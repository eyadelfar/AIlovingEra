import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useSelection } from './SelectionContext';
import useBookStore from '../../stores/bookStore';

/**
 * Context-sensitive floating toolbar positioned near the selected element.
 * Photo mode: Crop | Filter | Position | Swap | AI
 * Text mode: Size +/- | Bold | Italic | Align | AI
 */
export default function FloatingToolbar({ onAction }) {
  const { t } = useTranslation('viewer');
  const selection = useSelection();
  const toolbarRef = useRef(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  const selected = selection?.selected;

  // Position toolbar above the selected element with edge clamping
  useEffect(() => {
    if (!selected) return;

    function recalculate() {
      const key = selected.type === 'photo' ? `photo-${selected.slotKey}` : `text-${selected.field}`;
      const rect = selection.getElementRect?.(key);
      const containerRect = selection.containerRef?.current?.getBoundingClientRect();
      if (!rect || !containerRect) return;

      const toolbarW = toolbarRef.current?.offsetWidth || 200;
      const halfToolbar = toolbarW / 2;

      let top = rect.top - containerRect.top - 44;
      let left = rect.left - containerRect.left + rect.width / 2;

      // Clamp horizontal so toolbar stays within container
      left = Math.max(halfToolbar + 4, Math.min(left, containerRect.width - halfToolbar - 4));
      // If no room above, position below the element instead
      if (top < 0) {
        top = rect.bottom - containerRect.top + 8;
      }
      setPos({ top, left });
    }

    recalculate();

    window.addEventListener('resize', recalculate);
    const container = selection.containerRef?.current;
    const scrollParent = container?.closest('.overflow-auto, .overflow-y-auto, .overflow-scroll') || window;
    scrollParent.addEventListener('scroll', recalculate, true);

    return () => {
      window.removeEventListener('resize', recalculate);
      scrollParent.removeEventListener('scroll', recalculate, true);
    };
  }, [selected, selection]);

  const blendOverrides = useBookStore(s => s.blendOverrides);
  const globalBlend = useBookStore(s => s.blendPhotos);
  const setBlendOverride = useBookStore(s => s.setBlendOverride);

  if (!selected) return null;

  const isPhoto = selected.type === 'photo';
  const isBlended = isPhoto && (blendOverrides[selected.slotKey] != null ? blendOverrides[selected.slotKey] : globalBlend);

  return createPortal(
    <AnimatePresence>
      <motion.div
        ref={toolbarRef}
        data-toolbar
        initial={{ opacity: 0, y: 8, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.95 }}
        transition={{ duration: 0.15 }}
        className="absolute z-40 pointer-events-auto"
        style={{ top: pos.top, left: pos.left, transform: 'translateX(-50%)' }}
      >
        <div className="flex items-center gap-0.5 bg-gray-900/95 backdrop-blur-md border border-gray-700 rounded-xl px-1.5 py-1 shadow-2xl shadow-black/40">
          {isPhoto ? (
            <>
              <ToolbarBtn icon={<EditIcon />} label={t('toolbarEdit')} onClick={() => onAction('edit', selected)} />
              <ToolbarBtn
                icon={<BlendIcon />}
                label={t('toolbarBlend')}
                active={isBlended}
                onClick={() => setBlendOverride(selected.slotKey, !isBlended)}
              />
              <ToolbarSep />
              <ToolbarBtn icon={<RemoveBgIcon />} label={t('toolbarRemoveBg')} onClick={() => onAction('removeBg', selected)} />
              <ToolbarBtn icon={<FrameIcon />} label={t('toolbarFrame')} onClick={() => onAction('imageFrame', selected)} />
              <ToolbarSep />
              <ToolbarBtn icon={<SwapIcon />} label={t('toolbarSwap')} onClick={() => onAction('swap', selected)} />
              <ToolbarBtn icon={<RemoveIcon />} label={t('toolbarRemove')} onClick={() => onAction('removePhoto', selected)} />
              <ToolbarSep />
              <ToolbarBtn icon={<SparkleIcon />} label={t('toolbarAI')} accent onClick={() => onAction('ai', selected)} />
            </>
          ) : (
            <>
              <ToolbarBtn icon={<TextSizeIcon />} label={t('toolbarSize')} onClick={() => onAction('textSize', selected)} />
              <ToolbarBtn icon={<BoldIcon />} label={t('toolbarBold')} onClick={() => onAction('bold', selected)} />
              <ToolbarBtn icon={<AlignIcon />} label={t('toolbarAlign')} onClick={() => onAction('align', selected)} />
              <ToolbarSep />
              <ToolbarBtn icon={<SparkleIcon />} label={t('toolbarAI')} accent onClick={() => onAction('aiText', selected)} />
            </>
          )}
        </div>
      </motion.div>
    </AnimatePresence>,
    selection.containerRef?.current || document.body,
  );
}

function ToolbarBtn({ icon, label, onClick, accent, active }) {
  return (
    <button
      data-toolbar
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      title={label}
      className={`flex flex-col items-center gap-0 px-2 py-1 rounded-lg text-[9px] font-medium transition-all ${
        active
          ? 'bg-violet-500/30 text-violet-300'
          : accent
            ? 'text-violet-400 hover:bg-violet-500/20 hover:text-violet-300'
            : 'text-gray-400 hover:bg-gray-800 hover:text-white'
      }`}
    >
      {icon}
      <span className="mt-0.5">{label}</span>
    </button>
  );
}

function ToolbarSep() {
  return <div className="w-px h-6 bg-gray-700 mx-0.5" />;
}

function EditIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  );
}

function BlendIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
    </svg>
  );
}

function SwapIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
    </svg>
  );
}

function SparkleIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
    </svg>
  );
}

function TextSizeIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h8m-8 6h16" />
    </svg>
  );
}

function BoldIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6V4zm0 8h9a4 4 0 014 4 4 4 0 01-4 4H6v-8z" />
    </svg>
  );
}

function AlignIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 6h18M3 12h12M3 18h18" />
    </svg>
  );
}

function RemoveIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}

function RemoveBgIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 0 3 3 0 004.243 0zm0 0L12 12" />
    </svg>
  );
}

function FrameIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4h16v16H4V4zm2 2v12h12V6H6z" />
    </svg>
  );
}

