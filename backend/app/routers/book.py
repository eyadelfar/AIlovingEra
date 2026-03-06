import asyncio
import base64
import io
import json
import os
import tempfile
import time
import uuid

import structlog
from fastapi import APIRouter, Depends, Form, HTTPException, UploadFile
from fastapi.responses import StreamingResponse
from starlette.responses import StreamingResponse as StarletteStreamingResponse

from pydantic import BaseModel

from app.dependencies import get_orchestrator, get_supabase_service
from app.middleware.auth import get_current_user, check_user_ban
from app.services.supabase_service import SupabaseService
from app.models.schemas import (
    AddOns,
    AIQuestion,
    AIQuestionAnswer,
    AIQuestionsResponse,
    AnalyzeResult,
    BookGenerationRequest,
    BookGenerationResponse,
    DesignScale,
    ImageDensity,
    ImageGenerationResponse,
    ImageLook,
    MemoryBookDraft,
    PageSize,
    PlanResult,
    RegenerateTextRequest,
    RegenerateTextResponse,
    calculate_page_count,
)
from app.services.memory_book_orchestrator import MemoryBookOrchestrator
from app.services.session_store import get_session_store
from app.services.template_service import get_template

logger = structlog.get_logger()

MAX_IMAGES = 250
MAX_IMAGE_SIZE = 20 * 1024 * 1024  # 20 MB
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"}

router = APIRouter(prefix="/api/books", tags=["books"])


async def _validate_images(images: list[UploadFile]) -> tuple[list[bytes], list[str]]:
    """Validate and read uploaded images concurrently. Returns (image_bytes, mime_types)."""
    if len(images) > MAX_IMAGES:
        raise HTTPException(status_code=422, detail=f"Too many images ({len(images)}). Maximum is {MAX_IMAGES}.")

    # Validate content types first (no I/O)
    mime_types: list[str] = []
    for i, upload in enumerate(images):
        ct = (upload.content_type or "").lower()
        if ct not in ALLOWED_IMAGE_TYPES:
            raise HTTPException(status_code=422, detail=f"Image {i + 1} has unsupported type '{ct}'. Allowed: JPEG, PNG, WebP, HEIC, HEIF.")
        mime_types.append(ct)

    # Read all files concurrently
    image_bytes = await asyncio.gather(*[upload.read() for upload in images])

    # Validate sizes
    for i, data in enumerate(image_bytes):
        if len(data) > MAX_IMAGE_SIZE:
            raise HTTPException(status_code=422, detail=f"Image {i + 1} exceeds 20 MB size limit.")

    return list(image_bytes), mime_types


@router.post("/generate", response_model=BookGenerationResponse)
async def generate_book(
    images: list[UploadFile],
    template_slug: str = Form("romantic"),
    structure_template: str = Form("classic_timeline"),
    user_story_text: str = Form(""),
    partner_names_json: str = Form("[]"),
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
    locale: str = Form("en"),
    orchestrator: MemoryBookOrchestrator = Depends(get_orchestrator),
    user: dict = Depends(check_user_ban),
    supa: SupabaseService = Depends(get_supabase_service),
) -> BookGenerationResponse:
    logger.info(
        "book_generate_request",
        num_images=len(images),
        template=template_slug,
        structure=structure_template,
        vibe=vibe,
        image_look=image_look,
        image_density=image_density,
        page_count_target=page_count_target,
    )

    image_bytes, mime_types = await _validate_images(images)

    try:
        names = json.loads(partner_names_json) if partner_names_json else []
        if not isinstance(names, list):
            names = []
    except Exception:
        names = []

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
        logger.info("auto_page_count", num_photos=len(images), page_count=effective_page_count)

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
        locale=locale,
    )

    template_config = get_template(template_slug) or get_template("romantic") or {}

    # Deduct credit BEFORE generation (refund on failure)
    credit_deducted = False
    preview_only = False
    user_id = user.get("sub") if user else None
    if user and supa.client:
        profile = await supa.get_profile(user_id)
        if profile and profile.get("plan") not in ("monthly_pro", "annual_pro"):
            credit_deducted = await supa.use_credit(user_id)
            if not credit_deducted:
                preview_only = True
                logger.info("preview_generation", user_id=user_id, endpoint="generate")

    try:
        result = await orchestrator.generate(
            request=request,
            image_bytes=image_bytes,
            mime_types=mime_types,
            template_config=template_config,
        )
    except Exception:
        # Refund credit on generation failure
        if credit_deducted and user_id:
            await supa.refund_credit(user_id, "generation_failed")
        raise

    # Persist selected template in the draft for frontend retrieval
    result.draft.template_slug = template_slug
    result.preview_only = preview_only
    logger.info(
        "book_generate_response",
        num_chapters=len(result.draft.chapters),
        num_pages=len(result.draft.pages),
        title=result.draft.title,
        preview_only=preview_only,
    )
    return result


