import base64
import io
from dataclasses import dataclass

from PIL import Image, ImageDraw, ImageFont
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas as rl_canvas

from app.models.schemas import ComicBook, ComicPage, ComicPanel


# ── Page layout constants ─────────────────────────────────────────────────────
PAGE_W, PAGE_H = A4          # 595 x 842 points
MARGIN = 10 * mm             # outer margin
GUTTER = 4 * mm              # space between panels
CAPTION_H = 18 * mm          # height of caption strip


def _decode_image(data_uri: str) -> Image.Image | None:
    """Decode a data-URI base64 image to PIL Image."""
    if not data_uri:
        return None
    try:
        header, b64 = data_uri.split(",", 1)
        raw = base64.b64decode(b64)
        return Image.open(io.BytesIO(raw)).convert("RGB")
    except Exception:
        return None


def _make_placeholder(w: int, h: int) -> Image.Image:
    img = Image.new("RGB", (w, h), color=(40, 40, 60))
    draw = ImageDraw.Draw(img)
    draw.rectangle([0, 0, w - 1, h - 1], outline=(120, 80, 200), width=4)
    draw.text((w // 2, h // 2), "No Art", fill=(180, 180, 180), anchor="mm")
    return img


def _compose_page_image(page: ComicPage, page_w_px: int, page_h_px: int) -> Image.Image:
    """Compose all panels for one comic page into a single PIL image."""
    bg = Image.new("RGB", (page_w_px, page_h_px), color=(10, 10, 15))
    draw = ImageDraw.Draw(bg)

    n = len(page.panels)
    if n == 0:
        return bg

    margin = int(page_w_px * 0.015)
    gutter = int(page_w_px * 0.008)

    # Layout: determine grid cols/rows
    cols = 2 if n <= 4 else 3
    rows = (n + cols - 1) // cols

    usable_w = page_w_px - 2 * margin - (cols - 1) * gutter
    usable_h = page_h_px - 2 * margin - (rows - 1) * gutter
    cell_w = usable_w // cols
    cell_h = usable_h // rows

    for idx, panel in enumerate(page.panels):
        col = idx % cols
        row = idx // cols
        x = margin + col * (cell_w + gutter)
        y = margin + row * (cell_h + gutter)

        # Comic art image
        art = _decode_image(panel.comic_art_base64) if panel.comic_art_base64 else None
        if art is None:
            art = _make_placeholder(cell_w, cell_h)
        else:
            art = art.resize((cell_w, cell_h), Image.LANCZOS)

        bg.paste(art, (x, y))

        # Panel border
        draw.rectangle([x, y, x + cell_w - 1, y + cell_h - 1], outline=(255, 255, 255), width=3)

        # Caption strip (top of panel)
        if panel.caption:
            cap_h = max(22, cell_h // 8)
            draw.rectangle([x, y, x + cell_w, y + cap_h], fill=(240, 230, 180))
            draw.text((x + 6, y + cap_h // 2), panel.caption[:60], fill=(20, 20, 20), anchor="lm")

        # SFX text
        if panel.sfx:
            sfx_x = x + cell_w // 2
            sfx_y = y + cell_h - 30
            draw.text((sfx_x, sfx_y), panel.sfx, fill=(255, 220, 0), anchor="mm")

        # Dialogue strip (bottom of panel)
        if panel.dialogue:
            dial_h = max(24, cell_h // 7)
            draw.rectangle([x, y + cell_h - dial_h, x + cell_w, y + cell_h], fill=(255, 255, 255, 200))
            draw.text((x + 6, y + cell_h - dial_h // 2), panel.dialogue[:70], fill=(10, 10, 10), anchor="lm")

    return bg


def generate_pdf(comic: ComicBook) -> bytes:
    """Generate a PDF from a ComicBook. Returns raw PDF bytes."""
    buf = io.BytesIO()
    c = rl_canvas.Canvas(buf, pagesize=A4)

    # Resolution: render each page as 1200px wide image
    RENDER_W = 1200
    aspect = PAGE_H / PAGE_W
    RENDER_H = int(RENDER_W * aspect)

    for page in comic.pages:
        page_img = _compose_page_image(page, RENDER_W, RENDER_H)

        # Convert PIL image → in-memory PNG for ReportLab
        img_buf = io.BytesIO()
        page_img.save(img_buf, format="PNG")
        img_buf.seek(0)

        # Draw on PDF page — ReportLab requires ImageReader for BytesIO input
        c.drawImage(
            ImageReader(img_buf), 0, 0,
            width=PAGE_W, height=PAGE_H,
            preserveAspectRatio=False,
        )

        # Page number footer
        c.setFont("Helvetica-Bold", 9)
        c.setFillColorRGB(0.7, 0.7, 0.7)
        c.drawCentredString(
            PAGE_W / 2,
            6 * mm,
            f"{comic.title} — Page {page.page_number} of {len(comic.pages)}",
        )
        c.showPage()

    c.save()
    buf.seek(0)
    return buf.read()
