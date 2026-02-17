from fastapi import APIRouter, Depends, UploadFile, File

from app.dependencies import get_stt_service
from app.interfaces.stt_service import AbstractSTTService

router = APIRouter(prefix="/api/stt", tags=["stt"])


@router.get("/health")
async def stt_health():
    return {"status": "ok"}


@router.post("/transcribe")
async def transcribe_audio(
    audio: UploadFile = File(...),
    stt: AbstractSTTService = Depends(get_stt_service),
):
    audio_bytes = await audio.read()
    text = stt.transcribe(audio_bytes, mime_type=audio.content_type or "audio/webm")
    return {"text": text}
