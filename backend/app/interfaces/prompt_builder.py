from abc import ABC, abstractmethod


class AbstractPromptBuilder(ABC):
    @abstractmethod
    def build(self, user_text: str, num_images: int, panels_per_page: int = 4) -> str: ...
