import logging

from google import genai
from google.genai import types

from app.interfaces.ai_service import AbstractAIService
from app.models.ai_result import AIServiceResult
from app.services.gemini_rate_limiter import with_rate_limit_retry

logger = logging.getLogger(__name__)


class GeminiService(AbstractAIService):
    """Speaks to the Gemini API via the google-genai SDK — single responsibility."""

    def __init__(self, api_key: str, model_name: str) -> None:
        self._client = genai.Client(api_key=api_key)
        self._model_name = model_name

        # Request image output only if this model supports generation.
        # gemini-2.5-flash-image supports "IMAGE" modality; plain flash models do not.
        if "image" in model_name.lower():
            self._modalities = ["TEXT", "IMAGE"]
        else:
            self._modalities = ["TEXT"]

    async def generate_content(
        self,
        prompt: str,
        images: list[bytes],
        mime_types: list[str],
        max_output_tokens: int | None = None,
    ) -> AIServiceResult:
        # Build parts list: uploaded images first, then the prompt text.
        parts: list = [
            types.Part.from_bytes(data=img, mime_type=mime)
            for img, mime in zip(images, mime_types)
        ]
        parts.append(prompt)

        config_kwargs = {"response_modalities": self._modalities}
        if max_output_tokens is not None:
            config_kwargs["max_output_tokens"] = max_output_tokens

        try:
            response = await with_rate_limit_retry(
                lambda: self._client.aio.models.generate_content(
                    model=self._model_name,
                    contents=parts,
                    config=types.GenerateContentConfig(**config_kwargs),
                )
            )
        except ValueError:
            raise
        except Exception as exc:
            logger.error("Gemini API call failed: %s", exc)
            raise ValueError(f"AI service error: {exc}") from exc

        if not response.parts:
            raise ValueError("Gemini returned no content — the response may have been blocked by safety filters.")

        text_parts: list[str] = []
        output_images: list[bytes] = []
        output_mime_types: list[str] = []

        for part in response.parts:
            if part.text is not None:
                text_parts.append(part.text)
            elif part.inline_data is not None:
                output_images.append(part.inline_data.data)
                output_mime_types.append(part.inline_data.mime_type)

        return AIServiceResult(
            text="\n".join(text_parts),
            images=output_images,
            image_mime_types=output_mime_types,
        )
