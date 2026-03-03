import structlog
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.dependencies import get_settings, get_supabase_service
from app.middleware.auth import require_auth
from app.config import Settings
from app.services.supabase_service import SupabaseService

logger = structlog.get_logger()

router = APIRouter(prefix="/api/referral", tags=["referral"])


class ProcessReferralRequest(BaseModel):
    referral_code: str


@router.get("/code")
async def get_referral_code(
    user: dict = Depends(require_auth),
    supa: SupabaseService = Depends(get_supabase_service),
    settings: Settings = Depends(get_settings),
):
    user_id = user.get("sub")
    code = await supa.get_or_create_referral_code(user_id)
    link = f"{settings.frontend_url}/signup?ref={code}"
    return {"code": code, "link": link}


@router.get("/stats")
async def get_referral_stats(
    user: dict = Depends(require_auth),
    supa: SupabaseService = Depends(get_supabase_service),
):
    user_id = user.get("sub")
    stats = await supa.get_referral_stats(user_id)
    return stats


@router.post("/process")
async def process_referral(
    body: ProcessReferralRequest,
    user: dict = Depends(require_auth),
    supa: SupabaseService = Depends(get_supabase_service),
    settings: Settings = Depends(get_settings),
):
    user_id = user.get("sub")
    success = await supa.process_referral(user_id, body.referral_code, settings.referral_credits)
    if not success:
        raise HTTPException(status_code=400, detail="Invalid or already used referral code")
    return {"status": "referral_processed"}
