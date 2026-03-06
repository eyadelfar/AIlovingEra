import structlog
from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, EmailStr

from app.dependencies import get_supabase_service
from app.middleware.auth import get_current_user
from app.services.supabase_service import SupabaseService

logger = structlog.get_logger()

router = APIRouter(prefix="/api/contact", tags=["contact"])


class ContactForm(BaseModel):
    name: str
    email: EmailStr
    subject: str
    message: str


@router.post("")
async def submit_contact(
    body: ContactForm,
    user: dict | None = Depends(get_current_user),
    supa: SupabaseService = Depends(get_supabase_service),
):
    user_id = user.get("sub") if user else None
    logger.info("submit_contact", user_id=user_id, subject=body.subject)
    try:
        await supa.create_contact_submission({
            "name": body.name,
            "email": body.email,
            "subject": body.subject,
            "message": body.message,
            "user_id": user_id,
        })
    except Exception as e:
        logger.error("submit_contact_failed", user_id=user_id, error=str(e))
        raise
    logger.info("submit_contact_done", user_id=user_id)
    return {"status": "submitted"}