@router.post("/generate/stream")
async def generate_book_stream(
    images: list[UploadFile],
    template_slug: str = Form("romantic"),
    structure_template: str = Form("classic_timeline"),
    user_story_text: str = Form(""),
    partner_names_json: str = Form("[]"),
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
    locale: str = Form("en"),
    orchestrator: MemoryBookOrchestrator = Depends(get_orchestrator),
    user: dict = Depends(check_user_ban),
    supa: SupabaseService = Depends(get_supabase_service),
) -> StarletteStreamingResponse:
    """SSE endpoint for book generation with real-time progress."""
    logger.info(
        "book_generate_stream_request",
        num_images=len(images),
        user_id=user.get("sub") if user else "anon",
    )

    image_bytes, mime_types = await _validate_images(images)

    try:
        names = json.loads(partner_names_json) if partner_names_json else []
        if not isinstance(names, list):
            names = []
    except Exception:
        names = []

    question_answers = []
    try:
        qa_raw = json.loads(question_answers_json)
        question_answers = [AIQuestionAnswer(**a) for a in qa_raw]
    except Exception:
        pass

    constraints = []
    try:
        constraints = json.loads(constraints_json)
    except Exception:
        pass

    effective_page_count = page_count_target
    if effective_page_count == 0:
        effective_page_count = calculate_page_count(len(images))

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
        locale=locale,
    )

    template_config = get_template(template_slug) or get_template("romantic") or {}

    # Deduct credit BEFORE generation (refund on failure)
    credit_deducted = False
    preview_only = False
    user_id = user.get("sub") if user else None
    if user and supa.client:
        profile = await supa.get_profile(user_id)
        if profile and profile.get("plan") not in ("monthly_pro", "annual_pro"):
            credit_deducted = await supa.use_credit(user_id)
            if not credit_deducted:
                preview_only = True
                logger.info("preview_generation", user_id=user_id, endpoint="generate_stream")

    generation_id = uuid.uuid4().hex

    progress_queue: asyncio.Queue = asyncio.Queue()

    async def on_progress(event: dict):
        event["generation_id"] = generation_id
        await progress_queue.put(event)

    # Record generation start
    await supa.record_generation_start(
        user_id, generation_id, template_slug, len(image_bytes),
        wizard_inputs={"vibe": vibe, "structure": structure_template, "image_look": image_look,
                       "image_density": image_density, "page_size": page_size, "locale": locale,
                       "preview_only": preview_only},
    )

    async def generate_and_stream():
        t_start = time.time()
        try:
            result = await orchestrator.generate(
                request=request,
                image_bytes=image_bytes,
                mime_types=mime_types,
                template_config=template_config,
                on_progress=on_progress,
            )
            result.draft.template_slug = template_slug

            duration_ms = round((time.time() - t_start) * 1000)
            gen_status = "preview" if preview_only else "completed"
            await supa.record_generation_complete(generation_id, len(result.draft.pages), duration_ms, status=gen_status)

            # Send the final result as JSON
            await progress_queue.put({
                "stage": "complete",
                "progress": 100,
                "generation_id": generation_id,
                "preview_only": preview_only,
                "result": result.model_dump(),
            })
        except Exception as exc:
            logger.error("generation_stream_error", exc_info=True, generation_id=generation_id)
            # Refund credit on failure
            if credit_deducted and user_id:
                await supa.refund_credit(user_id, "generation_stream_failed")
            await supa.record_generation_failed(generation_id, str(exc)[:500])
            # Send sanitized error detail
            error_msg = str(exc) if str(exc) else "Generation failed"
            if "rate" in error_msg.lower() or "quota" in error_msg.lower():
                error_msg = "AI service rate limit reached. Please try again in a moment."
            elif "timeout" in error_msg.lower():
                error_msg = "Generation timed out. Try with fewer photos or pages."
            else:
                error_msg = "Generation failed. Please try again."
            await progress_queue.put({"stage": "error", "message": error_msg, "generation_id": generation_id})

    async def event_stream():
        task = asyncio.create_task(generate_and_stream())
        while True:
            try:
                event = await asyncio.wait_for(progress_queue.get(), timeout=15.0)
                yield f"data: {json.dumps(event)}\n\n"
                if event.get("stage") in ("complete", "error"):
                    break
            except asyncio.TimeoutError:
                # SSE heartbeat to keep connection alive
                yield ": heartbeat\n\n"
        await task

    return StarletteStreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


