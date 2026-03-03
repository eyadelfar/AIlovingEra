import base64
import json
import time
import uuid

import structlog
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.dependencies import get_settings
from app.logging_config import setup_logging
from app.routers import book, stt, templates, payments, marketplace, profile, usage, contact, referral, drafts, events
from app.routers.admin import dashboard as admin_dashboard, users as admin_users, revenue as admin_revenue, content as admin_content, system as admin_system
from app.services.playwright_pdf_generator import shutdown_browser
from app.services.session_store import init_session_store, get_session_store

settings = get_settings()

setup_logging(log_format=settings.log_format, log_level=settings.log_level)

logger = structlog.get_logger()

app = FastAPI(title="Keepsqueak Memory Book API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(book.router)
app.include_router(templates.router)
app.include_router(stt.router)
app.include_router(payments.router)
app.include_router(marketplace.router)
app.include_router(profile.router)
app.include_router(usage.router)
app.include_router(contact.router)
app.include_router(referral.router)
app.include_router(drafts.router)
app.include_router(events.router)
app.include_router(admin_dashboard.router)
app.include_router(admin_users.router)
app.include_router(admin_revenue.router)
app.include_router(admin_content.router)
app.include_router(admin_system.router)


@app.middleware("http")
async def request_context_middleware(request: Request, call_next):
    structlog.contextvars.clear_contextvars()

    request_id = request.headers.get("X-Request-ID") or uuid.uuid4().hex
    structlog.contextvars.bind_contextvars(
        request_id=request_id,
        http_method=request.method,
        http_path=request.url.path,
    )

    # Lightweight JWT decode (no verification) for user_id logging
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        try:
            payload_b64 = auth_header[7:].split(".")[1]
            # Add padding
            payload_b64 += "=" * (-len(payload_b64) % 4)
            payload = json.loads(base64.urlsafe_b64decode(payload_b64))
            user_id = payload.get("sub")
            if user_id:
                structlog.contextvars.bind_contextvars(user_id=user_id)
        except Exception:
            pass

    logger.info("request_started")
    t0 = time.perf_counter()

    try:
        response = await call_next(request)
    except Exception:
        # Ensure unhandled exceptions still get a proper JSON response
        # (so CORSMiddleware can add CORS headers to it)
        logger.error("unhandled_middleware_exception", exc_info=True)
        response = JSONResponse(
            status_code=500,
            content={"detail": "An internal error occurred. Please try again."},
        )

    duration_ms = round((time.perf_counter() - t0) * 1000, 1)
    logger.info(
        "request_completed",
        duration_ms=duration_ms,
        status_code=response.status_code,
    )
    response.headers["X-Request-ID"] = request_id
    return response


@app.exception_handler(ValueError)
async def value_error_handler(request: Request, exc: ValueError):
    return JSONResponse(status_code=422, content={"detail": str(exc)})


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    logger.error("unhandled_exception", exc_info=True)
    return JSONResponse(status_code=500, content={"detail": "An internal error occurred. Please try again."})


_start_time = time.time()


@app.on_event("startup")
async def on_startup():
    store = init_session_store(
        ttl_seconds=settings.session_ttl_seconds,
        max_sessions=settings.session_max_count,
    )
    store.start_cleanup_task()
    logger.info("session_store_started", ttl=settings.session_ttl_seconds, max=settings.session_max_count)


@app.on_event("shutdown")
async def on_shutdown():
    get_session_store().stop_cleanup_task()
    await shutdown_browser()


@app.get("/api/health")
async def health():
    from app.routers.book import _pdf_store
    return {
        "status": "ok",
        "service": "Keepsqueak Memory Book API",
        "uptime_s": round(time.time() - _start_time),
        "pdf_store_count": len(_pdf_store),
        "session_count": get_session_store().count,
    }
