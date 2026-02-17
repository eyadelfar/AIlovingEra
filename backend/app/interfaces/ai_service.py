from abc import ABC, abstractmethod

from app.models.ai_result import AIServiceResult


class AbstractAIService(ABC):
    @abstractmethod
    async def generate_content(
        self,
        prompt: str,
        images: list[bytes],
        mime_types: list[str],
    ) -> AIServiceResult: ...
