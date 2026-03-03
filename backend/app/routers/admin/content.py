from fastapi import APIRouter, Depends, Query, Request
from pydantic import BaseModel

from app.middleware.admin_auth import require_admin
from app.dependencies import get_admin_service
from app.services.admin_service import AdminService

router = APIRouter(prefix="/api/admin/content", tags=["admin-content"])


class ReviewBody(BaseModel):
    action: str
    admin_notes: str = ""


class ContactUpdateBody(BaseModel):
    status: str
    admin_response: str = ""


@router.get("/submissions")
async def list_submissions(
    page: int = Query(1, ge=1),
    status: str = Query(""),
    _user: dict = Depends(require_admin),
    svc: AdminService = Depends(get_admin_service),
):
    return await svc.list_design_submissions(page=page, status=status)


@router.post("/submissions/{submission_id}/review")
async def review_submission(
    submission_id: str,
    body: ReviewBody,
    request: Request,
    user: dict = Depends(require_admin),
    svc: AdminService = Depends(get_admin_service),
):
    await svc.review_design_submission(submission_id, body.action, body.admin_notes)
    await svc.log_action(user["user_id"], "review_submission", "design_submission", submission_id,
                         {"action": body.action, "notes": body.admin_notes},
                         request.client.host if request.client else "")
    return {"status": body.action}


@router.get("/contacts")
async def list_contacts(
    page: int = Query(1, ge=1),
    status: str = Query(""),
    _user: dict = Depends(require_admin),
    svc: AdminService = Depends(get_admin_service),
):
    return await svc.list_contacts(page=page, status=status)


@router.patch("/contacts/{contact_id}")
async def update_contact(
    contact_id: str,
    body: ContactUpdateBody,
    request: Request,
    user: dict = Depends(require_admin),
    svc: AdminService = Depends(get_admin_service),
):
    await svc.update_contact(contact_id, body.status, body.admin_response, user["user_id"])
    await svc.log_action(user["user_id"], "update_contact", "contact", contact_id,
                         {"status": body.status}, request.client.host if request.client else "")
    return {"status": "ok"}
