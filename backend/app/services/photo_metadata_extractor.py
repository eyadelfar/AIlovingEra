"""Local photo metadata extraction — no AI calls, uses Pillow only."""

import asyncio
import io
from concurrent.futures import ThreadPoolExecutor

import structlog
from PIL import Image, ExifTags, ImageFilter

from app.models.schemas import PhotoMetadata

logger = structlog.get_logger()

_EXIF_DATE_TAG = "DateTimeOriginal"
_EXIF_CREATE_TAG = "DateTimeDigitized"

# EXIF IFD tag ID for GPS data
_GPS_IFD_TAG = 0x8825

# Additional EXIF tags
_EXIF_ISO_TAG = 0x8827  # ISOSpeedRatings
_EXIF_EXPOSURE_TAG = 0x829A  # ExposureTime
_EXIF_FNUMBER_TAG = 0x829D  # FNumber

# Reusable thread pool for CPU-bound PIL work
_POOL = ThreadPoolExecutor(max_workers=8)


async def extract_photo_metadata(
    image_bytes_list: list[bytes],
    mime_types: list[str],
) -> list[PhotoMetadata]:
    # Process all photos in parallel using thread pool
    loop = asyncio.get_running_loop()
    futures = [
        loop.run_in_executor(
            _POOL,
            _extract_single,
            idx,
            raw,
            mime_types[idx] if idx < len(mime_types) else "image/jpeg",
        )
        for idx, raw in enumerate(image_bytes_list)
    ]
    return list(await asyncio.gather(*futures))


def _dms_to_decimal(dms_tuple: tuple, ref: str) -> float | None:
    """Convert EXIF GPS DMS (degrees, minutes, seconds) to decimal degrees."""
    try:
        degrees = float(dms_tuple[0])
        minutes = float(dms_tuple[1])
        seconds = float(dms_tuple[2])
        decimal = degrees + minutes / 60.0 + seconds / 3600.0
        if ref in ("S", "W"):
            decimal = -decimal
        return round(decimal, 6)
    except (TypeError, IndexError, ValueError, ZeroDivisionError):
        return None


def _extract_gps(exif_data) -> tuple[float | None, float | None]:
    """Extract GPS latitude and longitude from EXIF data."""
    try:
        gps_ifd = exif_data.get_ifd(_GPS_IFD_TAG)
        if not gps_ifd:
            return None, None

        # GPS tag IDs: 1=LatRef, 2=Lat, 3=LonRef, 4=Lon
        lat_ref = gps_ifd.get(1, "")
        lat_dms = gps_ifd.get(2)
        lon_ref = gps_ifd.get(3, "")
        lon_dms = gps_ifd.get(4)

        if lat_dms and lon_dms:
            lat = _dms_to_decimal(lat_dms, lat_ref)
            lon = _dms_to_decimal(lon_dms, lon_ref)
            return lat, lon
    except Exception:
        pass
    return None, None


def _extract_camera_model(tag_map: dict) -> str:
    """Extract camera model from EXIF tag map."""
    model = tag_map.get("Model", "")
    if model:
        return str(model).strip()
    make = tag_map.get("Make", "")
    if make:
        return str(make).strip()
    return ""


def _extract_focal_length(tag_map: dict) -> float | None:
    """Extract focal length in mm from EXIF tag map."""
    fl = tag_map.get("FocalLength")
    if fl is not None:
        try:
            return round(float(fl), 1)
        except (TypeError, ValueError):
            pass
    return None


