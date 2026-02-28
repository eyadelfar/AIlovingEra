"""
Renders book pages as HTML strings — mirrors frontend PageRenderer.jsx exactly.

Each function returns an HTML string for one page, using the same Tailwind CSS
classes and layout proportions as the React components. The Playwright PDF
generator assembles these into a full document and prints to PDF.
"""

from __future__ import annotations

import html as html_mod
from typing import Any

from app.pdf_templates.template_styles import TEMPLATE_STYLES, TEMPLATE_PHOTO_FILTERS

TEXT_LAYOUTS = {"QUOTE_PAGE", "DEDICATION", "TOC_SIMPLE"}


def _e(text: str | None) -> str:
    """HTML-escape text safely."""
    if not text:
        return ""
    return html_mod.escape(str(text))


def _photo_src(photo_data: dict[int, str], idx: int) -> str:
    """Get base64 data URI for a photo index."""
    return photo_data.get(idx, "")


def _obj_position(photo_index: int, analyses: list[dict] | None) -> str:
    """Compute CSS object-position from safe_crop_box — mirrors frontend getObjectPosition."""
    if not analyses:
        return ""
    a = next((p for p in analyses if p.get("photo_index") == photo_index), None)
    if not a or not a.get("safe_crop_box"):
        return ""
    box = a["safe_crop_box"]
    if isinstance(box, dict):
        x, y, w, h = box.get("x", 0), box.get("y", 0), box.get("w", 1), box.get("h", 1)
    else:
        x, y, w, h = box.x, box.y, box.w, box.h
    if x == 0 and y == 0 and w >= 0.99 and h >= 0.99:
        return ""
    cx = (x + w / 2) * 100
    cy = (y + h / 2) * 100
    return f"object-position: {cx}% {cy}%;"


def _photo_img(
    src: str,
    frame_class: str,
    photo_filter: str,
    obj_pos: str = "",
    extra_class: str = "",
) -> str:
    """Render a single photo <img> inside a frame div — mirrors frontend PhotoImg."""
    style_parts = []
    if photo_filter:
        style_parts.append(f"filter: {photo_filter};")
    if obj_pos:
        style_parts.append(obj_pos)
    img_style = " ".join(style_parts)
    return f'''<div class="overflow-hidden {frame_class} relative {extra_class}">
  <img src="{src}" alt="" class="w-full h-full object-cover" style="{img_style}" />
</div>'''


# ── Ornament SVGs ────────────────────────────────────────────────────────

def _ornaments_romantic(stroke: str, fill: str) -> str:
    return f'''<div class="absolute inset-0 pointer-events-none z-10">
  <svg class="absolute top-3 left-3" width="56" height="56" viewBox="0 0 56 56" fill="none">
    <path d="M6 50 C6 30 14 14 50 6" stroke="{stroke}" stroke-width="0.8"/>
    <path d="M6 50 C10 36 18 22 42 12" stroke="{stroke}" stroke-width="0.5"/>
    <ellipse cx="28" cy="20" rx="3" ry="6" transform="rotate(-35 28 20)" fill="{fill}" stroke="{stroke}" stroke-width="0.4"/>
    <ellipse cx="18" cy="32" rx="2.5" ry="5" transform="rotate(-55 18 32)" fill="{fill}" stroke="{stroke}" stroke-width="0.4"/>
    <circle cx="50" cy="6" r="1.5" fill="{stroke}"/>
  </svg>
  <svg class="absolute top-3 right-3" width="56" height="56" viewBox="0 0 56 56" fill="none" style="transform:scaleX(-1)">
    <path d="M6 50 C6 30 14 14 50 6" stroke="{stroke}" stroke-width="0.8"/>
    <path d="M6 50 C10 36 18 22 42 12" stroke="{stroke}" stroke-width="0.5"/>
    <ellipse cx="28" cy="20" rx="3" ry="6" transform="rotate(-35 28 20)" fill="{fill}" stroke="{stroke}" stroke-width="0.4"/>
    <ellipse cx="18" cy="32" rx="2.5" ry="5" transform="rotate(-55 18 32)" fill="{fill}" stroke="{stroke}" stroke-width="0.4"/>
    <circle cx="50" cy="6" r="1.5" fill="{stroke}"/>
  </svg>
  <svg class="absolute bottom-3 left-3" width="56" height="56" viewBox="0 0 56 56" fill="none" style="transform:scaleY(-1)">
    <path d="M6 50 C6 30 14 14 50 6" stroke="{stroke}" stroke-width="0.8"/>
    <ellipse cx="28" cy="20" rx="3" ry="6" transform="rotate(-35 28 20)" fill="{fill}" stroke="{stroke}" stroke-width="0.4"/>
    <circle cx="50" cy="6" r="1.5" fill="{stroke}"/>
  </svg>
  <svg class="absolute bottom-3 right-3" width="56" height="56" viewBox="0 0 56 56" fill="none" style="transform:scale(-1,-1)">
    <path d="M6 50 C6 30 14 14 50 6" stroke="{stroke}" stroke-width="0.8"/>
    <ellipse cx="28" cy="20" rx="3" ry="6" transform="rotate(-35 28 20)" fill="{fill}" stroke="{stroke}" stroke-width="0.4"/>
    <circle cx="50" cy="6" r="1.5" fill="{stroke}"/>
  </svg>
</div>'''


