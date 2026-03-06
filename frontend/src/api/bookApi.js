import { apiJson, apiBlob, getAccessToken, forceRefreshToken } from '../lib/api';
import { compressImagesForAPI, compressImagesForPDF, isUploadable } from '../lib/imageUtils';

/**
 * Authenticated fetch with 401 retry for streaming endpoints that bypass apiFetch.
 * If the first attempt returns 401, refreshes the token and retries once.
 */
async function authFetch(url, options = {}) {
  const token = await getAccessToken();
  const headers = { ...options.headers, ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  const res = await fetch(url, { ...options, headers });

  if (res.status === 401) {
    const freshToken = await forceRefreshToken();
    if (freshToken) {
      const retryHeaders = { ...options.headers, Authorization: `Bearer ${freshToken}` };
      return fetch(url, { ...options, headers: retryHeaders });
    }
  }

  return res;
}

export async function fetchTemplates() {
  return apiJson('/api/templates');
}

export async function generateBook({
  images, templateSlug, structureTemplate, userStoryText, partnerNames,
  specialOccasion, vibe, imageLook, imageDensity, designScale, addOns,
  questionAnswers, constraints, includeQuotes, customDensityCount, customPageSize,
}) {
  const form = new FormData();
  images.forEach(img => { if (isUploadable(img.file)) form.append('images', img.file); });
  form.append('template_slug', templateSlug || 'romantic');
  form.append('structure_template', structureTemplate || 'classic_timeline');
  form.append('user_story_text', userStoryText || '');
  form.append('partner_names_json', JSON.stringify((partnerNames || []).map(n => n.trim()).filter(Boolean)));
  form.append('relationship_type', 'couple');
  form.append('special_occasion', specialOccasion || '');
  form.append('vibe', vibe || 'romantic_warm');
  form.append('image_look', imageLook || 'natural');

  // Backend enum only accepts dense/balanced/airy — map custom to dense
  const densityForApi = imageDensity === 'custom' ? 'dense' : (imageDensity || 'balanced');
  form.append('image_density', densityForApi);

  const allConstraints = [...(constraints || [])];
  if (includeQuotes === false) {
    allConstraints.unshift('Do NOT include any quotes in the book.');
  }
  // Pass custom density as a constraint so AI knows the target
  if (imageDensity === 'custom' && customDensityCount) {
    allConstraints.push(`Use up to ${customDensityCount} photos per page spread.`);
  }
  // Pass custom page dimensions as a constraint
  if (designScale?.pageSize === 'custom' && customPageSize) {
    allConstraints.push(`Custom page size: ${customPageSize.width} x ${customPageSize.height} ${customPageSize.unit}.`);
  }
  form.append('constraints_json', JSON.stringify(allConstraints));

  if (designScale) {
    // Backend enum only accepts a4/us_letter/square — map custom to closest
    const pageSizeForApi = designScale.pageSize === 'custom' ? 'a4' : (designScale.pageSize || 'a4');
    form.append('page_size', pageSizeForApi);
    form.append('page_count_target', String(designScale.pageCountTarget ?? 24));
    form.append('bleed_mm', String(designScale.bleedMm ?? 3));
    form.append('margin_mm', String(designScale.marginMm ?? 12));
  }

  if (addOns) {
    form.append('love_letter_insert', String(addOns.loveLetter ?? false));
    form.append('audio_qr_codes', String(addOns.audioQrCodes ?? false));
    form.append('anniversary_edition_cover', String(addOns.anniversaryCover ?? false));
    form.append('mini_reel_storyboard', String(addOns.miniReel ?? false));
  }

  if (questionAnswers && Object.keys(questionAnswers).length > 0) {
    const answersArray = Object.entries(questionAnswers)
      .filter(([, text]) => text.trim())
      .map(([id, text]) => ({ question_id: id, answer_text: text }));
    form.append('question_answers_json', JSON.stringify(answersArray));
  }

  // Send locale so AI generates book content in the user's language
  const { default: i18n } = await import('../lib/i18n');
  form.append('locale', i18n.language || 'en');

  return apiJson('/api/books/generate', { method: 'POST', body: form, timeout: 300_000 });
}

/**
 * SSE-based book generation with real-time progress events.
 * @param {object} params - Same as generateBook params
 * @param {function} onProgress - Called with { stage, message, progress, current, total, totalPages }
 * @param {AbortSignal} signal - Optional abort signal for cancellation
 * @returns {Promise<object>} The final generation result (draft + photo_analyses)
 */
export async function generateBookStream({
  images, templateSlug, structureTemplate, userStoryText, partnerNames,
  specialOccasion, vibe, imageLook, imageDensity, designScale, addOns,
  questionAnswers, constraints, includeQuotes, customDensityCount, customPageSize,
}, onProgress, signal) {
  const form = new FormData();
  images.forEach(img => { if (isUploadable(img.file)) form.append('images', img.file); });
  form.append('template_slug', templateSlug || 'romantic');
  form.append('structure_template', structureTemplate || 'classic_timeline');
  form.append('user_story_text', userStoryText || '');
  form.append('partner_names_json', JSON.stringify((partnerNames || []).map(n => n.trim()).filter(Boolean)));
  form.append('relationship_type', 'couple');
  form.append('special_occasion', specialOccasion || '');
  form.append('vibe', vibe || 'romantic_warm');
  form.append('image_look', imageLook || 'natural');

  const densityForApi = imageDensity === 'custom' ? 'dense' : (imageDensity || 'balanced');
  form.append('image_density', densityForApi);

  const allConstraints = [...(constraints || [])];
  if (includeQuotes === false) {
    allConstraints.unshift('Do NOT include any quotes in the book.');
  }
  if (imageDensity === 'custom' && customDensityCount) {
    allConstraints.push(`Use up to ${customDensityCount} photos per page spread.`);
  }
  if (designScale?.pageSize === 'custom' && customPageSize) {
    allConstraints.push(`Custom page size: ${customPageSize.width} x ${customPageSize.height} ${customPageSize.unit}.`);
  }
  form.append('constraints_json', JSON.stringify(allConstraints));

  if (designScale) {
    const pageSizeForApi = designScale.pageSize === 'custom' ? 'a4' : (designScale.pageSize || 'a4');
    form.append('page_size', pageSizeForApi);
    form.append('page_count_target', String(designScale.pageCountTarget ?? 24));
    form.append('bleed_mm', String(designScale.bleedMm ?? 3));
    form.append('margin_mm', String(designScale.marginMm ?? 12));
  }

  if (addOns) {
    form.append('love_letter_insert', String(addOns.loveLetter ?? false));
    form.append('audio_qr_codes', String(addOns.audioQrCodes ?? false));
    form.append('anniversary_edition_cover', String(addOns.anniversaryCover ?? false));
    form.append('mini_reel_storyboard', String(addOns.miniReel ?? false));
  }

  if (questionAnswers && Object.keys(questionAnswers).length > 0) {
    const answersArray = Object.entries(questionAnswers)
      .filter(([, text]) => text.trim())
      .map(([id, text]) => ({ question_id: id, answer_text: text }));
    form.append('question_answers_json', JSON.stringify(answersArray));
  }

  // Send locale so AI generates book content in the user's language
  const { default: i18n } = await import('../lib/i18n');
  form.append('locale', i18n.language || 'en');

  const BASE = import.meta.env.VITE_API_BASE_URL ?? '';
  const res = await authFetch(`${BASE}/api/books/generate/stream`, {
    method: 'POST',
    body: form,
    signal,
  });

  if (!res.ok) {
    const text = await res.text();
    let message = text || `Generation failed: ${res.status}`;
    try {
      const json = JSON.parse(text);
      if (json.detail) message = typeof json.detail === 'string' ? json.detail : JSON.stringify(json.detail);
    } catch { /* ignore */ }
    throw new Error(message);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let finalResult = null;
  let lastEventTime = Date.now();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        // Filter SSE heartbeat comments
        if (line.startsWith(':')) {
          lastEventTime = Date.now();
          continue;
        }
        if (!line.startsWith('data: ')) continue;
        lastEventTime = Date.now();
        try {
          const event = JSON.parse(line.slice(6));
          if (event.stage === 'complete') {
            finalResult = event.result;
            if (event.preview_only && finalResult) finalResult.preview_only = true;
            onProgress?.({
              stage: 'complete',
              message: 'Your book is ready!',
              progress: 100,
              totalPages: event.result?.draft?.pages?.length,
              generationId: event.generation_id,
              preview_only: event.preview_only || false,
            });
          } else if (event.stage === 'error') {
            const err = new Error(event.message || 'Generation failed');
            err.generationId = event.generation_id;
            throw err;
          } else {
            onProgress?.(event);
          }
        } catch (e) {
          if (e.message && e.message !== 'Generation failed') throw e;
        }
      }

      // Detect stale connection (no data for 45s, even heartbeats)
      if (Date.now() - lastEventTime > 45_000) {
        throw new Error('Connection lost — no data received. Please try again.');
      }
    }
  } finally {
    reader.cancel();
  }

  if (!finalResult) {
    throw new Error('Generation stream ended without a result');
  }

  return finalResult;
}

