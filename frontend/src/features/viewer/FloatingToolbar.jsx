import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useSelection } from './SelectionContext';

/**
 * Context-sensitive floating toolbar positioned near the selected element.
 * Photo mode: Crop | Filter | Position | Swap | AI
 * Text mode: Size +/- | Bold | Italic | Align | AI
 */
export default function FloatingToolbar({ onAction }) {
  const selection = useSelection();
  const toolbarRef = useRef(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  const selected = selection?.selected;

  // Position toolbar above the selected element
  useEffect(() => {
    if (!selected) return;
    const key = selected.type === 'photo' ? `photo-${selected.slotKey}` : `text-${selected.field}`;
    const rect = selection.getElementRect?.(key);
    const containerRect = selection.containerRef?.current?.getBoundingClientRect();
    if (!rect || !containerRect) return;

    const top = rect.top - containerRect.top - 44;
    const left = rect.left - containerRect.left + rect.width / 2;
    setPos({ top: Math.max(0, top), left });
  }, [selected]);

  if (!selected) return null;

  const isPhoto = selected.type === 'photo';

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
              <ToolbarBtn icon={<CropIcon />} label="Crop" onClick={() => onAction('crop', selected)} />
              <ToolbarBtn icon={<FilterIcon />} label="Filter" onClick={() => onAction('filter', selected)} />
              <ToolbarBtn icon={<PositionIcon />} label="Position" onClick={() => onAction('position', selected)} />
              <ToolbarSep />
              <ToolbarBtn icon={<SwapIcon />} label="Swap" onClick={() => onAction('swap', selected)} />
              <ToolbarBtn icon={<SparkleIcon />} label="AI" accent onClick={() => onAction('ai', selected)} />
            </>
          ) : (
            <>
              <ToolbarBtn icon={<TextSizeIcon />} label="Size" onClick={() => onAction('textSize', selected)} />
              <ToolbarBtn icon={<BoldIcon />} label="Bold" onClick={() => onAction('bold', selected)} />
              <ToolbarBtn icon={<AlignIcon />} label="Align" onClick={() => onAction('align', selected)} />
              <ToolbarSep />
              <ToolbarBtn icon={<SparkleIcon />} label="AI" accent onClick={() => onAction('aiText', selected)} />
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

function CropIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 3v4m0 0H3m4 0h10a2 2 0 012 2v10m0 0v4m0-4h4m-4 0H7a2 2 0 01-2-2V7" />
    </svg>
  );
}

function FilterIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function PositionIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
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
