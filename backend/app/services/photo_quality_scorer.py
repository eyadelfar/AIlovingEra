"""Photo quality scoring — composite scores from local metadata + AI analysis."""

from __future__ import annotations

import structlog
from typing import Sequence

from app.models.schemas import (
    DuplicateGroup,
    PhotoMetadata,
    PhotoQualityScore,
)

logger = structlog.get_logger()


def score_photos(
    metadata: Sequence[PhotoMetadata],
    analyses: list[dict] | None = None,
) -> list[PhotoQualityScore]:
    """Compute composite quality score for each photo.

    Combines local metrics (blur, exposure, resolution) with AI analysis
    scores (composition, face quality) when available.
    """
    scores: list[PhotoQualityScore] = []

    analysis_map: dict[int, dict] = {}
    if analyses:
        for a in analyses:
            analysis_map[a.get("photo_index", -1)] = a

    for m in metadata:
        # Sharpness (invert blur_score: 0=sharp → 1.0 sharpness)
        sharpness = 1.0 - m.blur_score

        # Exposure quality
        exposure = m.exposure_quality

        # Resolution score (normalized to 12MP as "perfect")
        resolution = min(1.0, (m.width * m.height) / (4000 * 3000))

        # Composition score from AI analysis if available
        composition = 0.5  # default
        face_quality = 0.5  # default
        a = analysis_map.get(m.photo_index)
        if a:
            composition = a.get("composition_score", 0.5)
            # If hero_candidate, boost face quality assumption
            if a.get("hero_candidate"):
                face_quality = 0.8
            elif a.get("people_count", 0) > 0:
                face_quality = 0.6

        # Composite: blur 30% + exposure 20% + resolution 15% + composition 20% + face 15%
        overall = (
            sharpness * 0.30
            + exposure * 0.20
            + resolution * 0.15
            + composition * 0.20
            + face_quality * 0.15
        )
        overall = round(min(1.0, max(0.0, overall)), 3)

        # Book-worthiness threshold
        is_worthy = overall >= 0.3
        reason = ""
        if not is_worthy:
            reasons = []
            if sharpness < 0.3:
                reasons.append("very blurry")
            if exposure < 0.2:
                reasons.append("poor exposure")
            if resolution < 0.1:
                reasons.append("very low resolution")
            reason = ", ".join(reasons) if reasons else "low overall quality"

        scores.append(PhotoQualityScore(
            photo_index=m.photo_index,
            sharpness_score=round(sharpness, 3),
            exposure_score=round(exposure, 3),
            composition_score=round(composition, 3),
            face_quality_score=round(face_quality, 3),
            overall=overall,
            is_book_worthy=is_worthy,
            reason=reason,
        ))

    book_worthy = sum(1 for s in scores if s.is_book_worthy)
    filtered = sum(1 for s in scores if not s.is_book_worthy)
    logger.info("photo_quality_scored", total=len(scores), book_worthy=book_worthy, filtered=filtered)
    return scores


def filter_book_worthy(
    scores: list[PhotoQualityScore],
    duplicate_groups: list[DuplicateGroup],
    min_quality: float = 0.3,
) -> list[int]:
    """Return indices of photos that are book-worthy and not duplicates.

    For duplicate groups, only the best_index is kept.
    """
    # Collect duplicate indices (all except best)
    duplicate_indices: set[int] = set()
    for group in duplicate_groups:
        for idx in group.photo_indices:
            if idx != group.best_index:
                duplicate_indices.add(idx)

    worthy: list[int] = []
    for s in scores:
        if s.photo_index in duplicate_indices:
            continue
        if s.overall >= min_quality:
            worthy.append(s.photo_index)

    return sorted(worthy)