// ── Multi-step generation API ────────────────────────────────────────────

/**
 * Build the common settings body used by /plan and /write endpoints.
 */
function _buildSettingsBody(sessionId, settings) {
  const {
    templateSlug, structureTemplate, userStoryText, partnerNames,
    specialOccasion, vibe, imageLook, imageDensity, designScale, addOns,
    questionAnswers, constraints, includeQuotes, customDensityCount, customPageSize,
  } = settings;

  const densityForApi = imageDensity === 'custom' ? 'dense' : (imageDensity || 'balanced');
  const allConstraints = [...(constraints || [])];
  if (includeQuotes === false) allConstraints.unshift('Do NOT include any quotes in the book.');
  if (imageDensity === 'custom' && customDensityCount) {
    allConstraints.push(`Use up to ${customDensityCount} photos per page spread.`);
  }
  if (designScale?.pageSize === 'custom' && customPageSize) {
    allConstraints.push(`Custom page size: ${customPageSize.width} x ${customPageSize.height} ${customPageSize.unit}.`);
  }

  const answersArray = questionAnswers && typeof questionAnswers === 'object'
    ? Object.entries(questionAnswers)
        .filter(([, text]) => text?.trim?.())
        .map(([id, text]) => ({ question_id: id, answer_text: text }))
    : [];

  return {
    session_id: sessionId,
    template_slug: templateSlug || 'romantic',
    structure_template: structureTemplate || 'classic_timeline',
    user_story_text: userStoryText || '',
    partner_names: (partnerNames || []).map(n => n.trim()).filter(Boolean),
    relationship_type: 'couple',
    special_occasion: specialOccasion || '',
    vibe: vibe || 'romantic_warm',
    image_look: imageLook || 'natural',
    image_density: densityForApi,
    page_size: designScale?.pageSize === 'custom' ? 'a4' : (designScale?.pageSize || 'a4'),
    page_count_target: designScale?.pageCountTarget ?? 24,
    bleed_mm: designScale?.bleedMm ?? 3,
    margin_mm: designScale?.marginMm ?? 12,
    love_letter_insert: addOns?.loveLetter ?? false,
    audio_qr_codes: addOns?.audioQrCodes ?? false,
    anniversary_edition_cover: addOns?.anniversaryCover ?? false,
    mini_reel_storyboard: addOns?.miniReel ?? false,
    question_answers: answersArray,
    constraints: allConstraints,
  };
}