def _ornaments_vintage(stroke: str, fill: str) -> str:
    positions = [
        "top-2 left-2",
        "top-2 right-2 -scale-x-100",
        "bottom-2 left-2 -scale-y-100",
        "bottom-2 right-2 -scale-x-100 -scale-y-100",
    ]
    svgs = ""
    for pos in positions:
        svgs += f'''<svg class="absolute {pos}" width="52" height="52" viewBox="0 0 52 52" fill="none">
    <path d="M4 48 C4 24 16 8 48 4" stroke="{stroke}" stroke-width="1"/>
    <path d="M4 48 C6 40 10 32 18 24 C22 20 26 18 30 17" stroke="{stroke}" stroke-width="0.6"/>
    <path d="M48 4 C44 6 42 10 44 14 C46 12 48 8 48 4" stroke="{stroke}" stroke-width="0.7" fill="{fill}"/>
    <path d="M4 48 C8 46 10 42 8 38 C6 40 4 44 4 48" stroke="{stroke}" stroke-width="0.7" fill="{fill}"/>
    <circle cx="26" cy="16" r="1.2" fill="{stroke}"/>
  </svg>\n'''
    return f'''<div class="absolute inset-0 pointer-events-none z-10">
  {svgs}
  <div class="absolute inset-4 border border-amber-600/10 rounded pointer-events-none"></div>
</div>'''


def _ornaments_elegant(stroke: str) -> str:
    return f'''<div class="absolute inset-0 pointer-events-none z-10">
  <div class="absolute top-4 left-4">
    <div class="w-10 h-px" style="background-color:{stroke}"></div>
    <div class="w-px h-10" style="background-color:{stroke}"></div>
  </div>
  <div class="absolute top-4 right-4 flex flex-col items-end">
    <div class="w-10 h-px" style="background-color:{stroke}"></div>
    <div class="w-px h-10 self-end" style="background-color:{stroke}"></div>
  </div>
  <div class="absolute bottom-4 left-4 flex flex-col justify-end">
    <div class="w-px h-10" style="background-color:{stroke}"></div>
    <div class="w-10 h-px" style="background-color:{stroke}"></div>
  </div>
  <div class="absolute bottom-4 right-4 flex flex-col items-end justify-end">
    <div class="w-px h-10 self-end" style="background-color:{stroke}"></div>
    <div class="w-10 h-px" style="background-color:{stroke}"></div>
  </div>
</div>'''


def _ornaments_html(style: dict) -> str:
    co = style.get("cornerOrnament")
    if not co:
        return ""
    stroke = style["ornamentStroke"]
    fill = style["ornamentFill"]
    if co == "romantic":
        return _ornaments_romantic(stroke, fill)
    if co == "vintage":
        return _ornaments_vintage(stroke, fill)
    if co == "elegant":
        return _ornaments_elegant(stroke)
    return ""


