import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import html2canvas from 'html2canvas';
import { EditModeProvider } from '../features/viewer/EditModeContext';
import PageRenderer from '../features/viewer/PageRenderer';
import { buildPageToSpreadMap } from './gridUtils';
import { loadGoogleFont } from './fontLoader';
import useBookStore from '../stores/bookStore';

/**
 * Wait until all <img> elements inside a container have loaded (or timeout).
 */
function waitForImages(container, timeoutMs = 3000) {
  const imgs = container.querySelectorAll('img');
  if (!imgs.length) return Promise.resolve();

  return Promise.race([
    Promise.all(
      Array.from(imgs).map(
        (img) =>
          img.complete && img.naturalWidth > 0
            ? Promise.resolve()
            : new Promise((r) => {
                img.addEventListener('load', r, { once: true });
                img.addEventListener('error', r, { once: true });
              }),
      ),
    ),
    new Promise((r) => setTimeout(r, timeoutMs)),
  ]);
}

/**
 * Pre-load any custom Google Fonts used in text style overrides.
 */
async function preloadFonts() {
  const textStyleOverrides = useBookStore.getState().textStyleOverrides || {};
  const families = new Set();
  for (const val of Object.values(textStyleOverrides)) {
    if (val?.fontFamily) families.add(val.fontFamily);
  }
  await Promise.all(Array.from(families).map((f) => loadGoogleFont(f)));
  await document.fonts.ready;
}

/**
 * Render a single page offscreen using ReactDOM and capture it with html2canvas.
 * Returns a Canvas element.
 */
async function capturePageOffscreen(page, pageIdx, { images, templateSlug, photoAnalyses, cropOverrides, filterOverrides, anniversaryCoverText, pageToSpreadMap }) {
  const wrapper = document.createElement('div');
  wrapper.style.cssText =
    'position:fixed;left:-9999px;top:0;width:400px;height:560px;pointer-events:none;z-index:-9999;overflow:hidden;';
  document.body.appendChild(wrapper);

  const mapping = pageToSpreadMap?.[pageIdx];

  const root = createRoot(wrapper);
  root.render(
    createElement(
      EditModeProvider,
      { isEditMode: false },
      createElement(PageRenderer, {
        page,
        images,
        templateSlug,
        photoAnalyses,
        cropOverrides,
        filterOverrides,
        anniversaryCoverText: page.page_type === 'cover' ? anniversaryCoverText : undefined,
        chapterIdx: mapping?.chapterIdx ?? null,
        spreadIdx: mapping?.spreadIdx ?? null,
      }),
    ),
  );

  // Wait for React to commit + images + fonts to load
  await new Promise((r) => setTimeout(r, 1500));
  await waitForImages(wrapper, 5000);
  await document.fonts.ready;

  let canvas;
  try {
    canvas = await html2canvas(wrapper, {
      backgroundColor: '#030712',
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false,
    });
  } catch (err) {
    console.error('[VideoExport] html2canvas failed for page', pageIdx, err);
    // Fallback: dark placeholder
    canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 1120;
    const fCtx = canvas.getContext('2d');
    fCtx.fillStyle = '#030712';
    fCtx.fillRect(0, 0, canvas.width, canvas.height);
  }

  root.unmount();
  document.body.removeChild(wrapper);
  return canvas;
}

/**
 * Composite individual page canvases into spread canvases.
 */
function buildSpreadCanvases(pageCanvases) {
  const spreads = [];

  // Cover alone
  spreads.push([0]);
  // Pairs
  for (let i = 1; i < pageCanvases.length; i += 2) {
    if (i + 1 < pageCanvases.length) {
      spreads.push([i, i + 1]);
    } else {
      spreads.push([i]);
    }
  }

  return spreads.map((indices) => {
    const isSingle = indices.length === 1;
    const pageW = pageCanvases[0].width; // 800 at scale 2
    const pageH = pageCanvases[0].height; // 1120 at scale 2
    const gap = 8;

    const spreadCanvas = document.createElement('canvas');
    spreadCanvas.width = isSingle ? pageW : pageW * 2 + gap;
    spreadCanvas.height = pageH;
    const ctx = spreadCanvas.getContext('2d');
    ctx.fillStyle = '#030712';
    ctx.fillRect(0, 0, spreadCanvas.width, spreadCanvas.height);

    if (isSingle) {
      ctx.drawImage(pageCanvases[indices[0]], 0, 0);
    } else {
      ctx.drawImage(pageCanvases[indices[0]], 0, 0);
      ctx.drawImage(pageCanvases[indices[1]], pageW + gap, 0);
    }

    return spreadCanvas;
  });
}

/**
 * Select the best available WebM codec for MediaRecorder.
 */
function getBestMimeType() {
  const candidates = [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
  ];
  for (const mt of candidates) {
    if (MediaRecorder.isTypeSupported(mt)) return mt;
  }
  return 'video/webm';
}

