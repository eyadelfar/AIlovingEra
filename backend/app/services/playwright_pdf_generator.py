"""
Playwright-based PDF generator — renders the same HTML/CSS as the frontend preview.

Uses headless Chromium to convert HTML pages to PDF, guaranteeing pixel-perfect
visual parity with the React frontend.

Optimizations:
- Browser instance pooling (reuse across requests)
- Parallel image encoding with ThreadPoolExecutor
- Inlined CSS/fonts (no CDN dependencies)
- Skip resize for pre-compressed images
- Granular progress streaming with ETA
"""

from __future__ import annotations

import asyncio
import base64
import io
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Any, Callable

import structlog
from PIL import Image
from playwright.async_api import async_playwright

from app.interfaces.pdf_generator import AbstractPdfGenerator
from app.models.schemas import MemoryBookDraft
from app.pdf_templates.page_renderer import render_page

logger = structlog.get_logger()

# Page sizes in mm
PAGE_SIZES_MM = {
    "a4": (210, 297),
    "us_letter": (216, 279),
    "square": (210, 210),
}

TEMPLATES_DIR = Path(__file__).parent.parent / "pdf_templates"
BASE_TEMPLATE_PATH = TEMPLATES_DIR / "base.html"
PDF_STYLES_PATH = TEMPLATES_DIR / "pdf_styles.css"
PDF_FONTS_PATH = TEMPLATES_DIR / "pdf_fonts.css"

# ── Browser instance pool ───────────────────────────────────────────────
_browser_instance = None
_browser_lock = asyncio.Lock()
_playwright_instance = None


async def _get_browser():
    """Get or create a shared Chromium browser instance."""
    global _browser_instance, _playwright_instance
    async with _browser_lock:
        if _browser_instance and _browser_instance.is_connected():
            return _browser_instance
        # Clean up old instances
        if _browser_instance:
            try:
                await _browser_instance.close()
            except Exception:
                pass
        if _playwright_instance:
            try:
                await _playwright_instance.stop()
            except Exception:
                pass
        _playwright_instance = await async_playwright().start()
        _browser_instance = await _playwright_instance.chromium.launch(
            headless=True,
            args=["--no-sandbox", "--disable-gpu"],
        )
        return _browser_instance


async def shutdown_browser():
    """Gracefully close the pooled Playwright browser instance. Call on app shutdown."""
    global _browser_instance, _playwright_instance
    async with _browser_lock:
        if _browser_instance:
            try:
                await _browser_instance.close()
            except Exception:
                pass
            _browser_instance = None
        if _playwright_instance:
            try:
                await _playwright_instance.stop()
            except Exception:
                pass
            _playwright_instance = None
    logger.info("playwright_browser_shutdown")


def _encode_single_photo(idx: int, raw_bytes: bytes) -> tuple[int, str | None, int, int]:
    """Encode a single photo to base64 data URI — runs in thread pool.
    Returns (index, data_uri, original_bytes, output_bytes).
    """
    try:
        original_size = len(raw_bytes)
        img = Image.open(io.BytesIO(raw_bytes))
        # Skip resize for pre-compressed images (already <= 2400px from frontend)
        max_dim = 2400
        if max(img.size) > max_dim:
            ratio = max_dim / max(img.size)
            new_size = (int(img.width * ratio), int(img.height * ratio))
            img = img.resize(new_size, Image.LANCZOS)

        buf = io.BytesIO()
        if img.mode in ("RGBA", "LA", "P"):
            img = img.convert("RGB")
        img.save(buf, format="JPEG", quality=92, optimize=True)
        output_bytes = buf.getvalue()
        b64 = base64.b64encode(output_bytes).decode("ascii")
        return idx, f"data:image/jpeg;base64,{b64}", original_size, len(output_bytes)
    except Exception:
        logger.warning("photo_encode_failed", photo_index=idx)
        return idx, None, len(raw_bytes), 0


