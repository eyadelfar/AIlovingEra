"""Slim facade that implements AbstractResponseParser by delegating to the parsing subpackage."""

import json
import logging
import re

from app.interfaces.response_parser import AbstractResponseParser
from app.models.schemas import (
    CoverOption,
    DesignInstructions,
    LongformTextBlock,
    MemoryBookDraft,
    MemoryPageDraft,
    PhotoCluster,
    SmartQuestion,
    SystemNotes,
    normalize_layout,
)
from app.services.parsing.chapter_parser import parse_chapters, safe_str
from app.services.parsing.fallback_builder import fallback
from app.services.parsing.json_extractor import extract_json, repair_json
from app.services.parsing.page_flattener import flatten_chapters_to_pages

logger = logging.getLogger(__name__)


class MemoryBookResponseParser(AbstractResponseParser):
    """Parses Gemini responses into memory book structures."""

    # ── Public API (unchanged) ──────────────────────────────────────────

    def parse_photo_analysis(self, raw_text: str) -> list[dict]:
        try:
            json_str = extract_json(raw_text)
            data = json.loads(json_str)
            return self._extract_photo_list(data)
        except Exception:
            logger.warning("parse_photo_analysis: initial parse failed, trying repair")
            try:
                json_str = extract_json(raw_text)
                repaired = repair_json(json_str)
                data = json.loads(repaired)
                result = self._extract_photo_list(data)
                logger.info("parse_photo_analysis: repair succeeded, %d items", len(result))
                return result
            except Exception:
                logger.error("parse_photo_analysis: repair also FAILED", exc_info=True)
                return []

    @staticmethod
    def _extract_photo_list(data) -> list[dict]:
        """Extract photo list from various JSON shapes."""
        if isinstance(data, list):
            logger.info("parse_photo_analysis: success, %d items (list)", len(data))
            return data
        if isinstance(data, dict):
            if "photos" in data:
                logger.info("parse_photo_analysis: success, %d items", len(data["photos"]))
                return data["photos"]
            if "photo_index" in data:
                logger.info("parse_photo_analysis: success, 1 item (single object)")
                return [data]
        logger.warning("parse_photo_analysis: parsed JSON but unexpected shape")
        return []

    def parse_clusters_from_analysis(self, raw_text: str) -> list[dict]:
        try:
            json_str = extract_json(raw_text)
            data = json.loads(json_str)
            if isinstance(data, dict) and "clusters" in data:
                return data["clusters"]
        except Exception:
            pass
        return []

    def extract_clusters_from_analyses(self, analyses: list[dict]) -> list[dict]:
        cluster_map: dict[int, list[dict]] = {}
        for a in analyses:
            cid = a.get("cluster_id")
            if cid is not None:
                cluster_map.setdefault(int(cid), []).append(a)

        clusters: list[dict] = []
        for cid, members in sorted(cluster_map.items()):
            hero_candidates = [
                a["photo_index"] for a in members if a.get("hero_candidate")
            ]
            clusters.append({
                "cluster_id": str(cid),
                "label_guess": "unknown",
                "label_confidence": 0.0,
                "time_range": {},
                "image_ids": [a["photo_index"] for a in members],
                "hero_candidates": hero_candidates,
                "cohesion_score": 0.0,
                "notes": "",
            })
        return clusters

    def parse_narrative(
        self,
        raw_text: str,
        num_photos: int,
        photo_analyses: list[dict] | None = None,
    ) -> MemoryBookDraft:
        try:
            json_str = extract_json(raw_text)
            data = json.loads(json_str)
            return self._build_draft_from_data(data, num_photos)
        except json.JSONDecodeError:
            logger.warning("parse_narrative: initial JSON parse failed, trying repair")
            try:
                json_str = extract_json(raw_text)
                repaired = repair_json(json_str)
                data = json.loads(repaired)
                logger.info("parse_narrative: repair succeeded")
                return self._build_draft_from_data(data, num_photos)
            except Exception:
                logger.warning("parse_narrative: repair failed, trying partial parse")
                return self._partial_parse(raw_text, num_photos, photo_analyses)
        except Exception:
            logger.error("parse_narrative: FAILED", exc_info=True)
            return self._partial_parse(raw_text, num_photos, photo_analyses)

    def parse_questions(self, raw_text: str) -> list[dict]:
        try:
            json_str = extract_json(raw_text)
            data = json.loads(json_str)
            if isinstance(data, list):
                return data
            if isinstance(data, dict) and "questions" in data:
                return data["questions"]
            return []
        except Exception:
            return []

    def parse_regenerated_text(self, raw_text: str) -> str:
        text = raw_text.strip()
        if (text.startswith('"') and text.endswith('"')) or (text.startswith("'") and text.endswith("'")):
            text = text[1:-1]
        return text

    # ── Private helpers ─────────────────────────────────────────────────

    def _build_draft_from_data(self, data: dict, num_photos: int) -> MemoryBookDraft:
        chapters = parse_chapters(data)

        longform_blocks = [
            LongformTextBlock(**b)
            for b in data.get("longform_blocks", [])
        ]

        pages = []
        for p in data.get("pages", []):
            safe_p = {**p, "layout_type": normalize_layout(p.get("layout_type", "HERO_FULLBLEED"))}
            for tf in ("heading_text", "body_text", "caption_text", "quote_text"):
                if tf in safe_p:
                    safe_p[tf] = safe_str(safe_p[tf])
            pages.append(MemoryPageDraft(**safe_p))

        if not pages and chapters:
            pages = flatten_chapters_to_pages(chapters, data)

        title_options = data.get("titles", [])
        covers = [CoverOption(**c) for c in data.get("covers", [])]
        closing_page = data.get("closing_page", {})

        clusters = [
            PhotoCluster(**c) if isinstance(c, dict) else c
            for c in data.get("clusters", [])
        ]

        questions_for_user = [
            SmartQuestion(**q)
            for q in data.get("questions_for_user", [])
        ]

        design_instructions = None
        if "design_instructions" in data and data["design_instructions"]:
            design_instructions = DesignInstructions(**data["design_instructions"])

        notes_for_system = None
        if "notes_for_system" in data and data["notes_for_system"]:
            notes_for_system = SystemNotes(**data["notes_for_system"])

        confidence = {}
        metadata = data.get("metadata", {})
        if isinstance(metadata, dict):
            confidence = metadata.get("confidence", {})

        ded_page = data.get("dedication_page")
        ded_text = data.get("dedication")
        if ded_text is None and isinstance(ded_page, dict):
            ded_text = ded_page.get("text", "")

        draft = MemoryBookDraft(
            title=safe_str(data.get("title"), "Our Memory Book"),
            subtitle=safe_str(data.get("subtitle")),
            dedication=safe_str(ded_text),
            overall_narrative=safe_str(data.get("overall_narrative")),
            pages=pages,
            chapters=chapters,
            longform_blocks=longform_blocks,
            love_letter_text=safe_str(data.get("love_letter_text")),
            audio_qr_chapter_labels=data.get("audio_qr_chapter_labels", []),
            anniversary_cover_text=safe_str(data.get("anniversary_cover_text")),
            mini_reel_frames=data.get("mini_reel_frames", []),
            edit_suggestions=data.get("edit_suggestions", []),
            vibe=metadata.get("vibe", ""),
            structure_template=metadata.get("template", ""),
            title_options=title_options,
            covers=covers,
            closing_page=closing_page,
            clusters=clusters,
            questions_for_user=questions_for_user,
            design_instructions=design_instructions,
            notes_for_system=notes_for_system,
            confidence=confidence,
        )
        logger.info(
            "parse_narrative: success — title=%r, %d chapters, %d pages",
            draft.title, len(draft.chapters), len(draft.pages),
        )
        return draft

    def _partial_parse(
        self,
        raw_text: str,
        num_photos: int,
        photo_analyses: list[dict] | None = None,
    ) -> MemoryBookDraft:
        logger.info("_partial_parse: attempting field-by-field extraction")
        try:
            json_str = extract_json(raw_text)
            repaired = repair_json(json_str)

            title_match = re.search(r'"title"\s*:\s*"([^"]*)"', repaired)
            title = title_match.group(1) if title_match else None

            subtitle_match = re.search(r'"subtitle"\s*:\s*"([^"]*)"', repaired)
            subtitle = subtitle_match.group(1) if subtitle_match else ""

            chapters_match = re.search(r'"chapters"\s*:\s*(\[[\s\S]*\])', repaired)
            chapters = []
            if chapters_match:
                try:
                    chapters_text = repair_json(chapters_match.group(1))
                    chapters_data = json.loads(chapters_text)
                    chapters = parse_chapters({"chapters": chapters_data})
                except Exception:
                    logger.warning("_partial_parse: chapters extraction failed")

            if title and chapters:
                logger.info("_partial_parse: recovered title=%r, %d chapters", title, len(chapters))
                pages = flatten_chapters_to_pages(chapters, {"title": title})
                return MemoryBookDraft(
                    title=title,
                    subtitle=subtitle,
                    pages=pages,
                    chapters=chapters,
                )

            if title:
                logger.info("_partial_parse: recovered title only, using fallback chapters")
                fb = fallback(num_photos, photo_analyses)
                fb.title = title
                fb.subtitle = subtitle
                return fb

        except Exception:
            logger.warning("_partial_parse: failed entirely", exc_info=True)

        logger.warning("_partial_parse: falling back to generic fallback")
        return fallback(num_photos, photo_analyses)
