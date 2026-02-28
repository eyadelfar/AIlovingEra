import { useRef, useCallback } from 'react';

const MIN_SIZE = 80;

export default function ResizablePhoto({ children, overrideKey, size, onSizeChange, disabled }) {
  const containerRef = useRef(null);
  const startData = useRef(null);

  const handleResizePointerDown = useCallback((e, corner) => {
    if (disabled) return;
    e.preventDefault();
    e.stopPropagation();

    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();

    startData.current = {
      startX: e.clientX,
      startY: e.clientY,
      startW: size?.width || rect.width,
      startH: size?.height || rect.height,
      corner,
    };

    function onMove(ev) {
      const dx = ev.clientX - startData.current.startX;
      const dy = ev.clientY - startData.current.startY;
      let newW = startData.current.startW;
      let newH = startData.current.startH;

      if (corner.includes('right')) newW += dx;
      if (corner.includes('left')) newW -= dx;
      if (corner.includes('bottom')) newH += dy;
      if (corner.includes('top')) newH -= dy;

      newW = Math.max(MIN_SIZE, newW);
      newH = Math.max(MIN_SIZE, newH);

      el.style.width = `${newW}px`;
      el.style.height = `${newH}px`;
    }

    function onUp() {
      const rect = el.getBoundingClientRect();
      onSizeChange?.(overrideKey, {
        width: Math.max(MIN_SIZE, rect.width),
        height: Math.max(MIN_SIZE, rect.height),
        x: size?.x || 0,
        y: size?.y || 0,
      });
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    }

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }, [disabled, size, overrideKey, onSizeChange]);

  const style = {
    width: size?.width ? `${size.width}px` : undefined,
    height: size?.height ? `${size.height}px` : undefined,
    position: 'relative',
  };

  return (
    <div ref={containerRef} style={style} className="group/resize">
      {children}
      {!disabled && (
        <>
          {['top-left', 'top-right', 'bottom-left', 'bottom-right'].map(corner => {
            const pos = {
              'top-left': 'top-0 left-0 cursor-nw-resize',
              'top-right': 'top-0 right-0 cursor-ne-resize',
              'bottom-left': 'bottom-0 left-0 cursor-sw-resize',
              'bottom-right': 'bottom-0 right-0 cursor-se-resize',
            }[corner];

            return (
              <div
                key={corner}
                className={`absolute ${pos} w-3 h-3 bg-violet-500 rounded-full opacity-0 group-hover/resize:opacity-100 transition-opacity z-10 -translate-x-1/2 -translate-y-1/2`}
                style={{ [corner.includes('right') ? 'right' : 'left']: '-4px', [corner.includes('bottom') ? 'bottom' : 'top']: '-4px', transform: 'none' }}
                onPointerDown={(e) => handleResizePointerDown(e, corner)}
              />
            );
          })}
        </>
      )}
    </div>
  );
}