class _StepTimer:
    """Tracks step durations for ETA estimation."""

    def __init__(self):
        self.start = time.perf_counter()
        self._step_durations: list[tuple[float, float]] = []  # (duration_s, weight)

    @property
    def elapsed_ms(self) -> int:
        return round((time.perf_counter() - self.start) * 1000)

    def record_step(self, weight: float):
        now = time.perf_counter()
        duration = now - self.start
        self._step_durations.append((duration, weight))

    def estimate_remaining_ms(self, remaining_weight: float) -> int | None:
        if not self._step_durations:
            return None
        total_time = self._step_durations[-1][0]
        total_weight = sum(w for _, w in self._step_durations)
        if total_weight == 0:
            return None
        rate = total_time / total_weight
        return round(rate * remaining_weight * 1000)


class PlaywrightPdfGenerator(AbstractPdfGenerator):
    """Generates PDF by rendering HTML in headless Chromium — same CSS as frontend."""

    # Cache loaded CSS files
    _tailwind_css: str | None = None
    _fonts_css: str | None = None

    @classmethod
    def _load_css(cls) -> tuple[str, str]:
        """Load and cache CSS files."""
        if cls._tailwind_css is None:
            cls._tailwind_css = PDF_STYLES_PATH.read_text(encoding="utf-8")
        if cls._fonts_css is None:
            cls._fonts_css = PDF_FONTS_PATH.read_text(encoding="utf-8")
        return cls._tailwind_css, cls._fonts_css

    async def generate(
        self,
        book: MemoryBookDraft,
        photo_data: dict[int, bytes],
        template_config: dict,
        design_scale: dict | None = None,
        photo_analyses: list[dict] | None = None,
        overrides: dict | None = None,
        on_progress: Callable[[dict], Any] | None = None,
    ) -> bytes:
        ds = design_scale or {}
        page_size_key = ds.get("page_size", "a4")
        bleed_mm = ds.get("bleed_mm", 3.0)
        margin_mm = ds.get("margin_mm", 12.0)

        # Support custom page sizes
        if page_size_key == "custom":
            custom_w = ds.get("custom_width_mm")
            custom_h = ds.get("custom_height_mm")
            if custom_w and custom_h:
                page_w_mm, page_h_mm = float(custom_w), float(custom_h)
            else:
                page_w_mm, page_h_mm = PAGE_SIZES_MM["a4"]
        else:
            page_w_mm, page_h_mm = PAGE_SIZES_MM.get(page_size_key, PAGE_SIZES_MM["a4"])

        template_slug = book.template_slug or "romantic"
        page_count = len(book.pages)
        photo_count = len(photo_data)
        timer = _StepTimer()

        logger.info(
            "pdf_generation_start",
            page_count=page_count,
            photo_count=photo_count,
            template=template_slug,
            page_size=page_size_key,
            page_w_mm=page_w_mm,
            page_h_mm=page_h_mm,
            bleed_mm=bleed_mm,
        )

        # ── Stage 1: Encode photos (0-30%) ──────────────────────────────
        t_enc = time.perf_counter()
        if on_progress:
            await on_progress({
                "stage": "encoding",
                "message": f"Preparing {photo_count} photos...",
                "progress": 1,
                "current": 0,
                "total": photo_count,
                "elapsed_ms": timer.elapsed_ms,
            })
        photo_b64, encode_stats = await self._encode_photos_parallel(photo_data, on_progress, timer, photo_count)
        enc_ms = round((time.perf_counter() - t_enc) * 1000, 1)
        timer.record_step(weight=30)
        logger.info(
            "photo_encoding_complete",
            duration_ms=enc_ms,
            photo_count=photo_count,
            encoded_count=len(photo_b64),
            failed_count=photo_count - len(photo_b64),
            total_input_bytes=encode_stats.get("total_input", 0),
            total_output_bytes=encode_stats.get("total_output", 0),
        )

        # ── Stage 2: Render pages to HTML (30-70%) ──────────────────────
        t_render = time.perf_counter()
        pages_html = []
        total_pages = len(book.pages)
        for i, page in enumerate(book.pages):
            t_page = time.perf_counter()
            progress_pct = 30 + int((i / max(total_pages, 1)) * 40)
            layout_type = getattr(page, "layout_type", "unknown")
            page_photos = len(getattr(page, "photo_indices", []))
            if on_progress:
                await on_progress({
                    "stage": "rendering",
                    "message": f"Rendering page {i + 1} of {total_pages}...",
                    "progress": progress_pct,
                    "current": i + 1,
                    "total": total_pages,
                    "elapsed_ms": timer.elapsed_ms,
                    "estimated_remaining_ms": timer.estimate_remaining_ms(100 - progress_pct),
                })
            html = render_page(page, photo_b64, template_slug, photo_analyses, overrides)
            pages_html.append(html)
            page_ms = round((time.perf_counter() - t_page) * 1000, 1)
            logger.debug(
                "page_rendered",
                page_index=i,
                layout_type=layout_type,
                photo_count=page_photos,
                html_size=len(html),
                duration_ms=page_ms,
            )

        render_ms = round((time.perf_counter() - t_render) * 1000, 1)
        timer.record_step(weight=40)
        logger.info(
            "page_rendering_complete",
            duration_ms=render_ms,
            page_count=total_pages,
            total_html_size=sum(len(h) for h in pages_html),
        )

        # ── Stage 3: Assemble HTML document (70-75%) ────────────────────
        t_build = time.perf_counter()
        if on_progress:
            await on_progress({
                "stage": "assembling",
                "message": "Assembling document...",
                "progress": 72,
                "current": 0,
                "total": 0,
                "elapsed_ms": timer.elapsed_ms,
                "estimated_remaining_ms": timer.estimate_remaining_ms(28),
            })
        full_html = self._build_document(pages_html, page_w_mm, page_h_mm, bleed_mm)
        build_ms = round((time.perf_counter() - t_build) * 1000, 1)
        timer.record_step(weight=5)
        logger.info(
            "document_assembled",
            duration_ms=build_ms,
            html_size_bytes=len(full_html),
            page_count=total_pages,
        )

        # ── Stage 4: Generate PDF with Playwright (75-95%) ──────────────
        if on_progress:
            await on_progress({
                "stage": "printing",
                "message": "Generating PDF document...",
                "progress": 78,
                "current": 0,
                "total": 0,
                "elapsed_ms": timer.elapsed_ms,
                "estimated_remaining_ms": timer.estimate_remaining_ms(22),
            })
        pdf_bytes = await self._render_pdf(full_html, page_w_mm, page_h_mm, total_pages, on_progress, timer)
        timer.record_step(weight=20)

        # ── Stage 5: Complete (95-100%) ─────────────────────────────────
        total_ms = timer.elapsed_ms
        pdf_size_mb = round(len(pdf_bytes) / (1024 * 1024), 2)
        logger.info(
            "pdf_generation_complete",
            duration_ms=total_ms,
            size_bytes=len(pdf_bytes),
            size_mb=pdf_size_mb,
            page_count=page_count,
            photo_count=photo_count,
        )
        if on_progress:
            await on_progress({
                "stage": "finalizing",
                "message": f"PDF ready — {pdf_size_mb} MB, {page_count} pages",
                "progress": 99,
                "current": page_count,
                "total": page_count,
                "elapsed_ms": total_ms,
                "estimated_remaining_ms": 0,
            })

        return pdf_bytes

    async def _encode_photos_parallel(
        self,
        photo_data: dict[int, bytes],
        on_progress: Callable[[dict], Any] | None,
        timer: _StepTimer,
        total_photos: int,
    ) -> tuple[dict[int, str], dict]:
        """Convert raw photo bytes to base64 data URIs using parallel processing."""
        result = {}
        total = len(photo_data)
        loop = asyncio.get_running_loop()
        total_input_bytes = 0
        total_output_bytes = 0

        with ThreadPoolExecutor(max_workers=4) as pool:
            futures = {
                loop.run_in_executor(pool, _encode_single_photo, idx, raw_bytes): idx
                for idx, raw_bytes in photo_data.items()
            }
            completed = 0
            for coro in asyncio.as_completed(futures):
                idx, data_uri, in_bytes, out_bytes = await coro
                completed += 1
                total_input_bytes += in_bytes
                total_output_bytes += out_bytes
                if data_uri:
                    result[idx] = data_uri
                if on_progress:
                    progress_pct = 1 + int((completed / max(total, 1)) * 29)
                    await on_progress({
                        "stage": "encoding",
                        "message": f"Encoding photo {completed} of {total}...",
                        "progress": progress_pct,
                        "current": completed,
                        "total": total,
                        "elapsed_ms": timer.elapsed_ms,
                    })

        stats = {"total_input": total_input_bytes, "total_output": total_output_bytes}
        return result, stats

    def _build_document(
        self,
        pages_html: list[str],
        page_w_mm: float,
        page_h_mm: float,
        bleed_mm: float,
    ) -> str:
        """Build the complete HTML document from the base template and page content."""
        base_template = BASE_TEMPLATE_PATH.read_text(encoding="utf-8")
        tailwind_css, fonts_css = self._load_css()
        content = "\n".join(pages_html)

        # Template variable substitution
        html = base_template.replace("{{ tailwind_css }}", tailwind_css)
        html = html.replace("{{ fonts_css }}", fonts_css)
        html = html.replace("{{ page_width_mm }}", str(page_w_mm))
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
        page_count: int = 1,
        on_progress: Callable[[dict], Any] | None = None,
        timer: _StepTimer | None = None,
    ) -> bytes:
        """Use pooled Chromium browser to render HTML to PDF."""
        t_browser = time.perf_counter()
        browser = await _get_browser()
        browser_ms = round((time.perf_counter() - t_browser) * 1000, 1)
        logger.info("playwright_browser_acquired", duration_ms=browser_ms)

        context = await browser.new_context()
        try:
            page = await context.new_page()

            # Set viewport to match page proportions at 4x for quality
            scale = 4  # px per mm
            viewport_w = int(page_w_mm * scale)
            viewport_h = int(page_h_mm * scale)
            await page.set_viewport_size({"width": viewport_w, "height": viewport_h})

            # Scale timeout with page count: min 2min, +10s per page
            timeout_ms = max(120_000, page_count * 10_000)
            logger.info("playwright_render_start", timeout_ms=timeout_ms, page_count=page_count, html_size=len(html))

            # Load HTML — no CDN means we can use "load" instead of "networkidle"
            t_load = time.perf_counter()
            if on_progress:
                await on_progress({
                    "stage": "printing",
                    "message": "Loading content in browser...",
                    "progress": 82,
                    "elapsed_ms": timer.elapsed_ms if timer else 0,
                })
            await page.set_content(html, wait_until="load", timeout=timeout_ms)
            load_ms = round((time.perf_counter() - t_load) * 1000, 1)
            logger.info("playwright_content_loaded", duration_ms=load_ms)

            # Generate PDF
            t_pdf = time.perf_counter()
            if on_progress:
                await on_progress({
                    "stage": "printing",
                    "message": "Exporting PDF...",
                    "progress": 90,
                    "elapsed_ms": timer.elapsed_ms if timer else 0,
                })
            pdf_bytes = await page.pdf(
                width=f"{page_w_mm}mm",
                height=f"{page_h_mm}mm",
                print_background=True,
                prefer_css_page_size=True,
            )
            pdf_ms = round((time.perf_counter() - t_pdf) * 1000, 1)
            logger.info(
                "playwright_pdf_exported",
                duration_ms=pdf_ms,
                pdf_size_bytes=len(pdf_bytes),
            )
            return pdf_bytes
        finally:
            await context.close()
