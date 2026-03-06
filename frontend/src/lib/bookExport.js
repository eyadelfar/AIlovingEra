import useBookStore from '../stores/bookStore';

export const CURRENT_VERSION = 1;
const EXPORT_MAX_WIDTH = 1600;
const EXPORT_QUALITY = 0.85;
const SKIP_THRESHOLD = 150 * 1024; // 150KB — files smaller than this skip canvas compression

/**
 * Compress and base64-encode a single image.
 * Small files (<150KB) are kept as-is; larger ones are resized via canvas.
 */
async function compressAndEncodeImage(imageObj, index, total, onProgress) {
  onProgress?.({ stage: 'compressing', current: index + 1, total });

  const file = imageObj.file;
  if (!file) {
    // Image has no file (e.g. AI-generated with URL only) — skip encoding
    return { id: imageObj.id, name: imageObj.name || 'image', mimeType: 'image/jpeg', data: '' };
  }
  const arrayBuffer = await file.arrayBuffer();

  // Small files: skip canvas, just base64 the raw bytes
  if (file.size < SKIP_THRESHOLD) {
    const bytes = new Uint8Array(arrayBuffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return {
      id: imageObj.id,
      name: imageObj.name || file.name,
      mimeType: file.type || 'image/jpeg',
      data: btoa(binary),
    };
  }

  // Larger files: draw to canvas, compress
  const blob = new Blob([arrayBuffer], { type: file.type });
  const bitmap = await createImageBitmap(blob);
  const { width, height } = bitmap;

  let targetW = width;
  let targetH = height;
  if (width > EXPORT_MAX_WIDTH) {
    const ratio = EXPORT_MAX_WIDTH / width;
    targetW = EXPORT_MAX_WIDTH;
    targetH = Math.round(height * ratio);
  }

  const canvas = new OffscreenCanvas(targetW, targetH);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(bitmap, 0, 0, targetW, targetH);
  bitmap.close();

  const compressedBlob = await canvas.convertToBlob({ type: 'image/jpeg', quality: EXPORT_QUALITY });
  const compressedBuffer = await compressedBlob.arrayBuffer();
  const compressedBytes = new Uint8Array(compressedBuffer);
  let binary = '';
  for (let i = 0; i < compressedBytes.length; i++) binary += String.fromCharCode(compressedBytes[i]);

  return {
    id: imageObj.id,
    name: imageObj.name || file.name,
    mimeType: 'image/jpeg',
    data: btoa(binary),
  };
}

/**
 * Export the entire book state as a JSON string.
 * Images are compressed and base64-encoded sequentially (for progress reporting).
 */
export async function exportBook(onProgress) {
  const s = useBookStore.getState();

  // Strip pages[] from bookDraft (rebuilt on import via rebuildPages)
  let bookDraftClone = null;
  if (s.bookDraft) {
    bookDraftClone = structuredClone(s.bookDraft);
    delete bookDraftClone.pages;
  }

  // Sequentially compress images (so progress works)
  const images = [];
  for (let i = 0; i < s.images.length; i++) {
    const encoded = await compressAndEncodeImage(s.images[i], i, s.images.length, onProgress);
    images.push(encoded);
  }

  const envelope = {
    __ksb: true,
    version: CURRENT_VERSION,
    exportedAt: new Date().toISOString(),
    meta: {
      title: s.bookDraft?.title || 'Untitled',
      photoCount: s.images.length,
      pageCount: s.bookDraft?.pages?.length || 0,
      partnerNames: s.partnerNames,
    },
    wizard: {
      selectedTemplate: s.selectedTemplate,
      structureTemplate: s.structureTemplate,
      textInput: s.textInput,
      partnerNames: s.partnerNames,
      occasion: s.occasion,
      vibe: s.vibe,
      includeQuotes: s.includeQuotes,
      constraints: s.constraints,
    },
    questions: {
      aiQuestions: s.aiQuestions,
      questionAnswers: s.questionAnswers,
    },
    settings: {
      imageLook: s.imageLook,
      imageDensity: s.imageDensity,
      customDensityCount: s.customDensityCount,
      designScale: s.designScale,
      customPageSize: s.customPageSize,
      addOns: s.addOns,
      blendPhotos: s.blendPhotos,
      customTheme: s.customTheme,
    },
    generation: {
      bookDraft: bookDraftClone,
      photoAnalyses: s.photoAnalyses,
    },
    editor: {
      cropOverrides: s.cropOverrides,
      filterOverrides: s.filterOverrides,
      positionOffsets: s.positionOffsets,
      blendOverrides: s.blendOverrides,
      textStyleOverrides: s.textStyleOverrides,
      textPositionOffsets: s.textPositionOffsets,
      sizeOverrides: s.sizeOverrides,
    },
    images,
    cartoonImages: s.cartoonImages || [],
  };

  return JSON.stringify(envelope);
}

/**
 * Trigger a browser download of the JSON export string.
 */
export function downloadBookExport(jsonString, title) {
  const safeName = (title || 'memory-book').replace(/[^a-zA-Z0-9_\- ]/g, '').trim() || 'memory-book';
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${safeName}-keepsqueak.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
