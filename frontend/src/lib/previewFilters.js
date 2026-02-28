// Client-side CSS filter approximations of IMAGE_LOOK values.
// The actual AI enhancement happens during generation — these are
// lightweight visual previews for the wizard's live book preview.

export const IMAGE_LOOK_CSS_FILTERS = {
  natural: 'none',
  film: 'saturate(0.9) contrast(1.1) sepia(0.08)',
  vintage: 'sepia(0.3) contrast(1.05) saturate(0.8)',
  bright_airy: 'brightness(1.12) saturate(0.9) contrast(0.92)',
  moody: 'brightness(0.85) contrast(1.15) saturate(0.85)',
  bw: 'grayscale(1) contrast(1.1)',
  comic_ink: 'contrast(1.4) saturate(1.3)',
  watercolor: 'saturate(0.7) brightness(1.1) blur(0.3px)',
};
