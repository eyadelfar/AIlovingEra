import { apiFetch } from '../lib/api';
import log from '../lib/editorLogger';

export const listDrafts = () => {
  log.action('draftsApi', 'listDrafts');
  return apiFetch('/api/drafts');
};

export const getDraft = (draftId) => {
  log.action('draftsApi', 'getDraft', { draftId });
  return apiFetch(`/api/drafts/${draftId}`);
};

export const deleteDraft = (draftId) => {
  log.action('draftsApi', 'deleteDraft', { draftId });
  return apiFetch(`/api/drafts/${draftId}`, { method: 'DELETE' });
};
