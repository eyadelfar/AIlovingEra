import io

from fastapi import APIRouter, Depends, Form, Response, UploadFile
from fastapi.responses import StreamingResponse

from app.dependencies import get_orchestrator
from app.models.schemas import ComicBook
from app.services.comic_pdf_generator import generate_pdf
from app.services.comic_orchestrator import ComicOrchestrator

router = APIRouter(prefix="/api/comic", tags=["comic"])


@router.get("/health")
async def health() -> dict:
    return {"status": "ok"}


@router.post("/generate", response_model=ComicBook)
async def generate_comic(
    text: str = Form(""),
    panels_per_page: int = Form(4, ge=2, le=6),
    art_style: str = Form("superhero"),
    images: list[UploadFile] = [],
    orchestrator: ComicOrchestrator = Depends(get_orchestrator),
) -> ComicBook:
    image_bytes: list[bytes] = []
    mime_types: list[str] = []

    for upload in images:
        image_bytes.append(await upload.read())
        mime_types.append(upload.content_type or "image/jpeg")

    return await orchestrator.generate(
        user_text=text,
        panels_per_page=panels_per_page,
        art_style=art_style,
        image_bytes=image_bytes,
        mime_types=mime_types,
    )


@router.post("/pdf")
async def download_pdf(comic: ComicBook) -> StreamingResponse:
    """Generate and return a PDF of the comic book."""
    pdf_bytes = generate_pdf(comic)
    safe_title = "".join(c if c.isalnum() or c in " -_" else "_" for c in comic.title)[:50]
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{safe_title}.pdf"'},
    )