# ── Multi-step generation endpoints ──────────────────────────────────────

class UploadResponse(BaseModel):
    session_id: str
    image_count: int


class PlanRequest(BaseModel):
    session_id: str
    template_slug: str = "romantic"
    structure_template: str = "classic_timeline"
    user_story_text: str = ""
    partner_names: list[str] = []
    relationship_type: str = "couple"
    special_occasion: str = ""
    vibe: str = "romantic_warm"
    image_look: str = "natural"
    image_density: str = "balanced"
    page_size: str = "a4"
    page_count_target: int = 0
    bleed_mm: float = 3.0
    margin_mm: float = 12.0
    love_letter_insert: bool = False
    audio_qr_codes: bool = False
    anniversary_edition_cover: bool = False
    mini_reel_storyboard: bool = False
    question_answers: list[dict] = []
    constraints: list[str] = []
    locale: str = "en"


class WriteRequest(PlanRequest):
    """Same as PlanRequest, plus optional plan override."""
    plan_override: dict | None = None  # If None, uses cached plan from session


def _build_generation_request(body: PlanRequest) -> tuple[BookGenerationRequest, dict]:
    """Build BookGenerationRequest + template_config from a plan/write request body."""
    qa = []
    for a in body.question_answers:
        if a.get("question_id") and a.get("answer_text", "").strip():
            qa.append(AIQuestionAnswer(**a))

    effective_page_count = body.page_count_target
    if effective_page_count == 0:
        # Will be auto-calculated from session's num_photos during plan/write
        effective_page_count = 0

    request = BookGenerationRequest(
        template_slug=body.template_slug,
        structure_template=body.structure_template,
        user_story_text=body.user_story_text,
        partner_names=body.partner_names,
        relationship_type=body.relationship_type,
        special_occasion=body.special_occasion,
        vibe=body.vibe or "romantic_warm",
        image_look=ImageLook(body.image_look),
        image_density=ImageDensity(body.image_density),
        design_scale=DesignScale(
            page_size=PageSize(body.page_size),
            page_count_target=effective_page_count,
            bleed_mm=body.bleed_mm,
            margin_mm=body.margin_mm,
        ),
        add_ons=AddOns(
            love_letter_insert=body.love_letter_insert,
            audio_qr_codes=body.audio_qr_codes,
            anniversary_edition_cover=body.anniversary_edition_cover,
            mini_reel_storyboard=body.mini_reel_storyboard,
        ),
        question_answers=qa,
        constraints=body.constraints,
        locale=body.locale,
    )
    template_config = get_template(body.template_slug) or get_template("romantic") or {}
    return request, template_config


@router.post("/upload", response_model=UploadResponse)
async def upload_images(
    images: list[UploadFile],
    user: dict | None = Depends(get_current_user),
) -> UploadResponse:
    """Step 1: Upload images and create a server session. No AI calls, instant response."""
    image_bytes, mime_types = await _validate_images(images)

    store = get_session_store()
    user_id = user.get("sub") if user else None
    session = store.create(user_id=user_id)
    session.image_bytes = image_bytes
    session.mime_types = mime_types
    session.num_photos = len(image_bytes)

    logger.info("upload_complete", session_id=session.session_id, image_count=len(image_bytes))
    return UploadResponse(session_id=session.session_id, image_count=len(image_bytes))


