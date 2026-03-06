import structlog
from fastapi import APIRouter, HTTPException

from app.services.template_service import (
    get_structure_template,
    get_template,
    list_structure_templates,
    list_templates,
)

logger = structlog.get_logger()

router = APIRouter(prefix="/api/templates", tags=["templates"])


@router.get("")
async def get_all_templates() -> list[dict]:
    logger.info("get_all_templates")
    templates = list_templates()
    logger.info("get_all_templates_done", count=len(templates))
    return templates


@router.get("/structures")
async def get_all_structure_templates() -> list[dict]:
    logger.info("get_all_structure_templates")
    templates = list_structure_templates()
    logger.info("get_all_structure_templates_done", count=len(templates))
    return templates


@router.get("/structures/{slug}")
async def get_structure_template_by_slug(slug: str) -> dict:
    logger.info("get_structure_template", slug=slug)
    template = get_structure_template(slug)
    if not template:
        logger.warning("get_structure_template_not_found", slug=slug)
        raise HTTPException(status_code=404, detail=f"Structure template '{slug}' not found")
    return template


@router.get("/{slug}")
async def get_template_by_slug(slug: str) -> dict:
    logger.info("get_template", slug=slug)
    template = get_template(slug)
    if not template:
        logger.warning("get_template_not_found", slug=slug)
        raise HTTPException(status_code=404, detail=f"Template '{slug}' not found")
    return template
