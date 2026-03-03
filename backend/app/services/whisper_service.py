import asyncio
import io
import time

import structlog
from faster_whisper import WhisperModel

from app.interfaces.stt_service import AbstractSTTService

logger = structlog.get_logger()


class WhisperService(AbstractSTTService):
    """Concrete STT implementation using faster-whisper (runs on CPU with int8 quantisation)."""

    def __init__(self, model_size: str = "base"):
        logger.info("whisper_model_loading", model_size=model_size)
        # Model is downloaded once and persisted in the Docker whisper_cache volume.
        self._model = WhisperModel(model_size, device="cpu", compute_type="int8")

    async def transcribe(self, audio_bytes: bytes, mime_type: str, language: str | None = None) -> str:
        logger.info("transcription_start", audio_size_bytes=len(audio_bytes), language=language)
        t0 = time.perf_counter()
        result = await asyncio.to_thread(self._transcribe_sync, audio_bytes, language)
        duration_ms = round((time.perf_counter() - t0) * 1000, 1)
        logger.info("transcription_complete", duration_ms=duration_ms, text_length=len(result))
        return result

    def _transcribe_sync(self, audio_bytes: bytes, language: str | None = None) -> str:
        audio_buffer = io.BytesIO(audio_bytes)
        audio_buffer.seek(0)
        kwargs: dict = {}
        if language:
            kwargs["language"] = language
        segments, _ = self._model.transcribe(audio_buffer, **kwargs)
        return " ".join(seg.text for seg in segments).strip()