@router.post("/analyze/stream")
async def analyze_stream(
    session_id: str = Form(...),
    orchestrator: MemoryBookOrchestrator = Depends(get_orchestrator),
    user: dict | None = Depends(get_current_user),
) -> StarletteStreamingResponse:
    """Step 2: Analyze uploaded photos (stages A-B). Streams progress via SSE.
    Results are cached in the session. Image bytes are evicted after completion."""
    store = get_session_store()
    session = store.get(session_id)
    if not session:
        raise HTTPException(404, "Session not found or expired. Please re-upload images.")
    if not session.has_images and session.has_analyses:
        raise HTTPException(400, "Analysis already complete for this session.")
    if not session.has_images:
        raise HTTPException(400, "No images in session. Upload images first.")

    progress_queue: asyncio.Queue = asyncio.Queue()

    async def on_progress(event: dict):
        await progress_queue.put(event)

    async def analyze_task():
        try:
            async with session._lock:
                result = await orchestrator.analyze(
                    session.image_bytes, session.mime_types, on_progress,
                )
                # Cache results in session
                session.photo_analyses = result.photo_analyses
                session.clusters = result.clusters
                session.quality_scores = [s.model_dump() for s in result.quality_scores]
                session.duplicate_groups = [g.model_dump() for g in result.duplicate_groups]
                session.metadata = result.metadata
                # Evict image bytes to free memory
                session.evict_image_bytes()

            await progress_queue.put({
                "stage": "complete",
                "progress": 100,
                "session_id": session_id,
                "photo_count": result.num_photos,
                "num_clusters": len(result.clusters),
            })
        except Exception as exc:
            logger.error("analyze_stream_error", exc_info=True, session_id=session_id)
            await progress_queue.put({"stage": "error", "message": str(exc)[:200]})

    async def event_stream():
        task = asyncio.create_task(analyze_task())
        while True:
            try:
                event = await asyncio.wait_for(progress_queue.get(), timeout=15.0)
                yield f"data: {json.dumps(event)}\n\n"
                if event.get("stage") in ("complete", "error"):
                    break
            except asyncio.TimeoutError:
                yield ": heartbeat\n\n"
        await task

    return StarletteStreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.post("/plan")
async def plan_book(
    body: PlanRequest,
    orchestrator: MemoryBookOrchestrator = Depends(get_orchestrator),
    user: dict | None = Depends(get_current_user),
):
    """Step 3: Plan book structure using cached analyses. Fast — text-only AI.
    Can be called multiple times with different settings."""
    store = get_session_store()
    session = store.get(body.session_id)
    if not session:
        raise HTTPException(404, "Session not found or expired.")
    if not session.has_analyses:
        raise HTTPException(400, "Analysis not complete. Run /analyze/stream first.")

    request, _ = _build_generation_request(body)
    if request.design_scale.page_count_target == 0:
        request.design_scale.page_count_target = calculate_page_count(session.num_photos)

    # Reconstruct AnalyzeResult from cached session data
    from app.models.schemas import PhotoQualityScore, DuplicateGroup
    analyze_result = AnalyzeResult(
        photo_analyses=session.photo_analyses,
        clusters=session.clusters,
        quality_scores=[PhotoQualityScore(**s) for s in session.quality_scores],
        duplicate_groups=[DuplicateGroup(**g) for g in session.duplicate_groups],
        metadata=session.metadata,
        num_photos=session.num_photos,
    )

    plan_result = await orchestrator.plan(request, analyze_result)

    # Cache plan in session
    session.plan = plan_result.plan

    return {
        "session_id": body.session_id,
        "plan": plan_result.plan,
        "estimated_pages": plan_result.estimated_pages,
        "num_chapters": plan_result.num_chapters,
        "num_spreads": plan_result.num_spreads,
    }


