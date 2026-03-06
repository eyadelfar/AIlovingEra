import structlog
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel

from app.dependencies import get_supabase_service
from app.middleware.auth import require_auth
from app.services.supabase_service import SupabaseService

logger = structlog.get_logger()

router = APIRouter(prefix="/api/profile", tags=["profile"])


class ProfileUpdate(BaseModel):
    display_name: str | None = None
    language_preference: str | None = None


class ChangePasswordRequest(BaseModel):
    new_password: str


class DeleteAccountRequest(BaseModel):
    confirm: str


@router.get("")
async def get_profile(
    user: dict = Depends(require_auth),
    supa: SupabaseService = Depends(get_supabase_service),
):
    user_id = user.get("sub")
    logger.info("get_profile", user_id=user_id)
    profile = await supa.get_profile(user_id)
    if not profile:
        logger.warning("get_profile_not_found", user_id=user_id)
        raise HTTPException(status_code=404, detail="Profile not found")
    logger.info("get_profile_done", user_id=user_id)
    return profile


@router.patch("")
async def update_profile(
    body: ProfileUpdate,
    user: dict = Depends(require_auth),
    supa: SupabaseService = Depends(get_supabase_service),
):
    user_id = user.get("sub")
    update_data = body.model_dump(exclude_none=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    logger.info("update_profile", user_id=user_id, fields=list(update_data.keys()))
    await supa.update_profile(user_id, update_data)
    logger.info("update_profile_done", user_id=user_id)
    return {"status": "updated"}


@router.post("/avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    user: dict = Depends(require_auth),
    supa: SupabaseService = Depends(get_supabase_service),
):
    user_id = user.get("sub")
    logger.info("upload_avatar", user_id=user_id, content_type=file.content_type)
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    file_bytes = await file.read()
    if len(file_bytes) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 5MB)")

    try:
        url = await supa.upload_avatar(user_id, file_bytes, file.content_type)
    except Exception as e:
        logger.error("avatar_upload_failed", user_id=user_id, error=str(e))
        raise HTTPException(status_code=500, detail="Failed to upload avatar. Please try again.")
    logger.info("upload_avatar_done", user_id=user_id)
    return {"avatar_url": url}


@router.post("/change-password")
async def change_password(
    body: ChangePasswordRequest,
    user: dict = Depends(require_auth),
    supa: SupabaseService = Depends(get_supabase_service),
):
    user_id = user.get("sub")
    logger.info("change_password", user_id=user_id)
    if len(body.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    await supa.change_user_password(user_id, body.new_password)
    logger.info("change_password_done", user_id=user_id)
    return {"status": "password_changed"}


@router.delete("/account")
async def delete_account(
    body: DeleteAccountRequest,
    user: dict = Depends(require_auth),
    supa: SupabaseService = Depends(get_supabase_service),
):
    user_id = user.get("sub")
    logger.info("delete_account", user_id=user_id)
    if body.confirm != "DELETE":
        raise HTTPException(status_code=400, detail="Must confirm with 'DELETE'")
    await supa.delete_user_account(user_id)
    logger.info("delete_account_done", user_id=user_id)
    return {"status": "account_deleted"}
