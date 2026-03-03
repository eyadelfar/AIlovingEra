import { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import useBookStore from '../../stores/bookStore';

const TEXT_FIELDS = [
  { key: 'heading_text', labelKey: 'textFieldHeading' },
  { key: 'body_text', labelKey: 'textFieldBody', multiline: true },
  { key: 'caption_text', labelKey: 'textFieldCaption' },
  { key: 'quote_text', labelKey: 'textFieldQuote', multiline: true },
];

const FONT_SIZES = [
  { value: 'xs', labelKey: 'fontSizeXS' },
  { value: 'sm', labelKey: 'fontSizeS' },
  { value: 'base', labelKey: 'fontSizeM' },
  { value: 'lg', labelKey: 'fontSizeL' },
  { value: 'xl', labelKey: 'fontSizeXL' },
];

const PALETTE_COLORS = [
  '#ffffff', '#f1f5f9', '#fbbf24', '#fb7185', '#a78bfa', '#34d399', '#f472b6', '#60a5fa',
];

const TEXT_WIDTHS = [
  { value: 'narrow', labelKey: 'textWidthNarrow', maxWidth: '60%' },
  { value: 'medium', labelKey: 'textWidthMedium', maxWidth: '75%' },
  { value: 'wide', labelKey: 'textWidthWide', maxWidth: '90%' },
  { value: 'full', labelKey: 'textWidthFull', maxWidth: '100%' },
];

/**
 * Inline text editing overlay that appears on the page.
 * Shows all editable text fields for the current spread in a compact panel.
 * Each field is contentEditable with a floating toolbar.
 */
export default function InlineTextEditor({ page, chapterIdx, spreadIdx, onClose, initialField }) {
  const { t } = useTranslation('viewer');
  const updateSpreadField = useBookStore(s => s.updateSpreadField);
  const regenerateTextAction = useBookStore(s => s.regenerateTextAction);
  const isRegenerating = useBookStore(s => s.isRegenerating);
  const textStyleOverrides = useBookStore(s => s.textStyleOverrides);
  const setTextStyleOverride = useBookStore(s => s.setTextStyleOverride);
  const clearTextStyleOverride = useBookStore(s => s.clearTextStyleOverride);

  const availableFields = TEXT_FIELDS.filter(f => page[f.key] != null && page[f.key] !== undefined);
  const [values, setValues] = useState(() => {
    const v = {};
    availableFields.forEach(f => { v[f.key] = page[f.key] || ''; });
    return v;
  });

  // Capture initial styles on mount for revert on cancel
  const [initialStyles] = useState(() => {
    const s = {};
    availableFields.forEach(f => {
      const key = `${chapterIdx}-${spreadIdx}-${f.key}`;
      s[f.key] = textStyleOverrides[key] ? { ...textStyleOverrides[key] } : null;
    });
    return s;
  });

  // Buffer style changes locally instead of writing to store immediately
  const [localStyles, setLocalStyles] = useState(() => {
    const s = {};
    availableFields.forEach(f => {
      const key = `${chapterIdx}-${spreadIdx}-${f.key}`;
      s[f.key] = textStyleOverrides[key] ? { ...textStyleOverrides[key] } : {};
    });
    return s;
  });

  const [activeField, setActiveField] = useState(() => {
    if (initialField && availableFields.some(f => f.key === initialField)) return initialField;
    return availableFields[0]?.key || null;
  });

  const handleChange = useCallback((key, value) => {
    setValues(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleSave = useCallback(() => {
    // Save both text content AND style changes together
    availableFields.forEach(f => {
      if (values[f.key] !== (page[f.key] || '')) {
        updateSpreadField(chapterIdx, spreadIdx, f.key, values[f.key]);
      }
      // Commit style changes
      const key = `${chapterIdx}-${spreadIdx}-${f.key}`;
      const localStyle = localStyles[f.key];
      const hasStyles = localStyle && Object.keys(localStyle).length > 0;
      if (hasStyles) {
        setTextStyleOverride(key, localStyle);
      }
    });
    onClose();
  }, [values, page, chapterIdx, spreadIdx, localStyles, updateSpreadField, setTextStyleOverride, onClose, availableFields]);

  const handleCancel = useCallback(() => {
    // Restore initial styles (revert any changes)
    availableFields.forEach(f => {
      const key = `${chapterIdx}-${spreadIdx}-${f.key}`;
      const initial = initialStyles[f.key];
      const current = textStyleOverrides[key];
      // Only restore if something was changed (avoid unnecessary store writes)
      if (JSON.stringify(initial) !== JSON.stringify(current)) {
        if (initial) {
          setTextStyleOverride(key, initial);
        } else {
          clearTextStyleOverride(key);
        }
      }
    });
    onClose();
  }, [initialStyles, textStyleOverrides, chapterIdx, spreadIdx, availableFields, setTextStyleOverride, clearTextStyleOverride, onClose]);

  const handleRegenerate = useCallback(async (fieldKey) => {
    const result = await regenerateTextAction(
      chapterIdx, spreadIdx, fieldKey,
      t('aiRewritePrompt'),
    );
    if (result) {
      setValues(prev => ({ ...prev, [fieldKey]: result }));
    }
  }, [chapterIdx, spreadIdx, regenerateTextAction]);

  // ESC to cancel without saving
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') handleCancel();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleCancel]);

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
        <span className="text-xs font-medium text-gray-300">{t('editText')}</span>
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
              {t(f.labelKey)}
            </button>
          ))}
        </div>
      )}

      {activeField && (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[10px] text-violet-400 uppercase tracking-wider font-medium">
              {t(availableFields.find(f => f.key === activeField)?.labelKey)}
            </label>
            <button
              onClick={() => handleRegenerate(activeField)}
              disabled={isRegenerating}
              className="flex items-center gap-1 text-[9px] text-violet-400 hover:text-violet-300 disabled:opacity-50 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
              {isRegenerating ? t('rewriting') : t('aiRewrite')}
            </button>
          </div>
          <TextFieldEditor
            value={values[activeField]}
            onChange={(val) => handleChange(activeField, val)}
            multiline={availableFields.find(f => f.key === activeField)?.multiline}
          />

          {/* Font size, alignment, color controls */}
          <TextStyleControls
            overrideKey={`${chapterIdx}-${spreadIdx}-${activeField}`}
            style={localStyles[activeField] || {}}
            onUpdate={(updates) => setLocalStyles(prev => ({
              ...prev,
              [activeField]: { ...(prev[activeField] || {}), ...updates },
            }))}
          />
        </div>
      )}

      <div className="flex justify-end gap-2 mt-3 pt-3 border-t border-gray-800">
        <button
          onClick={handleCancel}
          className="px-3 py-1 rounded-lg text-[10px] text-gray-400 border border-gray-700 hover:border-gray-600 transition-colors"
        >
          {t('cancel')}
        </button>
        <button
          onClick={handleSave}
          className="px-3 py-1 rounded-lg text-[10px] font-medium bg-violet-600 text-white hover:bg-violet-500 transition-colors"
        >
          {t('save')}
        </button>
      </div>
    </motion.div>
  );
}

