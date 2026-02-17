import asyncio

from google import genai
from google.genai import types

from app.interfaces.art_generator import AbstractArtGenerator


class GeminiArtGenerator(AbstractArtGenerator):
    """Transforms a single photo into comic-style art using Gemini image generation."""

    def __init__(self, api_key: str, model_name: str = "gemini-2.5-flash-preview-05-20") -> None:
        self._client = genai.Client(api_key=api_key)
        self._model_name = model_name

    async def transform_to_comic(
        self,
        image_bytes: bytes,
        mime_type: str,
        art_style: str,
        mood: str,
        description: str,
    ) -> bytes:
        style_instructions = {
            "superhero": "superhero comic book style, bold primary colors, dynamic poses, Marvel/DC style",
            "manga": "Japanese manga style, black and white with screentones, expressive eyes, clean lines",
            "noir": "noir comic style, high contrast black and white, dramatic shadows, film noir atmosphere",
            "watercolor": "watercolor comic style, soft washes, painted textures, indie graphic novel look",
            "indie": "indie comic style, hand-drawn feel, muted colors, alternative comics aesthetic",
        }.get(art_style.lower(), "professional comic book style, bold ink lines, vibrant colors")

        prompt = (
            f"Transform this photograph into {style_instructions}. "
            f"Requirements: bold black ink outlines, flat cel-shaded colors, "
            f"comic book panel composition, preserve ALL people and key objects from the original photo, "
            f"maintain the same composition and scene layout. "
            f"Mood: {mood or 'neutral'}. "
            f"Scene: {description or 'as shown in the photo'}. "
            f"Make it look like a page from a professional published comic book."
        )

        parts = [
            types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
            prompt,
        ]

        response = await self._client.aio.models.generate_content(
            model=self._model_name,
            contents=parts,
            config=types.GenerateContentConfig(
                response_modalities=["TEXT", "IMAGE"],
            ),
        )

        for part in response.parts:
            if part.inline_data is not None:
                return part.inline_data.data

        raise ValueError("Gemini did not return an image for comic art generation")
