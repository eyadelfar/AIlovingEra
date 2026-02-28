import { useRef, useCallback } from 'react';

export default function DraggableText({ children, overrideKey, position, onPositionChange, disabled }) {
  const dragRef = useRef(null);
  const startPos = useRef(null);

  const handlePointerDown = useCallback((e) => {
    if (disabled) return;
    e.preventDefault();
    const el = dragRef.current;
    if (!el) return;

    startPos.current = {
      x: e.clientX - (position?.x || 0),
      y: e.clientY - (position?.y || 0),
    };

    function onMove(ev) {
      const newX = ev.clientX - startPos.current.x;
      const newY = ev.clientY - startPos.current.y;
      el.style.transform = `translate(${newX}px, ${newY}px)`;
    }

    function onUp(ev) {
      const newX = ev.clientX - startPos.current.x;
      const newY = ev.clientY - startPos.current.y;
      onPositionChange?.(overrideKey, { x: newX, y: newY, width: position?.width });
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    }

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }, [disabled, position, overrideKey, onPositionChange]);

  const style = {
    transform: position ? `translate(${position.x || 0}px, ${position.y || 0}px)` : undefined,
    width: position?.width ? `${position.width}px` : undefined,
    cursor: disabled ? 'default' : 'grab',
    position: 'relative',
  };

  return (
    <div
      ref={dragRef}
      style={style}
      onPointerDown={handlePointerDown}
      className="select-none"
    >
      {children}
    </div>
  );
}
