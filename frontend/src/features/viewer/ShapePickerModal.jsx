import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { SHAPE_CATEGORIES, CATEGORY_LABELS } from '../../assets/shapes/index';

export default function ShapePickerModal({ onSelect, onClose }) {
  const [activeCategory, setActiveCategory] = useState('hearts');
  const [color, setColor] = useState('#ffffff');

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const shapes = SHAPE_CATEGORIES[activeCategory] || [];

  return (
    <div data-modal className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-gray-900 rounded-2xl border border-gray-700 shadow-2xl max-w-sm w-full overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
          <h3 className="text-sm font-semibold text-gray-200">Add Shape</h3>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-500 hover:text-white hover:bg-gray-800 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Category tabs */}
        <div className="flex gap-1 mx-4 mt-3 p-0.5 bg-gray-800/50 rounded-lg overflow-x-auto">
          {Object.keys(SHAPE_CATEGORIES).map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-2.5 py-1 rounded text-[10px] font-medium whitespace-nowrap transition-all ${
                activeCategory === cat
                  ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>

        {/* Color picker */}
        <div className="flex items-center gap-2 mx-4 mt-2">
          <span className="text-[10px] text-gray-500">Color:</span>
          <div className="flex gap-1">
            {['#ffffff', '#f43f5e', '#ec4899', '#a855f7', '#3b82f6', '#10b981', '#f59e0b', '#000000'].map(c => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`w-5 h-5 rounded-full border-2 transition-all ${
                  color === c ? 'border-violet-400 scale-110' : 'border-gray-600'
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <input
            type="color"
            value={color}
            onChange={e => setColor(e.target.value)}
            className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent"
          />
        </div>

        {/* Shape grid */}
        <div className="grid grid-cols-5 gap-2 p-4 max-h-60 overflow-y-auto">
          {shapes.map(shape => (
            <button
              key={shape.id}
              onClick={() => {
                onSelect({
                  shapeId: shape.id,
                  viewBox: shape.viewBox,
                  paths: shape.paths,
                  fill: shape.fill !== false,
                  color,
                });
              }}
              className="flex items-center justify-center w-12 h-12 rounded-lg bg-gray-800/50 hover:bg-gray-700 transition-all hover:scale-105 group"
              title={shape.name}
            >
              <svg viewBox={shape.viewBox} className="w-8 h-8">
                {shape.paths.map((d, i) => (
                  <path
                    key={i}
                    d={d}
                    fill={shape.fill !== false ? color : 'none'}
                    stroke={color}
                    strokeWidth={shape.fill !== false ? 0 : 1.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ))}
              </svg>
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
