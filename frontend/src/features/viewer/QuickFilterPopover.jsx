import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  DEFAULT_FILTERS,
  FILTER_PRESETS,
  PRESET_LABELS,
  buildFilterCSS,
  buildVignetteStyle,
  getGrainOpacity,
} from '../../lib/filterUtils';
import useBookStore from '../../stores/bookStore';

const QUICK_SLIDERS = ['brightness', 'contrast', 'saturate', 'warmth'];
const SLIDER_META = {
  brightness: { min: 50, max: 150, label: 'Brightness' },
  contrast:   { min: 50, max: 150, label: 'Contrast' },
  saturate:   { min: 0, max: 200, label: 'Saturation' },
  warmth:     { min: -40, max: 40, label: 'Warmth' },
};

export default function QuickFilterPopover({ slotKey, photoSrc, onClose }) {
  const existingFilter = useBookStore(s => s.filterOverrides[slotKey]);
  const setFilterOverride = useBookStore(s => s.setFilterOverride);
  const clearFilterOverride = useBookStore(s => s.clearFilterOverride);

  const [filters, setFilters] = useState(existingFilter || { ...DEFAULT_FILTERS });

  const updateFilter = useCallback((key, value) => {
    setFilters(prev => ({ ...prev, [key]: Number(value) }));
  }, []);

  const applyPreset = useCallback((presetKey) => {
    setFilters({ ...FILTER_PRESETS[presetKey] });
  }, []);

  const handleApply = useCallback(() => {
    const isDefault = Object.keys(DEFAULT_FILTERS).every(k => filters[k] === DEFAULT_FILTERS[k]);
    if (isDefault) {
      clearFilterOverride(slotKey);
    } else {
      setFilterOverride(slotKey, filters);
    }
    onClose();
  }, [filters, slotKey, setFilterOverride, clearFilterOverride, onClose]);

  const handleReset = useCallback(() => {
    setFilters({ ...DEFAULT_FILTERS });
  }, []);

  const previewFilter = buildFilterCSS(filters);
  const previewVignette = buildVignetteStyle(filters.vignette);
  const previewGrain = getGrainOpacity(filters.grain);

  return (
    <motion.div
      data-popover
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.15 }}
      className="bg-gray-900/95 backdrop-blur-md border border-gray-700 rounded-2xl shadow-2xl shadow-black/50 p-4 w-80"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="relative aspect-[4/3] rounded-lg overflow-hidden mb-3 bg-black">
        <img
          src={photoSrc}
          alt=""
          className="w-full h-full object-cover"
          style={{ filter: previewFilter }}
        />
        {filters.vignette > 0 && <div style={previewVignette} />}
        {previewGrain > 0 && (
          <div className="absolute inset-0 pointer-events-none" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
            opacity: previewGrain, mixBlendMode: 'overlay',
          }} />
        )}
      </div>

      <div className="flex gap-1 mb-3 overflow-x-auto pb-1">
        {Object.entries(FILTER_PRESETS).map(([key, preset]) => {
          const css = buildFilterCSS(preset);
          return (
            <button
              key={key}
              onClick={() => applyPreset(key)}
              className="flex-shrink-0 flex flex-col items-center gap-0.5 group"
            >
              <div className="w-10 h-10 rounded-lg overflow-hidden border border-gray-700 group-hover:border-violet-500 transition-colors">
                <img
                  src={photoSrc}
                  alt=""
                  className="w-full h-full object-cover"
                  style={{ filter: css }}
                />
              </div>
              <span className="text-[8px] text-gray-500 group-hover:text-gray-300">{PRESET_LABELS[key]}</span>
            </button>
          );
        })}
      </div>

      <div className="space-y-2 mb-3">
        {QUICK_SLIDERS.map(key => {
          const meta = SLIDER_META[key];
          return (
            <div key={key} className="flex items-center gap-2">
              <span className="text-[10px] text-gray-500 w-16 text-right">{meta.label}</span>
              <input
                type="range"
                min={meta.min}
                max={meta.max}
                step={1}
                value={filters[key]}
                onChange={(e) => updateFilter(key, e.target.value)}
                className="flex-1 h-1 accent-violet-500 cursor-pointer"
              />
              <span className="text-[10px] text-gray-400 w-8 text-right tabular-nums">{filters[key]}</span>
            </div>
          );
        })}

        <div className="flex gap-3 pt-1">
          <div className="flex-1 flex items-center gap-1.5">
            <span className="text-[9px] text-gray-500">Vignette</span>
            <input
              type="range" min={0} max={100} step={1}
              value={filters.vignette}
              onChange={(e) => updateFilter('vignette', e.target.value)}
              className="flex-1 h-1 accent-violet-500 cursor-pointer"
            />
          </div>
          <div className="flex-1 flex items-center gap-1.5">
            <span className="text-[9px] text-gray-500">Grain</span>
            <input
              type="range" min={0} max={100} step={1}
              value={filters.grain}
              onChange={(e) => updateFilter('grain', e.target.value)}
              className="flex-1 h-1 accent-violet-500 cursor-pointer"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <button
          onClick={handleReset}
          className="text-[10px] text-gray-500 hover:text-gray-300 transition-colors"
        >
          Reset
        </button>
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1 rounded-lg text-[10px] text-gray-400 border border-gray-700 hover:border-gray-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            className="px-3 py-1 rounded-lg text-[10px] font-medium bg-violet-600 text-white hover:bg-violet-500 transition-colors"
          >
            Apply
          </button>
        </div>
      </div>
    </motion.div>
  );
}
