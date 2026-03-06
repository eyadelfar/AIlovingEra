import { MAX_IMAGES, VIBE_IMAGE_LOOK_DEFAULTS } from '../lib/constants';
import { trackEvent } from '../lib/eventTracker';
import log from '../lib/editorLogger';

export const createWizardSlice = (set, get) => ({
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

  setStep: (step) => {
    log.action('wizard', 'setStep', { step });
    set({ currentStep: step });
    trackEvent('step_entered', 'wizard', { step });
  },
  nextStep: () => {
    const s = get();
    if (s.currentStep === 1 && s.images.length >= 2) {
      s.triggerCartoonGeneration();
    }
    set({ currentStep: Math.min(s.currentStep + 1, 3) });
  },
  prevStep: () => set((s) => ({ currentStep: Math.max(s.currentStep - 1, 0) })),

  setTemplate: (slug) => {
    log.action('wizard', 'setTemplate', { slug });
    set({ selectedTemplate: slug });
    trackEvent('template_selected', 'wizard', { template: slug });
  },
  setStructureTemplate: (slug) => set({ structureTemplate: slug }),

  addImages: (files) => {
    const current = get().images.length;
    const allowed = MAX_IMAGES - current;
    log.action('wizard', 'addImages', { fileCount: files?.length, currentCount: current, allowed });
    if (allowed <= 0) return;
    const incoming = Array.from(files).slice(0, allowed);
    const newImages = incoming.map(file => ({
      id: crypto.randomUUID(),
      file,
      previewUrl: URL.createObjectURL(file),
      name: file.name,
    }));
    set((s) => ({ images: [...s.images, ...newImages] }));
  },

  removeImage: (id) => {
    const removed = get().images.find(i => i.id === id);
    if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl);
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

  sortImagesByDate: () => {
    set((s) => {
      const sorted = [...s.images].sort((a, b) => {
        const aTime = a.file?.lastModified || 0;
        const bTime = b.file?.lastModified || 0;
        return aTime - bTime;
      });
      return { images: sorted };
    });
  },

  setTextInput: (text) => set({ textInput: text }),
  setPartnerNames: (names) => set({ partnerNames: names }),
  setOccasion: (occ) => set({ occasion: occ }),
  setVibe: (vibe) => {
    log.action('wizard', 'setVibe', { vibe });
    const defaultLook = VIBE_IMAGE_LOOK_DEFAULTS[vibe];
    set(defaultLook ? { vibe, imageLook: defaultLook } : { vibe });
    trackEvent('vibe_selected', 'wizard', { vibe });
  },
  setIncludeQuotes: (val) => set({ includeQuotes: val }),
  addConstraint: (text) => set((s) => ({ constraints: [...s.constraints, text] })),
  removeConstraint: (idx) => set((s) => ({ constraints: s.constraints.filter((_, i) => i !== idx) })),
  setConstraints: (list) => set({ constraints: list }),
});