def _bg_pattern_html(style: dict) -> str:
    pat = style.get("bgPattern")
    if not pat:
        return ""
    return f'<div class="absolute inset-0 pointer-events-none z-0" style="background-image:{pat}"></div>'


# ── Page shell ───────────────────────────────────────────────────────────

def _page_shell(style: dict, inner_html: str, extra_class: str = "") -> str:
    """Wraps content in a PageShell — mirrors frontend exactly."""
    ornaments = _ornaments_html(style)
    bg_pattern = _bg_pattern_html(style)
    texture = style.get("pageTexture", "")
    return f'''<div class="book-page {style['pageBg']} rounded-xl overflow-hidden border {style['pageBorder']} relative {texture} {extra_class}">
  {bg_pattern}
  {ornaments}
  {inner_html}
</div>'''


def _divider(style: dict, wide: bool = False) -> str:
    cls = style["dividerWide"] if wide else style["divider"]
    return f'<div class="{cls}"></div>'


def _quote_block(text: str, style: dict, compact: bool = False) -> str:
    if not text:
        return ""
    size = "text-sm" if compact else ""
    return f'''<div class="flex flex-col items-center">
  <span class="{style['quoteMark']}">&ldquo;</span>
  <p class="{style['quoteText']} text-center max-w-xs -mt-2 {size}">{_e(text)}</p>
</div>'''


# ═════════════════════════════════════════════════════════════════════════
# PAGE RENDERERS — one function per page type / layout
# ═════════════════════════════════════════════════════════════════════════

def render_page(
    page: Any,
    photo_data: dict[int, str],
    template_slug: str,
    photo_analyses: list[dict] | None = None,
) -> str:
    """Render a single page to HTML. Main dispatch function."""
    style = TEMPLATE_STYLES.get(template_slug, TEMPLATE_STYLES["romantic"])
    pf = TEMPLATE_PHOTO_FILTERS.get(template_slug, "")
    layout = getattr(page, "layout_type", "HERO_FULLBLEED") or "HERO_FULLBLEED"
    indices = getattr(page, "photo_indices", []) or []

    def P(i: int) -> tuple[str, str, str]:
        """Returns (src, frame_class, obj_pos_style) for photo at slot i."""
        idx = indices[i] if i < len(indices) else -1
        src = _photo_src(photo_data, idx)
        frame = style["photoFrameHero"] if i == 0 else (style["photoFrameAlt"] if i % 2 == 1 else style["photoFrame"])
        pos = _obj_position(idx, photo_analyses)
        return src, frame, pos

    def img(i: int, hero: bool = False, alt: bool = False, extra: str = "") -> str:
        if i >= len(indices):
            return ""
        idx = indices[i]
        src = _photo_src(photo_data, idx)
        if not src:
            return ""
        frame = style["photoFrameHero"] if hero else (style["photoFrameAlt"] if alt else style["photoFrame"])
        pos = _obj_position(idx, photo_analyses)
        return _photo_img(src, frame, pf, pos, extra)

    photos_available = sum(1 for idx in indices if _photo_src(photo_data, idx))

    # Cover
    if page.page_type == "cover":
        return _render_cover(page, style, pf, photo_data, indices, photo_analyses)

    # Back cover
    if page.page_type == "back_cover":
        return _render_back_cover(page, style)

    # Left/right spread pages
    if getattr(page, "page_side", "") == "left":
        return _render_left_page(page, style, pf, photo_data, indices, photo_analyses, photos_available)

    if getattr(page, "page_side", "") == "right":
        return _render_right_page(page, style)

    # Text-only layouts
    if layout in TEXT_LAYOUTS:
        return _render_text_only(page, style, layout)

    # Photo layouts
    if layout == "HERO_FULLBLEED" and photos_available >= 1:
        return _render_hero_fullbleed(page, style, img)

    if layout == "TWO_BALANCED" and photos_available >= 2:
        return _render_two_balanced(page, style, img)

    if layout == "THREE_GRID" and photos_available >= 2:
        return _render_three_grid(page, style, img, photos_available)

    if layout == "FOUR_GRID" and photos_available >= 2:
        return _render_four_grid(page, style, img, photos_available)

    if layout == "SIX_MONTAGE" and photos_available >= 2:
        return _render_six_montage(page, style, img, photos_available)

    if layout == "WALL_8_10" and photos_available >= 2:
        return _render_wall(page, style, img, photos_available)

    if layout == "PHOTO_PLUS_QUOTE":
        return _render_photo_plus_quote(page, style, img, photos_available)

    if layout == "COLLAGE_PLUS_LETTER":
        return _render_collage_plus_letter(page, style, img, photos_available)

    # Fallback
    return _render_fallback(page, style, img, photos_available)


