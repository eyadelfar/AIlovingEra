/**
 * Client-side photo filter utilities.
 * Pure functions — no React dependency.
 */

export const DEFAULT_FILTERS = {
  brightness: 100,
  contrast: 100,
  saturate: 100,
  warmth: 0,
  fade: 0,
  vignette: 0,
  grain: 0,
};

export const FILTER_PRESETS = {
  none:      { ...DEFAULT_FILTERS },
  warm_glow: { brightness: 105, contrast: 95, saturate: 120, warmth: 20, fade: 10, vignette: 0, grain: 0 },
  cool_fade: { brightness: 102, contrast: 90, saturate: 80, warmth: -15, fade: 25, vignette: 0, grain: 0 },
  vintage:   { brightness: 95, contrast: 110, saturate: 70, warmth: 30, fade: 15, vignette: 20, grain: 20 },
  bw_classic:{ brightness: 100, contrast: 120, saturate: 0, warmth: 0, fade: 5, vignette: 15, grain: 0 },
  vivid:     { brightness: 105, contrast: 115, saturate: 140, warmth: 5, fade: 0, vignette: 0, grain: 0 },
  moody:     { brightness: 85, contrast: 120, saturate: 90, warmth: -10, fade: 10, vignette: 30, grain: 0 },
};

export const PRESET_LABELS = {
  none: 'Original',
  warm_glow: 'Warm Glow',
  cool_fade: 'Cool Fade',
  vintage: 'Vintage',
  bw_classic: 'B&W',
  vivid: 'Vivid',
  moody: 'Moody',
};

export const FILTER_RANGES = {
  brightness: { min: 0, max: 200, step: 1, label: 'Brightness' },
  contrast:   { min: 0, max: 200, step: 1, label: 'Contrast' },
  saturate:   { min: 0, max: 200, step: 1, label: 'Saturation' },
  warmth:     { min: -50, max: 50, step: 1, label: 'Warmth' },
  fade:       { min: 0, max: 100, step: 1, label: 'Fade' },
  vignette:   { min: 0, max: 100, step: 1, label: 'Vignette' },
  grain:      { min: 0, max: 100, step: 1, label: 'Grain' },
};

/**
 * Convert filter values to a CSS `filter` string.
 * Warmth is simulated via a combination of sepia + hue-rotate.
 * Fade reduces contrast and raises brightness slightly.
 * Vignette and grain are handled via CSS overlays, not the filter property.
 */
export function buildFilterCSS(filters) {
  const f = { ...DEFAULT_FILTERS, ...filters };

  const parts = [];

  // Fade: reduce contrast, slightly raise brightness
  const fadeAmount = f.fade / 100;
  const effectiveBrightness = (f.brightness / 100) + fadeAmount * 0.1;
  const effectiveContrast = (f.contrast / 100) * (1 - fadeAmount * 0.3);

  parts.push(`brightness(${effectiveBrightness.toFixed(3)})`);
  parts.push(`contrast(${effectiveContrast.toFixed(3)})`);
  parts.push(`saturate(${(f.saturate / 100).toFixed(3)})`);

  // Warmth: positive = warm (sepia + slight hue shift), negative = cool (hue-rotate blue)
  if (f.warmth > 0) {
    const sepiaAmount = (f.warmth / 50) * 0.3;
    parts.push(`sepia(${sepiaAmount.toFixed(3)})`);
    parts.push(`hue-rotate(${Math.round(f.warmth * -0.5)}deg)`);
  } else if (f.warmth < 0) {
    parts.push(`hue-rotate(${Math.round(f.warmth * 1.5)}deg)`);
  }

  return parts.join(' ');
}

/**
 * Build a CSS radial-gradient string for vignette overlay.
 * Returns empty string if vignette is 0.
 */
export function buildVignetteStyle(vignetteAmount) {
  if (!vignetteAmount) return {};
  const opacity = (vignetteAmount / 100) * 0.7;
  return {
    background: `radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,${opacity.toFixed(2)}) 100%)`,
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none',
    borderRadius: 'inherit',
  };
}

/**
 * Build SVG filter string for grain overlay.
 * Returns null if grain is 0.
 */
export function getGrainOpacity(grainAmount) {
  if (!grainAmount) return 0;
  return (grainAmount / 100) * 0.4;
}

/**
 * Check if filters differ from defaults.
 */
export function hasActiveFilters(filters) {
  if (!filters) return false;
  return Object.keys(DEFAULT_FILTERS).some(
    key => filters[key] !== DEFAULT_FILTERS[key]
  );
}
