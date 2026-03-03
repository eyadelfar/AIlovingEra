import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

const AUTOSAVE_DELAY = 1500;

export default function MiniReelStoryboard({ frames, isEditMode, onFrameChange }) {
  const { t } = useTranslation('viewer');
  const [localFrames, setLocalFrames] = useState(frames || []);
  const debounceRefs = useRef({});
  const onFrameChangeRef = useRef(onFrameChange);
  onFrameChangeRef.current = onFrameChange;

  // Sync from props when external changes happen (e.g., undo)
  useEffect(() => {
    setLocalFrames(frames || []);
  }, [frames]);

  // Cleanup all debounce timers on unmount
  useEffect(() => () => {
    Object.values(debounceRefs.current).forEach(clearTimeout);
  }, []);

  const flushFrame = useCallback((idx, val) => {
    clearTimeout(debounceRefs.current[idx]);
    if (val !== frames[idx]) onFrameChangeRef.current?.(idx, val);
  }, [frames]);

  const handleChange = useCallback((idx, val) => {
    setLocalFrames(prev => {
      const next = [...prev];
      next[idx] = val;
      return next;
    });
    // Debounced autosave — saves after user pauses typing
    clearTimeout(debounceRefs.current[idx]);
    debounceRefs.current[idx] = setTimeout(() => flushFrame(idx, val), AUTOSAVE_DELAY);
  }, [flushFrame]);

  if (!frames?.length) return null;

  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-200 mb-4 flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-violet-400" viewBox="0 0 20 20" fill="currentColor">
          <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6zm12.553-1.106A1 1 0 0014 5.882v8.236a1 1 0 001.447.894l4-2a1 1 0 000-1.789l-4-2.118z" />
        </svg>
        {t('miniReelStoryboard')}
      </h3>
      <div className="flex gap-3 overflow-x-auto pb-3 snap-x snap-mandatory">
        {frames.map((frame, idx) => (
          <div
            key={idx}
            className="flex-shrink-0 w-44 sm:w-56 snap-start rounded-xl border border-gray-700 bg-gray-900/60 overflow-hidden"
          >
            <div className="flex items-center gap-1 px-3 py-1.5 bg-gray-800/80 border-b border-gray-700">
              <div className="flex gap-1">
                {[0, 1, 2].map(i => (
                  <div key={i} className="w-1.5 h-1.5 rounded-full bg-gray-600" />
                ))}
              </div>
              <span className="ml-auto text-xs font-mono text-gray-500">
                {t('scene', { number: String(idx + 1).padStart(2, '0') })}
              </span>
              <div className="flex gap-1 ml-auto">
                {[0, 1, 2].map(i => (
                  <div key={i} className="w-1.5 h-1.5 rounded-full bg-gray-600" />
                ))}
              </div>
            </div>
            <div className="p-4">
              {isEditMode ? (
                <textarea
                  value={localFrames[idx] ?? frame}
                  onChange={(e) => handleChange(idx, e.target.value)}
                  onBlur={() => flushFrame(idx, localFrames[idx] ?? frame)}
                  className="w-full text-sm text-gray-300 leading-relaxed bg-transparent border border-dashed border-violet-500/30 rounded p-1.5 focus:outline-none focus:border-violet-500/60 resize-none overflow-hidden"
                  rows={3}
                />
              ) : (
                <p className="text-sm text-gray-300 leading-relaxed">{frame}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
