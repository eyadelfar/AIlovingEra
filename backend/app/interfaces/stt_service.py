from abc import ABC, abstractmethod


class AbstractSTTService(ABC):
    """Interface for speech-to-text transcription."""

    @abstractmethod
    async def transcribe(self, audio_bytes: bytes, mime_type: str, language: str | None = None) -> str:
        """Transcribe audio bytes to text. Returns the transcribed string.

        Args:
            audio_bytes: Raw audio data.
            mime_type: MIME type of the audio.
            language: Optional ISO 639-1 language code (e.g. 'en', 'ar') to
                      force the target language instead of auto-detecting.
        """
        ...
