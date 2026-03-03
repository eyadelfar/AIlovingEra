import { apiFetch } from '../lib/api';

export const listDrafts = () => apiFetch('/api/drafts');

export const getDraft = (draftId) => apiFetch(`/api/drafts/${draftId}`);

export const createDraft = (data) =>
  apiFetch('/api/drafts', { method: 'POST', body: JSON.stringify(data) });

export const updateDraft = (draftId, data) =>
  apiFetch(`/api/drafts/${draftId}`, { method: 'PUT', body: JSON.stringify(data) });

export const deleteDraft = (draftId) =>
  apiFetch(`/api/drafts/${draftId}`, { method: 'DELETE' });

export const uploadDraftPhotos = async (draftId, files) => {
  const form = new FormData();
  files.forEach((f) => form.append('photos', f));
  return apiFetch(`/api/drafts/${draftId}/photos`, { method: 'POST', body: form, rawBody: true });
};
