"""Local photo metadata extraction — no AI calls, uses Pillow only."""

import io
import logging

from PIL import Image, ExifTags

from app.models.schemas import PhotoMetadata

logger = logging.getLogger(__name__)

_EXIF_DATE_TAG = "DateTimeOriginal"
_EXIF_CREATE_TAG = "DateTimeDigitized"


async def extract_photo_metadata(
    image_bytes_list: list[bytes],
    mime_types: list[str],
) -> list[PhotoMetadata]:
    results: list[PhotoMetadata] = []
    for idx, raw in enumerate(image_bytes_list):
        meta = _extract_single(idx, raw, mime_types[idx] if idx < len(mime_types) else "image/jpeg")
        results.append(meta)
    return results


def _extract_single(index: int, raw: bytes, mime_type: str) -> PhotoMetadata:
    width, height, aspect, orientation = 0, 0, 1.0, "landscape"
    exif_date: str | None = None
    confidence = 0.0

    try:
        img = Image.open(io.BytesIO(raw))
        width, height = img.size
        aspect = round(width / height, 4) if height else 1.0
        if width > height * 1.05:
            orientation = "landscape"
        elif height > width * 1.05:
            orientation = "portrait"
        else:
            orientation = "square"

        exif_data = img.getexif()
        if exif_data:
            tag_map = {ExifTags.TAGS.get(k, k): v for k, v in exif_data.items()}
            if _EXIF_DATE_TAG in tag_map:
                exif_date = str(tag_map[_EXIF_DATE_TAG])
                confidence = 0.95
            elif _EXIF_CREATE_TAG in tag_map:
                exif_date = str(tag_map[_EXIF_CREATE_TAG])
                confidence = 0.85
    except Exception:
        logger.debug("Could not read image metadata for photo %d", index)

    if not exif_date:
        confidence = 0.0

    return PhotoMetadata(
        photo_index=index,
        width=width,
        height=height,
        aspect_ratio=aspect,
        orientation=orientation,
        exif_date=exif_date,
        date_confidence=confidence,
    )
