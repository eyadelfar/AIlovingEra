"""Pure functions for generating fallback book drafts when AI parsing fails."""

import logging
from math import ceil

from app.models.schemas import (
    ChapterDraft,
    MemoryBookDraft,
    MemoryPageDraft,
    SpreadDraft,
)

logger = logging.getLogger(__name__)


FALLBACK_QUOTES = [
    "The best thing to hold onto in life is each other.",
    "In all the world, there is no heart for me like yours.",
    "Every love story is beautiful, but ours is my favorite.",
    "Together is a wonderful place to be.",
    "Love is not about how many days you've been together, it's about how much you love each other every single day.",
]

FALLBACK_BLURBS = [
    "Where it all began — the first sparks of something beautiful.",
    "Growing closer with every shared sunrise and quiet evening.",
    "Adventures near and far that wrote themselves into our story.",
    "The moments that made us laugh until we couldn't breathe.",
    "Looking ahead to everything still waiting for us together.",
]


def pick_fallback_layout(sp_idx: int, photos_remaining: int) -> tuple[str, int]:
    """Pick a varied layout for fallback. Returns (layout_type, num_photos_to_consume)."""
    cycle = [
        ("HERO_FULLBLEED", 1),
        ("TWO_BALANCED", 2),
        ("PHOTO_PLUS_QUOTE", 2),
        ("THREE_GRID", 3),
        ("HERO_FULLBLEED", 1),
        ("FOUR_GRID", 4),
        ("QUOTE_PAGE", 0),
    ]
    pick = cycle[sp_idx % len(cycle)]
    if pick[1] > photos_remaining:
        return ("HERO_FULLBLEED", min(1, photos_remaining))
    return pick


def build_fallback_blurb(ch_idx: int, start_idx: int, end_idx: int, get_analysis) -> str:
    """Build a contextual blurb from photo analyses, or use varied fallback."""
    scenes = set()
    emotions = set()
    for idx in range(max(0, start_idx), end_idx):
        a = get_analysis(idx)
        if a.get("scene_type"):
            scenes.add(a["scene_type"])
        if a.get("emotion"):
            emotions.add(a["emotion"])
    if scenes:
        scene_list = ", ".join(sorted(scenes)[:3])
        return f"Moments captured in {scene_list} — each one a piece of the story."
    if emotions:
        emo_list = " and ".join(sorted(emotions)[:2])
        return f"A chapter filled with {emo_list} moments we'll always cherish."
    return FALLBACK_BLURBS[ch_idx % len(FALLBACK_BLURBS)]


def fallback(
    num_photos: int,
    photo_analyses: list[dict] | None = None,
) -> MemoryBookDraft:
    """Generate a complete fallback draft when AI parsing fails entirely."""
    logger.warning("fallback: generating fallback draft for %d photos", num_photos)

    def _get_analysis(idx: int) -> dict:
        if photo_analyses and idx < len(photo_analyses):
            return photo_analyses[idx]
        return {}

    def _caption(idx: int) -> str:
        a = _get_analysis(idx)
        return a.get("suggested_caption", "") or f"Memory {idx + 1}"

    def _body(idx: int) -> str:
        a = _get_analysis(idx)
        relevance = a.get("story_relevance", "")
        if relevance:
            return relevance
        desc = a.get("description", "")
        return desc or "A special moment we shared."

    pages = [
        MemoryPageDraft(
            page_number=1,
            page_type="cover",
            layout_type="HERO_FULLBLEED",
            photo_indices=[0] if num_photos > 0 else [],
            heading_text="Our Memory Book",
        ),
        MemoryPageDraft(
            page_number=2,
            page_type="dedication",
            layout_type="DEDICATION",
            heading_text="For Us",
            body_text="A collection of our favorite moments together.",
        ),
    ]

    # Build multi-chapter structure
    chapter_names = ["The Beginning", "Growing Together", "Adventures", "Special Moments", "Today & Tomorrow"]
    num_chapters = max(3, min(5, num_photos // 3)) if num_photos > 4 else max(1, num_photos)
    photos_per_chapter = ceil(num_photos / num_chapters) if num_chapters > 0 else num_photos

    chapters: list[ChapterDraft] = []
    photo_idx = 0
    quote_idx = 0
    for ch_i in range(num_chapters):
        spreads: list[SpreadDraft] = []
        chapter_end = min(photo_idx + photos_per_chapter, num_photos)
        sp_idx = 0
        while photo_idx < chapter_end:
            layout_type, num_consume = pick_fallback_layout(
                sp_idx, chapter_end - photo_idx,
            )
            consumed_indices = list(range(photo_idx, min(photo_idx + max(num_consume, 1), num_photos)))
            if num_consume == 0:
                consumed_indices = []

            # Build text from first consumed photo
            first_idx = consumed_indices[0] if consumed_indices else photo_idx
            body = _body(first_idx) if consumed_indices else ""
            cap = _caption(first_idx) if consumed_indices else ""
            quote = ""
            heading = ""
            if layout_type in ("QUOTE_PAGE", "PHOTO_PLUS_QUOTE"):
                quote = FALLBACK_QUOTES[quote_idx % len(FALLBACK_QUOTES)]
                quote_idx += 1
            if layout_type == "QUOTE_PAGE":
                heading = "A Moment to Reflect"

            spreads.append(SpreadDraft(
                spread_index=sp_idx,
                layout_type=layout_type,
                photo_indices=consumed_indices,
                heading_text=heading,
                body_text=body,
                caption_text=cap,
                quote_text=quote,
            ))
            pages.append(MemoryPageDraft(
                page_number=len(pages) + 1,
                page_type="content",
                layout_type=layout_type,
                photo_indices=consumed_indices,
                heading_text=heading,
                body_text=body,
                caption_text=cap,
                quote_text=quote,
            ))
            photo_idx += max(num_consume, 0)
            if num_consume == 0:
                # QUOTE_PAGE doesn't consume photos but we still advance spread idx
                pass
            sp_idx += 1

        ch_title = chapter_names[ch_i] if ch_i < len(chapter_names) else f"Chapter {ch_i + 1}"

        # Build a contextual blurb from photo analyses, or use varied fallback
        blurb = build_fallback_blurb(
            ch_i, photo_idx - max(len(spreads), 1), photo_idx, _get_analysis,
        )
        chapters.append(ChapterDraft(
            chapter_index=ch_i,
            title=ch_title,
            blurb=blurb,
            spreads=spreads,
        ))

        # Insert a quote breather page between chapters (every 2nd chapter)
        if ch_i > 0 and ch_i % 2 == 0 and ch_i < num_chapters - 1:
            q = FALLBACK_QUOTES[quote_idx % len(FALLBACK_QUOTES)]
            quote_idx += 1
            pages.append(MemoryPageDraft(
                page_number=len(pages) + 1,
                page_type="content",
                layout_type="QUOTE_PAGE",
                heading_text="",
                body_text="",
                quote_text=q,
            ))

    pages.append(
        MemoryPageDraft(
            page_number=len(pages) + 1,
            page_type="back_cover",
            layout_type="QUOTE_PAGE",
            heading_text="The End",
            body_text="Here's to many more memories together.",
        )
    )

    return MemoryBookDraft(
        title="Our Memory Book",
        subtitle="A collection of moments",
        dedication="To us and the memories we share.",
        overall_narrative="A journey through our favorite moments together.",
        pages=pages,
        chapters=chapters,
    )