@router.post("/write/stream")
async def write_stream(
    body: WriteRequest,
    orchestrator: MemoryBookOrchestrator = Depends(get_orchestrator),
    user: dict = Depends(check_user_ban),
    supa: SupabaseService = Depends(get_supabase_service),
) -> StarletteStreamingResponse:
    """Step 4: Write narrative text using cached plan + analyses. Streams progress.
    Credit is deducted here (the commit point)."""
    store = get_session_store()
    session = store.get(body.session_id)
    if not session:
        raise HTTPException(404, "Session not found or expired.")
    if not session.has_analyses:
        raise HTTPException(400, "Analysis not complete. Run /analyze/stream first.")

    # Use plan_override if provided, else fall back to cached plan
    plan_dict = body.plan_override or session.plan
    if not plan_dict:
        raise HTTPException(400, "No plan available. Run /plan first or provide plan_override.")

    request, template_config = _build_generation_request(body)
    if request.design_scale.page_count_target == 0:
        request.design_scale.page_count_target = calculate_page_count(session.num_photos)

    # Reconstruct intermediate results from cached session data
    from app.models.schemas import PhotoQualityScore, DuplicateGroup
    analyze_result = AnalyzeResult(
        photo_analyses=session.photo_analyses,
        clusters=session.clusters,
        quality_scores=[PhotoQualityScore(**s) for s in session.quality_scores],
        duplicate_groups=[DuplicateGroup(**g) for g in session.duplicate_groups],
        metadata=session.metadata,
        num_photos=session.num_photos,
    )
    plan_result = PlanResult(
        plan=plan_dict,
        estimated_pages=sum(len(ch.get("spreads", [])) for ch in plan_dict.get("chapters", [])) + 4,
        num_chapters=len(plan_dict.get("chapters", [])),
        num_spreads=sum(len(ch.get("spreads", [])) for ch in plan_dict.get("chapters", [])),
    )

    # Credit deduction
    credit_deducted = False
    user_id = user.get("sub") if user else None
    preview_only = False
    if user and supa.client:
        profile = await supa.get_profile(user_id)
        if profile and profile.get("plan") not in ("monthly_pro", "annual_pro"):
            credit_deducted = await supa.use_credit(user_id)
            if not credit_deducted:
                preview_only = True
                logger.info("preview_generation", user_id=user_id, endpoint="write_stream")

    generation_id = uuid.uuid4().hex
    progress_queue: asyncio.Queue = asyncio.Queue()

    async def on_progress(event: dict):
        event["generation_id"] = generation_id
        await progress_queue.put(event)

    await supa.record_generation_start(
        user_id, generation_id, body.template_slug, session.num_photos,
        wizard_inputs={"vibe": body.vibe, "structure": body.structure_template, "image_look": body.image_look,
                       "image_density": body.image_density, "page_size": body.page_size, "locale": body.locale,
                       "preview_only": preview_only},
    )

    async def write_task():
        t_start = time.time()
        try:
            draft = await orchestrator.write(
                request, plan_result, analyze_result, template_config, on_progress,
            )
            draft.template_slug = body.template_slug

            duration_ms = round((time.time() - t_start) * 1000)
            gen_status = "preview" if preview_only else "completed"
            await supa.record_generation_complete(generation_id, len(draft.pages), duration_ms, status=gen_status)

            # Cache draft in session
            session.draft = draft.model_dump()

            from app.models.schemas import PhotoAnalysis
            photo_analyses = [PhotoAnalysis(**a) for a in analyze_result.photo_analyses]
            result = BookGenerationResponse(
                draft=draft,
                photo_analyses=photo_analyses,
                estimated_pages=len(draft.pages),
                quality_scores=analyze_result.quality_scores,
                duplicate_groups=analyze_result.duplicate_groups,
                preview_only=preview_only,
            )

            await progress_queue.put({
                "stage": "complete",
                "progress": 100,
                "generation_id": generation_id,
                "preview_only": preview_only,
                "result": result.model_dump(),
            })
        except Exception as exc:
            logger.error("write_stream_error", exc_info=True, generation_id=generation_id)
            if credit_deducted and user_id:
                await supa.refund_credit(user_id, "write_stream_failed")
            await supa.record_generation_failed(generation_id, str(exc)[:500])
            error_msg = "Writing failed. Please try again."
            if "rate" in str(exc).lower() or "quota" in str(exc).lower():
                error_msg = "AI service rate limit reached. Please try again in a moment."
            elif "timeout" in str(exc).lower():
                error_msg = "Writing timed out. Try with fewer pages."
            await progress_queue.put({"stage": "error", "message": error_msg, "generation_id": generation_id})

    async def event_stream():
        task = asyncio.create_task(write_task())
        while True:
            try:
                event = await asyncio.wait_for(progress_queue.get(), timeout=15.0)
                yield f"data: {json.dumps(event)}\n\n"
                if event.get("stage") in ("complete", "error"):
                    break
            except asyncio.TimeoutError:
                yield ": heartbeat\n\n"
        await task

    return StarletteStreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


class UnlockRequest(BaseModel):
    generation_id: str