# ── Cover ────────────────────────────────────────────────────────────────

def _render_cover(page, style, pf, photo_data, indices, analyses):
    photo_html = ""
    if indices:
        src = _photo_src(photo_data, indices[0])
        if src:
            pos = _obj_position(indices[0], analyses)
            img_style = f"filter:{pf};" if pf else ""
            if pos:
                img_style += f" {pos}"
            photo_html = f'<img src="{src}" alt="" class="absolute inset-0 w-full h-full object-cover" style="{img_style}" />'
    return f'''<div class="book-page relative {style['pageBg']} rounded-xl overflow-hidden border {style['pageBorder']} {style.get('pageTexture', '')}">
  {photo_html}
  <div class="absolute inset-0 {style['coverOverlay']}"></div>
  <div class="absolute inset-0 flex flex-col items-center justify-end pb-12 px-10">
    {_divider(style)}
    <div class="mb-4"></div>
    <h2 class="text-3xl font-bold {style['heading']} text-center mb-2 drop-shadow-lg">{_e(page.heading_text)}</h2>
    {"" if not page.body_text else f'<p class="{style["caption"]} text-center drop-shadow-md text-sm">{_e(page.body_text)}</p>'}
  </div>
</div>'''


# ── Back cover ───────────────────────────────────────────────────────────

def _render_back_cover(page, style):
    inner = f'''<div class="relative z-20 flex flex-col items-center max-w-xs">
  {"" if not page.heading_text else f'<h3 class="text-2xl font-bold {style["heading"]} mb-6 text-center">{_e(page.heading_text)}</h3>'}
  {_divider(style)}
  {"" if not page.body_text else f'<p class="{style["body"]} text-center italic max-w-sm mt-6 text-sm leading-relaxed">{_e(page.body_text)}</p>'}
  {"" if not page.quote_text else f'<div class="mt-8">{_quote_block(page.quote_text, style)}</div>'}
</div>'''
    return _page_shell(style, inner, f"flex flex-col items-center justify-center {style['innerPadding']}")


# ── Left page ────────────────────────────────────────────────────────────

def _render_left_page(page, style, pf, photo_data, indices, analyses, count):
    cols = "grid-cols-3" if count > 4 else ("grid-cols-2" if count > 1 else "grid-cols-1")
    photos_html = ""
    for i in range(min(count, 9)):
        idx = indices[i] if i < len(indices) else -1
        src = _photo_src(photo_data, idx)
        if src:
            frame = style["photoFrameAlt"] if i % 2 == 1 else style["photoFrame"]
            pos = _obj_position(idx, analyses)
            photos_html += _photo_img(src, frame, pf, pos)
    if not photos_html:
        photos_html = '<div class="w-full h-full bg-gray-800/30 flex items-center justify-center rounded-lg"><span class="text-gray-600 text-sm">No photo</span></div>'
    caption = f'<p class="text-xs {style["caption"]} text-center mt-3 relative z-20">{_e(page.caption_text)}</p>' if page.caption_text else ""
    inner = f'''<div class="flex-1 min-h-0 grid {cols} {style["photoGap"]} relative z-20">
  {photos_html}
</div>
{caption}'''
    return _page_shell(style, inner, f"flex flex-col {style['innerPadding']}")


