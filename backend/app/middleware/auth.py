import json
import time
import urllib.request
from functools import lru_cache

import structlog
from fastapi import Request, HTTPException
from jose import jwt, JWTError, jwk
from jose.utils import base64url_decode

from app.config import Settings

logger = structlog.get_logger()

_JWKS_TTL_SECONDS = 3600  # 1 hour
_jwks_cache: dict[str, tuple[float, dict]] = {}


@lru_cache
def _get_settings() -> Settings:
    return Settings()


def _fetch_jwks(jwks_url: str) -> dict:
    """Fetch JWKS public keys from Supabase with a 1-hour TTL cache."""
    now = time.monotonic()
    cached = _jwks_cache.get(jwks_url)
    if cached and (now - cached[0]) < _JWKS_TTL_SECONDS:
        return cached[1]

    try:
        resp = urllib.request.urlopen(jwks_url, timeout=10)
        data = json.loads(resp.read())
        _jwks_cache[jwks_url] = (now, data)
        return data
    except Exception:
        logger.error("jwks_fetch_failed", jwks_url=jwks_url, exc_info=True)
        # Return stale cache if available, otherwise empty
        if cached:
            return cached[1]
        return {"keys": []}


def _decode_token(token: str) -> dict:
    """Decode and verify a Supabase JWT using JWKS (ES256)."""
    settings = _get_settings()

    jwks_url = settings.supabase_jwks_url
    if not jwks_url:
        # Derive from supabase_url
        base = settings.supabase_url.rstrip("/")
        if base:
            jwks_url = f"{base}/auth/v1/.well-known/jwks.json"
        else:
            raise HTTPException(status_code=500, detail="Auth not configured")

    # Fallback: if old jwt_secret is set, use HS256
    if settings.supabase_jwt_secret:
        try:
            return jwt.decode(
                token,
                settings.supabase_jwt_secret,
                algorithms=["HS256"],
                audience="authenticated",
            )
        except JWTError:
            raise HTTPException(status_code=401, detail="Invalid or expired token")

    # New JWKS-based verification (ES256)
    jwks = _fetch_jwks(jwks_url)
    keys = jwks.get("keys", [])
    if not keys:
        raise HTTPException(status_code=500, detail="No signing keys available")

    # Get the kid from the token header
    try:
        unverified_header = jwt.get_unverified_header(token)
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    kid = unverified_header.get("kid")
    alg = unverified_header.get("alg", "ES256")

    # Find matching key
    signing_key = None
    for key in keys:
        if key.get("kid") == kid:
            signing_key = key
            break

    if not signing_key:
        # Try first key if no kid match (single key setup)
        signing_key = keys[0]

    try:
        payload = jwt.decode(
            token,
            signing_key,
            algorithms=[alg],
            audience="authenticated",
        )
        return payload
    except JWTError:
        logger.debug("jwt_verification_failed", exc_info=True)
        raise HTTPException(status_code=401, detail="Invalid or expired token")


async def get_current_user(request: Request) -> dict | None:
    """Optional auth -- returns user dict or None if no token.
    If a token IS provided but is invalid/expired, re-raise 401
    instead of silently downgrading to anonymous.
    """
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return None
    token = auth_header[7:]
    # Token was provided — if it's invalid, that's a 401, not anonymous
    return _decode_token(token)


async def require_auth(request: Request) -> dict:
    """Required auth -- raises 401 if not authenticated."""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    return user


# ── Ban enforcement ─────────────────────────────────────────────────────
import time as _time
from collections import OrderedDict

_ban_cache: OrderedDict[str, tuple[float, bool, str | None]] = OrderedDict()
_BAN_CACHE_TTL = 300  # 5 minutes
_BAN_CACHE_MAX = 500


def _check_ban_cache(user_id: str) -> tuple[bool, str | None] | None:
    """Returns (is_banned, reason) from cache, or None if not cached / expired."""
    entry = _ban_cache.get(user_id)
    if entry is None:
        return None
    ts, is_banned, reason = entry
    if _time.monotonic() - ts > _BAN_CACHE_TTL:
        _ban_cache.pop(user_id, None)
        return None
    return is_banned, reason


def clear_ban_cache(user_id: str):
    """Clear ban cache for a specific user (called from admin ban/unban)."""
    _ban_cache.pop(user_id, None)


async def check_user_ban(request: Request) -> dict:
    """Required auth + ban check. Returns user dict or raises 401/403."""
    user = await require_auth(request)
    user_id = user.get("sub")
    if not user_id:
        return user

    cached = _check_ban_cache(user_id)
    if cached is not None:
        is_banned, reason = cached
        if is_banned:
            raise HTTPException(status_code=403, detail=f"Account suspended: {reason or 'Contact support'}")
        return user

    # Import here to avoid circular import
    from app.dependencies import get_supabase_service
    supa = get_supabase_service()
    profile = await supa.get_profile(user_id)

    is_banned = False
    reason = None
    if profile and profile.get("banned_at"):
        is_banned = True
        reason = profile.get("ban_reason")

    # Cache the result
    if len(_ban_cache) >= _BAN_CACHE_MAX:
        _ban_cache.popitem(last=False)
    _ban_cache[user_id] = (_time.monotonic(), is_banned, reason)

    if is_banned:
        raise HTTPException(status_code=403, detail=f"Account suspended: {reason or 'Contact support'}")

    return user
