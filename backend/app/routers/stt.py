import logging

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File

from app.dependencies import get_stt_service
from app.interfaces.stt_service import AbstractSTTService

logger = logging.getLogger(__name__)

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
    stt: AbstractSTTService = Depends(get_stt_service),
):
    ct = (audio.content_type or "").lower()
    ct_base = ct.split(";")[0].strip()
    if ct_base and ct_base not in ALLOWED_AUDIO_TYPES:
        raise HTTPException(status_code=422, detail=f"Unsupported audio type '{ct_base}'.")

    audio_bytes = await audio.read()
    if len(audio_bytes) > MAX_AUDIO_SIZE:
        raise HTTPException(status_code=422, detail="Audio file exceeds 25 MB size limit.")

    try:
        text = await stt.transcribe(audio_bytes, mime_type=ct or "audio/webm")
    except Exception as exc:
        logger.error("Transcription failed: %s", exc)
        raise HTTPException(status_code=500, detail="Transcription failed. Please try again.") from exc

    return {"text": text}
