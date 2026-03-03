"""Server-side session store for multi-step generation.

Caches intermediate results (analyses, plan) so images only upload once.
Sessions expire after TTL and are cleaned up by a background task.
"""

from __future__ import annotations

import asyncio
import time
import uuid

import structlog

logger = structlog.get_logger()

# Default configuration (overridden by Settings)
_DEFAULT_TTL_SECONDS = 30 * 60  # 30 minutes
_DEFAULT_MAX_SESSIONS = 100
_CLEANUP_INTERVAL = 5 * 60  # 5 minutes


class Session:
    """A single generation session holding cached intermediate results."""

    __slots__ = (
        "session_id", "user_id", "created_at", "last_accessed",
        "image_bytes", "mime_types",
        "photo_analyses", "clusters", "quality_scores",
        "duplicate_groups", "metadata", "plan", "draft",
        "template_config", "num_photos",
        "_lock",
    )

    def __init__(self, session_id: str, user_id: str | None = None) -> None:
        self.session_id = session_id
        self.user_id = user_id
        self.created_at = time.time()
        self.last_accessed = time.time()

        # Stage inputs (cleared after analyze to free memory)
        self.image_bytes: list[bytes] = []
        self.mime_types: list[str] = []
        self.num_photos: int = 0

        # Stage A outputs (cached)
        self.metadata: list[dict] = []
        self.quality_scores: list[dict] = []
        self.duplicate_groups: list[dict] = []

        # Stage B outputs (cached)
        self.photo_analyses: list[dict] = []
        self.clusters: list[dict] = []

        # Stage C output (cached)
        self.plan: dict | None = None

        # Stage D output (cached)
        self.draft: dict | None = None

        # Template config
        self.template_config: dict | None = None

        # Per-session lock for concurrent access
        self._lock = asyncio.Lock()

    def touch(self) -> None:
        self.last_accessed = time.time()

    def evict_image_bytes(self) -> None:
        """Drop raw image data to free memory after analysis is cached."""
        freed = sum(len(b) for b in self.image_bytes)
        self.image_bytes = []
        self.mime_types = []
        if freed > 0:
            logger.info(
                "session_images_evicted",
                session_id=self.session_id,
                freed_mb=round(freed / 1024 / 1024, 1),
            )

    @property
    def has_images(self) -> bool:
        return len(self.image_bytes) > 0

    @property
    def has_analyses(self) -> bool:
        return len(self.photo_analyses) > 0

    @property
    def has_plan(self) -> bool:
        return self.plan is not None

    @property
    def has_draft(self) -> bool:
        return self.draft is not None


class SessionStore:
    """In-memory store for generation sessions with TTL and cleanup."""

    def __init__(
        self,
        ttl_seconds: int = _DEFAULT_TTL_SECONDS,
        max_sessions: int = _DEFAULT_MAX_SESSIONS,
    ) -> None:
        self._sessions: dict[str, Session] = {}
        self._ttl = ttl_seconds
        self._max_sessions = max_sessions
        self._cleanup_task: asyncio.Task | None = None

    def create(self, user_id: str | None = None) -> Session:
        """Create a new session and return it."""
        if len(self._sessions) >= self._max_sessions:
            self._evict_oldest()

        session_id = uuid.uuid4().hex
        session = Session(session_id=session_id, user_id=user_id)
        self._sessions[session_id] = session
        logger.info("session_created", session_id=session_id, user_id=user_id)
        return session

    def get(self, session_id: str) -> Session | None:
        """Get a session by ID, or None if expired/missing."""
        session = self._sessions.get(session_id)
        if session is None:
            return None
        if time.time() - session.last_accessed > self._ttl:
            self._remove(session_id)
            return None
        session.touch()
        return session

    def remove(self, session_id: str) -> None:
        """Explicitly remove a session."""
        self._remove(session_id)

    @property
    def count(self) -> int:
        return len(self._sessions)

    def start_cleanup_task(self) -> None:
        """Start the background cleanup loop. Call once at app startup."""
        if self._cleanup_task is None or self._cleanup_task.done():
            self._cleanup_task = asyncio.create_task(self._cleanup_loop())

    def stop_cleanup_task(self) -> None:
        """Stop the background cleanup loop."""
        if self._cleanup_task and not self._cleanup_task.done():
            self._cleanup_task.cancel()

    # ── Private ──────────────────────────────────────────────────────────

    def _remove(self, session_id: str) -> None:
        session = self._sessions.pop(session_id, None)
        if session:
            logger.info("session_removed", session_id=session_id)

    def _evict_oldest(self) -> None:
        """Remove the oldest session to make room."""
        if not self._sessions:
            return
        oldest_id = min(self._sessions, key=lambda k: self._sessions[k].last_accessed)
        logger.info("session_evicted_for_capacity", session_id=oldest_id)
        self._remove(oldest_id)

    async def _cleanup_loop(self) -> None:
        """Background task that periodically removes expired sessions."""
        while True:
            try:
                await asyncio.sleep(_CLEANUP_INTERVAL)
                now = time.time()
                expired = [
                    sid for sid, s in self._sessions.items()
                    if now - s.last_accessed > self._ttl
                ]
                for sid in expired:
                    self._remove(sid)
                if expired:
                    logger.info(
                        "session_cleanup",
                        expired_count=len(expired),
                        remaining=len(self._sessions),
                    )
            except asyncio.CancelledError:
                break
            except Exception:
                logger.warning("session_cleanup_error", exc_info=True)


# ── Singleton ────────────────────────────────────────────────────────────

_store: SessionStore | None = None


def get_session_store() -> SessionStore:
    """Get the global session store singleton."""
    global _store
    if _store is None:
        _store = SessionStore()
    return _store


def init_session_store(ttl_seconds: int = _DEFAULT_TTL_SECONDS, max_sessions: int = _DEFAULT_MAX_SESSIONS) -> SessionStore:
    """Initialize the global session store with custom settings."""
    global _store
    _store = SessionStore(ttl_seconds=ttl_seconds, max_sessions=max_sessions)
    return _store