/**
 * Step 1: Upload images to create a server session.
 * @returns {{ session_id: string, image_count: number }}
 */
export async function uploadImages(images) {
  const form = new FormData();
  images.forEach(img => {
    if (isUploadable(img.file)) form.append('images', img.file);
  });
  return apiJson('/api/books/upload', { method: 'POST', body: form, timeout: 120_000 });
}

/**
 * Step 2: Analyze uploaded photos via SSE (stages A-B).
 * @param {string} sessionId
 * @param {function} onProgress
 * @param {AbortSignal} signal
 */
export async function analyzeStream(sessionId, onProgress, signal) {
  const form = new FormData();
  form.append('session_id', sessionId);

  const BASE = import.meta.env.VITE_API_BASE_URL ?? '';
  const res = await authFetch(`${BASE}/api/books/analyze/stream`, {
    method: 'POST',
    body: form,
    signal,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Analysis failed: ${res.status}`);
  }

  return _readSSEStream(res, onProgress);
}

/**
 * Step 3: Plan book structure (stage C). Fast text-only AI call.
 * @returns {{ session_id, plan, estimated_pages, num_chapters, num_spreads }}
 */
export async function planBook(sessionId, settings) {
  const body = _buildSettingsBody(sessionId, settings);
  return apiJson('/api/books/plan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    timeout: 60_000,
  });
}

/**
 * Step 4: Write narrative text via SSE (stage D). Credits deducted here.
 * @returns {Promise<object>} The final generation result (draft + photo_analyses)
 */
export async function writeBookStream(sessionId, settings, onProgress, signal, planOverride) {
  const body = _buildSettingsBody(sessionId, settings);
  if (planOverride) body.plan_override = planOverride;

  const BASE = import.meta.env.VITE_API_BASE_URL ?? '';
  const res = await authFetch(`${BASE}/api/books/write/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });

  if (!res.ok) {
    const text = await res.text();
    let message = text || `Write failed: ${res.status}`;
    try {
      const parsed = JSON.parse(text);
      if (parsed.detail) message = typeof parsed.detail === 'string' ? parsed.detail : JSON.stringify(parsed.detail);
    } catch { /* ignore */ }
    throw new Error(message);
  }

  return _readSSEStream(res, onProgress);
}

