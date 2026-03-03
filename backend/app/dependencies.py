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
from app.services.image_comparator import ImageComparator
from app.services.memory_book_orchestrator import MemoryBookOrchestrator
from app.services.playwright_pdf_generator import PlaywrightPdfGenerator
from app.services.memory_book_prompt_builder import MemoryBookPromptBuilder
from app.services.memory_book_response_parser import MemoryBookResponseParser
from app.services.whisper_service import WhisperService
from app.services.admin_service import AdminService
from app.services.supabase_service import SupabaseService

# Module-level singletons for services that are expensive to create
_ai_service: AbstractAIService | None = None
_image_enhancer: AbstractImageEnhancer | None = None
_image_comparator: ImageComparator | None = None


@lru_cache
def get_settings() -> Settings:
    return Settings()


def get_ai_service(settings: Settings = Depends(get_settings)) -> AbstractAIService:
    global _ai_service
    if _ai_service is None:
        if settings.ai_provider == "gemini":
            _ai_service = GeminiService(
                api_key=settings.gemini_api_key,
                model_name=settings.gemini_model,
            )
        else:
            raise ValueError(f"Unknown AI provider '{settings.ai_provider}'.")
    return _ai_service


def get_image_enhancer(settings: Settings = Depends(get_settings)) -> AbstractImageEnhancer:
    global _image_enhancer
    if _image_enhancer is None:
        _image_enhancer = GeminiImageEnhancer(
            api_key=settings.gemini_api_key,
            model_name=settings.gemini_art_model,
        )
    return _image_enhancer


@lru_cache
def get_prompt_builder() -> AbstractPromptBuilder:
    return MemoryBookPromptBuilder()


@lru_cache
def get_response_parser() -> AbstractResponseParser:
    return MemoryBookResponseParser()


@lru_cache
def get_pdf_generator() -> AbstractPdfGenerator:
    return PlaywrightPdfGenerator()


def get_image_comparator(settings: Settings = Depends(get_settings)) -> ImageComparator:
    global _image_comparator
    if _image_comparator is None:
        _image_comparator = ImageComparator(
            api_key=settings.gemini_api_key,
            model_name=settings.gemini_model,
        )
    return _image_comparator


def get_orchestrator(
    settings: Settings = Depends(get_settings),
    ai: AbstractAIService = Depends(get_ai_service),
    builder: AbstractPromptBuilder = Depends(get_prompt_builder),
    parser: AbstractResponseParser = Depends(get_response_parser),
    enhancer: AbstractImageEnhancer = Depends(get_image_enhancer),
    pdf_gen: AbstractPdfGenerator = Depends(get_pdf_generator),
    image_comparator: ImageComparator = Depends(get_image_comparator),
) -> MemoryBookOrchestrator:
    return MemoryBookOrchestrator(
        ai=ai, builder=builder, parser=parser,
        image_enhancer=enhancer, pdf_generator=pdf_gen,
        settings=settings,
        image_comparator=image_comparator,
    )


@lru_cache
def get_supabase_service() -> SupabaseService:
    settings = get_settings()
    return SupabaseService(url=settings.supabase_url, service_key=settings.supabase_service_key)


@lru_cache
def get_stt_service() -> AbstractSTTService:
    settings = get_settings()
    return WhisperService(model_size=settings.whisper_model_size)


def get_admin_service(supa: SupabaseService = Depends(get_supabase_service)) -> AdminService:
    return AdminService(supa=supa)
