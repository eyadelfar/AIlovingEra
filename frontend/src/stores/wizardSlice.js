export const createWizardSlice = (set, get) => ({
  // Wizard state
  currentStep: 0,
  selectedTemplate: null,
  structureTemplate: 'classic_timeline',
  images: [],
  textInput: '',
  partnerNames: ['', ''],
  occasion: '',
  vibe: 'romantic_warm',
  includeQuotes: true,
  constraints: [],

  // Wizard actions
  setStep: (step) => set({ currentStep: step }),
  nextStep: () => {
    const s = get();
    // Trigger cartoon generation when leaving photo upload step (step 1 → 2)
    if (s.currentStep === 1 && s.images.length >= 2) {
      s.triggerCartoonGeneration?.();
    }
    set({ currentStep: Math.min(s.currentStep + 1, 3) });
  },
  prevStep: () => set((s) => ({ currentStep: Math.max(s.currentStep - 1, 0) })),

  setTemplate: (slug) => set({ selectedTemplate: slug }),
  setStructureTemplate: (slug) => set({ structureTemplate: slug }),

  addImages: (files) => {
    const newImages = Array.from(files).map(file => ({
      id: crypto.randomUUID(),
      file,
      previewUrl: URL.createObjectURL(file),
      name: file.name,
    }));
    set((s) => ({ images: [...s.images, ...newImages] }));
  },

  removeImage: (id) => {
    set((s) => ({
      images: s.images.filter(i => i.id !== id),
    }));
  },

  undoRemoveImage: (image, index) => {
    const newPreviewUrl = URL.createObjectURL(image.file);
    set((s) => {
      const imgs = [...s.images];
      imgs.splice(Math.min(index, imgs.length), 0, { ...image, previewUrl: newPreviewUrl });
      return { images: imgs };
    });
  },

  reorderImages: (fromIdx, toIdx) => {
    set((s) => {
      const images = [...s.images];
      const [moved] = images.splice(fromIdx, 1);
      images.splice(toIdx, 0, moved);
      return { images };
    });
  },

  setTextInput: (text) => set({ textInput: text }),
  setPartnerNames: (names) => set({ partnerNames: names }),
  setOccasion: (occ) => set({ occasion: occ }),
  setVibe: (vibe) => set({ vibe }),
  setIncludeQuotes: (val) => set({ includeQuotes: val }),
  addConstraint: (text) => set((s) => ({ constraints: [...s.constraints, text] })),
  removeConstraint: (idx) => set((s) => ({ constraints: s.constraints.filter((_, i) => i !== idx) })),
  setConstraints: (list) => set({ constraints: list }),
});
