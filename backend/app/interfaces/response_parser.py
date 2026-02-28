from abc import ABC, abstractmethod

from app.models.schemas import MemoryBookDraft


class AbstractResponseParser(ABC):
    @abstractmethod
    def parse_photo_analysis(self, raw_text: str) -> list[dict]: ...

    @abstractmethod
    def parse_narrative(
        self,
        raw_text: str,
        num_photos: int,
        photo_analyses: list[dict] | None = None,
    ) -> MemoryBookDraft: ...

    @abstractmethod
    def parse_questions(self, raw_text: str) -> list[dict]: ...

    @abstractmethod
    def parse_regenerated_text(self, raw_text: str) -> str: ...

    @abstractmethod
    def parse_clusters_from_analysis(self, raw_text: str) -> list[dict]: ...

    @abstractmethod
    def extract_clusters_from_analyses(self, analyses: list[dict]) -> list[dict]: ...
