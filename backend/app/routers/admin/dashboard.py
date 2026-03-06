import structlog
from fastapi import APIRouter, Depends, Query

from app.middleware.admin_auth import require_admin
from app.dependencies import get_admin_service
from app.services.admin_service import AdminService

logger = structlog.get_logger()

router = APIRouter(prefix="/api/admin/dashboard", tags=["admin-dashboard"])


@router.get("/stats")
async def dashboard_stats(
    _user: dict = Depends(require_admin),
    svc: AdminService = Depends(get_admin_service),
):
    logger.info("admin_dashboard_stats")
    result = await svc.get_dashboard_stats()
    logger.info("admin_dashboard_stats_done")
    return result


@router.get("/revenue-chart")
async def revenue_chart(
    days: int = Query(30, ge=1, le=365),
    _user: dict = Depends(require_admin),
    svc: AdminService = Depends(get_admin_service),
):
    logger.info("admin_revenue_chart", days=days)
    return await svc.get_revenue_timeseries(days)


@router.get("/user-growth-chart")
async def user_growth_chart(
    days: int = Query(30, ge=1, le=365),
    _user: dict = Depends(require_admin),
    svc: AdminService = Depends(get_admin_service),
):
    logger.info("admin_user_growth_chart", days=days)
    return await svc.get_user_growth_timeseries(days)


@router.get("/generation-chart")
async def generation_chart(
    days: int = Query(30, ge=1, le=365),
    _user: dict = Depends(require_admin),
    svc: AdminService = Depends(get_admin_service),
):
    logger.info("admin_generation_chart", days=days)
    return await svc.get_generation_timeseries(days)


@router.get("/template-popularity")
async def template_popularity(
    limit: int = Query(10, ge=1, le=50),
    _user: dict = Depends(require_admin),
    svc: AdminService = Depends(get_admin_service),
):
    logger.info("admin_template_popularity", limit=limit)
    return await svc.get_template_popularity(limit)


@router.get("/funnel")
async def funnel_stats(
    days: int = Query(30, ge=1, le=365),
    _user: dict = Depends(require_admin),
    svc: AdminService = Depends(get_admin_service),
):
    logger.info("admin_funnel_stats", days=days)
    return await svc.get_funnel_stats(days)


@router.get("/event-stats")
async def event_stats(
    days: int = Query(30, ge=1, le=365),
    _user: dict = Depends(require_admin),
    svc: AdminService = Depends(get_admin_service),
):
    logger.info("admin_event_stats", days=days)
    return await svc.get_event_stats(days)


@router.get("/wizard-funnel")
async def wizard_funnel(
    days: int = Query(30, ge=1, le=365),
    _user: dict = Depends(require_admin),
    svc: AdminService = Depends(get_admin_service),
):
    logger.info("admin_wizard_funnel", days=days)
    return await svc.get_wizard_funnel(days)


@router.get("/pdf-stats")
async def pdf_stats(
    days: int = Query(30, ge=1, le=365),
    _user: dict = Depends(require_admin),
    svc: AdminService = Depends(get_admin_service),
):
    logger.info("admin_pdf_stats", days=days)
    return await svc.get_pdf_stats(days)
