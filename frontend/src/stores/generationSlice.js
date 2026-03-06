import {
  generateCartoon,
  uploadImages, analyzeStream, planBook, writeBookStream,
  unlockBook as unlockBookApi,
} from '../api/bookApi';
import { ensureFiles } from '../lib/imageUtils';
import { trackEvent } from '../lib/eventTracker';
import log from '../lib/editorLogger';

/* ── Phase-aware progress mapping ─────────────────────────────────── */
const PHASE_RANGES = {
  upload:  [0, 5],
  analyze: [5, 35],
  plan:    [35, 50],
  write:   [50, 99],
};

function phaseProgress(phase, raw) {
  const [lo, hi] = PHASE_RANGES[phase] || [0, 100];
  return Math.round(lo + (raw / 100) * (hi - lo));
}

export const createGenerationSlice = (set, get) => ({
  isGenerating: false,
  generationProgress: 0,
  generationStage: '',
  generationPhase: 'idle',
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
    if (s.isGenerating) return;
    const abortController = new AbortController();
    set({
      isGenerating: true,
      generationProgress: 0,
      generationPhase: 'upload',
      generationStage: 'Starting...',
      generationTotalPages: 0,
      generationCurrentPage: 0,
      error: null,
      generationId: null,
      _abortController: abortController,
    });

    log.action('generation', 'start', { template: s.selectedTemplate, imageCount: s.images.length });
    trackEvent('started', 'generation', { template: s.selectedTemplate });

    if (s.cartoonImages.length === 0 && !s.cartoonLoading) {
      get().triggerCartoonGeneration();
    }

    const onProgress = (event, phase) => {
      const cur = get().generationProgress;
      // Once complete, ignore further updates
      if (get().generationPhase === 'complete') return;
      const mapped = phaseProgress(phase, event.progress ?? 0);
      set({
        generationProgress: Math.max(mapped, cur),
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
        log.action('generation', 'phase:upload');
        set({ generationPhase: 'upload', generationStage: 'Uploading photos...' });
        // Re-hydrate File objects if they were evicted after a previous generation
        const hydratedImages = await ensureFiles(get().images);
        set({ images: hydratedImages });
        const uploadResult = await uploadImages(hydratedImages);
        sessionId = uploadResult.session_id;
        log.action('generation', 'uploaded', { sessionId });
        set((prev) => ({
          sessionId,
          generationProgress: Math.max(5, prev.generationProgress),
        }));
      }

      // Step 2: Analyze (if not already done)
      if (!hasAnalysis) {
        log.action('generation', 'phase:analyze', { sessionId });
        set({ generationPhase: 'analyze' });
        await analyzeStream(sessionId, (e) => onProgress(e, 'analyze'), abortController.signal);
        set((prev) => ({
          analysisComplete: true,
          generationProgress: Math.max(35, prev.generationProgress),
        }));
      }

      // Step 3: Plan
      log.action('generation', 'phase:plan', { sessionId });
      set((prev) => ({
        generationPhase: 'plan',
        generationStage: 'Planning your book layout...',
        generationProgress: Math.max(35, prev.generationProgress),
      }));
      const planRes = await planBook(sessionId, get()._getSettings());
      set((prev) => ({
        planResult: planRes.plan,
        generationProgress: Math.max(50, prev.generationProgress),
      }));

      // Step 4: Write (streams progress, credit deducted here)
      log.action('generation', 'phase:write', { sessionId });
      set({ generationPhase: 'write' });
      const result = await writeBookStream(
        sessionId, get()._getSettings(), (e) => onProgress(e, 'write'), abortController.signal,
      );

      // Evict File objects from images to free memory (keep previewUrl)
      set((prev) => ({
        images: prev.images.map(img => ({ id: img.id, previewUrl: img.previewUrl, name: img.name })),
        bookDraft: result.draft,
        photoAnalyses: result.photo_analyses,
        previewOnly: result.preview_only || false,
        isGenerating: false,
        generationProgress: 100,
        generationPhase: 'complete',
        generationStage: 'Complete!',
        _abortController: null,
      }));
      log.action('generation', 'complete', { pages: result.draft?.pages?.length || 0, preview: result.preview_only || false });
      trackEvent('completed', 'generation', { pages: result.draft?.pages?.length || 0, preview: result.preview_only || false });
    } catch (err) {
      if (err.name === 'AbortError') { log.action('generation', 'aborted'); return; }
      log.action('generation', 'failed', { error: err.message });
      set({
        isGenerating: false,
        generationProgress: 0,
        generationPhase: 'idle',
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
    if (s.isGenerating) return;
    if (!s.sessionId || !s.analysisComplete) {
      // No session — fall back to full generation
      return get().startGeneration();
    }

    const abortController = new AbortController();
    set({
      isGenerating: true,
      generationProgress: 40,
      generationPhase: 'plan',
      generationStage: 'Re-planning with new settings...',
      generationTotalPages: 0,
      generationCurrentPage: 0,
      error: null,
      generationId: null,
      bookDraft: null,
      _abortController: abortController,
    });

    const onProgress = (event, phase) => {
      const cur = get().generationProgress;
      if (get().generationPhase === 'complete') return;
      const mapped = phaseProgress(phase, event.progress ?? 0);
      set({
        generationProgress: Math.max(mapped, cur),
        generationStage: event.message ?? get().generationStage,
        generationTotalPages: event.totalPages ?? get().generationTotalPages,
        generationCurrentPage: event.current ?? get().generationCurrentPage,
        generationId: event.generationId ?? event.generation_id ?? get().generationId,
      });
    };

    try {
      // Re-plan with new settings
      const planRes = await planBook(s.sessionId, get()._getSettings());
      set((prev) => ({
        planResult: planRes.plan,
        generationProgress: Math.max(50, prev.generationProgress),
      }));

      // Re-write with new plan
      set({ generationPhase: 'write' });
      const result = await writeBookStream(
        s.sessionId, get()._getSettings(), (e) => onProgress(e, 'write'), abortController.signal,
      );

      set({
        bookDraft: result.draft,
        photoAnalyses: result.photo_analyses,
        previewOnly: result.preview_only || false,
        isGenerating: false,
        generationProgress: 100,
        generationPhase: 'complete',
        generationStage: 'Complete!',
        _abortController: null,
      });
    } catch (err) {
      if (err.name === 'AbortError') return;
      set({
        isGenerating: false,
        generationProgress: 0,
        generationPhase: 'idle',
        generationStage: '',
        error: err.message || 'Regeneration failed',
        generationId: err.generationId ?? get().generationId,
        _abortController: null,
      });
    }
  },

  retryGeneration: () => {
    set({ error: null, generationProgress: 0, generationPhase: 'idle', generationStage: '' });
    get().startGeneration();
  },

  cancelGeneration: () => {
    const controller = get()._abortController;
    if (controller) controller.abort();
    set({
      _abortController: null,
      isGenerating: false,
      generationProgress: 0,
      generationPhase: 'idle',
      generationStage: '',
      generationTotalPages: 0,
      generationCurrentPage: 0,
    });
  },

  /** Unlock a preview book by spending 1 credit. */
  unlockBook: async () => {
    const genId = get().generationId;
    if (!genId) return false;
    const result = await unlockBookApi(genId);
    if (result.unlocked) {
      set({ previewOnly: false });
      return true;
    }
    return false;
  },
});