# ── Right page ───────────────────────────────────────────────────────────

def _render_right_page(page, style):
    inner = f'''<div class="relative z-20 flex flex-col items-center max-w-sm">
  {"" if not page.heading_text else f'<h3 class="{style["headingLg"]} mb-3 text-center">{_e(page.heading_text)}</h3>'}
  {_divider(style)}
  {"" if not page.body_text else f'<p class="{style["body"]} leading-relaxed text-center mt-4 text-sm">{_e(page.body_text)}</p>'}
  {"" if not page.quote_text else f'<div class="mt-8">{_quote_block(page.quote_text, style)}</div>'}
</div>'''
    return _page_shell(style, inner, f"flex flex-col items-center justify-center {style['innerPadding']}")


# ── Text-only ────────────────────────────────────────────────────────────

def _render_text_only(page, style, layout):
    is_ded = layout == "DEDICATION"
    h_cls = "text-2xl font-bold" if is_ded else "text-lg font-semibold"
    b_cls = "italic text-base" if is_ded else "text-sm"
    inner = f'''<div class="relative z-20 flex flex-col items-center max-w-sm">
  {"" if not page.heading_text else f'<h3 class="{h_cls} {style["heading"]} mb-4 text-center">{_e(page.heading_text)}</h3>'}
  {_divider(style)}
  {"" if not page.body_text else f'<p class="{style["body"]} leading-relaxed text-center mt-5 {b_cls}">{_e(page.body_text)}</p>'}
  {"" if not page.quote_text else f'<div class="mt-8">{_quote_block(page.quote_text, style)}</div>'}
</div>'''
    return _page_shell(style, inner, f"flex flex-col items-center justify-center {style['innerPadding']}")


# ── HERO_FULLBLEED ───────────────────────────────────────────────────────

def _render_hero_fullbleed(page, style, img):
    return _page_shell(style, f'''<div class="absolute inset-0 z-20">
  <div class="absolute inset-x-0 top-0 bottom-[18%]">
    {img(0, hero=True, extra="!rounded-none !border-0 !shadow-none !p-0")}
  </div>
  <div class="absolute inset-x-0 bottom-0 h-[18%] flex flex-col items-center justify-center px-8">
    {"" if not page.heading_text else f'<h3 class="font-semibold {style["heading"]} mb-1 text-center">{_e(page.heading_text)}</h3>'}
    {"" if not page.body_text else f'<p class="{style["body"]} text-xs leading-relaxed text-center line-clamp-2">{_e(page.body_text)}</p>'}
    {"" if not page.caption_text else f'<p class="text-xs {style["caption"]} mt-1">{_e(page.caption_text)}</p>'}
  </div>
</div>''')


# ── TWO_BALANCED ─────────────────────────────────────────────────────────

def _render_two_balanced(page, style, img):
    inner = f'''<div class="relative z-20 flex flex-col h-full">
  <div class="flex justify-start" style="height:38%">
    <div class="w-[62%] h-full">{img(0, hero=True)}</div>
  </div>
  <div class="flex-1 flex flex-col items-center justify-center px-4 py-2 min-h-0">
    {"" if not page.heading_text else f'<h3 class="font-semibold {style["headingLg"]} mb-2 text-center">{_e(page.heading_text)}</h3>'}
    {_divider(style)}
    {"" if not page.body_text else f'<p class="{style["body"]} text-sm leading-relaxed text-center mt-2 line-clamp-3 max-w-sm">{_e(page.body_text)}</p>'}
    {"" if not page.quote_text else f'<div class="mt-3">{_quote_block(page.quote_text, style, compact=True)}</div>'}
  </div>
  <div class="flex justify-end" style="height:34%">
    <div class="w-[52%] h-full">{img(1, alt=True)}</div>
  </div>
  {"" if not page.caption_text else f'<p class="text-xs {style["caption"]} text-right mt-1.5">{_e(page.caption_text)}</p>'}
</div>'''
    return _page_shell(style, inner, f"{style['innerPadding']} flex flex-col")


