export const createViewerSlice = (set, get) => ({
  // Viewer state
  currentPage: 0,
  isEditMode: false,
  viewMode: 'spread',

  // Viewer actions
  setCurrentPage: (page) => set({ currentPage: page }),
  setViewMode: (mode) => set({ viewMode: mode }),
  nextPage: () => set((s) => {
    const maxPage = (s.bookDraft?.pages?.length ?? 1) - 1;
    return { currentPage: Math.min(s.currentPage + 1, maxPage) };
  }),
  prevPage: () => set((s) => ({ currentPage: Math.max(s.currentPage - 1, 0) })),
  setEditMode: (val) => set({ isEditMode: val }),
  toggleEditMode: () => set((s) => ({ isEditMode: !s.isEditMode })),
});
