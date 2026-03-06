"""Image comparator service — uses Gemini Vision to find relationships between photos."""

from __future__ import annotations

import asyncio
import json
import random
import time
from typing import Any

import structlog
from google import genai
from google.genai import types

from app.models.schemas import (
    ImageRelationship,
    ImageRelationships,
    PhotoMetadata,
)
from app.services.gemini_rate_limiter import with_rate_limit_retry

logger = structlog.get_logger()

# Maximum wall-clock time for the entire comparison stage.
_COMPARISON_TIMEOUT_S = 45.0

_COMPARISON_PROMPT = (
    "Compare these images across 8 dimensions. "
    "Return ONLY a JSON array where each element is an object with these fields: "
    '"index_a" (int), "index_b" (int), '
    '"same_location" (float 0-1), "same_people" (float 0-1), '
    '"sequential" (float 0-1), "related" (float 0-1), '
    '"same_event" (float 0-1 — are they from the same event/occasion?), '
    '"same_mood" (float 0-1 — do they share similar emotional tone?), '
    '"temporal_distance" (float — estimated hours apart, 0 if same moment), '
    '"narrative_arc_position" (string — "same_beat", "build_up", or "contrast"). '
    "The indices refer to the order of images provided (0-based). "
    "Example: [{\"index_a\":0,\"index_b\":1,\"same_location\":0.9,"
    "\"same_people\":1.0,\"sequential\":0.7,\"related\":0.95,"
    "\"same_event\":0.9,\"same_mood\":0.8,\"temporal_distance\":0.5,"
    "\"narrative_arc_position\":\"same_beat\"}]"
)


