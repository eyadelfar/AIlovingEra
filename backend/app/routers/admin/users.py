import structlog
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel

from app.middleware.admin_auth import require_admin
from app.dependencies import get_admin_service
from app.services.admin_service import AdminService

logger = structlog.get_logger()

router = APIRouter(prefix="/api/admin/users", tags=["admin-users"])


class UserUpdateBody(BaseModel):
    plan: str | None = None
    display_name: str | None = None


class AdjustCreditsBody(BaseModel):
    amount: int
    reason: str


class BanBody(BaseModel):
    reason: str


class RoleBody(BaseModel):
    role: str


@router.get("")
async def list_users(
    page: int = Query(1, ge=1),
    search: str = Query(""),
    plan: str = Query(""),
    role: str = Query(""),
    sort: str = Query("created_at"),
    _user: dict = Depends(require_admin),
    svc: AdminService = Depends(get_admin_service),
):
    logger.info("admin_list_users", page=page, search=search, plan=plan, role=role)
    return await svc.list_users(page=page, search=search, plan=plan, role=role, sort=sort)


@router.get("/{user_id}")
async def get_user_detail(
    user_id: str,
    _user: dict = Depends(require_admin),
    svc: AdminService = Depends(get_admin_service),
):
    logger.info("admin_get_user_detail", target_user_id=user_id)
    detail = await svc.get_user_detail(user_id)
    if not detail:
        logger.warning("admin_get_user_detail_not_found", target_user_id=user_id)
        raise HTTPException(status_code=404, detail="User not found")
    return detail


@router.patch("/{user_id}")
async def update_user(
    user_id: str,
    body: UserUpdateBody,
    request: Request,
    user: dict = Depends(require_admin),
    svc: AdminService = Depends(get_admin_service),
):
    logger.info("admin_update_user", admin_id=user.get("user_id"), target_user_id=user_id)
    await svc.update_user(user_id, body.model_dump(exclude_none=True))
    await svc.log_action(user["user_id"], "update_user", "user", user_id,
                         body.model_dump(exclude_none=True), request.client.host if request.client else "")
    logger.info("admin_update_user_done", target_user_id=user_id)
    return {"status": "ok"}


@router.post("/{user_id}/adjust-credits")
async def adjust_credits(
    user_id: str,
    body: AdjustCreditsBody,
    request: Request,
    user: dict = Depends(require_admin),
    svc: AdminService = Depends(get_admin_service),
):
    logger.info("admin_adjust_credits", admin_id=user.get("user_id"), target_user_id=user_id, amount=body.amount)
    await svc.adjust_credits(user_id, body.amount, body.reason)
    await svc.log_action(user["user_id"], "adjust_credits", "user", user_id,
                         {"amount": body.amount, "reason": body.reason},
                         request.client.host if request.client else "")
    logger.info("admin_adjust_credits_done", target_user_id=user_id, amount=body.amount)
    return {"status": "ok"}


@router.post("/{user_id}/ban")
async def ban_user(
    user_id: str,
    body: BanBody,
    request: Request,
    user: dict = Depends(require_admin),
    svc: AdminService = Depends(get_admin_service),
):
    logger.info("admin_ban_user", admin_id=user.get("user_id"), target_user_id=user_id)
    await svc.ban_user(user_id, body.reason)
    await svc.log_action(user["user_id"], "ban_user", "user", user_id,
                         {"reason": body.reason}, request.client.host if request.client else "")
    logger.info("admin_ban_user_done", target_user_id=user_id)
    return {"status": "banned"}


@router.post("/{user_id}/unban")
async def unban_user(
    user_id: str,
    request: Request,
    user: dict = Depends(require_admin),
    svc: AdminService = Depends(get_admin_service),
):
    logger.info("admin_unban_user", admin_id=user.get("user_id"), target_user_id=user_id)
    await svc.unban_user(user_id)
    await svc.log_action(user["user_id"], "unban_user", "user", user_id,
                         ip_address=request.client.host if request.client else "")
    logger.info("admin_unban_user_done", target_user_id=user_id)
    return {"status": "unbanned"}


@router.post("/{user_id}/role")
async def change_role(
    user_id: str,
    body: RoleBody,
    request: Request,
    user: dict = Depends(require_admin),
    svc: AdminService = Depends(get_admin_service),
):
    logger.info("admin_change_role", admin_id=user.get("user_id"), target_user_id=user_id, new_role=body.role)
    # Only full admins can change roles
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Only admins can change roles")
    await svc.change_user_role(user_id, body.role)
    await svc.log_action(user["user_id"], "change_role", "user", user_id,
                         {"new_role": body.role}, request.client.host if request.client else "")
    logger.info("admin_change_role_done", target_user_id=user_id, new_role=body.role)
    return {"status": "ok"}
