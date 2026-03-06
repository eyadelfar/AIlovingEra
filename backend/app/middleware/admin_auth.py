import structlog
from fastapi import Request, HTTPException, Depends

from app.middleware.auth import require_auth
from app.dependencies import get_supabase_service
from app.services.supabase_service import SupabaseService

logger = structlog.get_logger()

ADMIN_ROLES = ("admin", "moderator")


async def require_admin(
    request: Request,
    user: dict = Depends(require_auth),
    supa: SupabaseService = Depends(get_supabase_service),
) -> dict:
    """Verify the authenticated user has an admin or moderator role.

    Checks the DB on every request so role changes take effect immediately.
    """
    user_id = user.get("sub")
    logger.info("require_admin_check", user_id=user_id)
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")

    profile = await supa.get_profile(user_id)
    if not profile:
        logger.warning("require_admin_no_profile", user_id=user_id)
        raise HTTPException(status_code=403, detail="Profile not found")

    role = profile.get("role", "user")
    if role not in ADMIN_ROLES:
        logger.warning("admin_access_denied", user_id=user_id, role=role)
        raise HTTPException(status_code=403, detail="Admin access required")

    # Inject role and user_id into the user dict for downstream use
    user["role"] = role
    user["user_id"] = user_id
    user["profile"] = profile
    logger.info("require_admin_granted", user_id=user_id, role=role)
    return user
