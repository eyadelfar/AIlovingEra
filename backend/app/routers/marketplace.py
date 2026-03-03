import asyncio
from typing import Optional

import structlog
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from app.dependencies import get_supabase_service
from app.middleware.auth import require_auth
from app.services.supabase_service import SupabaseService

logger = structlog.get_logger()

router = APIRouter(prefix="/api/marketplace", tags=["marketplace"])


@router.get("/designs")
async def list_designs(
    category: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    free_only: bool = Query(False),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=50),
    supa: SupabaseService = Depends(get_supabase_service),
):
    """List marketplace designs with optional filters."""
    if not supa.client:
        return {"designs": [], "total": 0}

    query = supa.client.table("marketplace_designs").select("*", count="exact")

    if category:
        query = query.eq("category", category)
    if free_only:
        query = query.eq("is_free", True)
    if search:
        query = query.ilike("name", f"%{search}%")

    offset = (page - 1) * page_size
    query = query.order("sort_order").order("created_at", desc=True)
    query = query.range(offset, offset + page_size - 1)

    result = await asyncio.to_thread(query.execute)
    return {"designs": result.data or [], "total": result.count or 0}


@router.get("/designs/{slug}")
async def get_design(
    slug: str,
    supa: SupabaseService = Depends(get_supabase_service),
):
    """Get a single design by slug."""
    if not supa.client:
        raise HTTPException(status_code=404, detail="Design not found")

    result = await asyncio.to_thread(
        lambda: supa.client.table("marketplace_designs").select("*").eq("slug", slug).single().execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Design not found")
    return result.data


@router.post("/designs/{slug}/purchase")
async def purchase_design(
    slug: str,
    user: dict = Depends(require_auth),
    supa: SupabaseService = Depends(get_supabase_service),
):
    """Purchase a marketplace design using credits or subscription."""
    if not supa.client:
        raise HTTPException(status_code=501, detail="Marketplace not configured")

    user_id = user.get("sub")

    # Get design
    design_result = await asyncio.to_thread(
        lambda: supa.client.table("marketplace_designs").select("*").eq("slug", slug).single().execute()
    )
    design = design_result.data
    if not design:
        raise HTTPException(status_code=404, detail="Design not found")

    # Free designs don't need purchase
    if design["is_free"]:
        # Just add to owned
        await asyncio.to_thread(
            lambda: supa.client.table("user_owned_designs").upsert({
                "user_id": user_id,
                "design_id": design["id"],
            }).execute()
        )
        return {"status": "ok", "message": "Design added to your collection"}

    # Check if already owned
    existing = await asyncio.to_thread(
        lambda: supa.client.table("user_owned_designs")
            .select("id")
            .eq("user_id", user_id)
            .eq("design_id", design["id"])
            .execute()
    )
    if existing.data:
        return {"status": "ok", "message": "Already owned"}

    # Check entitlement
    profile = await supa.get_profile(user_id)
    if not profile:
        raise HTTPException(status_code=403, detail="Profile not found")

    plan = profile.get("plan", "free")
    if plan in ("monthly_pro", "annual_pro"):
        # Pro users get marketplace access
        pass
    else:
        # Need credits — 1 credit per premium design
        has_credit = await supa.use_credit(user_id)
        if not has_credit:
            raise HTTPException(status_code=402, detail="Insufficient credits")

    # Add to owned
    await asyncio.to_thread(
        lambda: supa.client.table("user_owned_designs").insert({
            "user_id": user_id,
            "design_id": design["id"],
        }).execute()
    )

    return {"status": "ok", "message": "Design purchased"}


@router.get("/my-designs")
async def my_designs(
    user: dict = Depends(require_auth),
    supa: SupabaseService = Depends(get_supabase_service),
):
    """List designs owned by the current user."""
    if not supa.client:
        return {"designs": []}

    user_id = user.get("sub")
    result = await asyncio.to_thread(
        lambda: supa.client.table("user_owned_designs")
            .select("design_id, purchased_at, marketplace_designs(*)")
            .eq("user_id", user_id)
            .execute()
    )

    designs = []
    for row in (result.data or []):
        design = row.get("marketplace_designs")
        if design:
            design["purchased_at"] = row["purchased_at"]
            designs.append(design)

    return {"designs": designs}


# ── Designer Submissions ────────────────────────────────────────────────────

class DesignSubmission(BaseModel):
    name: str
    description: str = ""
    category: str  # theme | cover | layout_pack
    subcategory: str = ""
    preview_image_url: str = ""
    config_json: dict


@router.post("/submissions")
async def submit_design(
    body: DesignSubmission,
    user: dict = Depends(require_auth),
    supa: SupabaseService = Depends(get_supabase_service),
):
    """Submit a new design for review."""
    if not supa.client:
        raise HTTPException(status_code=501, detail="Marketplace not configured")

    user_id = user.get("sub")
    if body.category not in ("theme", "cover", "layout_pack"):
        raise HTTPException(status_code=422, detail="Invalid category")

    result = await asyncio.to_thread(
        lambda: supa.client.table("design_submissions").insert({
            "designer_id": user_id,
            "name": body.name,
            "description": body.description,
            "category": body.category,
            "subcategory": body.subcategory,
            "preview_image_url": body.preview_image_url,
            "config_json": body.config_json,
            "status": "pending",
        }).execute()
    )

    return {"status": "ok", "submission": result.data[0] if result.data else None}


@router.get("/submissions/mine")
async def my_submissions(
    user: dict = Depends(require_auth),
    supa: SupabaseService = Depends(get_supabase_service),
):
    """List designer's own submissions."""
    if not supa.client:
        return {"submissions": []}

    user_id = user.get("sub")
    result = await asyncio.to_thread(
        lambda: supa.client.table("design_submissions")
            .select("*")
            .eq("designer_id", user_id)
            .order("submitted_at", desc=True)
            .execute()
    )

    return {"submissions": result.data or []}