# ── THREE_GRID ───────────────────────────────────────────────────────────

def _render_three_grid(page, style, img, count):
    right_col = ""
    if count >= 2:
        right_col += f'<div class="flex-1 min-h-0">{img(1, alt=True)}</div>'
    if count >= 3:
        right_col += f'<div class="flex-1 min-h-0">{img(2)}</div>'
    elif count >= 2:
        right_col += '<div class="flex-1"></div>'

    inner = f'''<div class="relative z-20 flex flex-col h-full">
  <div class="flex gap-2.5" style="height:65%">
    <div class="w-[60%] h-full">{img(0, hero=True)}</div>
    <div class="w-[40%] flex flex-col gap-2.5 h-full">{right_col}</div>
  </div>
  <div class="flex-1 flex flex-col justify-center min-h-0 pt-3">
    {"" if not page.heading_text else f'<h3 class="font-semibold {style["heading"]} mb-1">{_e(page.heading_text)}</h3>'}
    {_divider(style, wide=True)}
    <div class="my-2"></div>
    {"" if not page.body_text else f'<p class="{style["body"]} text-xs leading-relaxed line-clamp-3">{_e(page.body_text)}</p>'}
    {"" if not page.caption_text else f'<p class="text-xs {style["caption"]} mt-1 line-clamp-1">{_e(page.caption_text)}</p>'}
  </div>
</div>'''
    return _page_shell(style, inner, f"{style['innerPadding']} flex flex-col")


# ── FOUR_GRID ────────────────────────────────────────────────────────────

def _render_four_grid(page, style, img, count):
    right_col = ""
    if count >= 2:
        right_col += f'<div class="flex-1 min-h-0">{img(1, alt=True)}</div>'
    if count >= 3:
        right_col += f'<div class="flex-1 min-h-0">{img(2)}</div>'

    pano = ""
    if count >= 4:
        pano = f'<div class="mt-2.5" style="height:22%">{img(3, alt=True, extra="!rounded-lg")}</div>'

    inner = f'''<div class="relative z-20 flex flex-col h-full">
  <div class="flex gap-2.5" style="height:48%">
    <div class="w-[62%] h-full">{img(0, hero=True)}</div>
    <div class="w-[38%] flex flex-col gap-2.5 h-full">{right_col}</div>
  </div>
  {pano}
  <div class="flex-1 flex flex-col justify-center min-h-0 pt-2">
    {"" if not page.heading_text else f'<h3 class="font-semibold {style["heading"]} mb-1">{_e(page.heading_text)}</h3>'}
    {"" if not page.body_text else f'<p class="{style["body"]} text-xs leading-relaxed line-clamp-2">{_e(page.body_text)}</p>'}
    {"" if not page.caption_text else f'<p class="text-xs {style["caption"]} mt-0.5">{_e(page.caption_text)}</p>'}
  </div>
</div>'''
    return _page_shell(style, inner, f"{style['innerPadding']} flex flex-col")


# ── SIX_MONTAGE ──────────────────────────────────────────────────────────

def _render_six_montage(page, style, img, count):
    row1_r = f'<div class="w-[38%] h-full">{img(1, alt=True)}</div>' if count >= 2 else ""
    row2_l = f'<div class="w-[38%] h-full">{img(2)}</div>' if count >= 3 else ""
    row2_r = f'<div class="w-[62%] h-full">{img(3, alt=True)}</div>' if count >= 4 else ""
    row3_l = f'<div class="w-[50%] h-full">{img(4)}</div>' if count >= 5 else ""
    row3_r = f'<div class="w-[50%] h-full">{img(5, alt=True)}</div>' if count >= 6 else ""

    inner = f'''<div class="relative z-20 flex flex-col h-full gap-2">
  <div class="flex gap-2" style="height:28%">
    <div class="w-[62%] h-full">{img(0, hero=True)}</div>
    {row1_r}
  </div>
  <div class="flex gap-2" style="height:28%">
    {row2_l}{row2_r}
  </div>
  <div class="flex gap-2" style="height:24%">
    {row3_l}{row3_r}
  </div>
  <div class="flex-1 flex items-center justify-center min-h-0">
    {"" if not page.heading_text else f'<h3 class="font-semibold {style["heading"]} mr-3">{_e(page.heading_text)}</h3>'}
    {"" if not page.body_text else f'<p class="{style["body"]} text-xs line-clamp-1">{_e(page.body_text)}</p>'}
  </div>
</div>'''
    return _page_shell(style, inner, f"{style['innerPadding']} flex flex-col")


