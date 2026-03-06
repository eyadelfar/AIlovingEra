import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { PAGE_FRAME_PRESETS } from '../../lib/framePresets';

export default function PageFramePickerPanel({ currentFrameId, bookFrameId, onSelectPage, onSelectBook, onClose }) {
  const panelRef = useRef(null);
  const [tab, setTab] = useState('page');

  useEffect(() => {
    function handleClick(e) {
      if (panelRef.current && !panelRef.current.contains(e.target) && !e.target.closest('[data-toolbar]')) {
        onClose();
      }
    }
    function handleKey(e) { if (e.key === 'Escape') onClose(); }
    const timer = setTimeout(() => window.addEventListener('pointerdown', handleClick), 0);
    window.addEventListener('keydown', handleKey);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('pointerdown', handleClick);
      window.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  const activeId = tab === 'page' ? currentFrameId : bookFrameId;
  const handleSelect = tab === 'page' ? onSelectPage : onSelectBook;

  return (
    <motion.div
      ref={panelRef}
      data-popover
      initial={{ opacity: 0, y: 4, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 4, scale: 0.96 }}
      transition={{ duration: 0.12 }}
      className="bg-gray-900/95 backdrop-blur-md border border-gray-700 rounded-xl shadow-2xl p-3 w-72"
    >
      <div className="flex gap-1 mb-2 p-0.5 bg-gray-800/50 rounded-lg">
        <button
          onClick={() => setTab('page')}
          className={`flex-1 px-2 py-1 rounded text-[10px] font-medium transition-all ${
            tab === 'page' ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30' : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          This Page
        </button>
        <button
          onClick={() => setTab('book')}
          className={`flex-1 px-2 py-1 rounded text-[10px] font-medium transition-all ${
            tab === 'book' ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30' : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          All Pages (Book)
        </button>
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        {PAGE_FRAME_PRESETS.map(preset => {
          const isActive = activeId === preset.id;
          return (
            <button
              key={preset.id}
              onClick={() => handleSelect(preset)}
              className={`flex flex-col items-center gap-1 p-1.5 rounded-lg transition-all ${
                isActive ? 'bg-violet-500/20 ring-1 ring-violet-500' : 'hover:bg-gray-800'
              }`}
            >
              <div
                className={`w-14 h-10 bg-gray-800 rounded-sm ${preset.classes}`}
                style={preset.style}
              />
              <span className="text-[8px] text-gray-400">{preset.label}</span>
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}
