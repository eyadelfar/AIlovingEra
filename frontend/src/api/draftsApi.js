import { apiFetch } from '../lib/api';

export const listDrafts = () => apiFetch('/api/drafts');

export const getDraft = (draftId) => apiFetch(`/api/drafts/${draftId}`);

export const deleteDraft = (draftId) =>
  apiFetch(`/api/drafts/${draftId}`, { method: 'DELETE' });
