import { useState, useCallback, useRef, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useShallow } from 'zustand/shallow';
import { useTranslation } from 'react-i18next';
import PageRenderer from './PageRenderer';
import { EditModeProvider } from './EditModeContext';
import { SelectionProvider, useSelection } from './SelectionContext';
import FloatingToolbar from './FloatingToolbar';
import InlineTextEditor from './InlineTextEditor';
import PhotoEditModal from '../editor/PhotoEditModal';
import PhotoSwapModal from '../editor/PhotoSwapModal';
import AIImageModal from '../editor/AIImageModal';
import useBookStore from '../../stores/bookStore';

export default function EditablePageRenderer({
  page, images, templateSlug, photoAnalyses, cropOverrides, filterOverrides,
  isEditMode, chapterIdx, spreadIdx, anniversaryCoverText,
}) {
  const { t } = useTranslation('viewer');
  const isCover = page.page_type === 'cover';
  const isDedication = page.page_type === 'dedication';
  const isBackCover = page.page_type === 'back_cover';
  const isSpecialPage = isCover || isDedication || isBackCover;

  // Non-edit mode: render normally
  if (!isEditMode) {
    return (
      <PageRenderer
        page={page} images={images} templateSlug={templateSlug}
        photoAnalyses={photoAnalyses} cropOverrides={cropOverrides}
        filterOverrides={filterOverrides} anniversaryCoverText={anniversaryCoverText}
      />
    );
  }

  // Special pages (cover, dedication, back cover) get inline editing
  if (isSpecialPage) {
    return <SpecialPageEditor page={page} images={images} templateSlug={templateSlug}
      photoAnalyses={photoAnalyses} cropOverrides={cropOverrides}
      filterOverrides={filterOverrides} isDedication={isDedication} isCover={isCover}
      anniversaryCoverText={anniversaryCoverText} />;
  }

  // Normal content pages require chapterIdx and spreadIdx
  if (chapterIdx == null || spreadIdx == null) {
    return (
      <PageRenderer
        page={page} images={images} templateSlug={templateSlug}
        photoAnalyses={photoAnalyses} cropOverrides={cropOverrides}
        filterOverrides={filterOverrides} anniversaryCoverText={anniversaryCoverText}
      />
    );
  }

  return (
    <EditModeProvider isEditMode chapterIdx={chapterIdx} spreadIdx={spreadIdx}>
      <SelectionProvider enabled>
        <CanvasWrapper
          page={page}
          images={images}
          templateSlug={templateSlug}
          photoAnalyses={photoAnalyses}
          cropOverrides={cropOverrides}
          filterOverrides={filterOverrides}
          anniversaryCoverText={anniversaryCoverText}
          chapterIdx={chapterIdx}
          spreadIdx={spreadIdx}
        />
      </SelectionProvider>
    </EditModeProvider>
  );
}

/**
 * Simple inline text editor for dedication and back cover pages.
 */
