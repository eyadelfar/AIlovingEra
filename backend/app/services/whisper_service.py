import io

from faster_whisper import WhisperModel

from app.interfaces.stt_service import AbstractSTTService


class WhisperService(AbstractSTTService):
    """Concrete STT implementation using faster-whisper (runs on CPU with int8 quantisation)."""

    def __init__(self, model_size: str = "base"):
        # Model is downloaded once and persisted in the Docker whisper_cache volume.
        self._model = WhisperModel(model_size, device="cpu", compute_type="int8")

    def transcribe(self, audio_bytes: bytes, mime_type: str) -> str:
        # seek(0) is required — BytesIO pointer may not start at position 0
        audio_buffer = io.BytesIO(audio_bytes)
        audio_buffer.seek(0)
        segments, _ = self._model.transcribe(audio_buffer)
        return " ".join(seg.text for seg in segments).strip()
