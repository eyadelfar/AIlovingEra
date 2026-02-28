from fastapi import APIRouter, HTTPException

from app.services.template_service import (
    get_structure_template,
    get_template,
    list_structure_templates,
    list_templates,
)

router = APIRouter(prefix="/api/templates", tags=["templates"])


@router.get("")
async def get_all_templates() -> list[dict]:
    return list_templates()


@router.get("/structures")
async def get_all_structure_templates() -> list[dict]:
    return list_structure_templates()


@router.get("/structures/{slug}")
async def get_structure_template_by_slug(slug: str) -> dict:
    template = get_structure_template(slug)
    if not template:
        raise HTTPException(status_code=404, detail=f"Structure template '{slug}' not found")
    return template


@router.get("/{slug}")
async def get_template_by_slug(slug: str) -> dict:
    template = get_template(slug)
    if not template:
        raise HTTPException(status_code=404, detail=f"Template '{slug}' not found")
    return template
