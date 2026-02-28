import logging

from google import genai
from google.genai import types

from app.constants import IMAGE_LOOK_PROMPTS
from app.interfaces.image_enhancer import AbstractImageEnhancer
from app.services.gemini_rate_limiter import with_rate_limit_retry

logger = logging.getLogger(__name__)


class GeminiImageEnhancer(AbstractImageEnhancer):
    """Enhances photos with template-specific styling using Gemini image generation."""

    def __init__(self, api_key: str, model_name: str = "gemini-2.5-flash-image") -> None:
        self._client = genai.Client(api_key=api_key)
        self._model_name = model_name

    async def enhance_photo(
        self,
        image_bytes: bytes,
        mime_type: str,
        style: str,
        vibe: str,
        context: str,
        image_look: str = "",
    ) -> bytes:
        look_instruction = IMAGE_LOOK_PROMPTS.get(image_look, "")

        prompt = (
            f"Enhance this photograph for a memory book. "
            f"Style: {style}. "
            f"Keep the original composition, people, and scene intact. "
            f"Do NOT add text, borders, or frames. "
            f"Vibe: {vibe or 'warm'}. "
            f"Context: {context or 'a cherished memory'}. "
        )
        if look_instruction:
            prompt += f"Additional look: {look_instruction} "
        prompt += "Make the photo look professionally edited and emotionally resonant."

        parts = [
            types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
            prompt,
        ]

        try:
            response = await with_rate_limit_retry(
                lambda: self._client.aio.models.generate_content(
                    model=self._model_name,
                    contents=parts,
                    config=types.GenerateContentConfig(
                        response_modalities=["TEXT", "IMAGE"],
                    ),
                )
            )
        except ValueError:
            raise
        except Exception as exc:
            logger.error("Gemini enhance_photo failed: %s", exc)
            raise ValueError(f"AI image enhancement error: {exc}") from exc

        if not response.parts:
            raise ValueError("Gemini returned no content — the response may have been blocked by safety filters.")

        for part in response.parts:
            if part.inline_data is not None:
                return part.inline_data.data

        raise ValueError("Gemini did not return an enhanced image")

    async def generate_image_from_text(self, prompt: str) -> bytes:
        try:
            response = await with_rate_limit_retry(
                lambda: self._client.aio.models.generate_content(
                    model=self._model_name,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        response_modalities=["IMAGE"],
                    ),
                )
            )
        except ValueError:
            raise
        except Exception as exc:
            logger.error("Gemini generate_image_from_text failed: %s", exc)
            raise ValueError(f"AI image generation error: {exc}") from exc

        if not response.parts:
            raise ValueError("Gemini returned no content — the response may have been blocked by safety filters.")

        for part in response.parts:
            if part.inline_data is not None:
                return part.inline_data.data

        raise ValueError("Gemini did not return a generated image")

    async def generate_cartoon(
        self,
        image_bytes: bytes,
        mime_type: str,
        style: str = "chibi",
    ) -> bytes:
        prompt = (
            f"Create a cute {style} cartoon illustration of ONLY the people in this photo. "
            "Crop tightly to just the characters, no scenery, no background. "
            "Transparent background, flat art style, clean vector-like lines. "
            "Keep recognizable features (hair color, style, body proportions). "
            "Make it adorable and suitable for a couple's memory book. "
            "Do NOT add text, watermarks, or any background elements."
        )

        parts = [
            types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
            prompt,
        ]

        try:
            response = await with_rate_limit_retry(
                lambda: self._client.aio.models.generate_content(
                    model=self._model_name,
                    contents=parts,
                    config=types.GenerateContentConfig(
                        response_modalities=["IMAGE"],
                    ),
                )
            )
        except ValueError:
            raise
        except Exception as exc:
            logger.error("Gemini generate_cartoon failed: %s", exc)
            raise ValueError(f"AI cartoon generation error: {exc}") from exc

        if not response.parts:
            raise ValueError("Gemini returned no content for cartoon generation.")

        for part in response.parts:
            if part.inline_data is not None:
                return part.inline_data.data

        raise ValueError("Gemini did not return a cartoon image")

    async def blend_with_template(
        self,
        image_bytes: bytes,
        mime_type: str,
        template_name: str,
        palette_description: str = "",
    ) -> bytes:
        prompt = (
            f"Re-render this photograph to blend naturally with a '{template_name}' book design. "
            f"Color palette: {palette_description or template_name + ' tones'}. "
            "Keep all people identical and recognizable. "
            "Adjust colors, lighting, and atmosphere to match the book's visual theme. "
            "Do NOT add text, borders, or frames."
        )

        parts = [
            types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
            prompt,
        ]

        try:
            response = await with_rate_limit_retry(
                lambda: self._client.aio.models.generate_content(
                    model=self._model_name,
                    contents=parts,
                    config=types.GenerateContentConfig(
                        response_modalities=["IMAGE"],
                    ),
                )
            )
        except ValueError:
            raise
        except Exception as exc:
            logger.error("Gemini blend_with_template failed: %s", exc)
            raise ValueError(f"AI photo blending error: {exc}") from exc

        if not response.parts:
            raise ValueError("Gemini returned no content for photo blending.")

        for part in response.parts:
            if part.inline_data is not None:
                return part.inline_data.data

        raise ValueError("Gemini did not return a blended image")
