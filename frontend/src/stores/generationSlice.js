import {
  generateBookStream, generateCartoon,
  uploadImages, analyzeStream, planBook, writeBookStream,
  unlockBook as unlockBookApi,
} from '../api/bookApi';
import { trackEvent } from '../lib/eventTracker';

export const createGenerationSlice = (set, get) => ({
  isGenerating: false,
  generationProgress: 0,
  generationStage: '',
  generationTotalPages: 0,
  generationCurrentPage: 0,
  bookDraft: null,
  photoAnalyses: [],
  previewOnly: false,
  error: null,
  generationId: null,
  cartoonImages: [],
  cartoonLoading: false,
  _abortController: null,

  // Multi-step session state
  sessionId: null,
  analysisComplete: false,
  planResult: null,

  triggerCartoonGeneration: () => {
    const s = get();
    if (s.cartoonImages.length > 0 || s.cartoonLoading) return;
    if (s.images.length < 2) return;

    set({ cartoonLoading: true });
    generateCartoon(s.images.slice(0, 3))
      .then(result => {
        if (result?.image_base64) {
          // Convert base64 to blob URL to reduce JS heap usage
          const byteStr = atob(result.image_base64);
          const bytes = new Uint8Array(byteStr.length);
          for (let i = 0; i < byteStr.length; i++) bytes[i] = byteStr.charCodeAt(i);
          const blob = new Blob([bytes], { type: result.mime_type || 'image/png' });
          const blobUrl = URL.createObjectURL(blob);
          set({ cartoonImages: [blobUrl], cartoonLoading: false });
        } else {
          set({ cartoonLoading: false });
        }
      })
      .catch(() => {
        set({ cartoonLoading: false });
      });
  },

  /** Gather current wizard/settings state into a settings object for API calls. */
  _getSettings: () => {
    const s = get();
    return {
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
      customDensityCount: s.customDensityCount,
      customPageSize: s.customPageSize,
    };
  },

  /**
   * Full multi-step generation: upload → analyze → plan → write.
   * If a session already exists with completed analysis, skips upload + analyze.
   */
  startGeneration: async () => {
    const s = get();
    const abortController = new AbortController();
    set({
      isGenerating: true,
      generationProgress: 0,
      generationStage: 'Starting...',
      generationTotalPages: 0,
      generationCurrentPage: 0,
      error: null,
      generationId: null,
      _abortController: abortController,
    });

    trackEvent('started', 'generation', { template: s.selectedTemplate });

    if (s.cartoonImages.length === 0 && !s.cartoonLoading) {
      get().triggerCartoonGeneration();
    }

    const onProgress = (event) => {
      const currentProgress = get().generationProgress;
      const newProgress = event.progress ?? currentProgress;
      set({
        generationProgress: Math.max(newProgress, currentProgress),
        generationStage: event.message ?? get().generationStage,
        generationTotalPages: event.totalPages ?? get().generationTotalPages,
        generationCurrentPage: event.current ?? get().generationCurrentPage,
        generationId: event.generationId ?? event.generation_id ?? get().generationId,
      });
    };

    try {
      let sessionId = get().sessionId;
      let hasAnalysis = get().analysisComplete;

      // Step 1: Upload (if no session yet)
      if (!sessionId) {
        set({ generationStage: 'Uploading photos...' });
        const uploadResult = await uploadImages(s.images);
        sessionId = uploadResult.session_id;
        set({ sessionId, generationProgress: 1 });
      }

      // Step 2: Analyze (if not already done)
      if (!hasAnalysis) {
        await analyzeStream(sessionId, onProgress, abortController.signal);
        set({ analysisComplete: true });
      }

      // Step 3: Plan
      set({ generationStage: 'Planning your book layout...' });
      const planRes = await planBook(sessionId, get()._getSettings());
      set({ planResult: planRes.plan, generationProgress: 50 });

      // Step 4: Write (streams progress, credit deducted here)
      const result = await writeBookStream(
        sessionId, get()._getSettings(), onProgress, abortController.signal,
      );

      // Evict File objects from images to free memory (keep previewUrl)
      set((prev) => ({
        images: prev.images.map(img => ({ id: img.id, previewUrl: img.previewUrl, name: img.name })),
        bookDraft: result.draft,
        photoAnalyses: result.photo_analyses,
        previewOnly: result.preview_only || false,
        isGenerating: false,
        generationProgress: 100,
        generationStage: 'Complete!',
        _abortController: null,
      }));
      trackEvent('completed', 'generation', { pages: result.draft?.pages?.length || 0, preview: result.preview_only || false });
    } catch (err) {
      if (err.name === 'AbortError') return;
      set({
        isGenerating: false,
        generationProgress: 0,
        generationStage: '',
        error: err.message || 'Generation failed',
        generationId: err.generationId ?? get().generationId,
        _abortController: null,
      });
      trackEvent('failed', 'generation', { error: err.message || 'Generation failed' });
    }
  },

  /**
   * Re-generate with new settings. Skips upload + analyze (uses cached session).
   * Only re-plans and re-writes. Much faster (~10s vs 60s+).
   */
  rewriteWithNewSettings: async () => {
    const s = get();
    if (!s.sessionId || !s.analysisComplete) {
      // No session — fall back to full generation
      return get().startGeneration();
    }

    const abortController = new AbortController();
    set({
      isGenerating: true,
      generationProgress: 40,
      generationStage: 'Re-planning with new settings...',
      generationTotalPages: 0,
      generationCurrentPage: 0,
      error: null,
      generationId: null,
      bookDraft: null,
      _abortController: abortController,
    });

    const onProgress = (event) => {
      const currentProgress = get().generationProgress;
      const newProgress = event.progress ?? currentProgress;
      set({
        generationProgress: Math.max(newProgress, currentProgress),
        generationStage: event.message ?? get().generationStage,
        generationTotalPages: event.totalPages ?? get().generationTotalPages,
        generationCurrentPage: event.current ?? get().generationCurrentPage,
        generationId: event.generationId ?? event.generation_id ?? get().generationId,
      });
    };

    try {
      // Re-plan with new settings
      const planRes = await planBook(s.sessionId, get()._getSettings());
      set({ planResult: planRes.plan, generationProgress: 50 });

      // Re-write with new plan
      const result = await writeBookStream(
        s.sessionId, get()._getSettings(), onProgress, abortController.signal,
      );

      set({
        bookDraft: result.draft,
        photoAnalyses: result.photo_analyses,
        previewOnly: result.preview_only || false,
        isGenerating: false,
        generationProgress: 100,
        generationStage: 'Complete!',
        _abortController: null,
      });
    } catch (err) {
      if (err.name === 'AbortError') return;
      set({
        isGenerating: false,
        generationProgress: 0,
        generationStage: '',
        error: err.message || 'Regeneration failed',
        generationId: err.generationId ?? get().generationId,
        _abortController: null,
      });
    }
  },

  retryGeneration: () => {
    set({ error: null, generationProgress: 0, generationStage: '' });
    get().startGeneration();
  },

  cancelGeneration: () => {
    const controller = get()._abortController;
    if (controller) controller.abort();
    set({
      _abortController: null,
      isGenerating: false,
      generationProgress: 0,
      generationStage: '',
      generationTotalPages: 0,
      generationCurrentPage: 0,
    });
  },

  /** Unlock a preview book by spending 1 credit. */
  unlockBook: async () => {
    const genId = get().generationId;
    if (!genId) return false;
    try {
      const result = await unlockBookApi(genId);
      if (result.unlocked) {
        set({ previewOnly: false });
        return true;
      }
      return false;
    } catch (err) {
      console.error('Unlock failed:', err);
      throw err;
    }
  },
});
