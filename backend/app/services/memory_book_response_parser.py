"""Slim facade that implements AbstractResponseParser by delegating to the parsing subpackage."""

import json
import re

import structlog
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

logger = structlog.get_logger()


class MemoryBookResponseParser(AbstractResponseParser):
    """Parses Gemini responses into memory book structures."""

    # ── Public API (unchanged) ──────────────────────────────────────────

    def parse_photo_analysis(self, raw_text: str) -> list[dict]:
        try:
            json_str = extract_json(raw_text)
            data = json.loads(json_str)
            return self._extract_photo_list(data)
        except Exception:
            logger.warning("parse_photo_analysis_failed_initial")
            try:
                json_str = extract_json(raw_text)
                repaired = repair_json(json_str)
                data = json.loads(repaired)
                result = self._extract_photo_list(data)
                logger.info("parse_photo_analysis_repair_succeeded", item_count=len(result))
                return result
            except Exception:
                logger.error("parse_photo_analysis_repair_failed", exc_info=True)
                return []

    @staticmethod
    def _extract_photo_list(data) -> list[dict]:
        """Extract photo list from various JSON shapes."""
        if isinstance(data, list):
            logger.info("parse_photo_analysis_success", item_count=len(data), shape="list")
            return data
        if isinstance(data, dict):
            if "photos" in data:
                logger.info("parse_photo_analysis_success", item_count=len(data["photos"]), shape="dict.photos")
                return data["photos"]
            if "photo_index" in data:
                logger.info("parse_photo_analysis_success", item_count=1, shape="single_object")
                return [data]
        logger.warning("parse_photo_analysis_unexpected_shape")
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
                try:
                    cluster_map.setdefault(int(cid), []).append(a)
                except (TypeError, ValueError):
                    # Non-numeric cluster_id (e.g., "park_scene") — hash to int
                    cluster_map.setdefault(hash(str(cid)) % 10000, []).append(a)

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
            logger.warning("parse_narrative_json_failed")
            try:
                json_str = extract_json(raw_text)
                repaired = repair_json(json_str)
                data = json.loads(repaired)
                logger.info("parse_narrative_repair_succeeded")
                return self._build_draft_from_data(data, num_photos)
            except Exception:
                logger.warning("parse_narrative_repair_failed_partial")
                return self._partial_parse(raw_text, num_photos, photo_analyses)
        except Exception:
            logger.error("parse_narrative_failed", exc_info=True)
            return self._partial_parse(raw_text, num_photos, photo_analyses)

    def parse_plan(self, raw_text: str) -> dict:
        """Parse structural plan from Stage C. Strip reasoning field."""
        try:
            json_str = extract_json(raw_text)
            data = json.loads(json_str)
            if isinstance(data, dict):
                # Remove reasoning field (chain-of-thought) from output
                data.pop("reasoning", None)
                return data
        except Exception:
            logger.warning("parse_plan_initial_failed")
            try:
                json_str = extract_json(raw_text)
                repaired = repair_json(json_str)
                data = json.loads(repaired)
                if isinstance(data, dict):
                    data.pop("reasoning", None)
                    return data
            except Exception:
                logger.error("parse_plan_repair_failed", exc_info=True)
        return {"chapters": []}

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
            "parse_narrative_success",
            title=draft.title,
            num_chapters=len(draft.chapters),
            num_pages=len(draft.pages),
        )
        return draft

    def _partial_parse(
        self,
        raw_text: str,
        num_photos: int,
        photo_analyses: list[dict] | None = None,
    ) -> MemoryBookDraft:
        logger.info("partial_parse_attempting")
        try:
            json_str = extract_json(raw_text)
            repaired = repair_json(json_str)

            title_match = re.search(r'"title"\s*:\s*"([^"]*)"', repaired)
            title = title_match.group(1) if title_match else None

            subtitle_match = re.search(r'"subtitle"\s*:\s*"([^"]*)"', repaired)
            subtitle = subtitle_match.group(1) if subtitle_match else ""

            chapters_match = re.search(r'"chapters"\s*:\s*(\[[\s\S]*?\])\s*[,}]', repaired)
            chapters = []
            if chapters_match:
                try:
                    chapters_text = repair_json(chapters_match.group(1))
                    chapters_data = json.loads(chapters_text)
                    chapters = parse_chapters({"chapters": chapters_data})
                except Exception:
                    logger.warning("partial_parse_chapters_failed")

            if title and chapters:
                logger.info("partial_parse_recovered", title=title, num_chapters=len(chapters))
                pages = flatten_chapters_to_pages(chapters, {"title": title})
                return MemoryBookDraft(
                    title=title,
                    subtitle=subtitle,
                    pages=pages,
                    chapters=chapters,
                )

            if title:
                logger.info("partial_parse_title_only", title=title)
                fb = fallback(num_photos, photo_analyses)
                fb.title = title
                fb.subtitle = subtitle
                return fb

        except Exception:
            logger.warning("partial_parse_failed", exc_info=True)

        logger.warning("partial_parse_using_fallback")
        return fallback(num_photos, photo_analyses)
