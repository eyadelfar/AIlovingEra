import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';

const SelectionContext = createContext(null);

/**
 * Tracks which element (photo or text) is selected in the page canvas.
 * Provides select/deselect + click-outside-to-deselect.
 */
export function SelectionProvider({ children, enabled }) {
  const [selected, setSelected] = useState(null);
  // Refs for element bounding rects (used for toolbar positioning)
  const elementRefs = useRef({});
  const containerRef = useRef(null);

  const selectPhoto = useCallback((slotKey, chapterIdx, spreadIdx, slotIdx) => {
    setSelected({ type: 'photo', slotKey, chapterIdx, spreadIdx, slotIdx });
  }, []);

  const selectText = useCallback((field, chapterIdx, spreadIdx) => {
    setSelected({ type: 'text', field, chapterIdx, spreadIdx });
  }, []);

  const clearSelection = useCallback(() => setSelected(null), []);

  const registerRef = useCallback((key, ref) => {
    elementRefs.current[key] = ref;
  }, []);

  const getElementRect = useCallback((key) => {
    const el = elementRefs.current[key];
    return el?.getBoundingClientRect?.() || null;
  }, []);

  // Click-outside-to-deselect
  useEffect(() => {
    if (!enabled || !selected) return;
    function handleClick(e) {
      // Ignore clicks inside floating toolbars / popovers
      if (e.target.closest('[data-toolbar]') || e.target.closest('[data-popover]')) return;
      // Ignore clicks on interactive elements (other photos/text will handle their own selection)
      if (e.target.closest('[data-selectable]')) return;
      clearSelection();
    }
    // Use capture phase with a small delay so element click handlers fire first
    const timer = setTimeout(() => {
      document.addEventListener('pointerdown', handleClick);
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('pointerdown', handleClick);
    };
  }, [enabled, selected, clearSelection]);

  // ESC to deselect
  useEffect(() => {
    if (!enabled || !selected) return;
    function onKey(e) {
      if (e.key === 'Escape') clearSelection();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [enabled, selected, clearSelection]);

  return (
    <SelectionContext.Provider value={{
      selected,
      selectPhoto,
      selectText,
      clearSelection,
      registerRef,
      getElementRect,
      containerRef,
    }}>
      <div ref={containerRef} className="relative">
        {children}
      </div>
    </SelectionContext.Provider>
  );
}

export function useSelection() {
  return useContext(SelectionContext);
}
