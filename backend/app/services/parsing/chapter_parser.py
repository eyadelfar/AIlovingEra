"""Pure functions for parsing chapters and spreads from AI response data."""

from app.models.schemas import (
    ChapterDraft,
    PageElement,
    RegenPolicy,
    SpreadDraft,
    normalize_layout,
)


def safe_str(val, default: str = "") -> str:
    """Coerce None/non-string to string. AI often returns null for optional text fields."""
    if val is None:
        return default
    return str(val)


def safe_chapter_index(raw_value, fallback: int) -> int:
    """Extract an integer index from values like 0, "ch1", "chapter_3"."""
    if isinstance(raw_value, int):
        return raw_value
    if isinstance(raw_value, (float,)):
        return int(raw_value)
    if isinstance(raw_value, str):
        digits = ''.join(c for c in raw_value if c.isdigit())
        if digits:
            val = int(digits)
            # AI often uses 1-based: "ch1" should be index 0
            return max(0, val - 1) if val > 0 else 0
    return fallback


def parse_spreads(raw_spreads: list[dict]) -> list[SpreadDraft]:
    """Parse a list of raw spread dicts into SpreadDraft models."""
    spreads: list[SpreadDraft] = []
    for idx, s in enumerate(raw_spreads):
        # Extract photo indices from either flat field or nested elements
        photo_indices = s.get("photo_indices", [])
        elements: list[PageElement] = []

        # Parse nested pages > elements structure (v2 format)
        for page in s.get("pages", []):
            for elem in page.get("elements", []):
                pe = PageElement(**elem)
                elements.append(pe)
                if pe.type == "image" and pe.image_id is not None and pe.image_id not in photo_indices:
                    photo_indices.append(pe.image_id)

        # Normalize layout
        layout_raw = s.get("layout_id", s.get("layout_type", "HERO_FULLBLEED"))
        layout = normalize_layout(layout_raw)

        # Extract text from elements if top-level fields are empty
        heading = safe_str(s.get("heading_text"))
        body = safe_str(s.get("body_text"))
        caption = safe_str(s.get("caption_text"))
        quote = safe_str(s.get("quote_text"))

        if not heading and not body and not caption and not quote and elements:
            for e in elements:
                if e.type == "image" and e.caption and not caption:
                    caption = e.caption
                elif e.type == "quote" and e.text and not quote:
                    quote = e.text
                elif e.type == "text_block" and e.text and not body:
                    body = e.text

        # Parse regen policy
        regen_policy = None
        if "regen_policy" in s and s["regen_policy"]:
            regen_policy = RegenPolicy(**s["regen_policy"])

        spreads.append(SpreadDraft(
            spread_index=s.get("spread_index", idx),
            layout_type=layout,
            photo_indices=photo_indices,
            heading_text=heading,
            body_text=body,
            caption_text=caption,
            quote_text=quote,
            image_look_override=safe_str(s.get("image_look_override")),
            ai_generated_image_prompt=safe_str(s.get("ai_generated_image_prompt")),
            elements=elements,
            assigned_clusters=[str(c) for c in s.get("assigned_clusters", [])],
            design_notes=safe_str(s.get("design_notes")),
            regen_policy=regen_policy,
        ))
    return spreads


def parse_chapters(data: dict) -> list[ChapterDraft]:
    """Parse the chapters array from the AI response data dict."""
    chapters: list[ChapterDraft] = []
    for ch in data.get("chapters", []):
        spreads = parse_spreads(ch.get("spreads", []))
        raw_idx = ch.get("chapter_index", ch.get("chapter_id", len(chapters)))
        chapter_index = safe_chapter_index(raw_idx, len(chapters))
        chapters.append(ChapterDraft(
            chapter_index=chapter_index,
            title=safe_str(ch.get("title")),
            blurb=safe_str(ch.get("blurb")),
            spreads=spreads,
        ))
    return chapters
