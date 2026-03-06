import { trackEvent } from '../lib/eventTracker';
import log from '../lib/editorLogger';

export const createViewerSlice = (set, get) => ({
  currentPage: 0,
  isEditMode: false,
  viewMode: 'spread',

  setCurrentPage: (page) => {
    log.action('viewer', 'setPage', { page });
    set({ currentPage: page });
    trackEvent('page_viewed', 'viewer', { page });
  },
  setViewMode: (mode) => {
    log.action('viewer', 'setViewMode', { mode });
    set({ viewMode: mode });
  },
  nextPage: () => {
    set((s) => {
      const activeDraft = s.editorDraft || s.bookDraft;
      const maxPage = (activeDraft?.pages?.length ?? 1) - 1;
      const newPage = Math.min(s.currentPage + 1, maxPage);
      return { currentPage: newPage };
    });
    trackEvent('page_viewed', 'viewer', { page: get().currentPage });
  },
  prevPage: () => {
    set((s) => ({ currentPage: Math.max(s.currentPage - 1, 0) }));
    trackEvent('page_viewed', 'viewer', { page: get().currentPage });
  },
  setEditMode: (val) => {
    log.action('viewer', 'setEditMode', { editMode: val });
    set({ isEditMode: val });
  },
  toggleEditMode: () => {
    const s = get();
    const newMode = !s.isEditMode;
    log.action('viewer', 'toggleEditMode', { from: s.isEditMode, to: newMode, dirty: s.editorDirty });
    if (s.isEditMode && s.editorDirty) {
      s.commitEditorDraft();
    }
    set({ isEditMode: newMode });
  },
});
