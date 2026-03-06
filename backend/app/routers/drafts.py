import json

import structlog
from fastapi import APIRouter, Depends, HTTPException, UploadFile, Form
from pydantic import BaseModel

from app.middleware.auth import require_auth
from app.dependencies import get_supabase_service
from app.services.supabase_service import SupabaseService

logger = structlog.get_logger()

router = APIRouter(prefix="/api/drafts", tags=["drafts"])


class CreateDraftRequest(BaseModel):
    title: str = "Untitled"
    template_slug: str | None = None
    structure_template: str | None = None
    wizard_state: dict | None = None
    question_answers: list | None = None


class UpdateDraftRequest(BaseModel):
    title: str | None = None
    template_slug: str | None = None
    structure_template: str | None = None
    wizard_state: dict | None = None
    question_answers: list | None = None
    draft_json: dict | None = None
    photo_analyses: list | None = None
    editor_overrides: dict | None = None
    num_photos: int | None = None
    num_pages: int | None = None
    generation_id: str | None = None
    status: str | None = None


@router.get("")
async def list_drafts(
    user: dict = Depends(require_auth),
    supa: SupabaseService = Depends(get_supabase_service),
):
    user_id = user.get("sub")
    logger.info("list_drafts", user_id=user_id)
    drafts = await supa.list_drafts(user_id)
    logger.info("list_drafts_done", user_id=user_id, count=len(drafts))
    return {"drafts": drafts}


@router.get("/{draft_id}")
async def get_draft(
    draft_id: str,
    user: dict = Depends(require_auth),
    supa: SupabaseService = Depends(get_supabase_service),
):
    user_id = user.get("sub")
    logger.info("get_draft", user_id=user_id, draft_id=draft_id)
    draft = await supa.get_draft(draft_id, user_id)
    if not draft:
        logger.warning("get_draft_not_found", user_id=user_id, draft_id=draft_id)
        raise HTTPException(404, "Draft not found")
    logger.info("get_draft_done", user_id=user_id, draft_id=draft_id)
    return draft


@router.post("")
async def create_draft(
    body: CreateDraftRequest,
    user: dict = Depends(require_auth),
    supa: SupabaseService = Depends(get_supabase_service),
):
    user_id = user.get("sub")
    data = body.model_dump(exclude_none=True)
    logger.info("create_draft", user_id=user_id, title=body.title, template_slug=body.template_slug)
    draft = await supa.create_draft(user_id, data)
    logger.info("create_draft_done", user_id=user_id, draft_id=draft.get("id") if isinstance(draft, dict) else None)
    return draft


@router.put("/{draft_id}")
async def update_draft(
    draft_id: str,
    body: UpdateDraftRequest,
    user: dict = Depends(require_auth),
    supa: SupabaseService = Depends(get_supabase_service),
):
    user_id = user.get("sub")
    data = body.model_dump(exclude_none=True)
    if not data:
        raise HTTPException(422, "No fields to update")
    logger.info("update_draft", user_id=user_id, draft_id=draft_id, fields=list(data.keys()))
    updated = await supa.update_draft(draft_id, user_id, data)
    logger.info("update_draft_done", user_id=user_id, draft_id=draft_id)
    return updated


@router.delete("/{draft_id}")
async def delete_draft(
    draft_id: str,
    user: dict = Depends(require_auth),
    supa: SupabaseService = Depends(get_supabase_service),
):
    user_id = user.get("sub")
    logger.info("delete_draft", user_id=user_id, draft_id=draft_id)
    await supa.delete_draft(draft_id, user_id)
    logger.info("delete_draft_done", user_id=user_id, draft_id=draft_id)
    return {"ok": True}


@router.post("/{draft_id}/photos")
async def upload_draft_photos(
    draft_id: str,
    photos: list[UploadFile],
    user: dict = Depends(require_auth),
    supa: SupabaseService = Depends(get_supabase_service),
):
    user_id = user.get("sub")
    logger.info("upload_draft_photos", user_id=user_id, draft_id=draft_id, photo_count=len(photos))
    # Verify draft belongs to user
    draft = await supa.get_draft(draft_id, user_id)
    if not draft:
        logger.warning("upload_draft_photos_not_found", user_id=user_id, draft_id=draft_id)
        raise HTTPException(404, "Draft not found")

    paths = []
    for i, photo in enumerate(photos):
        data = await photo.read()
        ct = photo.content_type or "image/jpeg"
        path = await supa.upload_draft_photo(
            user_id, draft_id, i, data, ct, photo.filename or ""
        )
        paths.append(path)

    logger.info("upload_draft_photos_done", user_id=user_id, draft_id=draft_id, uploaded=len(paths))
    return {"paths": paths, "count": len(paths)}
