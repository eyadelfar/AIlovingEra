import base64
import io
import json
import logging

from fastapi import APIRouter, Depends, Form, HTTPException, UploadFile
from fastapi.responses import StreamingResponse

from app.dependencies import get_orchestrator
from app.models.schemas import (
    AddOns,
    AIQuestion,
    AIQuestionAnswer,
    AIQuestionsResponse,
    BookGenerationRequest,
    BookGenerationResponse,
    DesignScale,
    ImageDensity,
    ImageGenerationResponse,
    ImageLook,
    MemoryBookDraft,
    PageSize,
    RegenerateTextRequest,
    RegenerateTextResponse,
    calculate_page_count,
)
from app.services.memory_book_orchestrator import MemoryBookOrchestrator
from app.services.template_service import get_template

logger = logging.getLogger(__name__)

MAX_IMAGES = 250
MAX_IMAGE_SIZE = 20 * 1024 * 1024  # 20 MB
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"}

router = APIRouter(prefix="/api/books", tags=["books"])


async def _validate_images(images: list[UploadFile]) -> tuple[list[bytes], list[str]]:
    """Validate and read uploaded images. Returns (image_bytes, mime_types)."""
    if len(images) > MAX_IMAGES:
        raise HTTPException(status_code=422, detail=f"Too many images ({len(images)}). Maximum is {MAX_IMAGES}.")

    image_bytes: list[bytes] = []
    mime_types: list[str] = []
    for i, upload in enumerate(images):
        ct = (upload.content_type or "").lower()
        if ct not in ALLOWED_IMAGE_TYPES:
            raise HTTPException(status_code=422, detail=f"Image {i + 1} has unsupported type '{ct}'. Allowed: JPEG, PNG, WebP, HEIC, HEIF.")
        data = await upload.read()
        if len(data) > MAX_IMAGE_SIZE:
            raise HTTPException(status_code=422, detail=f"Image {i + 1} exceeds 20 MB size limit.")
        image_bytes.append(data)
        mime_types.append(ct)

    return image_bytes, mime_types


@router.post("/generate", response_model=BookGenerationResponse)
async def generate_book(
    images: list[UploadFile],
    template_slug: str = Form("romantic"),
    structure_template: str = Form("classic_timeline"),
    user_story_text: str = Form(""),
    partner_names: str = Form(""),
    relationship_type: str = Form("couple"),
    special_occasion: str = Form(""),
    vibe: str = Form("romantic_warm"),
    image_look: str = Form("natural"),
    image_density: str = Form("balanced"),
    page_size: str = Form("a4"),
    page_count_target: int = Form(0),
    bleed_mm: float = Form(3.0),
    margin_mm: float = Form(12.0),
    love_letter_insert: bool = Form(False),
    audio_qr_codes: bool = Form(False),
    anniversary_edition_cover: bool = Form(False),
    mini_reel_storyboard: bool = Form(False),
    question_answers_json: str = Form("[]"),
    constraints_json: str = Form("[]"),
    orchestrator: MemoryBookOrchestrator = Depends(get_orchestrator),
) -> BookGenerationResponse:
    logger.info(
        "POST /generate: %d images, template=%s, structure=%s, vibe=%s, look=%s, density=%s, page_count_target=%d",
        len(images), template_slug, structure_template, vibe, image_look, image_density, page_count_target,
    )

    image_bytes, mime_types = await _validate_images(images)

    names = [n.strip() for n in partner_names.split(",") if n.strip()] if partner_names else []

    # Parse question answers
    question_answers = []
    try:
        qa_raw = json.loads(question_answers_json)
        question_answers = [AIQuestionAnswer(**a) for a in qa_raw]
    except Exception:
        pass

    # Parse constraints
    constraints = []
    try:
        constraints = json.loads(constraints_json)
    except Exception:
        pass

    # Auto-calculate page count if 0
    effective_page_count = page_count_target
    if effective_page_count == 0:
        effective_page_count = calculate_page_count(len(images))
        logger.info("Auto page count: %d photos -> %d pages", len(images), effective_page_count)

    request = BookGenerationRequest(
        template_slug=template_slug,
        structure_template=structure_template,
        user_story_text=user_story_text,
        partner_names=names,
        relationship_type=relationship_type,
        special_occasion=special_occasion,
        vibe=vibe or "romantic_warm",
        image_look=ImageLook(image_look),
        image_density=ImageDensity(image_density),
        design_scale=DesignScale(
            page_size=PageSize(page_size),
            page_count_target=effective_page_count,
            bleed_mm=bleed_mm,
            margin_mm=margin_mm,
        ),
        add_ons=AddOns(
            love_letter_insert=love_letter_insert,
            audio_qr_codes=audio_qr_codes,
            anniversary_edition_cover=anniversary_edition_cover,
            mini_reel_storyboard=mini_reel_storyboard,
        ),
        question_answers=question_answers,
        constraints=constraints,
    )

    template_config = get_template(template_slug) or get_template("romantic") or {}

    result = await orchestrator.generate(
        request=request,
        image_bytes=image_bytes,
        mime_types=mime_types,
        template_config=template_config,
    )
    # Persist selected template in the draft for frontend retrieval
    result.draft.template_slug = template_slug
    logger.info(
        "POST /generate response: %d chapters, %d pages, title=%r",
        len(result.draft.chapters), len(result.draft.pages), result.draft.title,
    )
    return result


