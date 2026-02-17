from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # ── Gemini Script Model (Stage 1 — text only, cheaper) ─────────────────
    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.0-flash"          # Stage 1: script generation

    # ── Gemini Art Model (Stage 2 — image generation) ──────────────────────
    gemini_art_model: str = "gemini-2.5-flash-preview-05-20"  # Stage 2: photo→comic art

    # ── AI provider selector ───────────────────────────────────────────────
    ai_provider: str = "gemini"

    # ── STT ────────────────────────────────────────────────────────────────
    whisper_model_size: str = "base"

    # ── Server ─────────────────────────────────────────────────────────────
    cors_origins: list[str] = ["http://localhost:5173"]

    class Config:
        env_file = ".env"
