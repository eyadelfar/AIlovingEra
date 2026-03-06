import log from '../lib/editorLogger';

export const createSettingsSlice = (set) => ({
  imageLook: 'natural',
  imageDensity: 'balanced',
  customDensityCount: 4,
  designScale: { pageSize: 'a4', pageCountTarget: 0, bleedMm: 3, marginMm: 12 },
  customPageSize: { width: 8.5, height: 11, unit: 'in' },
  addOns: { loveLetter: false, audioQrCodes: false, anniversaryCover: false, miniReel: false },
  blendPhotos: false,
  customTheme: { pageBgColor: '#1a1020', headingColor: '#f9a8d4', bodyColor: '#e2e8f0', accentColor: '#c084fc', photoFrameStyle: 'rounded' },

  setImageLook: (look) => { log.action('settings', 'setImageLook', { look }); set({ imageLook: look }); },
  setImageDensity: (density) => { log.action('settings', 'setImageDensity', { density }); set({ imageDensity: density }); },
  setCustomDensityCount: (count) => set({ customDensityCount: Math.max(1, count) }),
  setDesignScale: (scale) => { log.action('settings', 'setDesignScale', scale); set((s) => ({ designScale: { ...s.designScale, ...scale } })); },
  setCustomPageSize: (dims) => set((s) => ({ customPageSize: { ...s.customPageSize, ...dims } })),
  setAddOn: (key, value) => set((s) => ({ addOns: { ...s.addOns, [key]: value } })),
  setBlendPhotos: (val) => set({ blendPhotos: val }),
  setCustomTheme: (updates) => set((s) => ({ customTheme: { ...s.customTheme, ...updates } })),
});
