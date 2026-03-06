import time

import structlog
from fastapi import APIRouter, Depends, Query

from app.middleware.admin_auth import require_admin
from app.dependencies import get_admin_service, get_settings
from app.services.admin_service import AdminService
from app.services.session_store import get_session_store

logger = structlog.get_logger()

router = APIRouter(prefix="/api/admin/system", tags=["admin-system"])

_start_time = time.time()


@router.get("/health")
async def system_health(
    _user: dict = Depends(require_admin),
):
    logger.info("admin_system_health")
    settings = get_settings()
    store = get_session_store()
    return {
        "status": "ok",
        "uptime_s": round(time.time() - _start_time),
        "sessions": store.count if store else 0,
        "ai_model": settings.gemini_model,
        "art_model": settings.gemini_art_model,
        "ai_provider": settings.ai_provider,
    }


@router.get("/errors")
async def recent_errors(
    limit: int = Query(20, ge=1, le=100),
    _user: dict = Depends(require_admin),
    svc: AdminService = Depends(get_admin_service),
):
    logger.info("admin_recent_errors", limit=limit)
    return await svc.get_generation_error_summary(limit)


@router.get("/audit-log")
async def audit_log(
    page: int = Query(1, ge=1),
    action: str = Query(""),
    _user: dict = Depends(require_admin),
    svc: AdminService = Depends(get_admin_service),
):
    logger.info("admin_audit_log", page=page, action=action)
    return await svc.list_audit_log(page=page, action=action)
