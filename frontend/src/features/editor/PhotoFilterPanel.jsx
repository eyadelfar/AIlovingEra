import { useState, useMemo } from 'react';
import {
  DEFAULT_FILTERS,
  FILTER_PRESETS,
  PRESET_LABELS,
  FILTER_RANGES,
  buildFilterCSS,
  buildVignetteStyle,
  getGrainOpacity,
} from '../../lib/filterUtils';

export default function PhotoFilterPanel({ src, initialFilters, onApply, onClose }) {
  const [filters, setFilters] = useState({ ...DEFAULT_FILTERS, ...(initialFilters || {}) });

  const filterCSS = useMemo(() => buildFilterCSS(filters), [filters]);
  const vignetteStyle = useMemo(() => buildVignetteStyle(filters.vignette), [filters.vignette]);
  const grainOpacity = useMemo(() => getGrainOpacity(filters.grain), [filters.grain]);

  function updateFilter(key, value) {
    setFilters(f => ({ ...f, [key]: Number(value) }));
  }

  function applyPreset(presetKey) {
    setFilters({ ...DEFAULT_FILTERS, ...FILTER_PRESETS[presetKey] });
  }

  function handleReset() {
    setFilters({ ...DEFAULT_FILTERS });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-gray-900 rounded-2xl border border-gray-800 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-800 flex-shrink-0">
          <h3 className="text-sm font-semibold text-gray-200">Photo Filters</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="flex flex-col md:flex-row gap-4 p-5">
            <div className="md:w-1/2 flex-shrink-0">
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-gray-700 bg-black">
                <img
                  src={src}
                  alt=""
                  className="w-full h-full object-cover"
                  style={{ filter: filterCSS }}
                />
                {filters.vignette > 0 && <div style={vignetteStyle} />}
                {filters.grain > 0 && (
                  <div
                    className="absolute inset-0 pointer-events-none rounded-xl"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
                      opacity: grainOpacity,
                      mixBlendMode: 'overlay',
                    }}
                  />
                )}
              </div>
            </div>

            <div className="md:w-1/2 space-y-4">
              <div>
                <label className="block text-xs text-gray-500 mb-2 uppercase tracking-wide">Presets</label>
                <div className="flex flex-wrap gap-2">
                  {Object.keys(FILTER_PRESETS).map(key => (
                    <button
                      key={key}
                      onClick={() => applyPreset(key)}
                      className="relative group"
                    >
                      <div className="w-14 h-14 rounded-lg overflow-hidden border border-gray-700 group-hover:border-violet-500/50 transition-colors">
                        <img
                          src={src}
                          alt=""
                          className="w-full h-full object-cover"
                          style={{ filter: buildFilterCSS(FILTER_PRESETS[key]) }}
                        />
                      </div>
                      <span className="block text-[10px] text-gray-500 text-center mt-1 group-hover:text-violet-300 transition-colors">
                        {PRESET_LABELS[key]}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="block text-xs text-gray-500 uppercase tracking-wide">Adjustments</label>
                {Object.entries(FILTER_RANGES).map(([key, range]) => (
                  <div key={key} className="flex items-center gap-3">
                    <span className="text-xs text-gray-400 w-20 flex-shrink-0">{range.label}</span>
                    <input
                      type="range"
                      min={range.min}
                      max={range.max}
                      step={range.step}
                      value={filters[key]}
                      onChange={e => updateFilter(key, e.target.value)}
                      className="flex-1 accent-violet-500"
                    />
                    <span className="text-xs text-gray-600 w-8 text-right">{filters[key]}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-800 flex-shrink-0">
          <button
            onClick={handleReset}
            className="px-4 py-2 rounded-lg text-xs font-medium text-gray-400 border border-gray-700 hover:border-gray-500 hover:text-white transition-all"
          >
            Reset
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-medium text-gray-400 hover:text-white transition-all"
            >
              Cancel
            </button>
            <button
              onClick={() => onApply(filters)}
              className="px-5 py-2 rounded-lg text-xs font-semibold bg-violet-600 text-white hover:bg-violet-500 transition-all"
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
