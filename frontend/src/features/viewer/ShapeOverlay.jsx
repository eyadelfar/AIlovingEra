import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * Renders shape overlays for a spread as absolutely positioned SVGs.
 * In edit mode: supports drag-to-move, corner resize, and selection.
 */
export default function ShapeOverlay({ shapes, isEditMode, onUpdate, onRemove, containerRef }) {
  const [selectedId, setSelectedId] = useState(null);

  // Click-outside-to-deselect
  useEffect(() => {
    if (selectedId == null) return;
    function handleClickOutside(e) {
      if (e.target.closest('[data-shape-overlay]')) return;
      if (e.target.closest('[data-toolbar]') || e.target.closest('[data-popover]') || e.target.closest('[data-context-menu]')) return;
      setSelectedId(null);
    }
    document.addEventListener('pointerdown', handleClickOutside);
    return () => document.removeEventListener('pointerdown', handleClickOutside);
  }, [selectedId]);

  if (!shapes || shapes.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-10">
      {shapes.map(shape => (
        <ShapeElement
          key={shape.id}
          shape={shape}
          isEditMode={isEditMode}
          isSelected={selectedId === shape.id}
          onSelect={() => setSelectedId(shape.id)}
          onDeselect={() => setSelectedId(null)}
          onUpdate={onUpdate}
          onRemove={onRemove}
          containerRef={containerRef}
        />
      ))}
    </div>
  );
}

function ShapeElement({ shape, isEditMode, isSelected, onSelect, onDeselect, onUpdate, onRemove, containerRef }) {
  const elRef = useRef(null);
  const cleanupRef = useRef(null);

  // Clean up any active window listeners on unmount
  useEffect(() => () => { cleanupRef.current?.(); }, []);

  const handleDragStart = useCallback((e) => {
    if (!isEditMode) return;
    e.preventDefault();
    e.stopPropagation();
    onSelect();

    const container = containerRef?.current;
    if (!container) return;
    const containerRect = container.getBoundingClientRect();
    const startX = e.clientX;
    const startY = e.clientY;
    const origX = shape.xPct;
    const origY = shape.yPct;

    const el = elRef.current;
    if (el) el.style.willChange = 'left, top';

    let rafId = null;
    function onMove(ev) {
      if (rafId) cancelAnimationFrame(rafId);
      const cx = ev.clientX, cy = ev.clientY;
      rafId = requestAnimationFrame(() => {
        const dx = ((cx - startX) / containerRect.width) * 100;
        const dy = ((cy - startY) / containerRect.height) * 100;
        if (el) {
          el.style.left = `${origX + dx}%`;
          el.style.top = `${origY + dy}%`;
        }
        rafId = null;
      });
    }

    function onUp(ev) {
      if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
      const dx = ((ev.clientX - startX) / containerRect.width) * 100;
      const dy = ((ev.clientY - startY) / containerRect.height) * 100;
      if (el) el.style.willChange = '';
      onUpdate(shape.id, { xPct: origX + dx, yPct: origY + dy });
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      cleanupRef.current = null;
    }

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    cleanupRef.current = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [isEditMode, shape, onUpdate, onSelect, containerRef]);

  const handleResizeStart = useCallback((e, corner) => {
    e.preventDefault();
    e.stopPropagation();
    const container = containerRef?.current;
    if (!container) return;
    const containerRect = container.getBoundingClientRect();
    const startX = e.clientX;
    const startY = e.clientY;
    const origW = shape.widthPct;
    const origH = shape.heightPct;

    const el = elRef.current;

    let rafId = null;
    function onMove(ev) {
      if (rafId) cancelAnimationFrame(rafId);
      const cx = ev.clientX, cy = ev.clientY;
      rafId = requestAnimationFrame(() => {
        const dx = ((cx - startX) / containerRect.width) * 100;
        const dy = ((cy - startY) / containerRect.height) * 100;
        let newW = origW, newH = origH;
        if (corner.includes('right')) newW = Math.max(3, origW + dx);
        if (corner.includes('left')) newW = Math.max(3, origW - dx);
        if (corner.includes('bottom')) newH = Math.max(3, origH + dy);
        if (corner.includes('top')) newH = Math.max(3, origH - dy);
        if (el) {
          el.style.width = `${newW}%`;
          el.style.height = `${newH}%`;
        }
        rafId = null;
      });
    }

    function onUp(ev) {
      if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
      const dx = ((ev.clientX - startX) / containerRect.width) * 100;
      const dy = ((ev.clientY - startY) / containerRect.height) * 100;
      let newW = origW, newH = origH;
      if (corner.includes('right')) newW = Math.max(3, origW + dx);
      if (corner.includes('left')) newW = Math.max(3, origW - dx);
      if (corner.includes('bottom')) newH = Math.max(3, origH + dy);
      if (corner.includes('top')) newH = Math.max(3, origH - dy);
      onUpdate(shape.id, { widthPct: newW, heightPct: newH });
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      cleanupRef.current = null;
    }

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    cleanupRef.current = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [shape, onUpdate, containerRef]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Delete' || e.key === 'Backspace') {
      onRemove(shape.id);
    }
    if (e.key === 'Escape') {
      onDeselect();
    }
  }, [shape.id, onRemove, onDeselect]);

  return (
    <div
      ref={elRef}
      data-shape-overlay
      className={`absolute ${isEditMode ? 'pointer-events-auto cursor-grab active:cursor-grabbing' : ''} ${
        isSelected ? 'ring-2 ring-violet-500 ring-offset-1 ring-offset-transparent z-20' : ''
      }`}
      style={{
        left: `${shape.xPct}%`,
        top: `${shape.yPct}%`,
        width: `${shape.widthPct}%`,
        height: `${shape.heightPct}%`,
        transform: shape.rotation ? `rotate(${shape.rotation}deg)` : undefined,
      }}
      onPointerDown={isEditMode ? handleDragStart : undefined}
      onClick={isEditMode ? (e) => { e.stopPropagation(); onSelect(); } : undefined}
      onKeyDown={isSelected ? handleKeyDown : undefined}
      tabIndex={isSelected ? 0 : undefined}
    >
      <svg viewBox={shape.viewBox} className="w-full h-full" preserveAspectRatio="xMidYMid meet">
        {shape.paths.map((d, i) => (
          <path
            key={i}
            d={d}
            fill={shape.fill !== false ? shape.color : 'none'}
            stroke={shape.color}
            strokeWidth={shape.fill !== false ? 0 : 1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
      </svg>

      {/* Resize handles */}
      {isSelected && isEditMode && (
        <>
          {['top-left', 'top-right', 'bottom-left', 'bottom-right'].map(corner => {
            const posClass = {
              'top-left': '-top-1 -left-1 cursor-nw-resize',
              'top-right': '-top-1 -right-1 cursor-ne-resize',
              'bottom-left': '-bottom-1 -left-1 cursor-sw-resize',
              'bottom-right': '-bottom-1 -right-1 cursor-se-resize',
            }[corner];
            return (
              <div
                key={corner}
                className={`absolute ${posClass} w-2 h-2 bg-violet-500 border border-white rounded-sm z-20 shadow-md`}
                onPointerDown={(e) => handleResizeStart(e, corner)}
              />
            );
          })}
          <button
            className="absolute -top-6 left-1/2 -translate-x-1/2 p-0.5 bg-red-500/80 rounded text-white hover:bg-red-600 transition-colors"
            onClick={(e) => { e.stopPropagation(); onRemove(shape.id); }}
            title="Delete shape"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </>
      )}
    </div>
  );
}
