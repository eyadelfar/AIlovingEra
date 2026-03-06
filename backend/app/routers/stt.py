import structlog
from fastapi import APIRouter, Depends, Form, HTTPException, UploadFile, File

from app.dependencies import get_stt_service
from app.interfaces.stt_service import AbstractSTTService

logger = structlog.get_logger()

MAX_AUDIO_SIZE = 25 * 1024 * 1024  # 25 MB
ALLOWED_AUDIO_TYPES = {
    "audio/webm", "audio/ogg", "audio/wav", "audio/mp3", "audio/mpeg",
    "audio/mp4", "audio/m4a", "audio/x-m4a", "audio/flac",
}

router = APIRouter(prefix="/api/stt", tags=["stt"])


@router.get("/health")
async def stt_health():
    return {"status": "ok"}


@router.post("/transcribe")
async def transcribe_audio(
    audio: UploadFile = File(...),
    language: str | None = Form(None),
    stt: AbstractSTTService = Depends(get_stt_service),
):
    logger.info("transcribe_audio", content_type=audio.content_type, language=language)
    ct = (audio.content_type or "").lower()
    ct_base = ct.split(";")[0].strip()
    if ct_base and ct_base not in ALLOWED_AUDIO_TYPES:
        raise HTTPException(status_code=422, detail=f"Unsupported audio type '{ct_base}'.")

    audio_bytes = await audio.read()
    if len(audio_bytes) == 0:
        raise HTTPException(status_code=422, detail="Audio file is empty.")
    if len(audio_bytes) > MAX_AUDIO_SIZE:
        raise HTTPException(status_code=422, detail="Audio file exceeds 25 MB size limit.")

    try:
        text = await stt.transcribe(audio_bytes, mime_type=ct or "audio/webm", language=language)
    except Exception:
        logger.error("transcription_failed", exc_info=True)
        raise HTTPException(status_code=500, detail="Transcription failed. Please try again.")

    logger.info("transcribe_audio_done", text_length=len(text))
    return {"text": text}