/**
 * Generic SSE stream reader with heartbeat filtering and stale detection.
 * Returns the final event's result (for complete events) or the complete event itself.
 */
async function _readSSEStream(res, onProgress) {
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let finalResult = null;
  let lastEventTime = Date.now();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith(':')) { lastEventTime = Date.now(); continue; }
        if (!line.startsWith('data: ')) continue;
        lastEventTime = Date.now();
        try {
          const event = JSON.parse(line.slice(6));
          if (event.stage === 'complete') {
            finalResult = event.result || event;
            if (event.preview_only) finalResult.preview_only = true;
            onProgress?.({ stage: 'complete', progress: 100, ...event });
          } else if (event.stage === 'error') {
            const err = new Error(event.message || 'Stream failed');
            err.generationId = event.generation_id;
            throw err;
          } else {
            onProgress?.(event);
          }
        } catch (e) {
          if (e.message && !e.message.includes('JSON')) throw e;
        }
      }

      if (Date.now() - lastEventTime > 45_000) {
        throw new Error('Connection lost — no data received. Please try again.');
      }
    }
  } finally {
    reader.cancel();
  }

  return finalResult;
}

export async function fetchAIQuestions({ images, partnerNames, relationshipType, extraCount, existingQuestions }) {
  const compressed = await compressImagesForAPI(images);
  const form = new FormData();
  compressed.forEach(img => { if (isUploadable(img.file)) form.append('images', img.file); });
  form.append('partner_names_json', JSON.stringify((partnerNames || []).map(n => n.trim()).filter(Boolean)));
  form.append('relationship_type', relationshipType || 'couple');
  if (extraCount) form.append('extra_count', String(extraCount));
  if (existingQuestions?.length) form.append('existing_questions_json', JSON.stringify(existingQuestions));

  // Send the user's current language so AI generates questions in their language
  const { default: i18n } = await import('../lib/i18n');
  form.append('locale', i18n.language || 'en');

  return apiJson('/api/books/questions', { method: 'POST', body: form, timeout: 90_000 });
}

