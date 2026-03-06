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
    logger.info("get_referral_code", user_id=user_id)
    code = await supa.get_or_create_referral_code(user_id)
    link = f"{settings.frontend_url}/signup?ref={code}"
    logger.info("get_referral_code_done", user_id=user_id, code=code)
    return {"code": code, "link": link}


@router.get("/stats")
async def get_referral_stats(
    user: dict = Depends(require_auth),
    supa: SupabaseService = Depends(get_supabase_service),
):
    user_id = user.get("sub")
    logger.info("get_referral_stats", user_id=user_id)
    stats = await supa.get_referral_stats(user_id)
    logger.info("get_referral_stats_done", user_id=user_id)
    return stats


@router.post("/process")
async def process_referral(
    body: ProcessReferralRequest,
    user: dict = Depends(require_auth),
    supa: SupabaseService = Depends(get_supabase_service),
    settings: Settings = Depends(get_settings),
):
    user_id = user.get("sub")
    logger.info("process_referral", user_id=user_id, referral_code=body.referral_code)
    success = await supa.process_referral(user_id, body.referral_code, settings.referral_credits)
    if not success:
        logger.warning("process_referral_failed", user_id=user_id, referral_code=body.referral_code)
        raise HTTPException(status_code=400, detail="Invalid or already used referral code")
    logger.info("process_referral_done", user_id=user_id, referral_code=body.referral_code)
    return {"status": "referral_processed"}