@router.post("/unlock")
async def unlock_book(
    body: UnlockRequest,
    user: dict = Depends(check_user_ban),
    supa: SupabaseService = Depends(get_supabase_service),
):
    """Unlock a preview-only book by deducting 1 credit."""
    user_id = user.get("sub") if user else None
    if not user_id:
        raise HTTPException(401, "Authentication required.")

    profile = await supa.get_profile(user_id)
    if not profile:
        raise HTTPException(404, "Profile not found.")

    plan = profile.get("plan", "free")
    if plan in ("monthly_pro", "annual_pro"):
        return {"unlocked": True, "credits_remaining": -1}

    success = await supa.use_credit(user_id)
    if not success:
        raise HTTPException(402, "No credits available. Purchase credits first.")

    # Update generation history status from preview → completed
    try:
        await supa._execute_sync(
            lambda: supa.client.table("generation_history")
            .update({"status": "completed"})
            .eq("generation_id", body.generation_id)
            .eq("user_id", user_id)
            .execute()
        )
    except Exception:
        logger.warning("unlock_history_update_failed", exc_info=True)

    await supa.log_payment_event(user_id, "book_unlocked", {
        "generation_id": body.generation_id,
    })

    remaining = await supa.get_credits(user_id)
    logger.info("book_unlocked", user_id=user_id, generation_id=body.generation_id)
    return {"unlocked": True, "credits_remaining": remaining}


@router.post("/questions", response_model=AIQuestionsResponse)
async def generate_questions(
    images: list[UploadFile],
    partner_names_json: str = Form("[]"),
    relationship_type: str = Form("couple"),
    locale: str = Form("en"),
    orchestrator: MemoryBookOrchestrator = Depends(get_orchestrator),
) -> AIQuestionsResponse:
    image_bytes, mime_types = await _validate_images(images)

    try:
        names = json.loads(partner_names_json) if partner_names_json else []
        if not isinstance(names, list):
            names = []
    except Exception:
        names = []

    questions_raw = await orchestrator.generate_questions(
        image_bytes=image_bytes,
        mime_types=mime_types,
        partner_names=names,
        relationship_type=relationship_type,
        locale=locale,
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


@router.post("/questions/stream")
async def generate_questions_stream(
    images: list[UploadFile],
    partner_names_json: str = Form("[]"),
    relationship_type: str = Form("couple"),
    locale: str = Form("en"),
    question_count: int = Form(6),
    orchestrator: MemoryBookOrchestrator = Depends(get_orchestrator),
) -> StarletteStreamingResponse:
    """SSE endpoint for question generation with real-time progress."""
    image_bytes, mime_types = await _validate_images(images)

    try:
        names = json.loads(partner_names_json) if partner_names_json else []
        if not isinstance(names, list):
            names = []
    except Exception:
        names = []

    # Clamp to reasonable range
    q_count = max(1, min(20, question_count))

    progress_queue: asyncio.Queue = asyncio.Queue()

    async def on_progress(event: dict):
        await progress_queue.put(event)

    async def generate_and_stream():
        try:
            questions_raw = await orchestrator.generate_questions(
                image_bytes=image_bytes,
                mime_types=mime_types,
                partner_names=names,
                relationship_type=relationship_type,
                locale=locale,
                question_count=q_count,
                on_progress=on_progress,
            )

            questions = []
            for q in questions_raw:
                questions.append({
                    "question_id": q.get("question_id", f"q{len(questions)}"),
                    "question_text": q.get("question_text", ""),
                    "context_hint": q.get("context_hint", ""),
                    "related_photo_indices": q.get("related_photo_indices", []),
                })

            await progress_queue.put({
                "stage": "complete",
                "progress": 100,
                "questions": questions,
            })
        except Exception as exc:
            logger.error("questions_stream_error", exc_info=True)
            error_msg = str(exc) if str(exc) else "Question generation failed"
            if "rate" in error_msg.lower() or "quota" in error_msg.lower():
                error_msg = "AI service rate limit reached. Please try again in a moment."
            else:
                error_msg = "Failed to generate questions. Please try again."
            await progress_queue.put({"stage": "error", "message": error_msg})

    async def event_stream():
        task = asyncio.create_task(generate_and_stream())
        while True:
            try:
                event = await asyncio.wait_for(progress_queue.get(), timeout=15.0)
                yield f"data: {json.dumps(event)}\n\n"
                if event.get("stage") in ("complete", "error"):
                    break
            except asyncio.TimeoutError:
                yield ": heartbeat\n\n"
        await task

    return StarletteStreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


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
    logger.info("enhance_image_request", image_look=image_look, vibe=vibe)
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
    except Exception:
        logger.error("cartoon_generation_failed", exc_info=True)
        raise HTTPException(status_code=500, detail="Cartoon generation failed.")

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
    crop_overrides_json: str = Form("{}"),
    filter_overrides_json: str = Form("{}"),
    text_style_overrides_json: str = Form("{}"),
    position_offsets_json: str = Form("{}"),
    blend_overrides_json: str = Form("{}"),
    size_overrides_json: str = Form("{}"),
    custom_width: float = Form(0),
    custom_height: float = Form(0),
    custom_unit: str = Form("mm"),
    orchestrator: MemoryBookOrchestrator = Depends(get_orchestrator),
    user: dict | None = Depends(get_current_user),
    supa: SupabaseService = Depends(get_supabase_service),
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

    # Parse editor overrides
    overrides = {}
    for key, json_str in [
        ("crop", crop_overrides_json),
        ("filter", filter_overrides_json),
        ("textStyle", text_style_overrides_json),
        ("position", position_offsets_json),
        ("blend", blend_overrides_json),
        ("size", size_overrides_json),
    ]:
        try:
            parsed = json.loads(json_str)
            if isinstance(parsed, dict) and parsed:
                overrides[key] = parsed
        except Exception:
            pass

    design_scale = {
        "page_size": page_size,
        "bleed_mm": bleed_mm,
        "margin_mm": margin_mm,
    }

    # Custom page size support
    if page_size == "custom" and custom_width > 0 and custom_height > 0:
        # Convert to mm if needed
        if custom_unit == "in":
            design_scale["custom_width_mm"] = custom_width * 25.4
            design_scale["custom_height_mm"] = custom_height * 25.4
        elif custom_unit == "cm":
            design_scale["custom_width_mm"] = custom_width * 10
            design_scale["custom_height_mm"] = custom_height * 10
        else:
            design_scale["custom_width_mm"] = custom_width
            design_scale["custom_height_mm"] = custom_height

    pdf_bytes = await orchestrator.generate_pdf(
        draft, photo_data, template_config, design_scale, photo_analyses, overrides,
        on_progress=None,
    )

    # Track PDF download
    user_id = user.get("sub") if user else None
    try:
        await supa.record_pdf_download(user_id, {
            "template_slug": template_slug,
            "num_pages": len(draft.pages),
            "page_size": page_size,
            "file_size_bytes": len(pdf_bytes),
            "download_method": "direct",
        })
    except Exception:
        logger.warning("pdf_download_tracking_failed", exc_info=True)

    safe_title = "".join(c if c.isalnum() or c in " -_" else "_" for c in draft.title)[:50]
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{safe_title}.pdf"'},
    )


