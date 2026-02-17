from abc import ABC, abstractmethod

from app.models.schemas import ComicBook


class AbstractResponseParser(ABC):
    @abstractmethod
    def parse(self, raw_text: str, num_images: int = 1) -> ComicBook: ...