def _compute_dominant_color(img: Image.Image) -> str:
    """Compute the dominant color from the image and return as hex string.

    Downsamples the image for speed, converts to RGB, buckets each pixel's
    hue into 12 sectors, picks the most common bucket, and returns the
    average color of pixels in that bucket as a hex string.
    """
    try:
        # Downsample for performance
        thumb = img.copy()
        thumb.thumbnail((64, 64))
        thumb = thumb.convert("RGB")

        pixels = list(thumb.getdata())
        if not pixels:
            return ""

        # Bucket pixels by hue (12 buckets of 30 degrees each)
        hue_buckets: dict[int, list[tuple[int, int, int]]] = {}
        for r, g, b in pixels:
            # Skip near-gray pixels (low saturation)
            max_c = max(r, g, b)
            min_c = min(r, g, b)
            if max_c - min_c < 20:
                continue

            # Compute hue
            if max_c == r:
                hue = (60 * ((g - b) / (max_c - min_c))) % 360
            elif max_c == g:
                hue = (60 * ((b - r) / (max_c - min_c)) + 120) % 360
            else:
                hue = (60 * ((r - g) / (max_c - min_c)) + 240) % 360

            bucket = int(hue // 30)
            hue_buckets.setdefault(bucket, []).append((r, g, b))

        if not hue_buckets:
            # All pixels are gray-ish, compute average
            avg_r = sum(p[0] for p in pixels) // len(pixels)
            avg_g = sum(p[1] for p in pixels) // len(pixels)
            avg_b = sum(p[2] for p in pixels) // len(pixels)
            return f"#{avg_r:02x}{avg_g:02x}{avg_b:02x}"

        # Find the most common hue bucket
        most_common_bucket = max(hue_buckets, key=lambda k: len(hue_buckets[k]))
        bucket_pixels = hue_buckets[most_common_bucket]

        avg_r = sum(p[0] for p in bucket_pixels) // len(bucket_pixels)
        avg_g = sum(p[1] for p in bucket_pixels) // len(bucket_pixels)
        avg_b = sum(p[2] for p in bucket_pixels) // len(bucket_pixels)

        return f"#{avg_r:02x}{avg_g:02x}{avg_b:02x}"
    except Exception:
        return ""


def _compute_blur_score(img: Image.Image) -> float:
    """Compute blur score using edge detection variance. 0=sharp, 1=blurry."""
    try:
        gray = img.convert("L").resize((256, 256))
        edges = gray.filter(ImageFilter.FIND_EDGES)
        pixels = list(edges.getdata())
        mean = sum(pixels) / len(pixels)
        variance = sum((p - mean) ** 2 for p in pixels) / len(pixels)
        # High variance = sharp (lots of edges), low variance = blurry
        # Invert so 0=sharp, 1=blurry; normalize against typical range
        sharpness = min(1.0, variance / 2000.0)
        return round(1.0 - sharpness, 3)
    except Exception:
        return 0.5  # Unknown quality — neutral default


def _compute_exposure_quality(img: Image.Image) -> float:
    """Compute exposure quality from histogram analysis. 0=bad, 1=perfect."""
    try:
        hist = img.convert("L").histogram()
        total = sum(hist)
        if total == 0:
            return 0.0
        underexposed = sum(hist[:10]) / total
        overexposed = sum(hist[246:]) / total
        mean_val = sum(i * h for i, h in enumerate(hist)) / total
        mean_penalty = abs(mean_val - 128) / 128
        score = max(0.0, 1.0 - underexposed * 3 - overexposed * 3 - mean_penalty * 0.5)
        return round(score, 3)
    except Exception:
        return 0.0


def _compute_perceptual_hash(img: Image.Image) -> str:
    """Compute 64-bit difference hash (dHash) for near-duplicate detection."""
    try:
        resized = img.convert("L").resize((9, 8))
        pixels = list(resized.getdata())
        bits = [
            1 if pixels[row * 9 + col] > pixels[row * 9 + col + 1] else 0
            for row in range(8)
            for col in range(8)
        ]
        return hex(int("".join(str(b) for b in bits), 2))
    except Exception:
        return ""


def _extract_iso(exif_data) -> int | None:
    """Extract ISO speed from EXIF data."""
    try:
        val = exif_data.get(_EXIF_ISO_TAG)
        if val is not None:
            return int(val)
    except (TypeError, ValueError):
        pass
    return None


def _extract_exposure_time(exif_data) -> str | None:
    """Extract exposure time and format as fraction string."""
    try:
        val = exif_data.get(_EXIF_EXPOSURE_TAG)
        if val is not None:
            fval = float(val)
            if fval > 0:
                if fval < 1:
                    return f"1/{int(round(1.0 / fval))}"
                return f"{fval:.1f}"
    except (TypeError, ValueError, ZeroDivisionError):
        pass
    return None


def _extract_f_stop(exif_data) -> float | None:
    """Extract f-stop (f-number) from EXIF data."""
    try:
        val = exif_data.get(_EXIF_FNUMBER_TAG)
        if val is not None:
            return round(float(val), 1)
    except (TypeError, ValueError):
        pass
    return None


def _count_faces_simple(img: Image.Image) -> int:
    """Simple face count estimation based on skin-tone pixel clustering.

    This is a rough heuristic — not a real face detector. Returns 0 if
    no skin-tone regions are found, otherwise estimates based on cluster count.
    """
    try:
        thumb = img.copy()
        thumb.thumbnail((128, 128))
        thumb = thumb.convert("RGB")
        pixels = list(thumb.getdata())
        w, h = thumb.size
        # Simple skin tone detection in RGB space
        skin_pixels = 0
        for r, g, b in pixels:
            if r > 95 and g > 40 and b > 20:
                if max(r, g, b) - min(r, g, b) > 15:
                    if abs(r - g) > 15 and r > g and r > b:
                        skin_pixels += 1
        skin_ratio = skin_pixels / len(pixels) if pixels else 0
        # Very rough: 5-20% skin → 1-2 faces, 20%+ → 2+ faces
        if skin_ratio > 0.20:
            return 2
        elif skin_ratio > 0.05:
            return 1
        return 0
    except Exception:
        return 0


def _extract_single(index: int, raw: bytes, mime_type: str) -> PhotoMetadata:
    width, height, aspect, orientation = 0, 0, 1.0, "landscape"
    exif_date: str | None = None
    confidence = 0.0
    gps_lat: float | None = None
    gps_lon: float | None = None
    camera_model: str = ""
    focal_length: float | None = None
    dominant_color: str = ""
    iso: int | None = None
    exposure_time: str | None = None
    f_stop: float | None = None
    blur_score: float = 0.0
    exposure_quality: float = 0.0
    face_count: int = 0
    perceptual_hash: str = ""

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

        # Compute dominant color from pixel data
        dominant_color = _compute_dominant_color(img)

        # Quality metrics (Pillow-only)
        blur_score = _compute_blur_score(img)
        exposure_quality = _compute_exposure_quality(img)
        perceptual_hash = _compute_perceptual_hash(img)
        face_count = _count_faces_simple(img)

        exif_data = img.getexif()
        if exif_data:
            tag_map = {ExifTags.TAGS.get(k, k): v for k, v in exif_data.items()}
            if _EXIF_DATE_TAG in tag_map:
                exif_date = str(tag_map[_EXIF_DATE_TAG])
                confidence = 0.95
            elif _EXIF_CREATE_TAG in tag_map:
                exif_date = str(tag_map[_EXIF_CREATE_TAG])
                confidence = 0.85

            # GPS coordinates
            gps_lat, gps_lon = _extract_gps(exif_data)

            # Camera model
            camera_model = _extract_camera_model(tag_map)

            # Focal length
            focal_length = _extract_focal_length(tag_map)

            # Additional EXIF data
            iso = _extract_iso(exif_data)
            exposure_time = _extract_exposure_time(exif_data)
            f_stop = _extract_f_stop(exif_data)
    except Exception:
        logger.debug("metadata_extraction_failed", photo_index=index)

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
        gps_lat=gps_lat,
        gps_lon=gps_lon,
        camera_model=camera_model,
        focal_length=focal_length,
        dominant_color=dominant_color,
        iso=iso,
        exposure_time=exposure_time,
        f_stop=f_stop,
        blur_score=blur_score,
        exposure_quality=exposure_quality,
        face_count=face_count,
        file_size_bytes=len(raw),
        perceptual_hash=perceptual_hash,
    )
