import { generateBook, generateCartoon } from '../api/bookApi';

export const createGenerationSlice = (set, get) => ({
  // Generation state
  isGenerating: false,
  generationProgress: 0,
  generationStage: '',
  bookDraft: null,
  photoAnalyses: [],
  error: null,
  cartoonImages: [],
  cartoonError: null,
  cartoonLoading: false,

  // Trigger cartoon generation early (called when leaving photo upload step)
  triggerCartoonGeneration: () => {
    const s = get();
    if (s.cartoonImages.length > 0 || s.cartoonLoading) return; // already done or in progress
    if (s.images.length < 2) return;

    set({ cartoonLoading: true, cartoonError: null });
    generateCartoon(s.images.slice(0, 3))
      .then(result => {
        if (result?.image_base64) {
          const dataUrl = `data:${result.mime_type || 'image/png'};base64,${result.image_base64}`;
          set({ cartoonImages: [dataUrl], cartoonLoading: false });
        } else {
          set({ cartoonLoading: false });
        }
      })
      .catch(err => {
        set({ cartoonError: err.message || 'Cartoon generation failed', cartoonLoading: false });
      });
  },

  // Generation actions
  startGeneration: async () => {
    const s = get();
    const startTime = Date.now();
    set({ isGenerating: true, generationProgress: 0, generationStage: 'Analyzing photos...', error: null });

    // Trigger cartoon if not already started
    if (s.cartoonImages.length === 0 && !s.cartoonLoading) {
      get().triggerCartoonGeneration();
    }

    const progressInterval = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      const progress = 88 * (1 - Math.exp(-elapsed / 40));
      let stage = 'Analyzing photos...';
      if (progress > 20) stage = 'Clustering moments...';
      if (progress > 40) stage = 'Planning layouts...';
      if (progress > 60) stage = 'Crafting your story...';
      if (progress > 80) stage = 'Adding finishing touches...';
      set({ generationProgress: progress, generationStage: stage });
    }, 500);

    try {
      const result = await generateBook({
        images: s.images,
        templateSlug: s.selectedTemplate,
        structureTemplate: s.structureTemplate,
        userStoryText: s.textInput,
        partnerNames: s.partnerNames,
        specialOccasion: s.occasion,
        vibe: s.vibe,
        imageLook: s.imageLook,
        imageDensity: s.imageDensity,
        designScale: s.designScale,
        addOns: s.addOns,
        questionAnswers: s.questionAnswers,
        constraints: s.constraints,
        includeQuotes: s.includeQuotes,
      });

      clearInterval(progressInterval);
      set({
        bookDraft: result.draft,
        photoAnalyses: result.photo_analyses,
        isGenerating: false,
        generationProgress: 100,
        generationStage: 'Complete!',
      });
    } catch (err) {
      clearInterval(progressInterval);
      set({
        isGenerating: false,
        generationProgress: 0,
        generationStage: '',
        error: err.message || 'Generation failed',
      });
    }
  },
});
