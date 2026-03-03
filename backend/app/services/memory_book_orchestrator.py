from __future__ import annotations

import time
from typing import Any, Callable

import structlog
from app.config import Settings
from app.interfaces.ai_service import AbstractAIService
from app.interfaces.image_enhancer import AbstractImageEnhancer
from app.interfaces.pdf_generator import AbstractPdfGenerator
from app.interfaces.prompt_builder import AbstractPromptBuilder
from app.interfaces.response_parser import AbstractResponseParser
from app.models.schemas import (
    AnalyzeResult,
    BookGenerationRequest,
    BookGenerationResponse,
    DuplicateGroup,
    MemoryBookDraft,
    PhotoAnalysis,
    PhotoMetadata,
    PhotoQualityScore,
    PlanResult,
    RegenerateTextRequest,
)
from app.services.duplicate_detector import detect_duplicates
from app.services.image_comparator import ImageComparator
from app.services.photo_metadata_extractor import extract_photo_metadata
from app.services.photo_quality_scorer import score_photos
from app.services.template_service import get_structure_template

logger = structlog.get_logger()


class MemoryBookOrchestrator:
    """Pipeline: metadata extraction -> photo analysis + clustering -> book plan -> image enhancement.
    Depends only on abstractions (DIP). Single responsibility: orchestrate.
    """

    def __init__(
        self,
        ai: AbstractAIService,
        builder: AbstractPromptBuilder,
        parser: AbstractResponseParser,
        image_enhancer: AbstractImageEnhancer,
        pdf_generator: AbstractPdfGenerator,
        settings: Settings | None = None,
        image_comparator: ImageComparator | None = None,
    ) -> None:
        self._ai = ai
        self._builder = builder
        self._parser = parser
        self._enhancer = image_enhancer
        self._pdf_gen = pdf_generator
        self._settings = settings or Settings()
        self._image_comparator = image_comparator

    # ── Public composable methods ────────────────────────────────────────

    async def analyze(
        self,
        image_bytes: list[bytes],
        mime_types: list[str],
        on_progress: "Callable[[dict], Any] | None" = None,
    ) -> AnalyzeResult:
        """Stages A + A1 + A2 + A3 + B: metadata extraction, scoring, dedup, AI analysis."""
        num_photos = len(image_bytes)
        log = logger.bind(operation="analyze", num_photos=num_photos)

        async def _progress(data: dict) -> None:
            if on_progress:
                await on_progress(data)

        # Stage A: Local metadata extraction (no AI, instant)
        log.info("stage_a_start")
        t0 = time.perf_counter()
        await _progress({"stage": "metadata", "message": "Reading photo metadata...", "progress": 2})
        metadata_list = await extract_photo_metadata(image_bytes, mime_types)
        metadata_dicts = [m.model_dump() for m in metadata_list]
        dates_found = sum(1 for m in metadata_dicts if m.get("exif_date"))
        orientations: dict[str, int] = {}
        for m in metadata_dicts:
            o = m.get("orientation", "unknown")
            orientations[o] = orientations.get(o, 0) + 1
        log.info(
            "stage_a_complete",
            duration_ms=round((time.perf_counter() - t0) * 1000, 1),
            dates_found=dates_found,
            orientations=orientations,
        )
        await _progress({"stage": "metadata", "message": "Metadata extracted", "progress": 5})

        # Stage A1: Quality scoring (local, instant)
        log.info("stage_a1_start")
        t0 = time.perf_counter()
        await _progress({"stage": "scoring", "message": "Scoring photo quality...", "progress": 5})
        quality_scores = score_photos(metadata_list)
        log.info("stage_a1_complete", duration_ms=round((time.perf_counter() - t0) * 1000, 1))

        # Stage A2: Duplicate detection (local, instant)
        log.info("stage_a2_start")
        t0 = time.perf_counter()
        await _progress({"stage": "dedup", "message": "Detecting duplicates...", "progress": 6})
        duplicate_groups = detect_duplicates(metadata_list)
        log.info(
            "stage_a2_complete",
            duration_ms=round((time.perf_counter() - t0) * 1000, 1),
            num_duplicate_groups=len(duplicate_groups),
        )

        # Stage A3: Image comparison (optional, non-critical)
        image_relationships = None
        if self._image_comparator and num_photos >= 2:
            log.info("stage_a3_start")
            t0 = time.perf_counter()
            await _progress({"stage": "comparing", "message": "Comparing images...", "progress": 6})
            try:
                image_data = list(zip(image_bytes, mime_types))
                image_relationships = await self._image_comparator.compare_images(
                    image_data, metadata_list,
                )
                log.info(
                    "stage_a3_complete",
                    duration_ms=round((time.perf_counter() - t0) * 1000, 1),
                    num_pairs=len(image_relationships.pairs),
                    num_clusters=len(image_relationships.clusters),
                )
            except Exception:
                log.warning("stage_a3_failed", exc_info=True)
                image_relationships = None
            await _progress({"stage": "comparing", "message": "Image comparison complete", "progress": 7})

        # Stage B: AI Photo Analysis + Clustering (batched for large sets)
        await _progress({"stage": "analyzing", "message": "Analyzing your photos...", "progress": 8, "current": 0, "total": num_photos})
        log.info("stage_b_start")
        t0 = time.perf_counter()
        photo_analyses_raw, clusters = await self._run_photo_analysis(
            image_bytes, mime_types, metadata_dicts, num_photos, on_progress=on_progress,
        )

        # Ensure we have analyses for all photos
        if len(photo_analyses_raw) < num_photos:
            for i in range(len(photo_analyses_raw), num_photos):
                photo_analyses_raw.append({
                    "photo_index": i,
                    "description": f"Photo {i + 1}",
                    "scene_type": "casual",
                    "emotion": "happy",
                    "people_count": 0,
                    "tags": [],
                    "suggested_caption": "",
                    "story_relevance": "",
                    "cluster_id": 0,
                    "hero_candidate": False,
                    "date_confidence": 0.0,
                })

        # Merge local metadata into analyses
        for a in photo_analyses_raw:
            idx = a.get("photo_index", 0)
            if idx < len(metadata_dicts):
                m = metadata_dicts[idx]
                a.setdefault("aspect_ratio", m.get("aspect_ratio", 1.0))
                if m.get("exif_date") and a.get("date_confidence", 0) < m.get("date_confidence", 0):
                    a["estimated_date_hint"] = m["exif_date"]
                    a["date_confidence"] = m["date_confidence"]

        # Merge quality scores into analyses
        quality_map = {s.photo_index: s for s in quality_scores}
        for a in photo_analyses_raw:
            idx = a.get("photo_index", 0)
            qs = quality_map.get(idx)
            if qs:
                a.setdefault("quality_score", qs.overall)
                a.setdefault("is_book_worthy", qs.is_book_worthy)
                a.setdefault("book_worthiness_reason", qs.reason)

        # Merge duplicate info into analyses
        duplicate_indices: set[int] = set()
        duplicate_best_map: dict[int, int] = {}
        for group in duplicate_groups:
            for idx in group.photo_indices:
                if idx != group.best_index:
                    duplicate_indices.add(idx)
                    duplicate_best_map[idx] = group.best_index
        for a in photo_analyses_raw:
            idx = a.get("photo_index", 0)
            if idx in duplicate_indices:
                a["is_duplicate"] = True
                a["duplicate_of"] = duplicate_best_map.get(idx)

        # Merge image comparison results into analyses if available
        if image_relationships and image_relationships.clusters:
            log.info(
                "merging_comparison_clusters",
                num_clusters=len(image_relationships.clusters),
            )
            for cluster_idx, cluster_members in enumerate(image_relationships.clusters):
                for member_idx in cluster_members:
                    for a in photo_analyses_raw:
                        if a.get("photo_index") == member_idx:
                            a.setdefault("image_comparison_cluster", cluster_idx)

            for cluster_idx, cluster_members in enumerate(image_relationships.clusters):
                clusters.append({
                    "cluster_id": f"img_cmp_{cluster_idx}",
                    "label_guess": "visually related",
                    "image_ids": cluster_members,
                    "cohesion_score": 0.8,
                    "notes": "Detected by image comparison",
                })

        log.info(
            "stage_b_complete",
            duration_ms=round((time.perf_counter() - t0) * 1000, 1),
            num_analyses=len(photo_analyses_raw),
            num_clusters=len(clusters),
        )
        await _progress({"stage": "analyzing", "message": "Photo analysis complete", "progress": 40})

        return AnalyzeResult(
            photo_analyses=photo_analyses_raw,
            clusters=clusters,
            quality_scores=quality_scores,
            duplicate_groups=duplicate_groups,
            metadata=metadata_dicts,
            num_photos=num_photos,
        )

    async def plan(
        self,
        request: BookGenerationRequest,
        analyze_result: AnalyzeResult,
        on_progress: "Callable[[dict], Any] | None" = None,
    ) -> PlanResult:
        """Stage C: Plan book structure from cached analysis results."""
        log = logger.bind(operation="plan", num_photos=analyze_result.num_photos)

        async def _progress(data: dict) -> None:
            if on_progress:
                await on_progress(data)

        log.info("stage_c_start")
        t0 = time.perf_counter()
        await _progress({"stage": "planning", "message": "Planning your book layout...", "progress": 45})

        quality_score_dicts = [s.model_dump() for s in analyze_result.quality_scores] if analyze_result.quality_scores else None
        planning_prompt = self._builder.build_planning_prompt(
            request, analyze_result.photo_analyses, analyze_result.clusters, quality_score_dicts,
        )
        log.info("stage_c_ai_call", prompt_chars=len(planning_prompt))
        plan_ai_result = await self._ai.generate_content(
            planning_prompt, [], [], max_output_tokens=16384,
        )
        log.info("stage_c_ai_response", response_chars=len(plan_ai_result.text))
        plan_dict = self._parser.parse_plan(plan_ai_result.text)
        num_plan_spreads = sum(len(ch.get("spreads", [])) for ch in plan_dict.get("chapters", []))
        log.info(
            "stage_c_complete",
            duration_ms=round((time.perf_counter() - t0) * 1000, 1),
            num_plan_chapters=len(plan_dict.get("chapters", [])),
            num_plan_spreads=num_plan_spreads,
        )

        return PlanResult(
            plan=plan_dict,
            estimated_pages=num_plan_spreads + 4,  # spreads + cover/dedication/toc/closing
            num_chapters=len(plan_dict.get("chapters", [])),
            num_spreads=num_plan_spreads,
        )

    async def write(
        self,
        request: BookGenerationRequest,
        plan_result: PlanResult,
        analyze_result: AnalyzeResult,
        template_config: dict,
        on_progress: "Callable[[dict], Any] | None" = None,
    ) -> MemoryBookDraft:
        """Stage D: Write all narrative text using the plan and analysis."""
        num_photos = analyze_result.num_photos
        log = logger.bind(operation="write", num_photos=num_photos)

        async def _progress(data: dict) -> None:
            if on_progress:
                await on_progress(data)

        log.info("stage_d_start")
        t0 = time.perf_counter()
        await _progress({"stage": "writing", "message": "Crafting your story...", "progress": 60})
        writing_prompt = self._builder.build_writing_prompt(
            request, plan_result.plan, analyze_result.photo_analyses,
        )
        log.info("stage_d_ai_call", prompt_chars=len(writing_prompt))
        writing_result = await self._ai.generate_content(
            writing_prompt, [], [], max_output_tokens=65536,
        )
        log.info("stage_d_ai_response", response_chars=len(writing_result.text))
        await _progress({"stage": "writing", "message": "Finalizing your story...", "progress": 70})
        draft = self._parser.parse_narrative(writing_result.text, num_photos, analyze_result.photo_analyses)

        # If decomposed pipeline produced poor results, fall back to single-pass
        if len(draft.chapters) <= 1 and num_photos > 4:
            log.warning("decomposed_pipeline_fallback", num_chapters=len(draft.chapters))
            await _progress({"stage": "writing", "message": "Refining your story...", "progress": 75})
            structure_guide = get_structure_template(request.structure_template) or {}
            narrative_prompt = self._builder.build_narrative_prompt(
                request, analyze_result.photo_analyses, analyze_result.clusters,
                structure_guide, template_config,
            )
            narrative_result = await self._ai.generate_content(
                narrative_prompt, [], [], max_output_tokens=self._STAGE_B_MAX_TOKENS,
            )
            draft_fallback = self._parser.parse_narrative(
                narrative_result.text, num_photos, analyze_result.photo_analyses,
            )
            if len(draft_fallback.chapters) > len(draft.chapters):
                log.info("single_pass_fallback_succeeded", num_chapters=len(draft_fallback.chapters))
                draft = draft_fallback

        log.info(
            "stage_d_complete",
            duration_ms=round((time.perf_counter() - t0) * 1000, 1),
            num_chapters=len(draft.chapters),
            num_pages=len(draft.pages),
            title=draft.title,
        )

        await _progress({
            "stage": "building",
            "message": f"Building {len(draft.pages)} pages...",
            "progress": 90,
            "totalPages": len(draft.pages),
        })
        await _progress({"stage": "finalizing", "message": "Your book is ready!", "progress": 99, "totalPages": len(draft.pages)})

        return draft

    async def generate(
        self,
        request: BookGenerationRequest,
        image_bytes: list[bytes],
        mime_types: list[str],
        template_config: dict,
        on_progress: "Callable[[dict], Any] | None" = None,
    ) -> BookGenerationResponse:
        """Full pipeline: analyze → plan → write. Backward-compatible wrapper."""
        # Stage A + B
        analyze_result = await self.analyze(image_bytes, mime_types, on_progress)

        # Stage C
        plan_result = await self.plan(request, analyze_result, on_progress)

        # Stage D
        draft = await self.write(request, plan_result, analyze_result, template_config, on_progress)

        photo_analyses = [PhotoAnalysis(**a) for a in analyze_result.photo_analyses]

        return BookGenerationResponse(
            draft=draft,
            photo_analyses=photo_analyses,
            estimated_pages=len(draft.pages),
            quality_scores=analyze_result.quality_scores,
            duplicate_groups=analyze_result.duplicate_groups,
        )

    async def generate_questions(
        self,
        image_bytes: list[bytes],
        mime_types: list[str],
        partner_names: list[str],
        relationship_type: str,
        locale: str = "en",
    ) -> list[dict]:
        """Run Stage A + B, then generate contextual questions."""
        num_photos = len(image_bytes)

        # Stage A
        metadata_list = await extract_photo_metadata(image_bytes, mime_types)
        metadata_dicts = [m.model_dump() for m in metadata_list]

        # Stage B (batched)
        logger.info("generating_questions", num_photos=num_photos)
        photo_analyses_raw, _ = await self._run_photo_analysis(
            image_bytes, mime_types, metadata_dicts, num_photos,
        )

        # Build and send questions prompt
        questions_prompt = self._builder.build_questions_prompt(
            photo_analyses_raw, partner_names, relationship_type, locale=locale,
        )
        questions_result = await self._ai.generate_content(questions_prompt, [], [])
        return self._parser.parse_questions(questions_result.text)

    async def generate_image(
        self,
        prompt: str,
        style_hint: str,
        image_look: str,
    ) -> bytes:
        full_prompt = self._builder.build_image_generation_prompt(
            prompt, style_hint, image_look,
        )
        return await self._enhancer.generate_image_from_text(full_prompt)

    async def regenerate_text(self, request: RegenerateTextRequest) -> str:
        prompt = self._builder.build_regenerate_text_prompt(request)
        result = await self._ai.generate_content(prompt, [], [])
        return self._parser.parse_regenerated_text(result.text)

    async def enhance_image(
        self,
        image_bytes: bytes,
        mime_type: str,
        style_hint: str,
        image_look: str,
        vibe: str,
        context: str,
    ) -> bytes:
        logger.info("enhance_image_start", image_look=image_look, vibe=vibe)
        return await self._enhancer.enhance_photo(
            image_bytes=image_bytes,
            mime_type=mime_type,
            style=style_hint,
            vibe=vibe,
            context=context,
            image_look=image_look,
        )

    async def generate_cartoon(
        self,
        image_bytes: bytes,
        mime_type: str,
        style: str,
    ) -> bytes:
        return await self._enhancer.generate_cartoon(image_bytes, mime_type, style)

    async def generate_pdf(
        self,
        draft: MemoryBookDraft,
        photo_data: dict[int, bytes],
        template_config: dict,
        design_scale: dict | None = None,
        photo_analyses: list[dict] | None = None,
        overrides: dict | None = None,
        on_progress=None,
    ) -> bytes:
        return await self._pdf_gen.generate(draft, photo_data, template_config, design_scale, photo_analyses, overrides, on_progress)

    # ── Private helpers ──────────────────────────────────────────────────

    @property
    def _BATCH_SIZE(self) -> int:
        return self._settings.batch_size

    @property
    def _STAGE_B_MAX_TOKENS(self) -> int:
        return self._settings.stage_b_max_tokens

    async def _run_photo_analysis(
        self,
        image_bytes: list[bytes],
        mime_types: list[str],
        metadata_dicts: list[dict],
        num_photos: int,
        on_progress: "Callable[[dict], Any] | None" = None,
    ) -> tuple[list[dict], list[dict]]:
        """Run Stage B photo analysis, batching if >10 photos."""
        if num_photos <= self._BATCH_SIZE:
            return await self._run_single_analysis(
                image_bytes, mime_types, metadata_dicts, num_photos, offset=0,
            )

        # Batch into chunks
        all_analyses: list[dict] = []
        all_raw_texts: list[str] = []
        total_batches = (num_photos + self._BATCH_SIZE - 1) // self._BATCH_SIZE
        batch_num = 0
        for start in range(0, num_photos, self._BATCH_SIZE):
            end = min(start + self._BATCH_SIZE, num_photos)
            batch_size = end - start
            batch_num += 1
            logger.info(
                "stage_b_batch",
                batch_num=batch_num,
                total_batches=total_batches,
                photo_start=start,
                photo_end=end - 1,
                batch_size=batch_size,
            )

            if on_progress:
                # Scale progress from 8 to 40 across batches
                batch_progress = 8 + int(32 * (batch_num - 1) / total_batches)
                await on_progress({
                    "stage": "analyzing",
                    "message": f"Analyzing photos {start + 1}-{end} of {num_photos}...",
                    "progress": batch_progress,
                    "current": start,
                    "total": num_photos,
                })

            batch_analyses, _ = await self._run_single_analysis(
                image_bytes[start:end],
                mime_types[start:end],
                metadata_dicts[start:end],
                batch_size,
                offset=start,
            )
            all_analyses.extend(batch_analyses)

        logger.info(
            "stage_b_batches_complete",
            total_analyses=len(all_analyses),
            total_batches=total_batches,
        )

        clusters = self._parser.extract_clusters_from_analyses(all_analyses)
        logger.info("stage_b_clusters_extracted", num_clusters=len(clusters))
        return all_analyses, clusters

    async def _run_single_analysis(
        self,
        image_bytes: list[bytes],
        mime_types: list[str],
        metadata_dicts: list[dict],
        num_photos: int,
        offset: int = 0,
    ) -> tuple[list[dict], list[dict]]:
        """Run Stage B for a single batch of photos."""
        # Keep metadata indices local (0-based within this batch)
        # so the prompt's "indexed 0 to N-1" matches the metadata
        local_meta = []
        for i, m in enumerate(metadata_dicts):
            local_meta.append({**m, "photo_index": i})

        analysis_prompt = self._builder.build_photo_analysis_prompt(num_photos, local_meta)
        analysis_result = await self._ai.generate_content(
            analysis_prompt, image_bytes, mime_types,
            max_output_tokens=self._STAGE_B_MAX_TOKENS,
        )
        logger.info(
            "stage_b_ai_response",
            response_length=len(analysis_result.text),
            offset=offset,
        )

        photo_analyses_raw = self._parser.parse_photo_analysis(analysis_result.text)
        logger.info("stage_b_parsed", num_analyses=len(photo_analyses_raw), offset=offset)

        # Adjust photo_index from local batch indices to global indices
        if offset > 0:
            for a in photo_analyses_raw:
                a["photo_index"] = a.get("photo_index", 0) + offset

        clusters = self._extract_clusters(analysis_result.text, photo_analyses_raw)
        logger.info("stage_b_clusters", num_clusters=len(clusters), offset=offset)
        return photo_analyses_raw, clusters

    def _extract_clusters(self, raw_text: str, analyses: list[dict]) -> list[dict]:
        """Try to extract clusters from AI response, fall back to grouping by cluster_id."""
        clusters = self._parser.parse_clusters_from_analysis(raw_text)
        if clusters:
            return clusters
        return self._parser.extract_clusters_from_analyses(analyses)
