import json
import re

from app.interfaces.response_parser import AbstractResponseParser
from app.models.schemas import ComicBook, ComicPage, ComicPanel


class ComicResponseParser(AbstractResponseParser):
    """Parses raw Gemini Stage 1 text into a validated ComicBook — single responsibility."""

    def parse(self, raw_text: str, num_images: int = 1) -> ComicBook:
        try:
            json_str = self._extract_json(raw_text)
            data = json.loads(json_str)
            return ComicBook(**data)
        except Exception:
            return self._fallback(num_images)

    @staticmethod
    def _extract_json(text: str) -> str:
        match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", text)
        if match:
            return match.group(1)
        match = re.search(r"\{[\s\S]*\}", text)
        if match:
            return match.group(0)
        return text

    @staticmethod
    def _fallback(num_images: int) -> ComicBook:
        """Emergency fallback — one panel per image, no story."""
        panels_per_page = 4
        all_panels = [
            ComicPanel(
                panel_number=i + 1,
                image_index=i,
                description=f"Scene {i + 1}",
                caption=f"Panel {i + 1}" if i == 0 else "",
            )
            for i in range(num_images)
        ]
        pages = []
        for page_idx, start in enumerate(range(0, len(all_panels), panels_per_page)):
            chunk = all_panels[start:start + panels_per_page]
            for j, p in enumerate(chunk):
                p.panel_number = j + 1
            pages.append(ComicPage(page_number=page_idx + 1, panels=chunk))
        return ComicBook(
            title="Your Story",
            genre="adventure",
            art_style="superhero",
            pages=pages,
        )
