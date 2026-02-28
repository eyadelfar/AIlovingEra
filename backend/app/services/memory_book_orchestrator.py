import logging

from app.config import Settings
from app.interfaces.ai_service import AbstractAIService
from app.interfaces.image_enhancer import AbstractImageEnhancer
from app.interfaces.pdf_generator import AbstractPdfGenerator
from app.interfaces.prompt_builder import AbstractPromptBuilder
from app.interfaces.response_parser import AbstractResponseParser
from app.models.schemas import (
    BookGenerationRequest,
    BookGenerationResponse,
    MemoryBookDraft,
    PhotoAnalysis,
    RegenerateTextRequest,
)
from app.services.photo_metadata_extractor import extract_photo_metadata
from app.services.template_service import get_structure_template

logger = logging.getLogger(__name__)


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
    ) -> None:
        self._ai = ai
        self._builder = builder
        self._parser = parser
        self._enhancer = image_enhancer
        self._pdf_gen = pdf_generator
        self._settings = settings or Settings()

    async def generate(
        self,
        request: BookGenerationRequest,
        image_bytes: list[bytes],
        mime_types: list[str],
        template_config: dict,
    ) -> BookGenerationResponse:
        num_photos = len(image_bytes)

        # Stage A: Local metadata extraction (no AI, instant)
        logger.info("Stage A: Extracting metadata for %d photos", num_photos)
        metadata_list = await extract_photo_metadata(image_bytes, mime_types)
        metadata_dicts = [m.model_dump() for m in metadata_list]
        dates_found = sum(1 for m in metadata_dicts if m.get("exif_date"))
        orientations = {}
        for m in metadata_dicts:
            o = m.get("orientation", "unknown")
            orientations[o] = orientations.get(o, 0) + 1
        logger.info("Stage A done: %d dates found, orientations=%s", dates_found, orientations)

        # Stage B: AI Photo Analysis + Clustering (batched for large sets)
        photo_analyses_raw, clusters = await self._run_photo_analysis(
            image_bytes, mime_types, metadata_dicts, num_photos,
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

        # Stage D+E: Full Book Plan Generation
        logger.info("Stage D+E: Generating book plan")
        structure_guide = get_structure_template(request.structure_template) or {}
        narrative_prompt = self._builder.build_narrative_prompt(
            request, photo_analyses_raw, clusters, structure_guide, template_config
        )
        narrative_result = await self._ai.generate_content(
            narrative_prompt, [], [], max_output_tokens=self._STAGE_B_MAX_TOKENS,
        )
        logger.info(
            "Stage D+E raw response: length=%d, first 1000 chars: %s",
            len(narrative_result.text),
            narrative_result.text[:1000],
        )
        draft = self._parser.parse_narrative(narrative_result.text, num_photos, photo_analyses_raw)
        logger.info(
            "Stage D+E parsed: %d chapters, %d pages, title=%r, fallback=%s",
            len(draft.chapters),
            len(draft.pages),
            draft.title,
            draft.title == "Our Memory Book" and len(draft.chapters) <= 1,
        )

        # Post-parse validation: retry once if single chapter with many photos
        if len(draft.chapters) <= 1 and num_photos > 4:
            logger.warning(
                "Only %d chapter(s) for %d photos — retrying narrative generation once",
                len(draft.chapters), num_photos,
            )
            narrative_result_retry = await self._ai.generate_content(
                narrative_prompt, [], [], max_output_tokens=self._STAGE_B_MAX_TOKENS,
            )
            draft_retry = self._parser.parse_narrative(narrative_result_retry.text, num_photos, photo_analyses_raw)
            if len(draft_retry.chapters) > len(draft.chapters):
                logger.info("Retry succeeded: %d chapters", len(draft_retry.chapters))
                draft = draft_retry
            else:
                logger.warning("Retry did not improve chapter count, keeping original")

        photo_analyses = [PhotoAnalysis(**a) for a in photo_analyses_raw]

        return BookGenerationResponse(
            draft=draft,
            photo_analyses=photo_analyses,
            estimated_pages=len(draft.pages),
        )

    async def generate_questions(
        self,
        image_bytes: list[bytes],
        mime_types: list[str],
        partner_names: list[str],
        relationship_type: str,
    ) -> list[dict]:
        """Run Stage A + B, then generate contextual questions."""
        num_photos = len(image_bytes)

        # Stage A
        metadata_list = await extract_photo_metadata(image_bytes, mime_types)
        metadata_dicts = [m.model_dump() for m in metadata_list]

        # Stage B (batched)
        logger.info("Generating questions: analyzing %d photos", num_photos)
        photo_analyses_raw, _ = await self._run_photo_analysis(
            image_bytes, mime_types, metadata_dicts, num_photos,
        )

        # Build and send questions prompt
        questions_prompt = self._builder.build_questions_prompt(
            photo_analyses_raw, partner_names, relationship_type,
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
        logger.info("Enhancing image: look=%s, vibe=%s", image_look, vibe)
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
    ) -> bytes:
        return await self._pdf_gen.generate(draft, photo_data, template_config, design_scale, photo_analyses)

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
    ) -> tuple[list[dict], list[dict]]:
        """Run Stage B photo analysis, batching if >10 photos."""
        if num_photos <= self._BATCH_SIZE:
            return await self._run_single_analysis(
                image_bytes, mime_types, metadata_dicts, num_photos, offset=0,
            )

        # Batch into chunks
        all_analyses: list[dict] = []
        all_raw_texts: list[str] = []
        for start in range(0, num_photos, self._BATCH_SIZE):
            end = min(start + self._BATCH_SIZE, num_photos)
            batch_size = end - start
            logger.info("Stage B batch: photos %d-%d (%d photos)", start, end - 1, batch_size)

            batch_analyses, _ = await self._run_single_analysis(
                image_bytes[start:end],
                mime_types[start:end],
                metadata_dicts[start:end],
                batch_size,
                offset=start,
            )
            all_analyses.extend(batch_analyses)

        logger.info("Stage B total parsed: %d photo analyses from %d batches",
                     len(all_analyses), (num_photos + self._BATCH_SIZE - 1) // self._BATCH_SIZE)

        clusters = self._parser.extract_clusters_from_analyses(all_analyses)
        logger.info("Stage B clusters: %d clusters extracted", len(clusters))
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
            "Stage B raw response: length=%d, first 500 chars: %s",
            len(analysis_result.text),
            analysis_result.text[:500],
        )

        photo_analyses_raw = self._parser.parse_photo_analysis(analysis_result.text)
        logger.info("Stage B parsed: %d photo analyses", len(photo_analyses_raw))

        # Adjust photo_index from local batch indices to global indices
        if offset > 0:
            for a in photo_analyses_raw:
                a["photo_index"] = a.get("photo_index", 0) + offset

        clusters = self._extract_clusters(analysis_result.text, photo_analyses_raw)
        logger.info("Stage B clusters: %d clusters extracted", len(clusters))
        return photo_analyses_raw, clusters

    def _extract_clusters(self, raw_text: str, analyses: list[dict]) -> list[dict]:
        """Try to extract clusters from AI response, fall back to grouping by cluster_id."""
        clusters = self._parser.parse_clusters_from_analysis(raw_text)
        if clusters:
            return clusters
        return self._parser.extract_clusters_from_analyses(analyses)

