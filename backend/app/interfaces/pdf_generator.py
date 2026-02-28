from abc import ABC, abstractmethod

from app.models.schemas import MemoryBookDraft


class AbstractPdfGenerator(ABC):
    """Interface for generating PDF memory books."""

    @abstractmethod
    async def generate(
        self,
        book: MemoryBookDraft,
        photo_data: dict[int, bytes],
        template_config: dict,
        design_scale: dict | None = None,
        photo_analyses: list[dict] | None = None,
    ) -> bytes:
        """Generate PDF bytes from a book draft, photos, and template config."""
        ...
