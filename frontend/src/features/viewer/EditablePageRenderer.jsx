import { useState, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import PageRenderer from './PageRenderer';
import { EditModeProvider } from './EditModeContext';
import { SelectionProvider, useSelection } from './SelectionContext';
import FloatingToolbar from './FloatingToolbar';
import QuickFilterPopover from './QuickFilterPopover';
import PositionControl from './PositionControl';
import InlineTextEditor from './InlineTextEditor';
import PhotoCropModal from '../editor/PhotoCropModal';
import PhotoSwapModal from '../editor/PhotoSwapModal';
import AIImageModal from '../editor/AIImageModal';
import useBookStore from '../../stores/bookStore';

export default function EditablePageRenderer({
  page, images, templateSlug, photoAnalyses, cropOverrides, filterOverrides,
  isEditMode, chapterIdx, spreadIdx, anniversaryCoverText,
}) {
  if (!isEditMode || chapterIdx == null || spreadIdx == null ||
      page.page_type === 'cover' || page.page_type === 'back_cover') {
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
 * Inner component that uses the selection context.
 * Renders PageRenderer + FloatingToolbar + action popovers.
 */
function CanvasWrapper({
  page, images, templateSlug, photoAnalyses, cropOverrides, filterOverrides,
  anniversaryCoverText, chapterIdx, spreadIdx,
}) {
  const selection = useSelection();
  const selected = selection?.selected;

  const setCropOverride = useBookStore(s => s.setCropOverride);

  const [activePopover, setActivePopover] = useState(null);
  const [textFieldTarget, setTextFieldTarget] = useState(null);
  const [showCropModal, setShowCropModal] = useState(false);
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);

  const handleAction = useCallback((action, sel) => {
    setActivePopover(null);

    switch (action) {
      case 'crop':
        setShowCropModal(true);
        break;
      case 'filter':
        setActivePopover('filter');
        break;
      case 'position':
        setActivePopover('position');
        break;
      case 'swap':
        setShowSwapModal(true);
        break;
      case 'ai':
        setShowAIModal(true);
        break;
      case 'textSize':
      case 'bold':
      case 'align':
      case 'aiText':
        setActivePopover('text');
        break;
    }
  }, []);

  const closePopover = useCallback(() => {
    setActivePopover(null);
    setTextFieldTarget(null);
  }, []);

  const handlePageClick = useCallback((e) => {
    if (e.target.closest('[data-selectable], [data-toolbar], [data-popover]')) return;

    const el = e.target.closest('h3, h2, p, span');
    if (!el) return;

    const text = el.textContent?.trim();
    if (!text) return;

    let field = null;
    if (page.heading_text && text === page.heading_text.trim()) field = 'heading_text';
    else if (page.body_text && text === page.body_text.trim()) field = 'body_text';
    else if (page.caption_text && text === page.caption_text.trim()) field = 'caption_text';
    else if (page.quote_text && text === page.quote_text.trim()) field = 'quote_text';
    else if (page.body_text && page.body_text.trim().startsWith(text)) field = 'body_text';
    else if (page.caption_text && page.caption_text.trim().startsWith(text)) field = 'caption_text';

    if (field) {
      e.stopPropagation();
      setTextFieldTarget(field);
      setActivePopover('text');
    }
  }, [page]);

  const getSelectedPhotoSrc = () => {
    if (!selected || selected.type !== 'photo') return null;
    const photoIndices = page.photo_indices || [];
    const photoIdx = photoIndices[selected.slotIdx];
    return photoIdx != null ? images[photoIdx]?.previewUrl : null;
  };

  const hasText = !!(page.heading_text || page.body_text || page.caption_text || page.quote_text);

  return (
    <div className="relative group/canvas" onClick={handlePageClick}>
      <div className="[&_h2]:cursor-text [&_h3]:cursor-text [&_p]:cursor-text [&_h2]:hover:ring-1 [&_h2]:hover:ring-violet-400/30 [&_h2]:hover:rounded [&_h3]:hover:ring-1 [&_h3]:hover:ring-violet-400/30 [&_h3]:hover:rounded [&_p]:hover:ring-1 [&_p]:hover:ring-violet-400/30 [&_p]:hover:rounded [&_h2]:transition-all [&_h3]:transition-all [&_p]:transition-all">
        <PageRenderer
          page={page}
          images={images}
          templateSlug={templateSlug}
          photoAnalyses={photoAnalyses}
          cropOverrides={cropOverrides}
          filterOverrides={filterOverrides}
          anniversaryCoverText={anniversaryCoverText}
        />
      </div>

      <div className="absolute inset-0 rounded-xl border-2 border-transparent group-hover/canvas:border-violet-500/30 transition-colors pointer-events-none" />

      {selected?.type === 'photo' && !activePopover && (
        <FloatingToolbar onAction={handleAction} />
      )}

      <AnimatePresence>
        {activePopover === 'filter' && selected?.type === 'photo' && (
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-40" data-popover>
            <QuickFilterPopover
              slotKey={selected.slotKey}
              photoSrc={getSelectedPhotoSrc()}
              onClose={closePopover}
            />
          </div>
        )}

        {activePopover === 'position' && selected?.type === 'photo' && (
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-40" data-popover>
            <PositionControl
              slotKey={selected.slotKey}
              photoIndex={(page.photo_indices || [])[selected.slotIdx]}
              onClose={closePopover}
            />
          </div>
        )}

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

      {showCropModal && selected?.type === 'photo' && (() => {
        const src = getSelectedPhotoSrc();
        const existingCrop = cropOverrides?.[selected.slotKey];
        return src ? (
          <PhotoCropModal
            src={src}
            initialCrop={existingCrop}
            onApply={(data) => {
              setCropOverride(selected.slotKey, data);
              setShowCropModal(false);
            }}
            onClose={() => setShowCropModal(false)}
          />
        ) : null;
      })()}

      {showSwapModal && selected?.type === 'photo' && (
        <PhotoSwapModal
          chapterIdx={chapterIdx}
          spreadIdx={spreadIdx}
          slotIdx={selected.slotIdx}
          onClose={() => setShowSwapModal(false)}
        />
      )}

      {showAIModal && selected?.type === 'photo' && (
        <AIImageModal
          chapterIdx={chapterIdx}
          spreadIdx={spreadIdx}
          slotIdx={selected.slotIdx}
          photoIndex={(page.photo_indices || [])[selected.slotIdx]}
          onClose={() => setShowAIModal(false)}
        />
      )}
    </div>
  );
}
