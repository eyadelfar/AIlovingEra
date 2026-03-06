import { CURRENT_VERSION } from './bookExport';
import { rebuildPages } from '../stores/editorSlice';
import log from './editorLogger';

/**
 * Validate a parsed JSON export object.
 * Returns { valid: true } or { valid: false, error: "..." }.
 */
export function validateExport(data) {
  log.action('import', 'validate', { version: data?.version, hasKsb: data?.__ksb });
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Not a valid JSON object' };
  }
  if (data.__ksb !== true) {
    return { valid: false, error: 'Not a KeepSqueak book file (missing __ksb marker)' };
  }
  if (typeof data.version !== 'number') {
    return { valid: false, error: 'Missing or invalid version number' };
  }
  if (data.version > CURRENT_VERSION) {
    return { valid: false, error: `This file was saved with a newer version (v${data.version}). Please update KeepSqueak.` };
  }
  if (!data.generation?.bookDraft?.title || !Array.isArray(data.generation?.bookDraft?.chapters)) {
    return { valid: false, error: 'Missing or invalid book draft (no title or chapters)' };
  }
  if (!Array.isArray(data.images)) {
    return { valid: false, error: 'Missing images array' };
  }
  for (let i = 0; i < data.images.length; i++) {
    const img = data.images[i];
    if (!img.id || !img.name || !img.data) {
      return { valid: false, error: `Image ${i + 1} is missing required fields (id, name, data)` };
    }
  }
  if (!data.settings?.imageLook || !data.settings?.designScale) {
    return { valid: false, error: 'Missing settings (imageLook or designScale)' };
  }
  return { valid: true };
}

/**
 * Convert a base64 string to a File object. Synchronous, pure.
 */
function base64ToFile(b64, name, mimeType) {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new File([bytes], name, { type: mimeType || 'image/jpeg' });
}

/**
 * Deserialize the images array from an export into File objects + preview URLs.
 */
export function deserializeImages(imagesArray, onProgress) {
  log.action('import', 'deserializeImages', { count: imagesArray?.length });
  const result = [];
  for (let i = 0; i < imagesArray.length; i++) {
    onProgress?.({ stage: 'loading', current: i + 1, total: imagesArray.length });
    const img = imagesArray[i];
    const file = base64ToFile(img.data, img.name, img.mimeType);
    const previewUrl = URL.createObjectURL(file);
    result.push({ id: img.id, file, previewUrl, name: img.name });
  }
  return result;
}

/**
 * Build the flat payload object to pass to Zustand's set() for full hydration.
 * Calls rebuildPages() on the bookDraft so pages[] is restored.
 */
export function buildHydratePayload(exportData, images) {
  log.action('import', 'hydrate', { imageCount: images?.length, title: exportData?.generation?.bookDraft?.title });
  const bookDraft = structuredClone(exportData.generation.bookDraft);
  bookDraft.pages = rebuildPages(bookDraft);

  const wizard = exportData.wizard || {};
  const questions = exportData.questions || {};
  const settings = exportData.settings || {};
  const editor = exportData.editor || {};

  return {
    // Wizard state
    selectedTemplate: wizard.selectedTemplate || null,
    structureTemplate: wizard.structureTemplate || 'classic_timeline',
    textInput: wizard.textInput || '',
    partnerNames: wizard.partnerNames || ['', ''],
    occasion: wizard.occasion || '',
    vibe: wizard.vibe || 'romantic_warm',
    includeQuotes: wizard.includeQuotes ?? true,
    constraints: wizard.constraints || [],

    // Questions state
    aiQuestions: questions.aiQuestions || [],
    questionAnswers: questions.questionAnswers || {},

    // Settings state
    imageLook: settings.imageLook || 'natural',
    imageDensity: settings.imageDensity || 'balanced',
    customDensityCount: settings.customDensityCount ?? 4,
    designScale: settings.designScale || { pageSize: 'a4', pageCountTarget: 0, bleedMm: 3, marginMm: 12 },
    customPageSize: settings.customPageSize || null,
    addOns: settings.addOns || { loveLetter: false, audioQrCodes: false, anniversaryCover: false, miniReel: false },
    blendPhotos: settings.blendPhotos ?? false,
    customTheme: settings.customTheme || { pageBgColor: '#1a1020', headingColor: '#f9a8d4', bodyColor: '#e2e8f0', accentColor: '#c084fc', photoFrameStyle: 'rounded' },

    // Generation state
    bookDraft,
    photoAnalyses: exportData.generation.photoAnalyses || [],
    isGenerating: false,
    generationProgress: 100,
    generationStage: 'Complete!',
    error: null,
    cartoonImages: exportData.cartoonImages || [],

    // Images (deserialized File objects with preview URLs)
    images,

    // Editor overrides (keep intact, editorDraft rebuilt by initEditor)
    cropOverrides: editor.cropOverrides || {},
    filterOverrides: editor.filterOverrides || {},
    positionOffsets: editor.positionOffsets || {},
    blendOverrides: editor.blendOverrides || {},
    textStyleOverrides: editor.textStyleOverrides || {},
    textPositionOffsets: editor.textPositionOffsets || {},
    sizeOverrides: editor.sizeOverrides || {},

    // Editor session state — will be initialized fresh by initEditor
    editorDraft: null,
    editorHistory: [],
    editorFuture: [],
    editorDirty: false,

    // Viewer state
    currentPage: 0,
    isEditMode: false,
    currentStep: 3, // skip wizard, go straight to viewer
  };
}
