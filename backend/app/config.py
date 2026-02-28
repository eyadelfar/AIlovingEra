from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env")

    # ── Gemini Script Model (Stage 1 — text only, cheaper) ─────────────────
    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.0-flash"          # Stage 1: script generation

    # ── Gemini Art Model (Stage 2 — image generation) ──────────────────────
    gemini_art_model: str = "gemini-2.5-flash-image"          # Stage 2: photo→comic art

    # ── AI provider selector ───────────────────────────────────────────────
    ai_provider: str = "gemini"

    # ── STT ────────────────────────────────────────────────────────────────
    whisper_model_size: str = "base"

    # ── Orchestrator ───────────────────────────────────────────────────
    batch_size: int = 10
    stage_b_max_tokens: int = 65536

    # ── Server ─────────────────────────────────────────────────────────────
    cors_origins: list[str] = ["http://localhost:5173"]
