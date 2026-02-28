"""
Playwright-based PDF generator — renders the same HTML/CSS as the frontend preview.

Uses headless Chromium to convert HTML pages to PDF, guaranteeing pixel-perfect
visual parity with the React frontend. Replaces the old Pillow/ReportLab approach.
"""

from __future__ import annotations

import base64
import io
import logging
from pathlib import Path

from PIL import Image
from playwright.async_api import async_playwright

from app.interfaces.pdf_generator import AbstractPdfGenerator
from app.models.schemas import MemoryBookDraft
from app.pdf_templates.page_renderer import render_page

logger = logging.getLogger(__name__)

# Page sizes in mm
PAGE_SIZES_MM = {
    "a4": (210, 297),
    "us_letter": (216, 279),
    "square": (210, 210),
}

BASE_TEMPLATE_PATH = Path(__file__).parent.parent / "pdf_templates" / "base.html"


class PlaywrightPdfGenerator(AbstractPdfGenerator):
    """Generates PDF by rendering HTML in headless Chromium — same CSS as frontend."""

    async def generate(
        self,
        book: MemoryBookDraft,
        photo_data: dict[int, bytes],
        template_config: dict,
        design_scale: dict | None = None,
        photo_analyses: list[dict] | None = None,
    ) -> bytes:
        ds = design_scale or {}
        page_size_key = ds.get("page_size", "a4")
        bleed_mm = ds.get("bleed_mm", 3.0)
        margin_mm = ds.get("margin_mm", 12.0)
        page_w_mm, page_h_mm = PAGE_SIZES_MM.get(page_size_key, PAGE_SIZES_MM["a4"])

        template_slug = book.template_slug or "romantic"
        logger.info(
            "Generating PDF: %d pages, template=%s, size=%s (%dx%dmm), bleed=%.1fmm",
            len(book.pages), template_slug, page_size_key, page_w_mm, page_h_mm, bleed_mm,
        )

        # Convert photo bytes to base64 data URIs
        photo_b64 = self._encode_photos(photo_data)

        # Render each page to HTML
        pages_html = []
        for page in book.pages:
            html = render_page(page, photo_b64, template_slug, photo_analyses)
            pages_html.append(html)

        # Combine into full document
        full_html = self._build_document(pages_html, page_w_mm, page_h_mm, bleed_mm)

        # Render to PDF with Playwright
        pdf_bytes = await self._render_pdf(full_html, page_w_mm, page_h_mm)
        logger.info("PDF generated: %d bytes", len(pdf_bytes))
        return pdf_bytes

    def _encode_photos(self, photo_data: dict[int, bytes]) -> dict[int, str]:
        """Convert raw photo bytes to base64 data URIs, resizing for PDF quality."""
        result = {}
        for idx, raw_bytes in photo_data.items():
            try:
                img = Image.open(io.BytesIO(raw_bytes))
                # Resize to max 1600px on longest side for good PDF quality without bloat
                max_dim = 1600
                if max(img.size) > max_dim:
                    ratio = max_dim / max(img.size)
                    new_size = (int(img.width * ratio), int(img.height * ratio))
                    img = img.resize(new_size, Image.LANCZOS)

                # Convert to JPEG for smaller data URIs
                buf = io.BytesIO()
                img_format = "JPEG"
                if img.mode in ("RGBA", "LA", "P"):
                    img = img.convert("RGB")
                img.save(buf, format=img_format, quality=85, optimize=True)
                b64 = base64.b64encode(buf.getvalue()).decode("ascii")
                result[idx] = f"data:image/jpeg;base64,{b64}"
            except Exception:
                logger.warning("Failed to encode photo %d, skipping", idx)
        return result

    def _build_document(
        self,
        pages_html: list[str],
        page_w_mm: float,
        page_h_mm: float,
        bleed_mm: float,
    ) -> str:
        """Build the complete HTML document from the base template and page content."""
        base_template = BASE_TEMPLATE_PATH.read_text(encoding="utf-8")
        content = "\n".join(pages_html)

        # Simple template variable substitution
        html = base_template.replace("{{ page_width_mm }}", str(page_w_mm))
        html = html.replace("{{ page_height_mm }}", str(page_h_mm))
        html = html.replace("{{ bleed_mm }}", str(bleed_mm))
        html = html.replace("{{ 2 * bleed_mm }}", str(2 * bleed_mm))
        html = html.replace("{{ page_width_mm - 2 * bleed_mm }}", str(page_w_mm - 2 * bleed_mm))
        html = html.replace("{{ page_height_mm - 2 * bleed_mm }}", str(page_h_mm - 2 * bleed_mm))
        html = html.replace("{{ content }}", content)
        return html

    async def _render_pdf(
        self,
        html: str,
        page_w_mm: float,
        page_h_mm: float,
    ) -> bytes:
        """Launch headless Chromium, render HTML, and export as PDF."""
        async with async_playwright() as p:
            browser = await p.chromium.launch(
                headless=True,
                args=["--no-sandbox", "--disable-gpu"],
            )
            try:
                page = await browser.new_page()

                # Set viewport to match page proportions at 2x for quality
                scale = 4  # px per mm
                viewport_w = int(page_w_mm * scale)
                viewport_h = int(page_h_mm * scale)
                await page.set_viewport_size({"width": viewport_w, "height": viewport_h})

                # Load the HTML and wait for images + Tailwind CDN
                await page.set_content(html, wait_until="networkidle")

                # Additional wait for Tailwind CDN to process all classes
                await page.wait_for_timeout(1500)

                # Generate PDF
                pdf_bytes = await page.pdf(
                    width=f"{page_w_mm}mm",
                    height=f"{page_h_mm}mm",
                    print_background=True,
                    prefer_css_page_size=True,
                )
                return pdf_bytes
            finally:
                await browser.close()