# ── WALL_8_10 ────────────────────────────────────────────────────────────

def _render_wall(page, style, img, count):
    cells = [
        (0, "col-span-1 row-span-1", False, False),
        (1, "col-span-3 row-span-1", False, True),
        (2, "col-span-1 row-span-1", False, False),
        (3, "col-span-2 row-span-1", False, True),
        (4, "col-span-1 row-span-1", False, False),
        (5, "col-span-2 row-span-1", True, False),
        (6, "col-span-2 row-span-1", False, True),
        (7, "col-span-1 row-span-1", False, False),
        (8, "col-span-2 row-span-1", False, True),
        (9, "col-span-1 row-span-1", False, False),
    ]
    grid_html = ""
    for i, cls, hero, alt in cells:
        if i < count:
            grid_html += f'<div class="{cls}">{img(i, hero=hero, alt=alt)}</div>\n'
    inner = f'<div class="relative z-20 h-full grid grid-cols-4 grid-rows-4 gap-1.5">{grid_html}</div>'
    return _page_shell(style, inner, style["innerPadding"])


# ── PHOTO_PLUS_QUOTE ─────────────────────────────────────────────────────

def _render_photo_plus_quote(page, style, img, count):
    if count == 1:
        photo_area = f'<div class="w-[85%] h-full">{img(0, hero=True)}</div>'
    elif count >= 2:
        photo_area = f'''<div class="w-[55%] h-full">{img(0, hero=True)}</div>
<div class="w-[40%] h-[85%] self-end">{img(1, alt=True)}</div>'''
    else:
        photo_area = ""

    inner = f'''<div class="relative z-20 flex flex-col h-full">
  <div class="flex items-center justify-center {"" if count == 1 else "gap-2.5"}" style="height:58%">
    {photo_area}
  </div>
  <div class="flex-1 flex flex-col items-center justify-center min-h-0 px-4">
    {_divider(style)}
    <div class="mb-4"></div>
    {"" if not page.quote_text else _quote_block(page.quote_text, style)}
    {"" if not page.heading_text else f'<h3 class="font-semibold {style["heading"]} mt-3 text-center">{_e(page.heading_text)}</h3>'}
    {"" if not page.body_text else f'<p class="{style["body"]} text-xs mt-1 text-center line-clamp-2">{_e(page.body_text)}</p>'}
  </div>
</div>'''
    return _page_shell(style, inner, f"{style['innerPadding']} flex flex-col")


# ── COLLAGE_PLUS_LETTER ──────────────────────────────────────────────────

def _render_collage_plus_letter(page, style, img, count):
    photos_html = ""
    for i in range(min(count, 9)):
        photos_html += img(i, alt=(i % 2 == 1))

    inner = f'''<div class="grid grid-cols-2 h-full">
  <div class="grid grid-cols-2 gap-1.5 p-4 relative z-20">
    {photos_html}
  </div>
  <div class="flex flex-col justify-center p-6 overflow-hidden relative z-20">
    {"" if not page.heading_text else f'<h3 class="font-semibold {style["headingLg"]} mb-2">{_e(page.heading_text)}</h3>'}
    {"" if not page.heading_text else _divider(style, wide=True)}
    {"" if not page.heading_text else '<div class="my-3"></div>'}
    {"" if not page.body_text else f'<p class="{style["body"]} text-xs leading-relaxed mt-1">{_e(page.body_text)}</p>'}
  </div>
</div>'''
    return _page_shell(style, inner, "")