class ImageComparator:
    """Compares images using Gemini Vision to discover relationships."""

    def __init__(self, api_key: str, model_name: str = "gemini-2.0-flash") -> None:
        self._client = genai.Client(api_key=api_key)
        self._model_name = model_name

    # ── Public API ──────────────────────────────────────────────────────

    async def compare_images(
        self,
        image_data: list[tuple[bytes, str]],
        metadata: list[PhotoMetadata],
    ) -> ImageRelationships:
        """Run the full comparison pipeline with a hard timeout.

        Returns an ``ImageRelationships`` even on failure (empty but valid).
        """
        n = len(image_data)
        logger.info("compare_images_start", num_images=n)
        if n < 2:
            logger.info("compare_images_skip", reason="fewer_than_2_images")
            return ImageRelationships()

        pairs_to_compare = self._select_pairs(n)
        if not pairs_to_compare:
            return ImageRelationships()

        t0 = time.perf_counter()
        try:
            result = await asyncio.wait_for(
                self._run_comparisons(image_data, pairs_to_compare),
                timeout=_COMPARISON_TIMEOUT_S,
            )
        except asyncio.TimeoutError:
            logger.warning(
                "image_comparison_timeout",
                timeout_s=_COMPARISON_TIMEOUT_S,
                num_pairs=len(pairs_to_compare),
            )
            return ImageRelationships()
        except Exception:
            logger.warning("image_comparison_failed", exc_info=True)
            return ImageRelationships()

        duration_ms = round((time.perf_counter() - t0) * 1000, 1)
        logger.info(
            "image_comparison_complete",
            duration_ms=duration_ms,
            num_pairs=len(result),
        )

        # Build clusters from the pairwise relationship scores.
        clusters = self._build_clusters(result, n)
        return ImageRelationships(pairs=result, clusters=clusters)

    # ── Pair selection strategies ────────────────────────────────────────

    @staticmethod
    def _select_pairs(n: int) -> list[tuple[int, int]]:
        """Choose which image pairs to compare based on set size."""
        if n <= 10:
            # Compare every pair.
            return [(i, j) for i in range(n) for j in range(i + 1, n)]

        if n <= 30:
            # Adjacent pairs + random cross-sample.
            pairs: list[tuple[int, int]] = [(i, i + 1) for i in range(n - 1)]
            all_non_adjacent = [
                (i, j) for i in range(n) for j in range(i + 2, n)
            ]
            sample_size = min(len(all_non_adjacent), max(10, n))
            pairs.extend(random.sample(all_non_adjacent, sample_size))
            return list(set(pairs))

        # n > 30: sample every 3rd + random 20% cross-pairs.
        sampled_indices = list(range(0, n, 3))
        pairs = [(sampled_indices[i], sampled_indices[i + 1]) for i in range(len(sampled_indices) - 1)]
        cross_pairs = [
            (sampled_indices[i], sampled_indices[j])
            for i in range(len(sampled_indices))
            for j in range(i + 2, len(sampled_indices))
        ]
        cross_sample = min(len(cross_pairs), max(10, int(0.2 * len(cross_pairs))))
        if cross_pairs:
            pairs.extend(random.sample(cross_pairs, cross_sample))
        return list(set(pairs))

    # ── Internal comparison logic ───────────────────────────────────────

    async def _run_comparisons(
        self,
        image_data: list[tuple[bytes, str]],
        pairs: list[tuple[int, int]],
    ) -> list[ImageRelationship]:
        """Send batches of 2-4 images to Gemini in parallel and collect relationships."""
        # Group pairs into batches where each batch covers 2-4 distinct images.
        batches = self._group_into_batches(pairs)

        # Run all batches in parallel using asyncio.gather
        tasks = [
            self._compare_batch(image_data, batch_pairs, batch_indices)
            for batch_pairs, batch_indices in batches
        ]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        all_relationships: list[ImageRelationship] = []
        for result in results:
            if isinstance(result, Exception):
                logger.debug("batch_comparison_failed", exc_info=result)
                continue
            all_relationships.extend(result)

        return all_relationships

    @staticmethod
    def _group_into_batches(
        pairs: list[tuple[int, int]],
    ) -> list[tuple[list[tuple[int, int]], list[int]]]:
        """Group pairs into batches of 2-4 distinct image indices each.

        Returns list of (pairs_in_batch, sorted_unique_indices).
        """
        batches: list[tuple[list[tuple[int, int]], list[int]]] = []
        remaining = list(pairs)

        while remaining:
            batch_indices: set[int] = set()
            batch_pairs: list[tuple[int, int]] = []

            for pair in list(remaining):
                new_indices = batch_indices | {pair[0], pair[1]}
                if len(new_indices) <= 4:
                    batch_indices = new_indices
                    batch_pairs.append(pair)
                    remaining.remove(pair)

            if batch_pairs:
                batches.append((batch_pairs, sorted(batch_indices)))
            else:
                # Safety: if no pair fit (should not happen), just take the first.
                p = remaining.pop(0)
                batches.append(([p], sorted({p[0], p[1]})))

        return batches

    async def _compare_batch(
        self,
        image_data: list[tuple[bytes, str]],
        batch_pairs: list[tuple[int, int]],
        batch_indices: list[int],
    ) -> list[ImageRelationship]:
        """Send one batch of images to Gemini and parse the response."""
        # Build a mapping from global index to local position in the request.
        global_to_local = {g: l for l, g in enumerate(batch_indices)}

        parts: list[Any] = []
        for idx in batch_indices:
            img_bytes, mime = image_data[idx]
            parts.append(types.Part.from_bytes(data=img_bytes, mime_type=mime))

        # Augment the prompt so the model knows how indices map.
        index_note = ", ".join(
            f"image {local}=photo #{global_}"
            for global_, local in sorted(global_to_local.items(), key=lambda x: x[1])
        )
        prompt = (
            f"You are given {len(batch_indices)} images ({index_note}). "
            f"{_COMPARISON_PROMPT}"
        )
        parts.append(prompt)

        response = await with_rate_limit_retry(
            lambda: self._client.aio.models.generate_content(
                model=self._model_name,
                contents=parts,
                config=types.GenerateContentConfig(
                    response_modalities=["TEXT"],
                    max_output_tokens=1024,
                ),
            )
        )

        if not response.parts:
            return []

        raw_text = "\n".join(p.text for p in response.parts if p.text)
        return self._parse_relationships(raw_text, global_to_local, batch_indices)

    # ── Response parsing ────────────────────────────────────────────────

    @staticmethod
    def _parse_relationships(
        raw_text: str,
        global_to_local: dict[int, int],
        batch_indices: list[int],
    ) -> list[ImageRelationship]:
        """Parse Gemini JSON response into ImageRelationship objects."""
        # Invert the map: local -> global
        local_to_global = {v: k for k, v in global_to_local.items()}

        # Try to extract JSON array from the response.
        text = raw_text.strip()
        # Strip markdown code fences if present.
        if text.startswith("```"):
            lines = text.split("\n")
            lines = [l for l in lines if not l.strip().startswith("```")]
            text = "\n".join(lines)

        try:
            data = json.loads(text)
        except json.JSONDecodeError:
            # Try to find a JSON array within the text.
            start = text.find("[")
            end = text.rfind("]")
            if start != -1 and end != -1 and end > start:
                try:
                    data = json.loads(text[start : end + 1])
                except json.JSONDecodeError:
                    logger.debug("comparison_response_parse_failed", text_preview=text[:200])
                    return []
            else:
                logger.debug("comparison_response_no_json", text_preview=text[:200])
                return []

        if not isinstance(data, list):
            return []

        results: list[ImageRelationship] = []
        for item in data:
            if not isinstance(item, dict):
                continue
            try:
                local_a = int(item.get("index_a", -1))
                local_b = int(item.get("index_b", -1))
                # Map local indices back to global.
                global_a = local_to_global.get(local_a, local_a)
                global_b = local_to_global.get(local_b, local_b)

                results.append(
                    ImageRelationship(
                        index_a=global_a,
                        index_b=global_b,
                        same_location=_clamp01(item.get("same_location", 0.0)),
                        same_people=_clamp01(item.get("same_people", 0.0)),
                        sequential=_clamp01(item.get("sequential", 0.0)),
                        related=_clamp01(item.get("related", 0.0)),
                        same_event=_clamp01(item.get("same_event", 0.0)),
                        same_mood=_clamp01(item.get("same_mood", 0.0)),
                        temporal_distance=max(0.0, float(item.get("temporal_distance", 0.0))),
                        visual_similarity=0.0,  # Not requested in prompt; computed locally if needed
                        narrative_arc_position=str(item.get("narrative_arc_position", "")),
                    )
                )
            except (TypeError, ValueError):
                continue

        return results

    # ── Clustering ──────────────────────────────────────────────────────

    @staticmethod
    def _build_clusters(
        pairs: list[ImageRelationship],
        n: int,
        threshold: float = 0.6,
    ) -> list[list[int]]:
        """Union-Find clustering: images with average relationship >= threshold are grouped."""
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

        for rel in pairs:
            avg_score = (
                rel.same_location + rel.same_people + rel.sequential + rel.related
                + rel.same_event + rel.same_mood
            ) / 6.0
            if avg_score >= threshold:
                union(rel.index_a, rel.index_b)

        clusters_map: dict[int, list[int]] = {}
        for i in range(n):
            root = find(i)
            clusters_map.setdefault(root, []).append(i)

        # Only return clusters with more than one member.
        return [sorted(members) for members in clusters_map.values() if len(members) > 1]


def _clamp01(value: Any) -> float:
    """Clamp a value to the 0-1 range."""
    try:
        v = float(value)
        return max(0.0, min(1.0, v))
    except (TypeError, ValueError):
        return 0.0
