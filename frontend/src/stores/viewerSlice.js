import { trackEvent } from '../lib/eventTracker';

export const createViewerSlice = (set, get) => ({
  currentPage: 0,
  isEditMode: false,
  viewMode: 'spread',

  setCurrentPage: (page) => {
    set({ currentPage: page });
    trackEvent('page_viewed', 'viewer', { page });
  },
  setViewMode: (mode) => set({ viewMode: mode }),
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
  setEditMode: (val) => set({ isEditMode: val }),
  toggleEditMode: () => {
    const s = get();
    if (s.isEditMode && s.editorDirty) {
      s.commitEditorDraft();
    }
    set({ isEditMode: !s.isEditMode });
  },
});