function TextStyleControls({ overrideKey, style, onUpdate }) {
  const { t } = useTranslation('viewer');
  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5 pt-2 border-t border-gray-800/50">
      {/* Font size */}
      <div className="flex items-center gap-0.5">
        {FONT_SIZES.map(fs => (
          <button
            key={fs.value}
            onClick={() => onUpdate({ fontSize: fs.value })}
            className={`w-5 h-5 rounded text-[8px] font-bold flex items-center justify-center transition-all ${
              style?.fontSize === fs.value
                ? 'bg-violet-500/30 text-violet-300'
                : 'text-gray-500 hover:text-gray-300'
            }`}
            title={t('sizeLabel', { size: t(fs.labelKey) })}
          >
            {t(fs.labelKey)}
          </button>
        ))}
      </div>

      <div className="w-px h-4 bg-gray-700" />

      {/* Alignment */}
      {['left', 'center', 'right'].map(align => (
        <button
          key={align}
          onClick={() => onUpdate({ align })}
          className={`w-5 h-5 rounded flex items-center justify-center transition-all ${
            style?.align === align
              ? 'bg-violet-500/30 text-violet-300'
              : 'text-gray-500 hover:text-gray-300'
          }`}
          title={t('alignLabel', { direction: align })}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 16 16" fill="currentColor">
            <rect y="2" width={align === 'right' ? 16 : align === 'center' ? 14 : 12} height="1.5" rx="0.5" x={align === 'right' ? 0 : align === 'center' ? 1 : 0} />
            <rect y="6" width={align === 'center' ? 10 : 16} height="1.5" rx="0.5" x={align === 'center' ? 3 : align === 'right' ? 0 : 0} />
            <rect y="10" width={align === 'right' ? 12 : align === 'center' ? 14 : 10} height="1.5" rx="0.5" x={align === 'right' ? 4 : align === 'center' ? 1 : 0} />
          </svg>
        </button>
      ))}

      <div className="w-px h-4 bg-gray-700" />

      {/* Bold toggle */}
      <button
        onClick={() => onUpdate({ bold: !style?.bold })}
        className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-black transition-all ${
          style?.bold
            ? 'bg-violet-500/30 text-violet-300'
            : 'text-gray-500 hover:text-gray-300'
        }`}
        title={t('bold')}
      >
        B
      </button>

      {/* Italic toggle */}
      <button
        onClick={() => onUpdate({ italic: !style?.italic })}
        className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-medium italic transition-all ${
          style?.italic
            ? 'bg-violet-500/30 text-violet-300'
            : 'text-gray-500 hover:text-gray-300'
        }`}
        title={t('italic')}
      >
        I
      </button>

      <div className="w-px h-4 bg-gray-700" />

      {/* Color palette */}
      <div className="flex items-center gap-0.5">
        {PALETTE_COLORS.map(color => (
          <button
            key={color}
            onClick={() => onUpdate({ color })}
            className={`w-3.5 h-3.5 rounded-full border transition-all ${
              style?.color === color ? 'border-violet-400 scale-125' : 'border-gray-600 hover:border-gray-400'
            }`}
            style={{ backgroundColor: color }}
            title={color}
          />
        ))}
      </div>

      <div className="w-px h-4 bg-gray-700" />

      {/* Text width */}
      <div className="flex items-center gap-0.5">
        {TEXT_WIDTHS.map(tw => (
          <button
            key={tw.value}
            onClick={() => onUpdate({ maxWidth: tw.value })}
            className={`w-5 h-5 rounded text-[8px] font-bold flex items-center justify-center transition-all ${
              style?.maxWidth === tw.value
                ? 'bg-violet-500/30 text-violet-300'
                : 'text-gray-500 hover:text-gray-300'
            }`}
            title={t('widthLabel', { width: tw.value })}
          >
            {t(tw.labelKey)}
          </button>
        ))}
      </div>
    </div>
  );
}

function TextFieldEditor({ value, onChange, multiline }) {
  const { t } = useTranslation('viewer');
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
        placeholder={t('enterTextPlaceholder')}
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
      placeholder={t('enterTextPlaceholder')}
    />
  );
}
