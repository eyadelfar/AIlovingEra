from functools import lru_cache

from fastapi import Depends

from app.config import Settings
from app.interfaces.ai_service import AbstractAIService
from app.interfaces.image_enhancer import AbstractImageEnhancer
from app.interfaces.pdf_generator import AbstractPdfGenerator
from app.interfaces.prompt_builder import AbstractPromptBuilder
from app.interfaces.response_parser import AbstractResponseParser
from app.interfaces.stt_service import AbstractSTTService
from app.services.gemini_image_enhancer import GeminiImageEnhancer
from app.services.gemini_service import GeminiService
from app.services.memory_book_orchestrator import MemoryBookOrchestrator
from app.services.playwright_pdf_generator import PlaywrightPdfGenerator
from app.services.memory_book_prompt_builder import MemoryBookPromptBuilder
from app.services.memory_book_response_parser import MemoryBookResponseParser
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


def get_image_enhancer(settings: Settings = Depends(get_settings)) -> AbstractImageEnhancer:
    return GeminiImageEnhancer(
        api_key=settings.gemini_api_key,
        model_name=settings.gemini_art_model,
    )


@lru_cache
def get_prompt_builder() -> AbstractPromptBuilder:
    return MemoryBookPromptBuilder()


@lru_cache
def get_response_parser() -> AbstractResponseParser:
    return MemoryBookResponseParser()


@lru_cache
def get_pdf_generator() -> AbstractPdfGenerator:
    return PlaywrightPdfGenerator()


def get_orchestrator(
    settings: Settings = Depends(get_settings),
    ai: AbstractAIService = Depends(get_ai_service),
    builder: AbstractPromptBuilder = Depends(get_prompt_builder),
    parser: AbstractResponseParser = Depends(get_response_parser),
    enhancer: AbstractImageEnhancer = Depends(get_image_enhancer),
    pdf_gen: AbstractPdfGenerator = Depends(get_pdf_generator),
) -> MemoryBookOrchestrator:
    return MemoryBookOrchestrator(
        ai=ai, builder=builder, parser=parser,
        image_enhancer=enhancer, pdf_generator=pdf_gen,
        settings=settings,
    )


@lru_cache
def get_stt_service() -> AbstractSTTService:
    settings = get_settings()
    return WhisperService(model_size=settings.whisper_model_size)
