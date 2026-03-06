import { useState, useRef, useCallback, useEffect } from 'react';
import {
  DEFAULT_FILTERS,
  FILTER_PRESETS,
  PRESET_LABELS,
  buildFilterCSS,
  buildVignetteStyle,
  getGrainOpacity,
} from '../../lib/filterUtils';

const MIN_ZOOM = 1;
const DEFAULT_ZOOM = 1;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.1;

const QUICK_SLIDERS = ['brightness', 'contrast', 'saturate', 'warmth'];
const SLIDER_META = {
  brightness: { min: 50, max: 150, label: 'Brightness' },
  contrast:   { min: 50, max: 150, label: 'Contrast' },
  saturate:   { min: 0, max: 200, label: 'Saturation' },
  warmth:     { min: -40, max: 40, label: 'Warmth' },
};

export default function PhotoEditModal({ src, initialCrop, initialFilter, onApply, onClose }) {
  const [tab, setTab] = useState('crop');

  // --- Crop state ---
  const [zoom, setZoom] = useState(initialCrop?.zoom ?? DEFAULT_ZOOM);
  const [pan, setPan] = useState({ x: initialCrop?.panX ?? 0, y: initialCrop?.panY ?? 0 });
  const [showGrid, setShowGrid] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const containerRef = useRef(null);

  // --- Filter state ---
  const [filters, setFilters] = useState(initialFilter || { ...DEFAULT_FILTERS });

  const clampPan = useCallback((x, y, z) => {
    if (z <= 1) return { x: 0, y: 0 };
    const maxOffset = ((z - 1) / z) * 50;
    return {
      x: Math.max(-maxOffset, Math.min(maxOffset, x)),
      y: Math.max(-maxOffset, Math.min(maxOffset, y)),
    };
  }, []);

  // Drag handlers
  const handleMouseDown = useCallback((e) => {
    if (zoom < 1) return;
    e.preventDefault();
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
  }, [pan, zoom]);

  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return;
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const dx = ((e.clientX - dragStart.current.x) / rect.width) * 100;
    const dy = ((e.clientY - dragStart.current.y) / rect.height) * 100;
    setPan(clampPan(dragStart.current.panX + dx, dragStart.current.panY + dy, zoom));
  }, [isDragging, zoom, clampPan]);

  const handleMouseUp = useCallback(() => setIsDragging(false), []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
    setZoom(z => {
      const next = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z + delta));
      setPan(p => clampPan(p.x, p.y, next));
      return next;
    });
  }, [clampPan]);

  // Touch handlers
  const lastTouchDist = useRef(null);
  const handleTouchStart = useCallback((e) => {
    if (e.touches.length === 1 && zoom > 1) {
      const t = e.touches[0];
      setIsDragging(true);
      dragStart.current = { x: t.clientX, y: t.clientY, panX: pan.x, panY: pan.y };
    }
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastTouchDist.current = Math.hypot(dx, dy);
    }
  }, [pan, zoom]);

  const handleTouchMove = useCallback((e) => {
    e.preventDefault();
    if (e.touches.length === 1 && isDragging) {
      const t = e.touches[0];
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const dx = ((t.clientX - dragStart.current.x) / rect.width) * 100;
      const dy = ((t.clientY - dragStart.current.y) / rect.height) * 100;
      setPan(clampPan(dragStart.current.panX + dx, dragStart.current.panY + dy, zoom));
    }
    if (e.touches.length === 2 && lastTouchDist.current != null) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const delta = (dist - lastTouchDist.current) * 0.01;
      lastTouchDist.current = dist;
      setZoom(z => {
        const next = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z + delta));
        setPan(p => clampPan(p.x, p.y, next));
        return next;
      });
    }
  }, [isDragging, zoom, clampPan]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
    lastTouchDist.current = null;
  }, []);

  // Register wheel/touch listeners imperatively with { passive: false } to allow preventDefault
  useEffect(() => {
    const el = containerRef.current;
    if (!el || tab !== 'crop') return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    el.addEventListener('touchstart', handleTouchStart, { passive: false });
    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    el.addEventListener('touchend', handleTouchEnd);
    return () => {
      el.removeEventListener('wheel', handleWheel);
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
    };
  }, [tab, handleWheel, handleTouchStart, handleTouchMove, handleTouchEnd]);

  // Filter handlers
  const updateFilter = useCallback((key, value) => {
    setFilters(prev => ({ ...prev, [key]: Number(value) }));
  }, []);

  const applyPreset = useCallback((presetKey) => {
    setFilters({ ...FILTER_PRESETS[presetKey] });
  }, []);

  // Apply both crop + filter
  function handleApply() {
    const cropData = { zoom, panX: pan.x, panY: pan.y };
    const isDefaultFilter = Object.keys(DEFAULT_FILTERS).every(k => filters[k] === DEFAULT_FILTERS[k]);
    onApply({ crop: cropData, filter: isDefaultFilter ? null : filters });
  }

  function handleReset() {
    if (tab === 'crop') {
      setZoom(DEFAULT_ZOOM);
      setPan({ x: 0, y: 0 });
    } else {
      setFilters({ ...DEFAULT_FILTERS });
    }
  }

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const previewFilter = buildFilterCSS(filters);
  const previewVignette = buildVignetteStyle(filters.vignette);
  const previewGrain = getGrainOpacity(filters.grain);

  const imageStyle = {
    filter: tab === 'filters' ? previewFilter : undefined,
    transform: zoom > 1 ? `scale(${zoom}) translate(${pan.x}%, ${pan.y}%)` : 'none',
    transformOrigin: 'center',
    cursor: tab === 'crop' && zoom >= 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
    userSelect: 'none',
    WebkitUserDrag: 'none',
  };

  const hintText = tab === 'crop' && !isDragging
    ? 'Drag to position, scroll to zoom'
    : null;

  return (
    <div data-modal className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-gray-900 rounded-2xl border border-gray-800 shadow-2xl max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-800">
          <h3 className="text-sm font-semibold text-gray-200">Edit Photo</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mx-5 mt-3 p-1 bg-gray-800/50 rounded-lg">
          <button
            onClick={() => setTab('crop')}
            className={`flex-1 px-3 py-1.5 rounded text-xs font-medium transition-all ${
              tab === 'crop'
                ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            Crop
          </button>
          <button
            onClick={() => setTab('filters')}
            className={`flex-1 px-3 py-1.5 rounded text-xs font-medium transition-all ${
              tab === 'filters'
                ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            Filters
          </button>
        </div>

        {/* Preview area */}
        <div className="px-5 py-4">
          <div
            ref={containerRef}
            className="relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-gray-700 bg-black"
            onMouseDown={tab === 'crop' ? handleMouseDown : undefined}
          >
            <img
              src={src}
              alt=""
              className={`absolute inset-0 w-full h-full ${zoom > 1 ? 'object-cover' : 'object-contain'}`}
              style={imageStyle}
              draggable={false}
            />

            {/* Grid overlay (crop tab only) */}
            {tab === 'crop' && showGrid && (
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white/20" />
                <div className="absolute left-2/3 top-0 bottom-0 w-px bg-white/20" />
                <div className="absolute top-1/3 left-0 right-0 h-px bg-white/20" />
                <div className="absolute top-2/3 left-0 right-0 h-px bg-white/20" />
              </div>
            )}

            {/* Filter overlays */}
            {tab === 'filters' && filters.vignette > 0 && <div style={previewVignette} />}
            {tab === 'filters' && previewGrain > 0 && (
              <div className="absolute inset-0 pointer-events-none" style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
                opacity: previewGrain, mixBlendMode: 'overlay',
              }} />
            )}

            {/* Hint */}
            {hintText && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="text-white/40 text-xs bg-black/40 px-3 py-1.5 rounded-full">{hintText}</span>
              </div>
            )}
          </div>
        </div>

        {/* Tab-specific controls */}
        {tab === 'crop' && (
          <div className="px-5 pb-3">
            <div className="flex items-center gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" />
              </svg>
              <input
                type="range"
                min={MIN_ZOOM} max={MAX_ZOOM} step={0.05}
                value={zoom}
                onChange={(e) => {
                  const z = parseFloat(e.target.value);
                  setZoom(z);
                  setPan(p => clampPan(p.x, p.y, z));
                }}
                className="flex-1 min-w-0 accent-violet-500"
              />
              <span className="text-xs text-gray-500 w-10 text-right">{zoom.toFixed(1)}x</span>
            </div>
            <div className="flex items-center justify-end mt-2">
              <button
                onClick={() => setShowGrid(g => !g)}
                className={`px-2.5 py-1 rounded text-xs transition-all border ${
                  showGrid
                    ? 'border-violet-500/50 text-violet-300 bg-violet-500/10'
                    : 'border-gray-700 text-gray-500'
                }`}
              >
                Grid
              </button>
            </div>
          </div>
        )}

        {tab === 'filters' && (
          <div className="px-5 pb-3">
            {/* Preset thumbnails */}
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
                      <img src={src} alt="" className="w-full h-full object-cover" style={{ filter: css }} />
                    </div>
                    <span className="text-[8px] text-gray-500 group-hover:text-gray-300">{PRESET_LABELS[key]}</span>
                  </button>
                );
              })}
            </div>

            {/* Sliders */}
            <div className="space-y-2 mb-3">
              {QUICK_SLIDERS.map(key => {
                const meta = SLIDER_META[key];
                return (
                  <div key={key} className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-500 w-16 text-right">{meta.label}</span>
                    <input
                      type="range" min={meta.min} max={meta.max} step={1}
                      value={filters[key]}
                      onChange={(e) => updateFilter(key, e.target.value)}
                      className="flex-1 min-w-0 h-1 accent-violet-500 cursor-pointer"
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
                    className="flex-1 min-w-0 h-1 accent-violet-500 cursor-pointer"
                  />
                </div>
                <div className="flex-1 flex items-center gap-1.5">
                  <span className="text-[9px] text-gray-500">Grain</span>
                  <input
                    type="range" min={0} max={100} step={1}
                    value={filters.grain}
                    onChange={(e) => updateFilter('grain', e.target.value)}
                    className="flex-1 min-w-0 h-1 accent-violet-500 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-800">
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
              onClick={handleApply}
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