/**
 * SSE streaming version of fetchAIQuestions — returns real progress events.
 * @param {{ images, partnerNames, relationshipType }} params
 * @param {function} onProgress - called with { stage, message, progress }
 * @returns {Promise<{ questions: Array }>} final result with questions array
 */
export async function fetchAIQuestionsStream({ images, partnerNames, relationshipType, questionCount }, onProgress) {
  const compressed = await compressImagesForAPI(images);
  const form = new FormData();
  compressed.forEach(img => { if (isUploadable(img.file)) form.append('images', img.file); });
  form.append('partner_names_json', JSON.stringify((partnerNames || []).map(n => n.trim()).filter(Boolean)));
  form.append('relationship_type', relationshipType || 'couple');
  if (questionCount) form.append('question_count', String(questionCount));

  const { default: i18n } = await import('../lib/i18n');
  form.append('locale', i18n.language || 'en');

  const BASE = import.meta.env.VITE_API_BASE_URL ?? '';
  const res = await authFetch(`${BASE}/api/books/questions/stream`, {
    method: 'POST',
    body: form,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Question generation failed: ${res.status}`);
  }

  return _readSSEStream(res, onProgress);
}

export async function generateAIImage({ prompt, styleHint, imageLook }) {
  const form = new FormData();
  form.append('prompt', prompt);
  form.append('style_hint', styleHint || '');
  form.append('image_look', imageLook || 'natural');
  return apiJson('/api/books/generate-image', { method: 'POST', body: form });
}

export async function enhanceImage({ imageFile, styleHint, imageLook, vibe, context }) {
  const form = new FormData();
  form.append('image', imageFile);
  form.append('style_hint', styleHint || '');
  form.append('image_look', imageLook || 'natural');
  form.append('vibe', vibe || '');
  form.append('context', context || '');
  return apiJson('/api/books/enhance-image', { method: 'POST', body: form });
}

export async function generateCartoon(images, style = 'chibi') {
  const compressed = await compressImagesForAPI(images.slice(0, 3));
  const form = new FormData();
  compressed.forEach(img => { if (isUploadable(img.file)) form.append('images', img.file); });
  form.append('style', style);
  return apiJson('/api/books/generate-cartoon', { method: 'POST', body: form, timeout: 90_000 });
}

export async function regenerateText(request) {
  return apiJson('/api/books/regenerate-text', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
}

export async function downloadBookPdf({ draft, images, templateSlug, designScale, photoAnalyses, filename, cropOverrides, filterOverrides, textStyleOverrides, positionOffsets, blendOverrides, sizeOverrides, signal, customPageSize, onProgress, transformBlob }) {
  // Pre-compress images for PDF quality (2400px, 0.92 quality)
  const compressed = await compressImagesForPDF(images, { onProgress });
  const form = new FormData();
  compressed.forEach(img => { if (isUploadable(img.file)) form.append('images', img.file); });
  form.append('draft_json', JSON.stringify(draft));
  form.append('template_slug', templateSlug || 'romantic');

  if (designScale) {
    const isCustom = designScale.pageSize === 'custom';
    const pageSizeForApi = isCustom ? 'custom' : (designScale.pageSize || 'a4');
    form.append('page_size', pageSizeForApi);
    form.append('bleed_mm', String(designScale.bleedMm ?? 3));
    form.append('margin_mm', String(designScale.marginMm ?? 12));
    if (isCustom && customPageSize) {
      form.append('custom_width', String(customPageSize.width));
      form.append('custom_height', String(customPageSize.height));
      form.append('custom_unit', customPageSize.unit || 'mm');
    }
  }

  if (photoAnalyses?.length) {
    form.append('photo_analyses_json', JSON.stringify(photoAnalyses));
  }

  if (cropOverrides && Object.keys(cropOverrides).length) {
    form.append('crop_overrides_json', JSON.stringify(cropOverrides));
  }
  if (filterOverrides && Object.keys(filterOverrides).length) {
    form.append('filter_overrides_json', JSON.stringify(filterOverrides));
  }
  if (textStyleOverrides && Object.keys(textStyleOverrides).length) {
    form.append('text_style_overrides_json', JSON.stringify(textStyleOverrides));
  }
  if (positionOffsets && Object.keys(positionOffsets).length) {
    form.append('position_offsets_json', JSON.stringify(positionOffsets));
  }
  if (blendOverrides && Object.keys(blendOverrides).length) {
    form.append('blend_overrides_json', JSON.stringify(blendOverrides));
  }
  if (sizeOverrides && Object.keys(sizeOverrides).length) {
    form.append('size_overrides_json', JSON.stringify(sizeOverrides));
  }

  onProgress?.({ stage: 'printing', current: 0, total: 0 });

  const BASE = import.meta.env.VITE_API_BASE_URL ?? '';

  // Try SSE streaming endpoint first (scalable, no timeout issues)
  try {
    const downloadToken = await _downloadPdfViaSSE(BASE, form, signal, onProgress);
    // Fetch the actual PDF via the download token
    const pdfRes = await authFetch(`${BASE}/api/books/pdf/download/${downloadToken}`, {
      signal,
    });
    if (!pdfRes.ok) throw new Error(`PDF download failed: ${pdfRes.status}`);
    let blob = await pdfRes.blob();
    if (transformBlob) blob = await transformBlob(blob);
    _triggerBlobDownload(blob, filename || `${draft.title || 'memory-book'}.pdf`);
    return;
  } catch (err) {
    if (err.name === 'AbortError' || signal?.aborted) {
      throw new Error('PDF download cancelled.');
    }
    // Fall through to blocking endpoint as fallback
    if (import.meta.env.DEV) {
      console.warn('SSE PDF failed, falling back to blocking endpoint:', err.message);
    }
  }

  // Fallback: blocking /pdf endpoint with long timeout, no retries
  const controller = new AbortController();
  if (signal) {
    signal.addEventListener('abort', () => controller.abort());
  }

  try {
    let blob = await apiBlob('/api/books/pdf', {
      method: 'POST',
      body: form,
      signal: controller.signal,
      timeout: 30 * 60 * 1000,
      retries: 0,
    });

    if (transformBlob) blob = await transformBlob(blob);
    _triggerBlobDownload(blob, filename || `${draft.title || 'memory-book'}.pdf`);
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error(signal?.aborted ? 'PDF download cancelled.' : 'PDF generation timed out. Try reducing the number of pages or images.');
    }
    throw err;
  }
}

/** Read SSE events from /pdf/stream and return the download token. */
async function _downloadPdfViaSSE(base, form, signal, onProgress) {
  const res = await authFetch(`${base}/api/books/pdf/stream`, {
    method: 'POST',
    body: form,
    signal,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `PDF stream failed: ${res.status}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let downloadToken = null;
  let lastEventTime = Date.now();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        // Filter SSE heartbeat comments
        if (line.startsWith(':')) {
          lastEventTime = Date.now();
          continue;
        }
        if (!line.startsWith('data: ')) continue;
        lastEventTime = Date.now();
        try {
          const event = JSON.parse(line.slice(6));
          if (event.stage === 'complete') {
            downloadToken = event.download_token;
          } else if (event.stage === 'error') {
            throw new Error(event.message || 'PDF generation failed');
          } else {
            onProgress?.(event);
          }
        } catch (e) {
          if (e.message && !e.message.includes('JSON')) throw e;
        }
      }

      // Detect stale connection
      if (Date.now() - lastEventTime > 45_000) {
        throw new Error('Connection lost — no data received. Please try again.');
      }
    }
  } finally {
    reader.cancel();
  }

  if (!downloadToken) {
    throw new Error('PDF stream ended without a download token');
  }

  return downloadToken;
}

/**
 * Unlock a preview-only book by spending 1 credit.
 * @param {string} generationId
 * @returns {{ unlocked: boolean, credits_remaining: number }}
 */
export async function unlockBook(generationId) {
  return apiJson('/api/books/unlock', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ generation_id: generationId }),
  });
}

/** Trigger a browser file download from a Blob. */
function _triggerBlobDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