# ── Disk-backed PDF store with auto-expiry (10 min) ──────────────────
_PDF_DIR = os.path.join(tempfile.gettempdir(), "keepsqueak_pdfs")
os.makedirs(_PDF_DIR, exist_ok=True)

# token -> (file_path, timestamp, title, user_id)
_pdf_store: dict[str, tuple[str, float, str, str | None]] = {}
_pdf_store_lock = asyncio.Lock()
_PDF_EXPIRY_S = 600  # 10 minutes


def _cleanup_expired_pdfs():
    """Remove expired entries from the PDF store and delete temp files."""
    now = time.time()
    expired = [k for k, (_, ts, _, _) in _pdf_store.items() if now - ts > _PDF_EXPIRY_S]
    for k in expired:
        entry = _pdf_store.pop(k, None)
        if entry:
            try:
                os.unlink(entry[0])
            except OSError:
                pass


@router.get("/pdf/download/{token}")
async def download_pdf_by_token(
    token: str,
    user: dict | None = Depends(get_current_user),
):
    """Download a previously generated PDF by token. Token is single-use and user-bound."""
    async with _pdf_store_lock:
        _cleanup_expired_pdfs()
        entry = _pdf_store.pop(token, None)
    if not entry:
        raise HTTPException(404, "PDF not found or expired")
    file_path, _ts, title, owner_id = entry
    # Verify requesting user matches the token owner
    requesting_user = user.get("sub") if user else None
    if owner_id and requesting_user and owner_id != requesting_user:
        raise HTTPException(403, "Not authorized to download this PDF")
    # Read PDF from temp file and clean up
    try:
        with open(file_path, "rb") as f:
            pdf_bytes = f.read()
        os.unlink(file_path)
    except FileNotFoundError:
        raise HTTPException(404, "PDF file not found or expired")
    safe_title = "".join(c if c.isalnum() or c in " -_" else "_" for c in title)[:50]
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{safe_title}.pdf"'},
    )


