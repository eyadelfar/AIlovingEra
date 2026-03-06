import { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import useBookStore from '../../stores/bookStore';
import { CURATED_FONTS, loadGoogleFont } from '../../lib/fontLoader';
import log from '../../lib/editorLogger';

const TEXT_FIELDS = [
  { key: 'heading_text', labelKey: 'textFieldHeading' },
  { key: 'body_text', labelKey: 'textFieldBody', multiline: true },
  { key: 'caption_text', labelKey: 'textFieldCaption' },
  { key: 'quote_text', labelKey: 'textFieldQuote', multiline: true },
];

// Numeric font sizes (px) — Word-like
const FONT_SIZES = [8, 10, 12, 14, 16, 18, 20, 24, 28, 32];
const DEFAULT_SIZE = 14;

const PALETTE_COLORS = [
  '#ffffff', '#f1f5f9', '#fbbf24', '#fb7185',
  '#a78bfa', '#34d399', '#f472b6', '#60a5fa',
  '#ef4444', '#f97316', '#84cc16', '#06b6d4',
  '#6366f1', '#ec4899', '#000000', '#6b7280',
];

/**
 * Compact Word-like toolbar-only editor.
 * Text is edited inline on the page via contentEditable (managed by EditablePageRenderer).
 * This toolbar provides formatting controls only — no textarea.
 */
const PAGE_TYPE_KEYS = {
  book_cover_front: { chapterIdx: 'bcf', spreadIdx: 0 },
  cover:            { chapterIdx: 'cov', spreadIdx: 0 },
  dedication:       { chapterIdx: 'ded', spreadIdx: 0 },
  back_cover:       { chapterIdx: 'bck', spreadIdx: 0 },
  book_cover_back:  { chapterIdx: 'bcb', spreadIdx: 0 },
};

function savePageText(pageType, field, text, updateBookField, updateSpreadField, chapterIdx, spreadIdx) {
  const mapping = PAGE_TYPE_KEYS[pageType];
  if (mapping) {
    if ((pageType === 'cover' || pageType === 'book_cover_front') && field === 'heading_text') {
      updateBookField('title', text);
    } else if (pageType === 'book_cover_front' && field === 'body_text') {
      const names = text.split('&').map(s => s.trim());
      if (names.length >= 2) updateBookField('partner_names', names);
    } else if (pageType === 'dedication' && field === 'heading_text') {
      updateBookField('dedication_heading', text);
    } else if (pageType === 'dedication' && field === 'body_text') {
      updateBookField('dedication', text);
    } else if (pageType === 'back_cover' && field === 'heading_text') {
      updateBookField('closing_heading', text);
    } else if (pageType === 'back_cover' && field === 'body_text') {
      updateBookField('closing_page', { text });
    }
  } else {
    updateSpreadField(chapterIdx, spreadIdx, field, text);
  }
}

export default function InlineTextEditor({ page, chapterIdx, spreadIdx, pageType, onClose, initialField, contentEditableRef }) {
  const { t } = useTranslation('viewer');
  const updateSpreadField = useBookStore(s => s.updateSpreadField);
  const updateBookField = useBookStore(s => s.updateBookField);
  const regenerateTextAction = useBookStore(s => s.regenerateTextAction);
  const isRegenerating = useBookStore(s => s.isRegenerating);
  const textStyleOverrides = useBookStore(s => s.textStyleOverrides);
  const setTextStyleOverride = useBookStore(s => s.setTextStyleOverride);
  const clearTextStyleOverride = useBookStore(s => s.clearTextStyleOverride);

  const availableFields = TEXT_FIELDS.filter(f => page[f.key] != null && page[f.key] !== undefined);

  const [activeField, setActiveField] = useState(() => {
    if (initialField && availableFields.some(f => f.key === initialField)) return initialField;
    return availableFields[0]?.key || null;
  });

  const [showColorPicker, setShowColorPicker] = useState(false);
  const colorPickerRef = useRef(null);
  const colorInputRef = useRef(null);
  const [showFontPicker, setShowFontPicker] = useState(false);
  const fontPickerRef = useRef(null);
  const [customFontInput, setCustomFontInput] = useState('');

  const [localStyles, setLocalStyles] = useState(() => {
    const s = {};
    availableFields.forEach(f => {
      const key = `${chapterIdx}-${spreadIdx}-${f.key}`;
      s[f.key] = textStyleOverrides[key] ? { ...textStyleOverrides[key] } : {};
    });
    return s;
  });

  const [initialStyles] = useState(() => {
    const s = {};
    availableFields.forEach(f => {
      const key = `${chapterIdx}-${spreadIdx}-${f.key}`;
      s[f.key] = textStyleOverrides[key] ? { ...textStyleOverrides[key] } : null;
    });
    return s;
  });

  const closedRef = useRef(false);
  const localStylesRef = useRef(localStyles);
  useEffect(() => { localStylesRef.current = localStyles; });
  const availableFieldsRef = useRef(availableFields);
  useEffect(() => { availableFieldsRef.current = availableFields; });

  // Auto-save styles on unmount
  useEffect(() => {
    return () => {
      if (closedRef.current) return;
      availableFieldsRef.current.forEach(f => {
        const key = `${chapterIdx}-${spreadIdx}-${f.key}`;
        const localStyle = localStylesRef.current[f.key];
        if (localStyle && Object.keys(localStyle).length > 0) {
          setTextStyleOverride(key, localStyle);
        }
      });
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Close color picker on click outside
  useEffect(() => {
    if (!showColorPicker) return;
    function handleClickOutside(e) {
      if (colorPickerRef.current && !colorPickerRef.current.contains(e.target)) {
        setShowColorPicker(false);
      }
    }
    document.addEventListener('pointerdown', handleClickOutside);
    return () => document.removeEventListener('pointerdown', handleClickOutside);
  }, [showColorPicker]);

  // Close font picker on click outside
  useEffect(() => {
    if (!showFontPicker) return;
    function handleClickOutside(e) {
      if (fontPickerRef.current && !fontPickerRef.current.contains(e.target)) {
        setShowFontPicker(false);
      }
    }
    document.addEventListener('pointerdown', handleClickOutside);
    return () => document.removeEventListener('pointerdown', handleClickOutside);
  }, [showFontPicker]);

  const style = localStyles[activeField] || {};
  const updateStyle = useCallback((updates) => {
    log.action('textEditor', 'updateStyle', { field: activeField, ...updates });
    setLocalStyles(prev => ({
      ...prev,
      [activeField]: { ...(prev[activeField] || {}), ...updates },
    }));
    // Apply to store immediately for live preview
    const key = `${chapterIdx}-${spreadIdx}-${activeField}`;
    setTextStyleOverride(key, updates);
    // Also apply directly to the contentEditable DOM element for instant visual feedback
    const el = contentEditableRef?.current;
    if (el) {
      if (updates.fontFamily !== undefined) el.style.fontFamily = updates.fontFamily || '';
      if (updates.fontSize !== undefined) el.style.fontSize = updates.fontSize ? `${updates.fontSize}px` : '';
      if (updates.color !== undefined) el.style.color = updates.color || '';
      if (updates.bold !== undefined) el.style.fontWeight = updates.bold ? 'bold' : '';
      if (updates.italic !== undefined) el.style.fontStyle = updates.italic ? 'italic' : '';
      if (updates.underline !== undefined) el.style.textDecoration = updates.underline ? 'underline' : '';
      if (updates.align !== undefined) el.style.textAlign = updates.align || '';
    }
  }, [activeField, chapterIdx, spreadIdx, setTextStyleOverride, contentEditableRef]);

  const handleSave = useCallback(() => {
    log.action('textEditor', 'save', { field: activeField, chapterIdx, spreadIdx });
    closedRef.current = true;
    // Save text content from contentEditable if ref exists
    if (contentEditableRef?.current && chapterIdx != null && spreadIdx != null) {
      const newText = contentEditableRef.current.innerText;
      const originalText = page[activeField] || '';
      if (newText !== originalText) {
        savePageText(pageType, activeField, newText, updateBookField, updateSpreadField, chapterIdx, spreadIdx);
      }
    }
    availableFields.forEach(f => {
      const key = `${chapterIdx}-${spreadIdx}-${f.key}`;
      const localStyle = localStyles[f.key];
      if (localStyle && Object.keys(localStyle).length > 0) {
        setTextStyleOverride(key, localStyle);
      }
    });
    onClose();
  }, [page, activeField, pageType, chapterIdx, spreadIdx, localStyles, updateBookField, updateSpreadField, setTextStyleOverride, onClose, availableFields, contentEditableRef]);

  const handleCancel = useCallback(() => {
    log.action('textEditor', 'cancel', { field: activeField, chapterIdx, spreadIdx });
    closedRef.current = true;
    availableFields.forEach(f => {
      const key = `${chapterIdx}-${spreadIdx}-${f.key}`;
      const initial = initialStyles[f.key];
      const current = textStyleOverrides[key];
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

  const handleRegenerate = useCallback(async () => {
    if (!activeField) return;
    log.action('textEditor', 'aiRewrite', { field: activeField, chapterIdx, spreadIdx });
    const result = await regenerateTextAction(
      chapterIdx, spreadIdx, activeField,
      t('aiRewritePrompt'),
    );
    if (result) {
      updateSpreadField(chapterIdx, spreadIdx, activeField, result);
    }
  }, [activeField, chapterIdx, spreadIdx, regenerateTextAction, updateSpreadField, t]);

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') handleCancel();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleCancel]);

  // Font size A-/A+ cycling with numeric sizes
  const currentSize = style?.fontSize || DEFAULT_SIZE;
  const currentSizeIdx = FONT_SIZES.indexOf(typeof currentSize === 'number' ? currentSize : parseInt(currentSize));
  const sizeIdx = currentSizeIdx >= 0 ? currentSizeIdx : FONT_SIZES.findIndex(s => s >= DEFAULT_SIZE);

  const decreaseSize = () => {
    const idx = Math.max(0, sizeIdx - 1);
    updateStyle({ fontSize: FONT_SIZES[idx] });
  };
  const increaseSize = () => {
    const idx = Math.min(FONT_SIZES.length - 1, sizeIdx + 1);
    updateStyle({ fontSize: FONT_SIZES[idx] });
  };

  if (availableFields.length === 0) return null;

  const sizeLabel = FONT_SIZES[sizeIdx >= 0 ? sizeIdx : 3];

  return (
    <motion.div
      data-popover
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.12 }}
      className="bg-gray-900/95 backdrop-blur-xl border border-gray-700/80 rounded-xl shadow-2xl shadow-black/60 w-auto min-w-[18rem] ring-1 ring-violet-500/10"
      onClick={(e) => e.stopPropagation()}
    >
      {/* ── Compact Toolbar Row ── */}
      <div className="flex items-center gap-1 px-2.5 py-2 flex-wrap">
        {/* A- / size / A+ */}
        <button
          onClick={decreaseSize}
          disabled={sizeIdx <= 0}
          className="w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold text-gray-400 hover:text-white hover:bg-gray-800/60 disabled:opacity-30 transition-colors"
          title={t('decreaseSize')}
        >
          A-
        </button>
        <span className="text-[10px] font-bold text-violet-300 w-6 text-center select-none">{sizeLabel}</span>
        <button
          onClick={increaseSize}
          disabled={sizeIdx >= FONT_SIZES.length - 1}
          className="w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold text-gray-400 hover:text-white hover:bg-gray-800/60 disabled:opacity-30 transition-colors"
          title={t('increaseSize')}
        >
          A+
        </button>

        <div className="w-px h-4 bg-gray-700/60" />

        {/* B I U */}
        <button
          onClick={() => updateStyle({ bold: !style?.bold })}
          className={`w-6 h-6 rounded flex items-center justify-center text-[11px] font-black transition-all ${
            style?.bold ? 'bg-violet-500/30 text-violet-300' : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/60'
          }`}
          title={t('bold')}
        >
          B
        </button>
        <button
          onClick={() => updateStyle({ italic: !style?.italic })}
          className={`w-6 h-6 rounded flex items-center justify-center text-[11px] italic transition-all ${
            style?.italic ? 'bg-violet-500/30 text-violet-300' : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/60'
          }`}
          title={t('italic')}
        >
          I
        </button>
        <button
          onClick={() => updateStyle({ underline: !style?.underline })}
          className={`w-6 h-6 rounded flex items-center justify-center text-[11px] underline transition-all ${
            style?.underline ? 'bg-violet-500/30 text-violet-300' : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/60'
          }`}
          title={t('underline')}
        >
          U
        </button>

        <div className="w-px h-4 bg-gray-700/60" />

        {/* Alignment */}
        {['left', 'center', 'right'].map(align => (
          <button
            key={align}
            onClick={() => updateStyle({ align })}
            className={`w-6 h-6 rounded flex items-center justify-center transition-all ${
              style?.align === align ? 'bg-violet-500/30 text-violet-300' : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/60'
            }`}
            title={t('alignLabel', { direction: align })}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-2.5 w-2.5" viewBox="0 0 16 16" fill="currentColor">
              {align === 'left' && <>
                <rect y="2" width="10" height="1.5" rx="0.5" />
                <rect y="6" width="16" height="1.5" rx="0.5" />
                <rect y="10" width="8" height="1.5" rx="0.5" />
              </>}
              {align === 'center' && <>
                <rect y="2" width="12" height="1.5" rx="0.5" x="2" />
                <rect y="6" width="16" height="1.5" rx="0.5" />
                <rect y="10" width="12" height="1.5" rx="0.5" x="2" />
              </>}
              {align === 'right' && <>
                <rect y="2" width="10" height="1.5" rx="0.5" x="6" />
                <rect y="6" width="16" height="1.5" rx="0.5" />
                <rect y="10" width="8" height="1.5" rx="0.5" x="8" />
              </>}
            </svg>
          </button>
        ))}

        <div className="w-px h-4 bg-gray-700/60" />

        {/* Font family picker */}
        <div className="relative" ref={fontPickerRef}>
          <button
            onClick={() => setShowFontPicker(prev => !prev)}
            className={`px-2 py-1 rounded text-[10px] font-medium transition-all max-w-[6rem] truncate ${
              showFontPicker ? 'bg-violet-500/25 text-violet-300 border border-violet-500/30' : 'text-gray-400 hover:text-gray-300 hover:bg-gray-800/60'
            }`}
            title={t('fontFamily') || 'Font'}
            style={style?.fontFamily ? { fontFamily: style.fontFamily } : undefined}
          >
            {style?.fontFamily ? style.fontFamily.split(',')[0] : 'Font'}
          </button>

          {showFontPicker && (
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 z-[60] bg-gray-900 border border-gray-700 rounded-lg p-1.5 shadow-2xl min-w-[10rem] max-h-[14rem] overflow-y-auto">
              {/* Default (inherit) */}
              <button
                onClick={() => { updateStyle({ fontFamily: '' }); setShowFontPicker(false); }}
                className={`w-full text-left px-2 py-1 rounded text-[10px] transition-all ${
                  !style?.fontFamily ? 'bg-violet-500/20 text-violet-300' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`}
              >
                Default
              </button>
              {CURATED_FONTS.map(font => (
                <button
                  key={font}
                  onClick={async () => {
                    await loadGoogleFont(font);
                    updateStyle({ fontFamily: font });
                    setShowFontPicker(false);
                  }}
                  onMouseEnter={() => loadGoogleFont(font)}
                  className={`w-full text-left px-2 py-1 rounded text-[10px] transition-all ${
                    style?.fontFamily === font ? 'bg-violet-500/20 text-violet-300' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                  }`}
                  style={{ fontFamily: font }}
                >
                  {font}
                </button>
              ))}
              {/* Import custom font */}
              <div className="border-t border-gray-700 mt-1 pt-1">
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const name = customFontInput.trim();
                    if (name) {
                      await loadGoogleFont(name);
                      updateStyle({ fontFamily: name });
                      setCustomFontInput('');
                      setShowFontPicker(false);
                    }
                  }}
                  className="flex gap-1"
                >
                  <input
                    type="text"
                    value={customFontInput}
                    onChange={(e) => setCustomFontInput(e.target.value)}
                    placeholder="Google Font name..."
                    className="flex-1 bg-gray-800/50 border border-gray-700 rounded px-1.5 py-0.5 text-[9px] text-gray-300 focus:outline-none focus:border-violet-500/50 min-w-0"
                  />
                  <button
                    type="submit"
                    className="px-1.5 py-0.5 rounded text-[9px] bg-violet-600 text-white hover:bg-violet-500"
                  >
                    +
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>

        <div className="w-px h-4 bg-gray-700/60" />

        {/* Color: current color dot + dropdown */}
        <div className="relative" ref={colorPickerRef}>
          <button
            onClick={() => setShowColorPicker(prev => !prev)}
            className="w-6 h-6 rounded flex items-center justify-center transition-all hover:bg-gray-800/60"
            title={t('customColor')}
          >
            <span
              className="w-3.5 h-3.5 rounded-full border border-gray-500"
              style={{ backgroundColor: style?.color || '#ffffff' }}
            />
          </button>

          {showColorPicker && (
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 z-[60] bg-gray-900 border border-gray-700 rounded-lg p-2 shadow-2xl grid grid-cols-4 gap-1 min-w-[6.5rem]">
              {PALETTE_COLORS.map(color => (
                <button
                  key={color}
                  onClick={() => { updateStyle({ color }); setShowColorPicker(false); }}
                  className={`w-5 h-5 rounded-full border transition-all ${
                    style?.color === color ? 'border-violet-400 scale-110' : 'border-gray-600 hover:border-gray-400'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
              {/* Native color picker for custom color */}
              <button
                onClick={() => colorInputRef.current?.click()}
                className="w-5 h-5 rounded-full border border-dashed border-gray-500 flex items-center justify-center text-gray-500 hover:text-gray-300 hover:border-gray-400 transition-all text-[8px]"
                title={t('customColor')}
              >
                +
              </button>
              <input
                ref={colorInputRef}
                type="color"
                value={style?.color || '#ffffff'}
                onChange={(e) => { updateStyle({ color: e.target.value }); }}
                className="sr-only"
              />
            </div>
          )}
        </div>

        {/* AI Rewrite */}
        <button
          onClick={handleRegenerate}
          disabled={isRegenerating}
          className="w-6 h-6 rounded flex items-center justify-center text-violet-400 hover:text-violet-300 hover:bg-violet-500/10 disabled:opacity-40 transition-colors ms-auto"
          title={isRegenerating ? t('rewriting') : t('aiRewrite')}
        >
          {isRegenerating ? (
            <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
          )}
        </button>

        {/* Close */}
        <button
          onClick={handleCancel}
          className="w-6 h-6 rounded flex items-center justify-center text-gray-500 hover:text-white hover:bg-gray-800/60 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </motion.div>
  );
}
