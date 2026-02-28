import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import useBookStore from '../../stores/bookStore';

/**
 * 3x3 position grid + fine-tune sliders for photo positioning.
 * Uses crop override panX/panY to shift the image within its container.
 */

const POSITIONS = [
  { label: 'TL', panX: 15, panY: 15 },
  { label: 'TC', panX: 0, panY: 15 },
  { label: 'TR', panX: -15, panY: 15 },
  { label: 'ML', panX: 15, panY: 0 },
  { label: 'C',  panX: 0, panY: 0 },
  { label: 'MR', panX: -15, panY: 0 },
  { label: 'BL', panX: 15, panY: -15 },
  { label: 'BC', panX: 0, panY: -15 },
  { label: 'BR', panX: -15, panY: -15 },
];

export default function PositionControl({ slotKey, photoIndex, onClose }) {
  const existingCrop = useBookStore(s => s.cropOverrides[slotKey]);
  const setCropOverride = useBookStore(s => s.setCropOverride);
  const clearCropOverride = useBookStore(s => s.clearCropOverride);
  const getCropStyle = useBookStore(s => s.getCropStyle);

  const [zoom, setZoom] = useState(existingCrop?.zoom || 1);
  const [panX, setPanX] = useState(existingCrop?.panX || 0);
  const [panY, setPanY] = useState(existingCrop?.panY || 0);

  const applyPosition = useCallback((pos) => {
    setPanX(pos.panX);
    setPanY(pos.panY);
  }, []);

  const handleApply = useCallback(() => {
    if (zoom === 1 && panX === 0 && panY === 0) {
      clearCropOverride(slotKey);
    } else {
      setCropOverride(slotKey, { zoom, panX, panY });
    }
    onClose();
  }, [zoom, panX, panY, slotKey, setCropOverride, clearCropOverride, onClose]);

  const handleAuto = useCallback(() => {
    // Use AI-analyzed safe crop box position
    const aiStyle = getCropStyle(photoIndex);
    if (aiStyle?.objectPosition) {
      // Convert "50% 30%" → panX=0, panY=~12
      const [xStr, yStr] = aiStyle.objectPosition.split(' ');
      const x = parseFloat(xStr) || 50;
      const y = parseFloat(yStr) || 50;
      setPanX(Math.round((50 - x) * 0.5));
      setPanY(Math.round((50 - y) * 0.5));
    } else {
      setPanX(0);
      setPanY(0);
    }
    setZoom(1);
  }, [getCropStyle, photoIndex]);

  const handleReset = useCallback(() => {
    setZoom(1);
    setPanX(0);
    setPanY(0);
  }, []);

  return (
    <motion.div
      data-popover
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.15 }}
      className="bg-gray-900/95 backdrop-blur-md border border-gray-700 rounded-2xl shadow-2xl shadow-black/50 p-4 w-64"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-gray-300">Position</span>
        <button
          onClick={handleAuto}
          className="text-[10px] text-violet-400 hover:text-violet-300 transition-colors"
        >
          Auto (AI)
        </button>
      </div>

      <div className="grid grid-cols-3 gap-1 mb-3 mx-auto w-fit">
        {POSITIONS.map((pos) => {
          const isActive = Math.abs(panX - pos.panX) < 3 && Math.abs(panY - pos.panY) < 3;
          return (
            <button
              key={pos.label}
              onClick={() => applyPosition(pos)}
              className={`w-8 h-8 rounded-lg text-[9px] font-medium transition-all border ${
                isActive
                  ? 'border-violet-500 bg-violet-500/20 text-violet-300'
                  : 'border-gray-700 text-gray-500 hover:border-gray-600 hover:text-gray-300'
              }`}
            >
              {pos.label}
            </button>
          );
        })}
      </div>

      <div className="space-y-2 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-500 w-10">X</span>
          <input
            type="range" min={-30} max={30} step={1}
            value={panX}
            onChange={(e) => setPanX(Number(e.target.value))}
            className="flex-1 h-1 accent-violet-500 cursor-pointer"
          />
          <span className="text-[10px] text-gray-400 w-8 text-right tabular-nums">{panX}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-500 w-10">Y</span>
          <input
            type="range" min={-30} max={30} step={1}
            value={panY}
            onChange={(e) => setPanY(Number(e.target.value))}
            className="flex-1 h-1 accent-violet-500 cursor-pointer"
          />
          <span className="text-[10px] text-gray-400 w-8 text-right tabular-nums">{panY}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-500 w-10">Zoom</span>
          <input
            type="range" min={1} max={2.5} step={0.05}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="flex-1 h-1 accent-violet-500 cursor-pointer"
          />
          <span className="text-[10px] text-gray-400 w-8 text-right tabular-nums">{zoom.toFixed(1)}x</span>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <button
          onClick={handleReset}
          className="text-[10px] text-gray-500 hover:text-gray-300 transition-colors"
        >
          Reset
        </button>
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1 rounded-lg text-[10px] text-gray-400 border border-gray-700 hover:border-gray-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            className="px-3 py-1 rounded-lg text-[10px] font-medium bg-violet-600 text-white hover:bg-violet-500 transition-colors"
          >
            Apply
          </button>
        </div>
      </div>
    </motion.div>
  );
}
