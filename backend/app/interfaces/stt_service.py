from abc import ABC, abstractmethod


class AbstractSTTService(ABC):
    """Interface for speech-to-text transcription."""

    @abstractmethod
    async def transcribe(self, audio_bytes: bytes, mime_type: str) -> str:
        """Transcribe audio bytes to text. Returns the transcribed string."""
        ...
