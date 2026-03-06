import structlog
from fastapi import APIRouter, Depends, Query, Request
from pydantic import BaseModel

from app.middleware.admin_auth import require_admin
from app.dependencies import get_admin_service
from app.services.admin_service import AdminService

logger = structlog.get_logger()

router = APIRouter(prefix="/api/admin/revenue", tags=["admin-revenue"])


class RefundBody(BaseModel):
    reason: str


@router.get("/purchases")
async def list_purchases(
    page: int = Query(1, ge=1),
    user_id: str = Query(""),
    status: str = Query(""),
    plan_id: str = Query(""),
    _user: dict = Depends(require_admin),
    svc: AdminService = Depends(get_admin_service),
):
    logger.info("admin_list_purchases", page=page, user_id=user_id, status=status, plan_id=plan_id)
    return await svc.list_purchases(page=page, user_id=user_id, status=status, plan_id=plan_id)


@router.post("/purchases/{purchase_id}/refund")
async def refund_purchase(
    purchase_id: str,
    body: RefundBody,
    request: Request,
    user: dict = Depends(require_admin),
    svc: AdminService = Depends(get_admin_service),
):
    logger.info("admin_refund_purchase", admin_id=user.get("user_id"), purchase_id=purchase_id)
    await svc.refund_purchase(purchase_id, body.reason, user["user_id"])
    await svc.log_action(user["user_id"], "refund_purchase", "purchase", purchase_id,
                         {"reason": body.reason}, request.client.host if request.client else "")
    logger.info("admin_refund_purchase_done", purchase_id=purchase_id)
    return {"status": "refunded"}


@router.get("/payment-audit")
async def payment_audit(
    page: int = Query(1, ge=1),
    event_type: str = Query(""),
    _user: dict = Depends(require_admin),
    svc: AdminService = Depends(get_admin_service),
):
    logger.info("admin_payment_audit", page=page, event_type=event_type)
    return await svc.get_payment_audit_log(page=page, event_type=event_type)
