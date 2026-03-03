"""Duplicate detection using perceptual hash (dHash) Hamming distance."""

from __future__ import annotations

import structlog
from typing import Sequence

from app.models.schemas import DuplicateGroup, PhotoMetadata

logger = structlog.get_logger()


def _hamming_distance(hash_a: str, hash_b: str) -> int:
    """Compute Hamming distance between two hex-encoded perceptual hashes."""
    try:
        a = int(hash_a, 16)
        b = int(hash_b, 16)
        xor = a ^ b
        return bin(xor).count("1")
    except (ValueError, TypeError):
        return 64  # Max distance — treat as totally different


def detect_duplicates(
    metadata: Sequence[PhotoMetadata],
    threshold: int = 10,
) -> list[DuplicateGroup]:
    """Compare pHash Hamming distances to find near-duplicate groups.

    Args:
        metadata: List of PhotoMetadata with perceptual_hash populated.
        threshold: Maximum Hamming distance to consider as duplicate (default 10 out of 64).

    Returns:
        List of DuplicateGroup with best_index selected per group.
    """
    n = len(metadata)
    if n < 2:
        return []

    # Build adjacency via Union-Find
    parent = list(range(n))

    def find(x: int) -> int:
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    def union(a: int, b: int) -> None:
        ra, rb = find(a), find(b)
        if ra != rb:
            parent[ra] = rb

    # Compare all pairs (only those with valid hashes)
    for i in range(n):
        if not metadata[i].perceptual_hash:
            continue
        for j in range(i + 1, n):
            if not metadata[j].perceptual_hash:
                continue
            dist = _hamming_distance(
                metadata[i].perceptual_hash,
                metadata[j].perceptual_hash,
            )
            if dist <= threshold:
                union(i, j)

    # Group by root
    groups_map: dict[int, list[int]] = {}
    for i in range(n):
        root = find(i)
        groups_map.setdefault(root, []).append(i)

    # Only groups with 2+ members are duplicates
    results: list[DuplicateGroup] = []
    group_id = 0
    for members in groups_map.values():
        if len(members) < 2:
            continue
        best = select_best_in_group(members, metadata)
        # Compute average similarity score for the group
        total_dist = 0
        pair_count = 0
        for mi in range(len(members)):
            for mj in range(mi + 1, len(members)):
                ha = metadata[members[mi]].perceptual_hash
                hb = metadata[members[mj]].perceptual_hash
                if ha and hb:
                    total_dist += _hamming_distance(ha, hb)
                    pair_count += 1
        avg_dist = total_dist / pair_count if pair_count else 0
        similarity = round(max(0.0, 1.0 - avg_dist / 64.0), 3)

        results.append(DuplicateGroup(
            group_id=group_id,
            photo_indices=sorted(members),
            best_index=best,
            similarity_score=similarity,
        ))
        group_id += 1

    logger.info("duplicates_detected", num_groups=len(results), num_photos=n)
    return results


def select_best_in_group(
    indices: list[int],
    metadata: Sequence[PhotoMetadata],
) -> int:
    """Pick the highest-quality photo from a duplicate group.

    Score = blur * 0.4 + exposure * 0.3 + resolution * 0.3
    """
    best_idx = indices[0]
    best_score = -1.0

    for idx in indices:
        m = metadata[idx]
        resolution = min(1.0, (m.width * m.height) / (4000 * 3000))  # Normalize to ~12MP
        # Note: blur_score in metadata is 0=sharp, 1=blurry, so we invert
        sharpness = 1.0 - m.blur_score
        score = sharpness * 0.4 + m.exposure_quality * 0.3 + resolution * 0.3
        if score > best_score:
            best_score = score
            best_idx = idx

    return best_idx