@router.post("/questions", response_model=AIQuestionsResponse)
async def generate_questions(
    images: list[UploadFile],
    partner_names: str = Form(""),
    relationship_type: str = Form("couple"),
    orchestrator: MemoryBookOrchestrator = Depends(get_orchestrator),
) -> AIQuestionsResponse:
    image_bytes, mime_types = await _validate_images(images)

    names = [n.strip() for n in partner_names.split(",") if n.strip()] if partner_names else []

    questions_raw = await orchestrator.generate_questions(
        image_bytes=image_bytes,
        mime_types=mime_types,
        partner_names=names,
        relationship_type=relationship_type,
    )

    questions = []
    for q in questions_raw:
        questions.append(AIQuestion(
            question_id=q.get("question_id", f"q{len(questions)}"),
            question_text=q.get("question_text", ""),
            context_hint=q.get("context_hint", ""),
            related_photo_indices=q.get("related_photo_indices", []),
        ))

    return AIQuestionsResponse(questions=questions)


@router.post("/generate-image", response_model=ImageGenerationResponse)
async def generate_image(
    prompt: str = Form(...),
    style_hint: str = Form(""),
    image_look: str = Form("natural"),
    orchestrator: MemoryBookOrchestrator = Depends(get_orchestrator),
) -> ImageGenerationResponse:
    image_bytes = await orchestrator.generate_image(prompt, style_hint, image_look)
    return ImageGenerationResponse(
        image_base64=base64.b64encode(image_bytes).decode(),
        mime_type="image/png",
    )


@router.post("/enhance-image", response_model=ImageGenerationResponse)
async def enhance_image(
    image: UploadFile,
    style_hint: str = Form(""),
    image_look: str = Form("natural"),
    vibe: str = Form(""),
    context: str = Form(""),
    orchestrator: MemoryBookOrchestrator = Depends(get_orchestrator),
) -> ImageGenerationResponse:
    logger.info("POST /enhance-image: look=%s, vibe=%s", image_look, vibe)
    img_bytes = await image.read()
    mime = image.content_type or "image/jpeg"
    enhanced = await orchestrator.enhance_image(
        image_bytes=img_bytes,
        mime_type=mime,
        style_hint=style_hint,
        image_look=image_look,
        vibe=vibe,
        context=context,
    )
    return ImageGenerationResponse(
        image_base64=base64.b64encode(enhanced).decode(),
        mime_type="image/png",
    )


@router.post("/generate-cartoon", response_model=ImageGenerationResponse)
async def generate_cartoon(
    images: list[UploadFile],
    style: str = Form("chibi"),
    orchestrator: MemoryBookOrchestrator = Depends(get_orchestrator),
) -> ImageGenerationResponse:
    if not images:
        raise HTTPException(status_code=422, detail="At least one image is required.")
    if len(images) > 3:
        raise HTTPException(status_code=422, detail="Maximum 3 images for cartoon generation.")

    # Use the first image (typically the best couple photo)
    img_data = await images[0].read()
    mime = images[0].content_type or "image/jpeg"

    try:
        cartoon_bytes = await orchestrator.generate_cartoon(img_data, mime, style)
    except Exception as exc:
        logger.error("Cartoon generation failed: %s", exc)
        raise HTTPException(status_code=500, detail="Cartoon generation failed.") from exc

    return ImageGenerationResponse(
        image_base64=base64.b64encode(cartoon_bytes).decode(),
        mime_type="image/png",
    )


@router.post("/regenerate-text", response_model=RegenerateTextResponse)
async def regenerate_text(
    request: RegenerateTextRequest,
    orchestrator: MemoryBookOrchestrator = Depends(get_orchestrator),
) -> RegenerateTextResponse:
    new_text = await orchestrator.regenerate_text(request)
    return RegenerateTextResponse(new_text=new_text)


@router.post("/pdf")
async def download_pdf(
    images: list[UploadFile],
    draft_json: str = Form(...),
    template_slug: str = Form("romantic"),
    page_size: str = Form("a4"),
    bleed_mm: float = Form(3.0),
    margin_mm: float = Form(12.0),
    photo_analyses_json: str = Form("[]"),
    orchestrator: MemoryBookOrchestrator = Depends(get_orchestrator),
) -> StreamingResponse:
    draft = MemoryBookDraft(**json.loads(draft_json))
    template_config = get_template(template_slug) or get_template("romantic") or {}

    photo_data: dict[int, bytes] = {}
    for i, upload in enumerate(images):
        photo_data[i] = await upload.read()

    # Parse photo analyses for face-aware cropping
    photo_analyses = None
    try:
        pa_raw = json.loads(photo_analyses_json)
        if isinstance(pa_raw, list) and len(pa_raw) > 0:
            photo_analyses = pa_raw
    except Exception:
        pass

    design_scale = {
        "page_size": page_size,
        "bleed_mm": bleed_mm,
        "margin_mm": margin_mm,
    }

    pdf_bytes = await orchestrator.generate_pdf(draft, photo_data, template_config, design_scale, photo_analyses)

    safe_title = "".join(c if c.isalnum() or c in " -_" else "_" for c in draft.title)[:50]
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{safe_title}.pdf"'},
    )
