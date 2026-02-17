from functools import lru_cache

from fastapi import Depends

from app.config import Settings
from app.interfaces.ai_service import AbstractAIService
from app.interfaces.art_generator import AbstractArtGenerator
from app.interfaces.prompt_builder import AbstractPromptBuilder
from app.interfaces.response_parser import AbstractResponseParser
from app.interfaces.stt_service import AbstractSTTService
from app.services.comic_orchestrator import ComicOrchestrator
from app.services.comic_prompt_builder import ComicPromptBuilder
from app.services.comic_response_parser import ComicResponseParser
from app.services.gemini_art_generator import GeminiArtGenerator
from app.services.gemini_service import GeminiService
from app.services.whisper_service import WhisperService


@lru_cache
def get_settings() -> Settings:
    return Settings()


def get_ai_service(settings: Settings = Depends(get_settings)) -> AbstractAIService:
    if settings.ai_provider == "gemini":
        return GeminiService(
            api_key=settings.gemini_api_key,
            model_name=settings.gemini_model,
        )
    raise ValueError(f"Unknown AI provider '{settings.ai_provider}'.")


def get_art_generator(settings: Settings = Depends(get_settings)) -> AbstractArtGenerator:
    return GeminiArtGenerator(
        api_key=settings.gemini_api_key,
        model_name=settings.gemini_art_model,
    )


def get_prompt_builder() -> AbstractPromptBuilder:
    return ComicPromptBuilder()


def get_response_parser() -> AbstractResponseParser:
    return ComicResponseParser()


def get_orchestrator(
    ai: AbstractAIService = Depends(get_ai_service),
    builder: AbstractPromptBuilder = Depends(get_prompt_builder),
    parser: AbstractResponseParser = Depends(get_response_parser),
    art: AbstractArtGenerator = Depends(get_art_generator),
) -> ComicOrchestrator:
    return ComicOrchestrator(ai=ai, builder=builder, parser=parser, art_generator=art)


@lru_cache
def get_stt_service() -> AbstractSTTService:
    settings = get_settings()
    return WhisperService(model_size=settings.whisper_model_size)
