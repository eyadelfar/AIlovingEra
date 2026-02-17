import asyncio
import base64

from app.interfaces.ai_service import AbstractAIService
from app.interfaces.art_generator import AbstractArtGenerator
from app.interfaces.prompt_builder import AbstractPromptBuilder
from app.interfaces.response_parser import AbstractResponseParser
from app.models.schemas import ComicBook


class ComicOrchestrator:
    """Two-stage pipeline: script generation → parallel comic art generation.
    Depends only on abstractions (DIP). Single responsibility: orchestrate.
    """

    _ART_CONCURRENCY = 8  # max parallel Gemini image generation calls

    def __init__(
        self,
        ai: AbstractAIService,
        builder: AbstractPromptBuilder,
        parser: AbstractResponseParser,
        art_generator: AbstractArtGenerator,
    ) -> None:
        self._ai = ai
        self._builder = builder
        self._parser = parser
        self._art = art_generator

    async def generate(
        self,
        user_text: str,
        panels_per_page: int,
        image_bytes: list[bytes],
        mime_types: list[str],
    ) -> ComicBook:
        num_images = len(image_bytes)

        # ── Stage 1: analyze all images + generate comic script ────────────
        prompt = self._builder.build(user_text, num_images, panels_per_page)
        result = await self._ai.generate_content(prompt, image_bytes, mime_types)
        comic = self._parser.parse(result.text, num_images)

        # ── Stage 2: transform each panel's photo into comic art ───────────
        sem = asyncio.Semaphore(self._ART_CONCURRENCY)
        all_panels = [panel for page in comic.pages for panel in page.panels]

        async def transform_with_limit(panel):
            idx = panel.image_index
            if idx < 0 or idx >= num_images:
                return None
            async with sem:
                try:
                    return await self._art.transform_to_comic(
                        image_bytes=image_bytes[idx],
                        mime_type=mime_types[idx],
                        art_style=comic.art_style,
                        mood=panel.mood,
                        description=panel.description,
                    )
                except Exception:
                    return None

        art_results = await asyncio.gather(
            *[transform_with_limit(p) for p in all_panels],
            return_exceptions=False,
        )

        for panel, art_bytes in zip(all_panels, art_results):
            if isinstance(art_bytes, bytes) and art_bytes:
                encoded = base64.b64encode(art_bytes).decode()
                panel.comic_art_base64 = f"data:image/png;base64,{encoded}"

        return comic