function SpecialPageEditor({ page, images, templateSlug, photoAnalyses, cropOverrides, filterOverrides, isDedication, isCover, anniversaryCoverText }) {
  const { t } = useTranslation('viewer');
  const updateBookField = useBookStore(s => s.updateBookField);
  const editorDraft = useBookStore(s => s.editorDraft);
  const [editing, setEditing] = useState(null); // 'heading' | 'body' | 'coverText' | null
  const [headingVal, setHeadingVal] = useState(page.heading_text || '');
  const [bodyVal, setBodyVal] = useState(page.body_text || '');
  const [coverTextVal, setCoverTextVal] = useState(anniversaryCoverText || '');
  const inputRef = useRef(null);

  // Sync local state when page prop changes (e.g. after external edit)
  useEffect(() => {
    setHeadingVal(page.heading_text || '');
    setBodyVal(page.body_text || '');
  }, [page.heading_text, page.body_text]);

  useEffect(() => {
    setCoverTextVal(anniversaryCoverText || '');
  }, [anniversaryCoverText]);

  useEffect(() => {
    if (editing && inputRef.current) inputRef.current.focus();
  }, [editing]);

  const saveAndClose = useCallback(() => {
    if (isCover) {
      // Cover page: save title + anniversary cover text
      if (headingVal !== (editorDraft?.title || '')) {
        updateBookField('title', headingVal);
      }
      if (coverTextVal !== (editorDraft?.anniversary_cover_text || '')) {
        updateBookField('anniversary_cover_text', coverTextVal);
      }
    } else {
      const currentHeading = isDedication
        ? (editorDraft?.dedication_heading || 'For Us')
        : (editorDraft?.closing_heading || 'The End');
      const currentBody = isDedication
        ? (editorDraft?.dedication || '')
        : (editorDraft?.closing_page?.text || '');

      if (headingVal !== currentHeading) {
        if (isDedication) {
          updateBookField('dedication_heading', headingVal);
        } else {
          updateBookField('closing_heading', headingVal);
        }
      }
      if (bodyVal !== currentBody) {
        if (isDedication) {
          updateBookField('dedication', bodyVal);
        } else {
          updateBookField('closing_page', { text: bodyVal });
        }
      }
    }
    setEditing(null);
  }, [headingVal, bodyVal, coverTextVal, editorDraft, isDedication, isCover, updateBookField]);

  return (
    <div className="relative group/special">
      <PageRenderer
        page={page} images={images} templateSlug={templateSlug}
        photoAnalyses={photoAnalyses} cropOverrides={cropOverrides}
        filterOverrides={filterOverrides} anniversaryCoverText={anniversaryCoverText}
      />
      {/* Edit overlay */}
      <div
        className="absolute inset-0 rounded-xl cursor-pointer transition-all hover:ring-2 hover:ring-violet-500/40"
        onClick={() => { if (!editing) setEditing(isCover ? 'heading' : 'body'); }}
      >
        {!editing && (
          <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm rounded-lg px-2 py-1 text-[10px] text-white/70 opacity-80 transition-opacity">
            {t('clickToEdit')}
          </div>
        )}
      </div>
      {editing && (
        <div className="absolute inset-x-0 bottom-0 z-30 bg-gray-900/95 backdrop-blur-md border-t border-gray-700 rounded-b-xl p-3 space-y-2">
          <div>
            <label className="text-[10px] text-violet-400 uppercase tracking-wider font-medium">
              {isCover ? t('title') || 'Title' : t('heading')}
            </label>
            <input
              ref={editing === 'heading' ? inputRef : null}
              value={headingVal}
              onChange={e => setHeadingVal(e.target.value)}
              onFocus={() => setEditing('heading')}
              className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-violet-500/50 mt-1"
            />
          </div>
          {isCover ? (
            <div>
              <label className="text-[10px] text-violet-400 uppercase tracking-wider font-medium">
                {t('coverText') || 'Cover Text'}
              </label>
              <input
                ref={editing === 'coverText' ? inputRef : null}
                value={coverTextVal}
                onChange={e => setCoverTextVal(e.target.value)}
                onFocus={() => setEditing('coverText')}
                placeholder={t('anniversaryCoverPlaceholder') || 'Anniversary cover text...'}
                className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-violet-500/50 mt-1"
              />
            </div>
          ) : (
            <div>
              <label className="text-[10px] text-violet-400 uppercase tracking-wider font-medium">{t('body')}</label>
              <textarea
                ref={editing === 'body' ? inputRef : null}
                value={bodyVal}
                onChange={e => setBodyVal(e.target.value)}
                onFocus={() => setEditing('body')}
                rows={3}
                className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-200 resize-none focus:outline-none focus:border-violet-500/50 mt-1"
              />
            </div>
          )}
          <div className="flex justify-end gap-2">
            <button onClick={() => setEditing(null)} className="px-3 py-1 rounded-lg text-[10px] text-gray-400 border border-gray-700 hover:border-gray-600">{t('cancel')}</button>
            <button onClick={saveAndClose} className="px-3 py-1 rounded-lg text-[10px] font-medium bg-violet-600 text-white hover:bg-violet-500">{t('save')}</button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Inner component that uses the selection context.
 * Renders PageRenderer + FloatingToolbar + action popovers.
 */
function CanvasWrapper({
  page, images, templateSlug, photoAnalyses, cropOverrides, filterOverrides,
  anniversaryCoverText, chapterIdx, spreadIdx,
}) {
  const selection = useSelection();
  const selected = selection?.selected;

  const storeActions = useBookStore(
    useShallow(s => ({
      setCropOverride: s.setCropOverride,
      setFilterOverride: s.setFilterOverride,
      clearFilterOverride: s.clearFilterOverride,
      setTextPositionOffset: s.setTextPositionOffset,
      removePhotoFromSpread: s.removePhotoFromSpread,
      addPhotoToSpread: s.addPhotoToSpread,
      addImageToBook: s.addImageToBook,
    })),
  );
  const { setCropOverride, setFilterOverride, clearFilterOverride, setTextPositionOffset, removePhotoFromSpread, addPhotoToSpread, addImageToBook } = storeActions;

  const [activePopover, setActivePopover] = useState(null);
  const [textFieldTarget, setTextFieldTarget] = useState(null);
  const [showCropModal, setShowCropModal] = useState(false);
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const [showAddPhotoMode, setShowAddPhotoMode] = useState(false);
  // Captured modal state — survives selection clearing
  const [modalTarget, setModalTarget] = useState(null);
  const addPhotoInputRef = useRef(null);

  const capturePhotoTarget = useCallback(() => {
    if (!selected || selected.type !== 'photo') return null;
    const photoIndices = page.photo_indices || [];
    const photoIdx = photoIndices[selected.slotIdx];
    const src = photoIdx != null ? images[photoIdx]?.previewUrl : null;
    return {
      slotKey: selected.slotKey,
      slotIdx: selected.slotIdx,
      photoIdx,
      src,
      crop: cropOverrides?.[selected.slotKey],
      filter: filterOverrides?.[selected.slotKey],
    };
  }, [selected, page, images, cropOverrides, filterOverrides]);

  const handleAction = useCallback((action, sel) => {
    setActivePopover(null);

    switch (action) {
      case 'crop':
      case 'edit':
        setModalTarget(capturePhotoTarget());
        setShowCropModal(true);
        break;
      case 'swap':
        setModalTarget(capturePhotoTarget());
        setShowSwapModal(true);
        break;
      case 'ai':
        setModalTarget(capturePhotoTarget());
        setShowAIModal(true);
        break;
      case 'removePhoto':
        if (sel?.slotIdx != null) {
          removePhotoFromSpread(chapterIdx, spreadIdx, sel.slotIdx);
          selection?.clear?.();
        }
        break;
      case 'moveTo':
        // TODO: Open page picker for moving photos between pages
        setModalTarget(capturePhotoTarget());
        break;
      case 'addPhoto':
        addPhotoInputRef.current?.click();
        break;
      case 'textSize':
      case 'bold':
      case 'align':
      case 'aiText':
        setActivePopover('text');
        break;
    }
  }, [capturePhotoTarget, chapterIdx, spreadIdx, removePhotoFromSpread, selection]);

  const closePopover = useCallback(() => {
    setActivePopover(null);
    setTextFieldTarget(null);
  }, []);

  const handlePageClick = useCallback((e) => {
    if (e.target.closest('[data-selectable], [data-toolbar], [data-popover]')) return;

    // Walk up from clicked element to find nearest data-ts attribute
    const TS_TO_FIELD = { heading: 'heading_text', body: 'body_text', caption: 'caption_text', quote: 'quote_text' };
    let el = e.target;
    let field = null;
    while (el && el !== e.currentTarget) {
      const tsValue = el.getAttribute?.('data-ts');
      if (tsValue && TS_TO_FIELD[tsValue]) {
        field = TS_TO_FIELD[tsValue];
        break;
      }
      el = el.parentElement;
    }

    // Fallback: detect from tag for elements without data-ts
    if (!field) {
      const tagEl = e.target.closest('h2, h3, p');
      if (tagEl && page.heading_text && (tagEl.tagName === 'H2' || tagEl.tagName === 'H3')) {
        field = 'heading_text';
      }
    }

    if (field && page[field] != null) {
      e.stopPropagation();
      setTextFieldTarget(field);
      setActivePopover('text');
    }
  }, [page]);

  const hasText = !!(page.heading_text || page.body_text || page.caption_text || page.quote_text);
  const canvasRef = useRef(null);

  // Text drag-to-move — persist positions to store
  const setTextPosRef = useRef(setTextPositionOffset);
  setTextPosRef.current = setTextPositionOffset;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let dragEl = null;
    let startX = 0, startY = 0, origXPct = 0, origYPct = 0;
    let containerW = 400, containerH = 560;
    let dragFieldType = null;

    function detectFieldType(el) {
      // Walk up to find data-ts attribute first
      let current = el;
      while (current && current !== canvas) {
        const ts = current.getAttribute?.('data-ts');
        if (ts) {
          const map = { heading: 'heading_text', body: 'body_text', caption: 'caption_text', quote: 'quote_text' };
          return map[ts] || 'body_text';
        }
        current = current.parentElement;
      }
      // Fallback for elements without data-ts
      const tag = el.tagName.toLowerCase();
      if (tag === 'h2' || tag === 'h3') return 'heading_text';
      return 'body_text';
    }

    function onPointerDown(e) {
      const el = e.target.closest('h2, h3, p, span');
      if (!el || el.closest('[data-selectable]') || el.closest('[data-toolbar]') || el.closest('[data-popover]')) return;
      if (!canvas.contains(el)) return;
      e.preventDefault();
      dragEl = el;
      dragFieldType = detectFieldType(el);
      startX = e.clientX;
      startY = e.clientY;

      // Get container dimensions for percentage conversion
      const pageContainer = canvas.closest('[class*="aspect-"]') || canvas;
      const rect = pageContainer.getBoundingClientRect();
      containerW = rect.width || 400;
      containerH = rect.height || 560;

      const transform = dragEl.style.transform || '';
      const matchPct = transform.match(/translate\((-?[\d.]+)%,\s*(-?[\d.]+)%\)/);
      origXPct = matchPct ? parseFloat(matchPct[1]) : 0;
      origYPct = matchPct ? parseFloat(matchPct[2]) : 0;
      dragEl.style.cursor = 'grabbing';
      dragEl.style.zIndex = '30';
      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
    }

    function onPointerMove(e) {
      if (!dragEl) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      const newXPct = origXPct + (dx / containerW) * 100;
      const newYPct = origYPct + (dy / containerH) * 100;
      dragEl.style.transform = `translate(${newXPct}%, ${newYPct}%)`;
    }

    function onPointerUp(e) {
      if (dragEl) {
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        // Persist position as percentage if moved more than 2px
        if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
          const key = `${chapterIdx}-${spreadIdx}-${dragFieldType}`;
          setTextPosRef.current?.(key, {
            xPct: origXPct + (dx / containerW) * 100,
            yPct: origYPct + (dy / containerH) * 100,
          });
        }
        dragEl.style.cursor = '';
        dragEl.style.zIndex = '';
      }
      dragEl = null;
      dragFieldType = null;
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    }

    canvas.addEventListener('pointerdown', onPointerDown);
    return () => {
      canvas.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [chapterIdx, spreadIdx]);

  return (
    <div ref={canvasRef} className="relative group/canvas" onClick={handlePageClick}>
      <div className="[&_h2]:cursor-grab [&_h3]:cursor-grab [&_p]:cursor-grab [&_h2]:hover:ring-1 [&_h2]:hover:ring-violet-400/30 [&_h2]:hover:rounded [&_h3]:hover:ring-1 [&_h3]:hover:ring-violet-400/30 [&_h3]:hover:rounded [&_p]:hover:ring-1 [&_p]:hover:ring-violet-400/30 [&_p]:hover:rounded [&_h2]:transition-all [&_h3]:transition-all [&_p]:transition-all [&_h2]:select-none [&_h3]:select-none [&_p]:select-none">
        <PageRenderer
          page={page}
          images={images}
          templateSlug={templateSlug}
          photoAnalyses={photoAnalyses}
          cropOverrides={cropOverrides}
          filterOverrides={filterOverrides}
          anniversaryCoverText={anniversaryCoverText}
          chapterIdx={chapterIdx}
          spreadIdx={spreadIdx}
        />
      </div>

      <div className="absolute inset-0 rounded-xl border-2 border-transparent group-hover/canvas:border-violet-500/30 transition-colors pointer-events-none" />

      {selected?.type === 'photo' && !activePopover && (
        <FloatingToolbar onAction={handleAction} />
      )}

      <AnimatePresence>
        {activePopover === 'text' && (
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-40" data-popover>
            <InlineTextEditor
              page={page}
              chapterIdx={chapterIdx}
              spreadIdx={spreadIdx}
              onClose={closePopover}
              initialField={textFieldTarget}
            />
          </div>
        )}
      </AnimatePresence>

      {showCropModal && modalTarget?.src && (
        <PhotoEditModal
          src={modalTarget.src}
          slotKey={modalTarget.slotKey}
          initialCrop={modalTarget.crop}
          initialFilter={modalTarget.filter}
          onApply={({ crop, filter }) => {
            setCropOverride(modalTarget.slotKey, crop);
            if (filter) {
              setFilterOverride(modalTarget.slotKey, filter);
            } else {
              clearFilterOverride(modalTarget.slotKey);
            }
            setShowCropModal(false);
            setModalTarget(null);
          }}
          onClose={() => { setShowCropModal(false); setModalTarget(null); }}
        />
      )}

      {showSwapModal && modalTarget && (
        <PhotoSwapModal
          chapterIdx={chapterIdx}
          spreadIdx={spreadIdx}
          slotIdx={modalTarget.slotIdx}
          onClose={() => { setShowSwapModal(false); setModalTarget(null); }}
        />
      )}

      {showAIModal && modalTarget && (
        <AIImageModal
          chapterIdx={chapterIdx}
          spreadIdx={spreadIdx}
          slotIdx={modalTarget.slotIdx}
          photoIndex={modalTarget.photoIdx}
          onClose={() => { setShowAIModal(false); setModalTarget(null); }}
        />
      )}

      {/* Hidden file input for adding photos */}
      <input
        ref={addPhotoInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files || []);
          files.forEach(file => {
            const idx = addImageToBook(file);
            addPhotoToSpread(chapterIdx, spreadIdx, idx);
          });
          e.target.value = '';
        }}
      />
    </div>
  );
}