@router.post("/pdf/stream")
async def download_pdf_stream(
    images: list[UploadFile],
    draft_json: str = Form(...),
    template_slug: str = Form("romantic"),
    page_size: str = Form("a4"),
    bleed_mm: float = Form(3.0),
    margin_mm: float = Form(12.0),
    photo_analyses_json: str = Form("[]"),
    crop_overrides_json: str = Form("{}"),
    filter_overrides_json: str = Form("{}"),
    text_style_overrides_json: str = Form("{}"),
    position_offsets_json: str = Form("{}"),
    blend_overrides_json: str = Form("{}"),
    size_overrides_json: str = Form("{}"),
    custom_width: float = Form(0),
    custom_height: float = Form(0),
    custom_unit: str = Form("mm"),
    orchestrator: MemoryBookOrchestrator = Depends(get_orchestrator),
    user: dict = Depends(check_user_ban),
    supa: SupabaseService = Depends(get_supabase_service),
) -> StarletteStreamingResponse:
    """SSE endpoint for PDF generation with real-time progress and token-based download."""
    draft = MemoryBookDraft(**json.loads(draft_json))
    template_config = get_template(template_slug) or get_template("romantic") or {}

    photo_data: dict[int, bytes] = {}
    for i, upload in enumerate(images):
        photo_data[i] = await upload.read()

    photo_analyses = None
    try:
        pa_raw = json.loads(photo_analyses_json)
        if isinstance(pa_raw, list) and len(pa_raw) > 0:
            photo_analyses = pa_raw
    except Exception:
        pass

    overrides = {}
    for key, json_str in [
        ("crop", crop_overrides_json),
        ("filter", filter_overrides_json),
        ("textStyle", text_style_overrides_json),
        ("position", position_offsets_json),
        ("blend", blend_overrides_json),
        ("size", size_overrides_json),
    ]:
        try:
            parsed = json.loads(json_str)
            if isinstance(parsed, dict) and parsed:
                overrides[key] = parsed
        except Exception:
            pass

    design_scale = {
        "page_size": page_size,
        "bleed_mm": bleed_mm,
        "margin_mm": margin_mm,
    }

    # Custom page size support
    if page_size == "custom" and custom_width > 0 and custom_height > 0:
        if custom_unit == "in":
            design_scale["custom_width_mm"] = custom_width * 25.4
            design_scale["custom_height_mm"] = custom_height * 25.4
        elif custom_unit == "cm":
            design_scale["custom_width_mm"] = custom_width * 10
            design_scale["custom_height_mm"] = custom_height * 10
        else:
            design_scale["custom_width_mm"] = custom_width
            design_scale["custom_height_mm"] = custom_height

    progress_queue: asyncio.Queue = asyncio.Queue()

    async def on_progress(event: dict):
        await progress_queue.put(event)

    user_id = user.get("sub") if user else None

    async def generate_and_stream():
        try:
            pdf_bytes = await orchestrator.generate_pdf(
                draft, photo_data, template_config, design_scale, photo_analyses, overrides,
                on_progress=on_progress,
            )
            # Write PDF to temp file and store metadata only (disk-backed)
            async with _pdf_store_lock:
                _cleanup_expired_pdfs()
                token = uuid.uuid4().hex
                pdf_path = os.path.join(_PDF_DIR, f"{token}.pdf")
                with open(pdf_path, "wb") as f:
                    f.write(pdf_bytes)
                _pdf_store[token] = (pdf_path, time.time(), draft.title or "memory-book", user_id)
            # Track PDF download
            try:
                await supa.record_pdf_download(user_id, {
                    "template_slug": template_slug,
                    "num_pages": len(draft.pages),
                    "page_size": page_size,
                    "file_size_bytes": len(pdf_bytes),
                    "download_method": "stream",
                })
            except Exception:
                logger.warning("pdf_download_tracking_failed", exc_info=True)
            await progress_queue.put({"stage": "complete", "download_token": token})
        except Exception as exc:
            logger.error("pdf_stream_error", exc_info=True)
            error_msg = "PDF generation failed"
            if "timeout" in str(exc).lower():
                error_msg = "PDF generation timed out. Try reducing the number of pages."
            await progress_queue.put({"stage": "error", "message": error_msg})

    async def event_stream():
        task = asyncio.create_task(generate_and_stream())
        while True:
            try:
                event = await asyncio.wait_for(progress_queue.get(), timeout=15.0)
                yield f"data: {json.dumps(event)}\n\n"
                if event.get("stage") in ("complete", "error"):
                    break
            except asyncio.TimeoutError:
                # SSE heartbeat to keep connection alive
                yield ": heartbeat\n\n"
        await task

    return StarletteStreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
