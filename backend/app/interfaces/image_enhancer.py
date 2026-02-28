from abc import ABC, abstractmethod


class AbstractImageEnhancer(ABC):
    """Interface for enhancing photos with template-specific styles."""

    @abstractmethod
    async def enhance_photo(
        self,
        image_bytes: bytes,
        mime_type: str,
        style: str,
        vibe: str,
        context: str,
        image_look: str = "",
    ) -> bytes:
        """Returns enhanced PNG bytes."""
        ...

    @abstractmethod
    async def generate_image_from_text(self, prompt: str) -> bytes:
        """Generate an image from a text prompt. Returns PNG bytes."""
        ...

    @abstractmethod
    async def generate_cartoon(
        self,
        image_bytes: bytes,
        mime_type: str,
        style: str = "chibi",
    ) -> bytes:
        """Create a cartoon version of people in the photo. Returns PNG bytes."""
        ...

    @abstractmethod
    async def blend_with_template(
        self,
        image_bytes: bytes,
        mime_type: str,
        template_name: str,
        palette_description: str = "",
    ) -> bytes:
        """Re-render a photo to blend with a template's visual style. Returns PNG bytes."""
        ...
