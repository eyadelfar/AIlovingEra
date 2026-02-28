export const createSettingsSlice = (set) => ({
  // Settings state
  imageLook: 'natural',
  imageDensity: 'balanced',
  designScale: { pageSize: 'a4', pageCountTarget: 0, bleedMm: 3, marginMm: 12 },
  addOns: { loveLetter: false, audioQrCodes: false, anniversaryCover: false, miniReel: false },
  blendPhotos: false,

  // Settings actions
  setImageLook: (look) => set({ imageLook: look }),
  setImageDensity: (density) => set({ imageDensity: density }),
  setDesignScale: (scale) => set((s) => ({ designScale: { ...s.designScale, ...scale } })),
  setAddOn: (key, value) => set((s) => ({ addOns: { ...s.addOns, [key]: value } })),
  setBlendPhotos: (val) => set({ blendPhotos: val }),
});