/**
 * Export the book as a WebM video with slide transitions between spreads.
 *
 * @param {Object} opts
 * @param {Array} opts.pages - bookDraft.pages array
 * @param {Object} opts.images - images object (keyed by index)
 * @param {string} opts.templateSlug
 * @param {Object} opts.photoAnalyses
 * @param {Object} opts.cropOverrides
 * @param {Object} opts.filterOverrides
 * @param {string} opts.anniversaryCoverText
 * @param {Array} opts.chapters - bookDraft.chapters for spread mapping
 * @param {number} opts.secPerPage - seconds per spread
 * @param {Object} opts.resolution - { w, h }
 * @param {Function} opts.onProgress - (percent: number) => void
 * @param {AbortSignal} [opts.signal]
 * @returns {Promise<Blob>} Raw WebM blob
 */
export async function exportBookVideo({
  pages,
  images,
  templateSlug,
  photoAnalyses,
  cropOverrides,
  filterOverrides,
  anniversaryCoverText,
  chapters,
  secPerPage,
  resolution,
  onProgress,
  signal,
}) {
  // ── Step 1: Pre-load fonts ──
  onProgress?.(1);
  await preloadFonts();
  onProgress?.(5);

  // ── Step 2: Capture each page offscreen ──
  const pageToSpreadMap = buildPageToSpreadMap(chapters);
  const captureCtx = { images, templateSlug, photoAnalyses, cropOverrides, filterOverrides, anniversaryCoverText, pageToSpreadMap };
  const pageCanvases = [];

  for (let i = 0; i < pages.length; i++) {
    if (signal?.aborted) throw new DOMException('Export cancelled', 'AbortError');
    const canvas = await capturePageOffscreen(pages[i], i, captureCtx);
    pageCanvases.push(canvas);
    onProgress?.(5 + Math.round(((i + 1) / pages.length) * 55)); // 5-60%
  }

  if (!pageCanvases.length) {
    throw new Error('No pages captured');
  }

  // ── Step 3: Composite into spreads ──
  const spreadCanvases = buildSpreadCanvases(pageCanvases);
  onProgress?.(62);

  // ── Step 4: Record video ──
  const W = resolution?.w || 1920;
  const H = resolution?.h || 1080;
  const FPS = 30;
  const holdFrames = Math.round(secPerPage * FPS);
  const slideFrames = Math.round(0.6 * FPS); // 0.6s transition

  const videoCanvas = document.createElement('canvas');
  videoCanvas.width = W;
  videoCanvas.height = H;
  const ctx = videoCanvas.getContext('2d');

  // Use captureStream(0) for manual frame control if requestFrame is supported
  const useManualFrames = typeof CanvasCaptureMediaStreamTrack !== 'undefined';
  const stream = videoCanvas.captureStream(useManualFrames ? 0 : FPS);
  const videoTrack = stream.getVideoTracks()[0];

  const recorder = new MediaRecorder(stream, {
    mimeType: getBestMimeType(),
    videoBitsPerSecond: 5_000_000,
  });
  const chunks = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };
  const done = new Promise((resolve) => {
    recorder.onstop = resolve;
  });
  recorder.start();

  function pushFrame() {
    if (useManualFrames && videoTrack.requestFrame) {
      videoTrack.requestFrame();
    }
  }

  function drawSpreadFit(img, offsetX) {
    const scale = Math.min(W / img.width, H / img.height) * 0.92;
    const w = img.width * scale;
    const h = img.height * scale;
    const x = (W - w) / 2 + offsetX;
    const y = (H - h) / 2;
    ctx.drawImage(img, x, y, w, h);
  }

  const frameDelay = 1000 / FPS;

  for (let si = 0; si < spreadCanvases.length; si++) {
    if (signal?.aborted) {
      recorder.stop();
      throw new DOMException('Export cancelled', 'AbortError');
    }
    onProgress?.(62 + Math.round((si / spreadCanvases.length) * 28)); // 62-90%
    const img = spreadCanvases[si];

    // Hold: show spread for duration
    for (let f = 0; f < holdFrames; f++) {
      ctx.fillStyle = '#030712';
      ctx.fillRect(0, 0, W, H);
      drawSpreadFit(img, 0);
      pushFrame();
      await new Promise((r) => setTimeout(r, frameDelay));
    }

    // Slide transition to next spread
    if (si < spreadCanvases.length - 1) {
      const nextImg = spreadCanvases[si + 1];
      for (let f = 0; f < slideFrames; f++) {
        const t = f / slideFrames;
        const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        const offset = ease * W;

        ctx.fillStyle = '#030712';
        ctx.fillRect(0, 0, W, H);
        drawSpreadFit(img, -offset);
        drawSpreadFit(nextImg, W - offset);
        pushFrame();
        await new Promise((r) => setTimeout(r, frameDelay));
      }
    }
  }

  // Hold last frame briefly (1 second)
  for (let f = 0; f < FPS; f++) {
    pushFrame();
    await new Promise((r) => setTimeout(r, frameDelay));
  }

  recorder.stop();
  await done;

  onProgress?.(92);
  return new Blob(chunks, { type: 'video/webm' });
}
