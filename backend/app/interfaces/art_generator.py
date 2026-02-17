from abc import ABC, abstractmethod


class AbstractArtGenerator(ABC):
    """Interface for transforming a photo into comic-style art."""

    @abstractmethod
    async def transform_to_comic(
        self,
        image_bytes: bytes,
        mime_type: str,
        art_style: str,
        mood: str,
        description: str,
    ) -> bytes:
        """Returns raw PNG bytes of the comic-art version."""
        ...
