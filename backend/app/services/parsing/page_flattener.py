"""Pure function to flatten chapter/spread structures into flat page lists for PDF."""

from app.models.schemas import ChapterDraft, MemoryPageDraft


def flatten_chapters_to_pages(
    chapters: list[ChapterDraft],
    data: dict,
) -> list[MemoryPageDraft]:
    """Convert a chapter-based structure into a flat list of MemoryPageDraft for PDF rendering."""
    pages: list[MemoryPageDraft] = []
    page_num = 1

    # Cover
    first_photo = []
    if chapters and chapters[0].spreads:
        first_photo = chapters[0].spreads[0].photo_indices[:1]
    pages.append(MemoryPageDraft(
        page_number=page_num,
        page_type="cover",
        layout_type="HERO_FULLBLEED",
        photo_indices=first_photo,
        heading_text=data.get("title", "Our Memory Book"),
    ))
    page_num += 1

    # Dedication
    ded_text = data.get("dedication", "")
    if not ded_text and isinstance(data.get("dedication_page"), dict):
        ded_text = data["dedication_page"].get("text", "")
    pages.append(MemoryPageDraft(
        page_number=page_num,
        page_type="dedication",
        layout_type="DEDICATION",
        heading_text="For Us",
        body_text=ded_text,
    ))
    page_num += 1

    # Chapter content
    mixed_layouts = {"PHOTO_PLUS_QUOTE", "COLLAGE_PLUS_LETTER"}
    for ch in chapters:
        for spread in ch.spreads:
            if spread.layout_type in mixed_layouts:
                # Split into left (photos) and right (text) pages
                pages.append(MemoryPageDraft(
                    page_number=page_num,
                    page_type="content",
                    layout_type=spread.layout_type,
                    photo_indices=spread.photo_indices,
                    heading_text="",
                    body_text="",
                    caption_text=spread.caption_text,
                    quote_text="",
                    page_side="left",
                ))
                page_num += 1
                pages.append(MemoryPageDraft(
                    page_number=page_num,
                    page_type="content",
                    layout_type=spread.layout_type,
                    photo_indices=[],
                    heading_text=spread.heading_text,
                    body_text=spread.body_text,
                    caption_text="",
                    quote_text=spread.quote_text,
                    page_side="right",
                ))
                page_num += 1
            else:
                pages.append(MemoryPageDraft(
                    page_number=page_num,
                    page_type="content",
                    layout_type=spread.layout_type,
                    photo_indices=spread.photo_indices,
                    heading_text=spread.heading_text,
                    body_text=spread.body_text,
                    caption_text=spread.caption_text,
                    quote_text=spread.quote_text,
                ))
                page_num += 1

    # Back cover
    closing = data.get("closing_page", {})
    closing_text = closing.get("text", "Here's to many more memories together.") if isinstance(closing, dict) else "Here's to many more memories together."
    pages.append(MemoryPageDraft(
        page_number=page_num,
        page_type="back_cover",
        layout_type="QUOTE_PAGE",
        heading_text="The End",
        body_text=closing_text,
    ))

    return pages
