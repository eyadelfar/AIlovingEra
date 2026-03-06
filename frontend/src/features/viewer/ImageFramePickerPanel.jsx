import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { IMAGE_FRAME_PRESETS } from '../../lib/framePresets';

export default function ImageFramePickerPanel({ currentFrameId, onSelect, onClose }) {
  const panelRef = useRef(null);

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

  return (
    <motion.div
      ref={panelRef}
      data-popover
      initial={{ opacity: 0, y: 4, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 4, scale: 0.96 }}
      transition={{ duration: 0.12 }}
      className="bg-gray-900/95 backdrop-blur-md border border-gray-700 rounded-xl shadow-2xl p-3 w-64"
    >
      <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Image Frame</p>
      <div className="grid grid-cols-4 gap-1.5">
        {IMAGE_FRAME_PRESETS.map(preset => {
          const isActive = currentFrameId === preset.id;
          return (
            <button
              key={preset.id}
              onClick={() => onSelect(preset)}
              className={`flex flex-col items-center gap-1 p-1.5 rounded-lg transition-all ${
                isActive ? 'bg-violet-500/20 ring-1 ring-violet-500' : 'hover:bg-gray-800'
              }`}
            >
              <div
                className={`w-10 h-10 bg-gradient-to-br from-violet-400/40 to-pink-400/40 ${preset.classes}`}
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