# ── Fallback ─────────────────────────────────────────────────────────────

def _render_fallback(page, style, img, count):
    if count == 0:
        inner = f'''<div class="relative z-20 text-center max-w-sm">
  {"" if not page.heading_text else f'<h3 class="font-semibold {style["heading"]} mb-2">{_e(page.heading_text)}</h3>'}
  {"" if not page.body_text else f'<p class="{style["body"]} text-sm leading-relaxed">{_e(page.body_text)}</p>'}
</div>'''
        return _page_shell(style, inner, f"flex flex-col items-center justify-center {style['innerPadding']}")

    if count == 1:
        inner = f'''<div class="relative z-20 flex flex-col h-full">
  <div style="height:75%">{img(0, hero=True)}</div>
  <div class="flex-1 flex flex-col items-center justify-center min-h-0 pt-3">
    {"" if not page.heading_text else f'<h3 class="font-semibold {style["heading"]} mb-1 text-center">{_e(page.heading_text)}</h3>'}
    {_divider(style)}
    {"" if not page.body_text else f'<p class="{style["body"]} text-xs mt-2 text-center line-clamp-2">{_e(page.body_text)}</p>'}
  </div>
</div>'''
        return _page_shell(style, inner, f"{style['innerPadding']} flex flex-col")

    if count <= 5:
        bottom_photos = "".join(
            f'<div class="flex-1 h-full">{img(i, alt=(i % 2 == 0))}</div>' for i in range(2, count)
        )
        bottom_h = "30%" if count > 3 else "25%"
        inner = f'''<div class="relative z-20 flex flex-col h-full gap-2">
  <div class="flex gap-2" style="height:50%">
    <div class="w-[60%] h-full">{img(0, hero=True)}</div>
    <div class="w-[40%] h-full">{img(1, alt=True)}</div>
  </div>
  <div class="flex gap-2" style="height:{bottom_h}">{bottom_photos}</div>
  <div class="flex-1 flex items-center min-h-0 gap-3">
    {"" if not page.heading_text else f'<h3 class="font-semibold {style["heading"]} flex-shrink-0">{_e(page.heading_text)}</h3>'}
    {"" if not page.body_text else f'<p class="{style["body"]} text-xs line-clamp-2">{_e(page.body_text)}</p>'}
  </div>
</div>'''
        return _page_shell(style, inner, f"{style['innerPadding']} flex flex-col")

    # 6+ photos: dense mosaic
    row1 = f'''<div class="flex gap-1.5" style="height:30%">
  <div class="w-[55%] h-full">{img(0, hero=True)}</div>
  <div class="w-[45%] h-full">{img(1, alt=True)}</div>
</div>'''
    row2_items = "".join(
        f'<div class="flex-1 h-full">{img(i, alt=(i % 2 == 0))}</div>' for i in range(2, min(5, count))
    )
    row2 = f'<div class="flex gap-1.5" style="height:30%">{row2_items}</div>'
    row3 = ""
    if count > 5:
        row3_items = "".join(
            f'<div class="flex-1 h-full">{img(i, alt=(i % 2 == 1))}</div>' for i in range(5, min(10, count))
        )
        row3 = f'<div class="flex gap-1.5" style="height:25%">{row3_items}</div>'

    inner = f'''<div class="relative z-20 flex flex-col h-full gap-1.5">
  {row1}
  {row2}
  {row3}
  <div class="flex-1 flex items-center justify-center min-h-0">
    {"" if not page.heading_text else f'<h3 class="font-semibold {style["heading"]} text-center">{_e(page.heading_text)}</h3>'}
    {"" if not page.caption_text else f'<p class="text-xs {style["caption"]} ml-3">{_e(page.caption_text)}</p>'}
  </div>
</div>'''
    return _page_shell(style, inner, f"{style['innerPadding']} flex flex-col")
