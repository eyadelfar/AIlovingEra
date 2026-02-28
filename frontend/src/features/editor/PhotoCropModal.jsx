import { useState, useRef, useCallback, useEffect } from 'react';

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.1;

export default function PhotoCropModal({ src, initialCrop, onApply, onClose }) {
  const [zoom, setZoom] = useState(initialCrop?.zoom ?? 1);
  const [pan, setPan] = useState({
    x: initialCrop?.panX ?? 0,
    y: initialCrop?.panY ?? 0,
  });
  const [showGrid, setShowGrid] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const containerRef = useRef(null);
  const imgRef = useRef(null);

  // At zoom=1 with object-contain, the image fits fully inside the frame.
  // Panning only makes sense when the image (at current zoom) exceeds the frame.
  const clampPan = useCallback((x, y, z) => {
    if (z <= 1) return { x: 0, y: 0 };
    // At zoom > 1, allow panning proportional to how much the image overflows
    const maxOffset = ((z - 1) / z) * 50;
    return {
      x: Math.max(-maxOffset, Math.min(maxOffset, x)),
      y: Math.max(-maxOffset, Math.min(maxOffset, y)),
    };
  }, []);

  const handleMouseDown = useCallback((e) => {
    if (zoom <= 1) return; // no drag at zoom=1
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
    const clamped = clampPan(dragStart.current.panX + dx, dragStart.current.panY + dy, zoom);
    setPan(clamped);
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
      const clamped = clampPan(dragStart.current.panX + dx, dragStart.current.panY + dy, zoom);
      setPan(clamped);
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

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
    setZoom(z => {
      const next = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z + delta));
      setPan(p => clampPan(p.x, p.y, next));
      return next;
    });
  }, [clampPan]);

  function handleReset() {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }

  function handleApply() {
    onApply({ zoom, panX: pan.x, panY: pan.y });
  }

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // At zoom=1: object-contain shows the full image (letterboxed).
  // At zoom>1: image scales up and overflows the frame, user pans to pick the crop.
  const imageStyle = {
    transform: zoom > 1 ? `scale(${zoom}) translate(${pan.x}%, ${pan.y}%)` : undefined,
    transformOrigin: 'center',
    cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
    userSelect: 'none',
    WebkitUserDrag: 'none',
  };

  const hintText = zoom <= 1
    ? 'Scroll to zoom in, then drag to pick the perfect frame'
    : 'Drag to position your photo';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-gray-900 rounded-2xl border border-gray-800 shadow-2xl max-w-lg w-full overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-800">
          <h3 className="text-sm font-semibold text-gray-200">Crop & Position</h3>
          <div className="flex items-center gap-2">
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
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-gray-800 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>

        <div className="px-5 py-4">
          <div
            ref={containerRef}
            className="relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-gray-700 bg-black"
            onMouseDown={handleMouseDown}
            onWheel={handleWheel}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <img
              ref={imgRef}
              src={src}
              alt=""
              className={`absolute inset-0 w-full h-full ${zoom > 1 ? 'object-cover' : 'object-contain'}`}
              style={imageStyle}
              draggable={false}
            />

            {showGrid && (
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white/20" />
                <div className="absolute left-2/3 top-0 bottom-0 w-px bg-white/20" />
                <div className="absolute top-1/3 left-0 right-0 h-px bg-white/20" />
                <div className="absolute top-2/3 left-0 right-0 h-px bg-white/20" />
              </div>
            )}

            {!isDragging && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="text-white/40 text-xs bg-black/40 px-3 py-1.5 rounded-full">
                  {hintText}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="px-5 pb-3">
          <div className="flex items-center gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" />
            </svg>
            <input
              type="range"
              min={MIN_ZOOM}
              max={MAX_ZOOM}
              step={0.05}
              value={zoom}
              onChange={(e) => {
                const z = parseFloat(e.target.value);
                setZoom(z);
                setPan(p => clampPan(p.x, p.y, z));
              }}
              className="flex-1 accent-violet-500"
            />
            <span className="text-xs text-gray-500 w-10 text-right">{zoom.toFixed(1)}x</span>
          </div>
        </div>

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
