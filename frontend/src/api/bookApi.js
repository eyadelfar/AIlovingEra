import { apiJson, apiBlob } from '../lib/api';

export async function generateBook({
  images, templateSlug, structureTemplate, userStoryText, partnerNames,
  specialOccasion, vibe, imageLook, imageDensity, designScale, addOns,
  questionAnswers, constraints, includeQuotes,
}) {
  const form = new FormData();
  images.forEach(img => form.append('images', img.file));
  form.append('template_slug', templateSlug || 'romantic');
  form.append('structure_template', structureTemplate || 'classic_timeline');
  form.append('user_story_text', userStoryText || '');
  form.append('partner_names', (partnerNames || []).filter(Boolean).join(','));
  form.append('relationship_type', 'couple');
  form.append('special_occasion', specialOccasion || '');
  form.append('vibe', vibe || 'romantic_warm');
  form.append('image_look', imageLook || 'natural');
  form.append('image_density', imageDensity || 'balanced');
  const allConstraints = [...(constraints || [])];
  if (includeQuotes === false) {
    allConstraints.unshift('Do NOT include any quotes in the book.');
  }
  form.append('constraints_json', JSON.stringify(allConstraints));

  if (designScale) {
    form.append('page_size', designScale.pageSize || 'a4');
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

  return apiJson('/api/books/generate', { method: 'POST', body: form });
}

export async function fetchAIQuestions({ images, partnerNames, relationshipType }) {
  const form = new FormData();
  images.forEach(img => form.append('images', img.file));
  form.append('partner_names', (partnerNames || []).filter(Boolean).join(','));
  form.append('relationship_type', relationshipType || 'couple');
  return apiJson('/api/books/questions', { method: 'POST', body: form });
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
  const form = new FormData();
  images.slice(0, 3).forEach(img => form.append('images', img.file));
  form.append('style', style);
  return apiJson('/api/books/generate-cartoon', { method: 'POST', body: form });
}

export async function regenerateText(request) {
  return apiJson('/api/books/regenerate-text', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
}

export async function downloadBookPdf({ draft, images, templateSlug, designScale, photoAnalyses, filename }) {
  const form = new FormData();
  images.forEach(img => form.append('images', img.file));
  form.append('draft_json', JSON.stringify(draft));
  form.append('template_slug', templateSlug || 'romantic');

  if (designScale) {
    form.append('page_size', designScale.pageSize || 'a4');
    form.append('bleed_mm', String(designScale.bleedMm ?? 3));
    form.append('margin_mm', String(designScale.marginMm ?? 12));
  }

  if (photoAnalyses?.length) {
    form.append('photo_analyses_json', JSON.stringify(photoAnalyses));
  }

  // 5-minute timeout for large PDFs
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5 * 60 * 1000);

  try {
    const blob = await apiBlob('/api/books/pdf', {
      method: 'POST',
      body: form,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `${draft.title || 'memory-book'}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('PDF generation timed out. Try reducing the number of pages or images.');
    }
    throw err;
  }
}
