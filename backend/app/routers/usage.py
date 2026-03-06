import structlog
from fastapi import APIRouter, Depends

from app.dependencies import get_supabase_service
from app.middleware.auth import require_auth
from app.services.supabase_service import SupabaseService

logger = structlog.get_logger()

router = APIRouter(prefix="/api/usage", tags=["usage"])


@router.get("")
async def get_usage(
    user: dict = Depends(require_auth),
    supa: SupabaseService = Depends(get_supabase_service),
):
    user_id = user.get("sub")
    logger.info("get_usage", user_id=user_id)
    profile = await supa.get_profile(user_id)
    generation_history = await supa.get_generation_history(user_id, limit=50)
    credit_history = await supa.get_credit_history(user_id, limit=100)
    logger.info("get_usage_done", user_id=user_id, generations=len(generation_history), credits=len(credit_history))

    return {
        "profile": profile,
        "generation_history": generation_history,
        "credit_history": credit_history,
    }
