from abc import ABC, abstractmethod

from app.models.schemas import BookGenerationRequest, RegenerateTextRequest


class AbstractPromptBuilder(ABC):
    @abstractmethod
    def build_photo_analysis_prompt(
        self,
        num_photos: int,
        metadata: list[dict] | None = None,
    ) -> str: ...

    @abstractmethod
    def build_narrative_prompt(
        self,
        request: BookGenerationRequest,
        photo_analyses: list[dict],
        clusters: list[dict] | None = None,
        structure_guide: dict | None = None,
        template_config: dict | None = None,
    ) -> str: ...

    @abstractmethod
    def build_planning_prompt(
        self,
        request: BookGenerationRequest,
        photo_analyses: list[dict],
        clusters: list[dict] | None = None,
        quality_scores: list[dict] | None = None,
    ) -> str:
        """Stage C: Generate book structure plan (no text, just skeleton)."""
        ...

    @abstractmethod
    def build_writing_prompt(
        self,
        request: BookGenerationRequest,
        plan: dict,
        photo_analyses: list[dict],
    ) -> str:
        """Stage D: Generate all narrative text for a planned structure."""
        ...

    @abstractmethod
    def build_questions_prompt(
        self,
        photo_analyses: list[dict],
        partner_names: list[str],
        relationship_type: str,
    ) -> str: ...

    @abstractmethod
    def build_regenerate_text_prompt(self, request: RegenerateTextRequest) -> str: ...

    @abstractmethod
    def build_image_generation_prompt(
        self,
        user_prompt: str,
        style_hint: str,
        image_look: str,
    ) -> str: ...
