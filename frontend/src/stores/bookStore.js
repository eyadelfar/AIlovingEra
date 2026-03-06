import { create } from 'zustand';
import { createWizardSlice } from './wizardSlice';
import { createQuestionsSlice } from './questionsSlice';
import { createSettingsSlice } from './settingsSlice';
import { createGenerationSlice } from './generationSlice';
import { createViewerSlice } from './viewerSlice';
import { createEditorSlice } from './editorSlice';

const useBookStore = create((...a) => ({
  ...createWizardSlice(...a),
  ...createQuestionsSlice(...a),
  ...createSettingsSlice(...a),
  ...createGenerationSlice(...a),
  ...createViewerSlice(...a),
  ...createEditorSlice(...a),

  hydrateFromExport: (payload) => {
    const [set, get] = a;
    // Cleanup existing state
    get().images.forEach(img => URL.revokeObjectURL(img.previewUrl));
    const timer = get()._questionRevealTimer;
    if (timer) clearInterval(timer);
    const ctrl = get()._abortController;
    if (ctrl) ctrl.abort();
    // Atomic state replacement
    set(payload);
    // Initialize editor from restored bookDraft
    get().initEditor();
  },

  reset: () => {
    const [set, get] = a;
    const s = get();
    // Clean up timers and abort controllers before resetting state
    const questionTimer = s._questionRevealTimer;
    if (questionTimer) clearInterval(questionTimer);
    const abortController = s._abortController;
    if (abortController) abortController.abort();
    s.images.forEach(img => URL.revokeObjectURL(img.previewUrl));
    set({
      currentStep: 0, selectedTemplate: null, structureTemplate: 'classic_timeline',
      images: [], textInput: '', partnerNames: ['', ''], occasion: '',
      vibe: 'romantic_warm', includeQuotes: true, constraints: [],
      aiQuestions: [], questionAnswers: {}, isLoadingQuestions: false,
      imageLook: 'natural', imageDensity: 'balanced',
      designScale: { pageSize: 'a4', pageCountTarget: 0, bleedMm: 3, marginMm: 12 },
      addOns: { loveLetter: false, audioQrCodes: false, anniversaryCover: false, miniReel: false },
      blendPhotos: false,
      isGenerating: false, generationProgress: 0, generationStage: '', generationPhase: 'idle',
      generationTotalPages: 0, generationCurrentPage: 0,
      _abortController: null, _questionRevealTimer: null,
      sessionId: null, analysisComplete: false, planResult: null, generationId: null,
      bookDraft: null, photoAnalyses: [], previewOnly: false, error: null, cartoonImages: [], cartoonLoading: false,
      customTheme: { pageBgColor: '#1a1020', headingColor: '#f9a8d4', bodyColor: '#e2e8f0', accentColor: '#c084fc', photoFrameStyle: 'rounded' },
      customDensityCount: 4, customPageSize: { width: 8.5, height: 11, unit: 'in' },
      currentPage: 0, isEditMode: false, viewMode: 'spread',
      useOriginalPhotos: false, editorDraft: null, editorHistory: [], editorFuture: [],
      selectedChapterIndex: null, selectedSpreadIndex: null, isRegenerating: false,
      editorDirty: false, cropOverrides: {}, filterOverrides: {},
      positionOffsets: {}, blendOverrides: {}, textStyleOverrides: {},
      textPositionOffsets: {}, sizeOverrides: {},
      imageFrameOverrides: {}, pageFrameOverrides: {}, bookPageFrame: null, shapeOverlays: {},
    });
  },
}));

export default useBookStore;
