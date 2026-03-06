/** Image frame presets — decorative borders applied to individual photos. */
export const IMAGE_FRAME_PRESETS = [
  { id: 'none', label: 'None', classes: '', style: {} },
  { id: 'thin', label: 'Simple', classes: 'border border-white/30 rounded', style: {} },
  { id: 'thick', label: 'Bold', classes: 'border-2 border-white/50 rounded', style: {} },
  { id: 'rounded-sm', label: 'Round SM', classes: 'rounded-md overflow-hidden', style: {} },
  { id: 'rounded-md', label: 'Round MD', classes: 'rounded-xl overflow-hidden', style: {} },
  { id: 'rounded-lg', label: 'Round LG', classes: 'rounded-2xl overflow-hidden', style: {} },
  { id: 'circle', label: 'Circle', classes: 'rounded-full overflow-hidden', style: {} },
  { id: 'shadow', label: 'Shadow', classes: 'rounded-lg shadow-xl', style: {} },
  { id: 'shadow-deep', label: 'Deep Shadow', classes: 'rounded-lg shadow-2xl', style: {} },
  { id: 'polaroid', label: 'Polaroid', classes: 'bg-white p-1.5 pb-8 rounded-sm shadow-xl', style: {} },
  { id: 'vintage', label: 'Vintage', classes: 'border-4 border-amber-200/40 rounded-sm', style: { boxShadow: 'inset 0 0 10px rgba(0,0,0,0.3)' } },
  { id: 'elegant', label: 'Elegant', classes: 'border-2 border-white/20 rounded-lg shadow-lg', style: { boxShadow: '0 0 0 1px rgba(255,255,255,0.1), 0 10px 25px rgba(0,0,0,0.3)' } },
  { id: 'dark', label: 'Dark', classes: 'border-2 border-gray-800 rounded-lg', style: {} },
  { id: 'glow', label: 'Glow', classes: 'rounded-lg', style: { boxShadow: '0 0 20px rgba(139,92,246,0.3), 0 0 40px rgba(139,92,246,0.1)' } },
];

/** Page frame presets — decorative borders around the entire page shell. */
export const PAGE_FRAME_PRESETS = [
  { id: 'none', label: 'None', classes: '', style: {} },
  { id: 'simple', label: 'Simple Line', classes: 'border-2 border-gray-300/30', style: {} },
  { id: 'double', label: 'Double Line', classes: '', style: { boxShadow: 'inset 0 0 0 2px rgba(255,255,255,0.15), inset 0 0 0 5px transparent, inset 0 0 0 6px rgba(255,255,255,0.1)' } },
  { id: 'thick', label: 'Thick Border', classes: 'border-4 border-gray-200/20', style: {} },
  { id: 'ornate', label: 'Ornate', classes: 'border-2 border-amber-300/30', style: { boxShadow: 'inset 0 0 0 4px transparent, inset 0 0 0 5px rgba(217,168,56,0.2), inset 8px 8px 0 -4px rgba(217,168,56,0.1), inset -8px -8px 0 -4px rgba(217,168,56,0.1)' } },
  { id: 'gilded', label: 'Gilded', classes: 'border-4 border-amber-400/30 rounded-sm', style: { boxShadow: 'inset 0 0 15px rgba(217,168,56,0.15)' } },
  { id: 'shadow', label: 'Shadow', classes: 'shadow-2xl border border-gray-700/30', style: {} },
  { id: 'minimal', label: 'Minimal', classes: 'border border-gray-500/10', style: {} },
  { id: 'scrapbook', label: 'Scrapbook', classes: 'border-4 border-amber-100/20 rounded-sm', style: { boxShadow: '4px 4px 0 rgba(0,0,0,0.2)' } },
];
