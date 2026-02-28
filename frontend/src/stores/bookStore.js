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

  // Reset (touches state from multiple slices)
  reset: () => {
    const [set, get] = a;
    const s = get();
    s.images.forEach(img => URL.revokeObjectURL(img.previewUrl));
    set({
      // Wizard
      currentStep: 0, selectedTemplate: null, structureTemplate: 'classic_timeline',
      images: [], textInput: '', partnerNames: ['', ''], occasion: '',
      vibe: 'romantic_warm', includeQuotes: true, constraints: [],
      // Questions
      aiQuestions: [], questionAnswers: {}, isLoadingQuestions: false,
      // Settings
      imageLook: 'natural',
      imageDensity: 'balanced',
      designScale: { pageSize: 'a4', pageCountTarget: 0, bleedMm: 3, marginMm: 12 },
      addOns: { loveLetter: false, audioQrCodes: false, anniversaryCover: false, miniReel: false },
      blendPhotos: false,
      // Generation
      isGenerating: false, generationProgress: 0, generationStage: '',
      bookDraft: null, photoAnalyses: [], error: null,
      cartoonImages: [], cartoonError: null,
      // Viewer
      currentPage: 0, isEditMode: false, viewMode: 'spread',
      // Editor
      useOriginalPhotos: false, editorDraft: null, editorHistory: [], editorFuture: [],
      selectedChapterIndex: null, selectedSpreadIndex: null, isRegenerating: false,
      editorDirty: false, cropOverrides: {}, filterOverrides: {},
    });
  },
}));

export default useBookStore;
