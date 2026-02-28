import { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import useBookStore from '../../stores/bookStore';

const TEXT_FIELDS = [
  { key: 'heading_text', label: 'Heading' },
  { key: 'body_text', label: 'Body', multiline: true },
  { key: 'caption_text', label: 'Caption' },
  { key: 'quote_text', label: 'Quote', multiline: true },
];

/**
 * Inline text editing overlay that appears on the page.
 * Shows all editable text fields for the current spread in a compact panel.
 * Each field is contentEditable with a floating toolbar.
 */
export default function InlineTextEditor({ page, chapterIdx, spreadIdx, onClose, initialField }) {
  const updateSpreadField = useBookStore(s => s.updateSpreadField);
  const regenerateTextAction = useBookStore(s => s.regenerateTextAction);
  const isRegenerating = useBookStore(s => s.isRegenerating);

  const availableFields = TEXT_FIELDS.filter(f => page[f.key] != null && page[f.key] !== undefined);
  const [values, setValues] = useState(() => {
    const v = {};
    availableFields.forEach(f => { v[f.key] = page[f.key] || ''; });
    return v;
  });
  const [activeField, setActiveField] = useState(() => {
    if (initialField && availableFields.some(f => f.key === initialField)) return initialField;
    return availableFields[0]?.key || null;
  });

  const handleChange = useCallback((key, value) => {
    setValues(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleSave = useCallback(() => {
    // Only save fields that changed
    availableFields.forEach(f => {
      if (values[f.key] !== (page[f.key] || '')) {
        updateSpreadField(chapterIdx, spreadIdx, f.key, values[f.key]);
      }
    });
    onClose();
  }, [values, page, chapterIdx, spreadIdx, updateSpreadField, onClose, availableFields]);

  const handleRegenerate = useCallback(async (fieldKey) => {
    const result = await regenerateTextAction(
      chapterIdx, spreadIdx, fieldKey,
      'Improve this text, make it more poetic and engaging while keeping the same meaning.',
    );
    if (result) {
      setValues(prev => ({ ...prev, [fieldKey]: result }));
    }
  }, [chapterIdx, spreadIdx, regenerateTextAction]);

  // ESC to close without saving
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (availableFields.length === 0) return null;

  return (
    <motion.div
      data-popover
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.15 }}
      className="bg-gray-900/95 backdrop-blur-md border border-gray-700 rounded-2xl shadow-2xl shadow-black/50 p-4 w-80 max-h-96 overflow-y-auto"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-gray-300">Edit Text</span>
        <button
          onClick={onClose}
          className="p-1 rounded text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {availableFields.length > 1 && (
        <div className="flex gap-1 mb-3">
          {availableFields.map(f => (
            <button
              key={f.key}
              onClick={() => setActiveField(f.key)}
              className={`px-2 py-0.5 rounded-md text-[10px] font-medium transition-all ${
                activeField === f.key
                  ? 'bg-violet-500/20 text-violet-300 border border-violet-500/40'
                  : 'text-gray-500 hover:text-gray-300 border border-transparent'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {activeField && (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[10px] text-violet-400 uppercase tracking-wider font-medium">
              {availableFields.find(f => f.key === activeField)?.label}
            </label>
            <button
              onClick={() => handleRegenerate(activeField)}
              disabled={isRegenerating}
              className="flex items-center gap-1 text-[9px] text-violet-400 hover:text-violet-300 disabled:opacity-50 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
              {isRegenerating ? 'Rewriting...' : 'AI Rewrite'}
            </button>
          </div>
          <TextFieldEditor
            value={values[activeField]}
            onChange={(val) => handleChange(activeField, val)}
            multiline={availableFields.find(f => f.key === activeField)?.multiline}
          />
        </div>
      )}

      <div className="flex justify-end gap-2 mt-3 pt-3 border-t border-gray-800">
        <button
          onClick={onClose}
          className="px-3 py-1 rounded-lg text-[10px] text-gray-400 border border-gray-700 hover:border-gray-600 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          className="px-3 py-1 rounded-lg text-[10px] font-medium bg-violet-600 text-white hover:bg-violet-500 transition-colors"
        >
          Save
        </button>
      </div>
    </motion.div>
  );
}

function TextFieldEditor({ value, onChange, multiline }) {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current) ref.current.focus();
  }, []);

  if (multiline) {
    return (
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 resize-none focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-all"
        placeholder="Enter text..."
      />
    );
  }

  return (
    <input
      ref={ref}
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-all"
      placeholder="Enter text..."
    />
  );
}
