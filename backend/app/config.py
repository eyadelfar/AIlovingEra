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

    # ── Supabase ──────────────────────────────────────────────────────────
    supabase_url: str = ""
    supabase_service_key: str = ""
    supabase_jwt_secret: str = ""       # Legacy HS256 (optional)
    supabase_jwks_url: str = ""         # New ES256 JWKS endpoint

    # ── Stripe ────────────────────────────────────────────────────────────
    stripe_api_key: str = ""
    stripe_webhook_secret: str = ""
    stripe_price_single: str = ""
    stripe_price_starter: str = ""
    stripe_price_creator: str = ""
    stripe_price_monthly: str = ""
    stripe_price_annual: str = ""

    # ── PayPal ────────────────────────────────────────────────────────────
    paypal_client_id: str = ""
    paypal_client_secret: str = ""
    paypal_sandbox: bool = True    # env: PAYPAL_SANDBOX — set False for production

    # ── Sessions ─────────────────────────────────────────────────────────
    session_ttl_seconds: int = 1800      # 30 minutes
    session_max_count: int = 100

    # ── Server ─────────────────────────────────────────────────────────────
    frontend_url: str = "http://localhost:5173"
    cors_origins: list[str] = ["http://localhost:5173"]
    # ── Referral ─────────────────────────────────────────────────────────
    referral_credits: int = 1

    log_level: str = "INFO"       # env: LOG_LEVEL
    log_format: str = "console"   # env: LOG_FORMAT — "console" (dev) | "json" (prod)
