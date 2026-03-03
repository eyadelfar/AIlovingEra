import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { TEMPLATE_STYLES, buildCustomStyle } from './templateStyles';
import PageShell from './PageShell';
import { Divider } from './PageShell';
import useBookStore from '../../stores/bookStore';

const AUTOSAVE_DELAY = 1500;

export default function LoveLetterPage({ text, templateSlug, isEditMode, onTextChange }) {
  const { t } = useTranslation('viewer');
  const customTheme = useBookStore((s) => s.customTheme);
  const [localText, setLocalText] = useState(text || '');
  const debounceRef = useRef(null);
  const onTextChangeRef = useRef(onTextChange);
  onTextChangeRef.current = onTextChange;

  // Sync from props when external changes happen (e.g., undo)
  useEffect(() => {
    setLocalText(text || '');
  }, [text]);

  // Cleanup debounce timer on unmount
  useEffect(() => () => clearTimeout(debounceRef.current), []);

  const flush = useCallback((val) => {
    clearTimeout(debounceRef.current);
    if (val !== (text || '')) onTextChangeRef.current?.(val);
  }, [text]);

  const handleChange = useCallback((e) => {
    const val = e.target.value;
    setLocalText(val);
    // Debounced autosave — saves after user pauses typing
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => flush(val), AUTOSAVE_DELAY);
  }, [flush]);

  if (!text && !isEditMode) return null;

  const style = templateSlug === 'custom' && customTheme
    ? buildCustomStyle(customTheme)
    : (TEMPLATE_STYLES[templateSlug] || TEMPLATE_STYLES.romantic);

  return (
    <div className="max-w-sm sm:max-w-md mx-auto">
      <PageShell style={style} className={`flex flex-col items-center justify-center ${style.innerPadding}`}>
        <div className="relative z-20 flex flex-col items-center max-w-sm w-full">
          {/* Header */}
          <h3 className={`text-2xl font-bold ${style.heading} mb-2 text-center`}>
            {t('aLetterForYou')}
          </h3>
          <Divider className={`${style.divider} mb-6`} />

          {/* Letter body */}
          {isEditMode ? (
            <textarea
              value={localText}
              onChange={handleChange}
              onBlur={() => flush(localText)}
              className={`${style.body} leading-relaxed text-sm whitespace-pre-line text-center w-full bg-transparent border border-dashed border-violet-500/30 rounded-lg p-3 focus:outline-none focus:border-violet-500/60 resize-none overflow-hidden`}
              rows={6}
              placeholder={t('writeLoveLetterPlaceholder')}
            />
          ) : (
            <div className={`${style.body} leading-relaxed text-sm whitespace-pre-line text-center`}>
              {text}
            </div>
          )}

          {/* Heart divider at bottom */}
          <div className="mt-8 flex items-center gap-2 opacity-40">
            <div className={`w-8 h-px ${templateSlug === 'vintage' ? 'bg-amber-500' : templateSlug === 'elegant' ? 'bg-slate-500' : 'bg-rose-500'}`} />
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"
                clipRule="evenodd"
                className={templateSlug === 'vintage' ? 'text-amber-400' : templateSlug === 'elegant' ? 'text-slate-400' : 'text-rose-400'}
              />
            </svg>
            <div className={`w-8 h-px ${templateSlug === 'vintage' ? 'bg-amber-500' : templateSlug === 'elegant' ? 'bg-slate-500' : 'bg-rose-500'}`} />
          </div>
        </div>
      </PageShell>
    </div>
  );
}
