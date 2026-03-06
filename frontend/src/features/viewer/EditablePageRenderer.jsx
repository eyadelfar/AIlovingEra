import { useState, useCallback, useRef, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useShallow } from 'zustand/shallow';
import PageRenderer from './PageRenderer';
import { EditModeProvider } from './EditModeContext';
import { SelectionProvider, useSelection } from './SelectionContext';
import FloatingToolbar from './FloatingToolbar';
import InlineTextEditor from './InlineTextEditor';
import ContextMenu from './ContextMenu';
import PhotoEditModal from '../editor/PhotoEditModal';
import PhotoSwapModal from '../editor/PhotoSwapModal';
import AIImageModal from '../editor/AIImageModal';
import useBookStore from '../../stores/bookStore';
// backgroundRemoval dynamically imported at call sites to avoid 23MB WASM in main bundle
import ImageFramePickerPanel from './ImageFramePickerPanel';
import PageFramePickerPanel from './PageFramePickerPanel';
import ShapePickerModal from './ShapePickerModal';
import ShapeOverlay from './ShapeOverlay';
import log from '../../lib/editorLogger';

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

export default function EditablePageRenderer({
  page, images, templateSlug, photoAnalyses, cropOverrides, filterOverrides,
  isEditMode, chapterIdx, spreadIdx, anniversaryCoverText,
}) {
  // Non-edit mode: render normally
  if (!isEditMode) {
    return (
      <PageRenderer
        page={page} images={images} templateSlug={templateSlug}
        photoAnalyses={photoAnalyses} cropOverrides={cropOverrides}
        filterOverrides={filterOverrides} anniversaryCoverText={anniversaryCoverText}
        chapterIdx={chapterIdx} spreadIdx={spreadIdx}
      />
    );
  }

  // Resolve chapterIdx/spreadIdx: use synthetic keys for special pages
  const specialMapping = PAGE_TYPE_KEYS[page.page_type];
  const resolvedChapterIdx = specialMapping ? specialMapping.chapterIdx : chapterIdx;
  const resolvedSpreadIdx = specialMapping ? specialMapping.spreadIdx : spreadIdx;

  // All pages need valid keys for editing
  if (resolvedChapterIdx == null || resolvedSpreadIdx == null) {
    return (
      <PageRenderer
        page={page} images={images} templateSlug={templateSlug}
        photoAnalyses={photoAnalyses} cropOverrides={cropOverrides}
        filterOverrides={filterOverrides} anniversaryCoverText={anniversaryCoverText}
      />
    );
  }

  return (
    <EditModeProvider isEditMode chapterIdx={resolvedChapterIdx} spreadIdx={resolvedSpreadIdx}>
      <SelectionProvider enabled>
        <CanvasWrapper
          page={page}
          images={images}
          templateSlug={templateSlug}
          photoAnalyses={photoAnalyses}
          cropOverrides={cropOverrides}
          filterOverrides={filterOverrides}
          anniversaryCoverText={anniversaryCoverText}
          chapterIdx={resolvedChapterIdx}
          spreadIdx={resolvedSpreadIdx}
          pageType={page.page_type}
        />
      </SelectionProvider>
    </EditModeProvider>
  );
}

/**
 * Inner component that uses the selection context.
 * Renders PageRenderer + FloatingToolbar + action popovers.
 * Text elements become contentEditable when clicked, with a compact toolbar.
 */
function CanvasWrapper({
  page, images, templateSlug, photoAnalyses, cropOverrides, filterOverrides,
  anniversaryCoverText, chapterIdx, spreadIdx, pageType,
}) {
  const selection = useSelection();
  const selected = selection?.selected;

  const storeActions = useBookStore(
    useShallow(s => ({
      updateBookField: s.updateBookField,
      setCropOverride: s.setCropOverride,
      setFilterOverride: s.setFilterOverride,
      clearFilterOverride: s.clearFilterOverride,
      setTextPositionOffset: s.setTextPositionOffset,
      removePhotoFromSpread: s.removePhotoFromSpread,
      addPhotoToSpread: s.addPhotoToSpread,
      addImageToBook: s.addImageToBook,
      updateSpreadField: s.updateSpreadField,
      setTextStyleOverride: s.setTextStyleOverride,
      regenerateTextAction: s.regenerateTextAction,
      editorClipboard: s.editorClipboard,
      setEditorClipboard: s.setEditorClipboard,
      blendOverrides: s.blendOverrides,
      globalBlend: s.blendPhotos,
      setBlendOverride: s.setBlendOverride,
      replacePhotoPreviewUrl: s.replacePhotoPreviewUrl,
      setImageFrameOverride: s.setImageFrameOverride,
      imageFrameOverrides: s.imageFrameOverrides,
      setPageFrameOverride: s.setPageFrameOverride,
      setBookPageFrame: s.setBookPageFrame,
      pageFrameOverrides: s.pageFrameOverrides,
      bookPageFrame: s.bookPageFrame,
      addShapeOverlay: s.addShapeOverlay,
      updateShapeOverlay: s.updateShapeOverlay,
      removeShapeOverlay: s.removeShapeOverlay,
      shapeOverlays: s.shapeOverlays,
    })),
  );
  const { updateBookField, setCropOverride, setFilterOverride, clearFilterOverride, setTextPositionOffset, removePhotoFromSpread, addPhotoToSpread, addImageToBook, updateSpreadField, setTextStyleOverride, regenerateTextAction, editorClipboard, setEditorClipboard, blendOverrides, globalBlend, setBlendOverride, replacePhotoPreviewUrl, setImageFrameOverride, imageFrameOverrides, setPageFrameOverride, setBookPageFrame, pageFrameOverrides, bookPageFrame, addShapeOverlay, updateShapeOverlay, removeShapeOverlay, shapeOverlays } = storeActions;

  const [activePopover, setActivePopover] = useState(null);
  const [textFieldTarget, setTextFieldTarget] = useState(null);
  const [showCropModal, setShowCropModal] = useState(false);
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const [bgRemovalLoading, setBgRemovalLoading] = useState(false);
  const [showFramePicker, setShowFramePicker] = useState(false);
  const [showShapePicker, setShowShapePicker] = useState(false);
  const [showPageFramePicker, setShowPageFramePicker] = useState(false);
  // Captured modal state — survives selection clearing
  const [modalTarget, setModalTarget] = useState(null);
  const addPhotoInputRef = useRef(null);
  // Track which text element is currently contentEditable
  const [editingTextEl, setEditingTextEl] = useState(null);
  const contentEditableRef = useRef(null);
  // Resize handle state
  const [, setResizeTarget] = useState(null); // { el, field, startX, startWidth, containerWidth }
  const resizeCleanupRef = useRef(null);
  // Context menu state
  const [contextMenu, setContextMenu] = useState(null); // { x, y, targetType, targetInfo }
  const [contextMenuClickPos, setContextMenuClickPos] = useState(null); // { xPct, yPct }
  // Clipboard is in the Zustand store (editorClipboard / setEditorClipboard) so it's shared across pages

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
      case 'removeBg': {
        const target = capturePhotoTarget();
        if (target?.photoIdx != null && target.src) {
          setBgRemovalLoading(true);
          import('../../lib/backgroundRemoval').then(m => m.removeBackground(target.src))
            .then(newUrl => {
              replacePhotoPreviewUrl(target.photoIdx, newUrl);
              setBgRemovalLoading(false);
            })
            .catch(() => setBgRemovalLoading(false));
        }
        break;
      }
      case 'imageFrame': {
        setModalTarget(capturePhotoTarget());
        setShowFramePicker(true);
        break;
      }
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
    // Save contentEditable text before closing
    if (contentEditableRef.current && textFieldTarget) {
      const newText = contentEditableRef.current.innerText;
      const originalText = page[textFieldTarget] || '';
      if (newText !== originalText) {
        savePageText(pageType, textFieldTarget, newText, updateBookField, updateSpreadField, chapterIdx, spreadIdx);
      }
    }
    // Restore contentEditable elements
    if (editingTextEl) {
      editingTextEl.contentEditable = 'false';
      editingTextEl.style.outline = '';
      editingTextEl.style.cursor = '';
      editingTextEl.style.zIndex = '';
      editingTextEl.style.position = '';
      setEditingTextEl(null);
    }
    contentEditableRef.current = null;
    setActivePopover(null);
    setTextFieldTarget(null);
    setResizeTarget(null);
  }, [editingTextEl, textFieldTarget, page, pageType, chapterIdx, spreadIdx, updateBookField, updateSpreadField]);

  // ── Context menu ──────────────────────────────────────────────────
  const TS_TO_FIELD = { heading: 'heading_text', body: 'body_text', caption: 'caption_text', quote: 'quote_text' };

  const findTextField = useCallback((target, boundary) => {
    let el = target;
    while (el && el !== boundary) {
      const tsValue = el.getAttribute?.('data-ts');
      if (tsValue && TS_TO_FIELD[tsValue]) return { field: TS_TO_FIELD[tsValue], element: el };
      el = el.parentElement;
    }
    // Fallback: tag-based detection — scoped to boundary
    const tagEl = target.closest?.('h2, h3, p');
    if (tagEl && boundary?.contains(tagEl)) {
      if (page.heading_text && (tagEl.tagName === 'H2' || tagEl.tagName === 'H3')) {
        return { field: 'heading_text', element: tagEl };
      }
      if (tagEl.tagName === 'P' && page.body_text) {
        return { field: 'body_text', element: tagEl };
      }
    }
    return null;
  }, [page]);

  const handleContextMenu = useCallback((e) => {
    e.preventDefault();
    const containerRect = canvasRef.current?.getBoundingClientRect();
    if (!containerRect) return;
    const x = e.clientX - containerRect.left;
    const y = e.clientY - containerRect.top;

    // Detect what was right-clicked
    const photoEl = e.target.closest('[data-selectable]');
    const textInfo = findTextField(e.target, e.currentTarget);

    if (photoEl) {
      const slotKey = photoEl.dataset?.slotKey;
      const slotIdx = parseInt(photoEl.dataset?.slotIdx, 10);
      const photoIndices = page.photo_indices || [];
      const photoIdx = photoIndices[slotIdx];
      if (selection && slotKey != null) {
        selection.selectPhoto(slotKey, chapterIdx, spreadIdx, slotIdx);
      }
      log.action('contextMenu', 'open:photo', { x, y, slotKey, slotIdx, photoIdx });
      setContextMenu({ x, y, targetType: 'photo', targetInfo: { slotKey, slotIdx, photoIdx } });
    } else if (textInfo) {
      log.action('contextMenu', 'open:text', { x, y, field: textInfo.field });
      setContextMenu({ x, y, targetType: 'text', targetInfo: { field: textInfo.field, element: textInfo.element } });
    } else {
      log.action('contextMenu', 'open:empty', { x, y });
      setContextMenu({ x, y, targetType: 'empty' });
    }
  }, [page, chapterIdx, spreadIdx, selection, findTextField]);

  const handleContextAction = useCallback((action) => {
    const info = contextMenu?.targetInfo;
    const targetType = contextMenu?.targetType;

    switch (action) {
      // ── Empty area actions ──
      case 'addImage':
        addPhotoInputRef.current?.click();
        break;
      case 'generateAIImage':
        // Open AI modal in generate-only mode (no existing photo)
        setModalTarget({ slotKey: null, slotIdx: null, photoIdx: null, src: null });
        setShowAIModal(true);
        break;
      case 'addText': {
        // Find an empty text field to populate, preferring body > heading > caption > quote
        const fields = ['body_text', 'heading_text', 'caption_text', 'quote_text'];
        const emptyField = fields.find(f => !page[f]);
        // Place text near the right-click position using px offsets
        if (contextMenu && canvasRef.current) {
          const textPosField = emptyField || 'body_text';
          const textPosKey = `${chapterIdx}-${spreadIdx}-${textPosField}`;
          setTextPositionOffset(textPosKey, { xPx: contextMenu.x, yPx: contextMenu.y });
          log.action('text', 'addText:position', { key: textPosKey, x: contextMenu.x, y: contextMenu.y });
        }
        if (emptyField) {
          savePageText(pageType, emptyField, 'Your text here...', updateBookField, updateSpreadField, chapterIdx, spreadIdx);
          // Auto-select the new text for editing after React re-render
          requestAnimationFrame(() => setTimeout(() => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const fieldToTs = { heading_text: 'heading', body_text: 'body', caption_text: 'caption', quote_text: 'quote' };
            const tsKey = fieldToTs[emptyField];
            const el = canvas.querySelector(`[data-ts="${tsKey}"]`);
            if (el) {
              el.contentEditable = 'true';
              el.style.outline = '1px solid rgba(139, 92, 246, 0.4)';
              el.style.cursor = 'text';
              el.style.borderRadius = '4px';
              el.style.padding = '2px 4px';
              el.style.position = 'relative';
              el.style.zIndex = '30';
              el.focus();
              const range = document.createRange();
              range.selectNodeContents(el);
              const sel = window.getSelection();
              sel.removeAllRanges();
              sel.addRange(range);
              setEditingTextEl(el);
              contentEditableRef.current = el;
              setTextFieldTarget(emptyField);
              setActivePopover('text');
            }
          }, 0));
        } else {
          // All standard fields occupied — append new text to body_text
          const editField = 'body_text';
          const current = page[editField] || '';
          savePageText(pageType, editField, current + '\nNew text here...', updateBookField, updateSpreadField, chapterIdx, spreadIdx);
          requestAnimationFrame(() => setTimeout(() => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const el = canvas.querySelector('[data-ts="body"]');
            if (el) {
              el.contentEditable = 'true';
              el.style.outline = '1px solid rgba(139, 92, 246, 0.4)';
              el.style.cursor = 'text';
              el.style.borderRadius = '4px';
              el.style.padding = '2px 4px';
              el.style.position = 'relative';
              el.style.zIndex = '30';
              el.focus();
              const range = document.createRange();
              range.selectNodeContents(el);
              range.collapse(false);
              const sel = window.getSelection();
              sel.removeAllRanges();
              sel.addRange(range);
              setEditingTextEl(el);
              contentEditableRef.current = el;
              setTextFieldTarget(editField);
              setActivePopover('text');
            }
          }, 0));
        }
        break;
      }
      case 'paste': {
        if (!editorClipboard) break;
        if (editorClipboard.type === 'photo' && editorClipboard.photoIdx != null) {
          addPhotoToSpread(chapterIdx, spreadIdx, editorClipboard.photoIdx);
        } else if (editorClipboard.type === 'text' && editorClipboard.content) {
          // Paste text into the target field, or body_text if on empty area
          const pasteField = (targetType === 'text' && info?.field) ? info.field : 'body_text';
          const existing = page[pasteField] || '';
          savePageText(pageType, pasteField, existing ? existing + ' ' + editorClipboard.content : editorClipboard.content, updateBookField, updateSpreadField, chapterIdx, spreadIdx);
        }
        break;
      }

      // ── Photo actions ──
      case 'edit':
        if (targetType === 'photo') {
          const photoIndices = page.photo_indices || [];
          const editPhotoIdx = info?.photoIdx ?? photoIndices[info?.slotIdx];
          const editSrc = editPhotoIdx != null ? images[editPhotoIdx]?.previewUrl : null;
          if (editSrc) {
            setModalTarget({
              slotKey: info?.slotKey, slotIdx: info?.slotIdx, photoIdx: editPhotoIdx, src: editSrc,
              crop: cropOverrides?.[info?.slotKey], filter: filterOverrides?.[info?.slotKey],
            });
            setShowCropModal(true);
          }
        } else if (targetType === 'text' && info?.element) {
          setTimeout(() => { info.element.click(); }, 0);
        }
        break;
      case 'copy':
        if (targetType === 'photo') {
          setEditorClipboard({ type: 'photo', photoIdx: info?.photoIdx, slotKey: info?.slotKey });
        } else if (targetType === 'text' && info?.field) {
          setEditorClipboard({ type: 'text', content: page[info.field] || '', field: info.field });
        }
        break;
      case 'cut':
        if (targetType === 'photo') {
          setEditorClipboard({ type: 'photo', photoIdx: info?.photoIdx, slotKey: info?.slotKey });
          if (info?.slotIdx != null) removePhotoFromSpread(chapterIdx, spreadIdx, info.slotIdx);
        } else if (targetType === 'text' && info?.field) {
          setEditorClipboard({ type: 'text', content: page[info.field] || '', field: info.field });
          savePageText(pageType, info.field, '', updateBookField, updateSpreadField, chapterIdx, spreadIdx);
        }
        break;
      case 'delete':
        if (targetType === 'photo' && info?.slotIdx != null) {
          removePhotoFromSpread(chapterIdx, spreadIdx, info.slotIdx);
          selection?.clearSelection?.();
        } else if (targetType === 'text' && info?.field) {
          savePageText(pageType, info.field, '', updateBookField, updateSpreadField, chapterIdx, spreadIdx);
        }
        break;

      // ── Blend toggle ──
      case 'toggleBlend':
        if (targetType === 'photo' && info?.slotKey) {
          const currentBlend = blendOverrides[info.slotKey] != null ? blendOverrides[info.slotKey] : globalBlend;
          setBlendOverride(info.slotKey, !currentBlend);
        }
        break;

      // ── Page/Book frame ──
      case 'pageFrame':
        setShowPageFramePicker(true);
        break;

      // ── AI actions ──
      case 'addShape': {
        // Store click position for shape placement
        const shapeCanvas = canvasRef.current;
        if (shapeCanvas && contextMenu) {
          const shapeRect = shapeCanvas.getBoundingClientRect();
          const shapeXPct = (contextMenu.x / shapeRect.width) * 100;
          const shapeYPct = (contextMenu.y / shapeRect.height) * 100;
          setContextMenuClickPos({ xPct: shapeXPct, yPct: shapeYPct });
        }
        setShowShapePicker(true);
        break;
      }
      case 'removeBg':
        if (targetType === 'photo') {
          const bgPhotoIdx = info?.photoIdx ?? (page.photo_indices || [])[info?.slotIdx];
          const bgSrc = bgPhotoIdx != null ? images[bgPhotoIdx]?.previewUrl : null;
          if (bgSrc) {
            setBgRemovalLoading(true);
            import('../../lib/backgroundRemoval').then(m => m.removeBackground(bgSrc))
              .then(newUrl => { replacePhotoPreviewUrl(bgPhotoIdx, newUrl); setBgRemovalLoading(false); })
              .catch(() => setBgRemovalLoading(false));
          }
        }
        break;
      case 'enhanceAI':
        if (targetType === 'photo') {
          const aiPhotoIdx = info?.photoIdx ?? (page.photo_indices || [])[info?.slotIdx];
          setModalTarget({
            slotKey: info?.slotKey, slotIdx: info?.slotIdx, photoIdx: aiPhotoIdx,
            src: aiPhotoIdx != null ? images[aiPhotoIdx]?.previewUrl : null,
          });
          setShowAIModal(true);
        }
        break;
      case 'regenerateAI':
        if (targetType === 'text' && info?.field) {
          regenerateTextAction(chapterIdx, spreadIdx, info.field, 'Improve this text, make it more poetic and engaging while keeping the same meaning.');
        }
        break;
    }
    setContextMenu(null);
  }, [contextMenu, editorClipboard, page, pageType, images, cropOverrides, filterOverrides, chapterIdx, spreadIdx, selection,
    addPhotoToSpread, removePhotoFromSpread, updateBookField, updateSpreadField, regenerateTextAction, setEditorClipboard, blendOverrides, globalBlend, setBlendOverride, setTextPositionOffset]);

  const handlePageClick = useCallback((e) => {
    if (e.target.closest('[data-selectable], [data-toolbar], [data-popover]')) return;

    // Walk up from clicked element to find nearest data-ts attribute
    const TS_TO_FIELD = { heading: 'heading_text', body: 'body_text', caption: 'caption_text', quote: 'quote_text' };
    let el = e.target;
    let field = null;
    let targetEl = null;
    while (el && el !== e.currentTarget) {
      const tsValue = el.getAttribute?.('data-ts');
      if (tsValue && TS_TO_FIELD[tsValue]) {
        field = TS_TO_FIELD[tsValue];
        targetEl = el;
        break;
      }
      el = el.parentElement;
    }

    // Fallback: detect from tag for elements without data-ts — scoped to canvas
    if (!field) {
      const tagEl = e.target.closest('h2, h3, p');
      if (tagEl && canvasRef.current?.contains(tagEl)) {
        if (page.heading_text && (tagEl.tagName === 'H2' || tagEl.tagName === 'H3')) {
          field = 'heading_text';
          targetEl = tagEl;
        } else if (tagEl.tagName === 'P') {
          field = 'body_text';
          targetEl = tagEl;
        }
      }
    }

    if (field && page[field] != null) {
      e.stopPropagation();
      // Clear photo selection when starting text editing
      selection?.clearSelection?.();

      // Make the text element contentEditable inline
      if (targetEl) {
        // Clean up previous contentEditable
        if (editingTextEl && editingTextEl !== targetEl) {
          // Save previous text
          const prevField = textFieldTarget;
          if (prevField && contentEditableRef.current) {
            const prevText = contentEditableRef.current.innerText;
            const origText = page[prevField] || '';
            if (prevText !== origText) {
              savePageText(pageType, prevField, prevText, updateBookField, updateSpreadField, chapterIdx, spreadIdx);
            }
          }
          editingTextEl.contentEditable = 'false';
          editingTextEl.style.outline = '';
          editingTextEl.style.cursor = '';
          editingTextEl.style.zIndex = '';
          editingTextEl.style.position = '';
        }

        targetEl.contentEditable = 'true';
        targetEl.style.outline = '1px solid rgba(139, 92, 246, 0.4)';
        targetEl.style.cursor = 'text';
        targetEl.style.borderRadius = '4px';
        targetEl.style.padding = '2px 4px';
        targetEl.style.position = 'relative';
        targetEl.style.zIndex = '30';
        targetEl.focus();
        setEditingTextEl(targetEl);
        contentEditableRef.current = targetEl;
      }

      setTextFieldTarget(field);
      setActivePopover('text');
    } else {
      // Clicked empty space or non-text element — close any open text editing
      if (editingTextEl || activePopover) {
        closePopover();
      }
    }
  }, [page, pageType, editingTextEl, textFieldTarget, activePopover, closePopover, chapterIdx, spreadIdx, updateBookField, updateSpreadField, selection]);

  const canvasRef = useRef(null);

  // Auto-save and close popover when photo selection clears (click-outside)
  const closePopoverRef = useRef(closePopover);
  closePopoverRef.current = closePopover;
  const prevSelectedRef = useRef(selected);
  useEffect(() => {
    const wasSelected = prevSelectedRef.current;
    prevSelectedRef.current = selected;
    // Close text editing when selection changes (photo selected or deselected)
    if (wasSelected !== selected && (editingTextEl || activePopover)) {
      closePopoverRef.current();
    }
  }, [selected, editingTextEl, activePopover]);

  // Text drag-to-move — persist positions to store
  const setTextPosRef = useRef(setTextPositionOffset);
  setTextPosRef.current = setTextPositionOffset;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let dragEl = null;
    let startX = 0, startY = 0, origXPx = 0, origYPx = 0;
    let dragFieldType = null;
    let rafId = null;

    function detectFieldType(el) {
      let current = el;
      while (current && current !== canvas) {
        const ts = current.getAttribute?.('data-ts');
        if (ts) {
          const map = { heading: 'heading_text', body: 'body_text', caption: 'caption_text', quote: 'quote_text' };
          return map[ts] || 'body_text';
        }
        current = current.parentElement;
      }
      const tag = el.tagName.toLowerCase();
      if (tag === 'h2' || tag === 'h3') return 'heading_text';
      return 'body_text';
    }

    function onPointerDown(e) {
      if (e.target.closest('[contenteditable="true"]')) return;
      // Don't start text drag if clicking on a shape overlay
      if (e.target.closest('[data-shape-overlay]')) return;
      const el = e.target.closest('h2, h3, p, span');
      if (!el || el.closest('[data-selectable]') || el.closest('[data-toolbar]') || el.closest('[data-popover]')) return;
      if (!canvas.contains(el)) return;
      e.preventDefault();
      dragEl = el;
      dragFieldType = detectFieldType(el);
      startX = e.clientX;
      startY = e.clientY;

      // Parse existing px transform
      const transform = dragEl.style.transform || '';
      const matchPx = transform.match(/translate\((-?[\d.]+)px,\s*(-?[\d.]+)px\)/);
      origXPx = matchPx ? parseFloat(matchPx[1]) : 0;
      origYPx = matchPx ? parseFloat(matchPx[2]) : 0;

      log.action('text', 'drag:start', { field: dragFieldType, origXPx, origYPx });
      dragEl.style.cursor = 'grabbing';
      dragEl.style.zIndex = '30';
      dragEl.style.willChange = 'transform';
      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
    }

    function onPointerMove(e) {
      if (!dragEl) return;
      const cx = e.clientX, cy = e.clientY;
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const dx = cx - startX;
        const dy = cy - startY;
        dragEl.style.transform = `translate(${origXPx + dx}px, ${origYPx + dy}px)`;
        rafId = null;
      });
    }

    function onPointerUp(e) {
      if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
      if (dragEl) {
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
          const key = `${chapterIdx}-${spreadIdx}-${dragFieldType}`;
          const finalX = origXPx + dx;
          const finalY = origYPx + dy;
          setTextPosRef.current?.(key, { xPx: finalX, yPx: finalY });
          log.action('text', 'drag:end', { key, xPx: finalX, yPx: finalY });
        }
        dragEl.style.cursor = '';
        dragEl.style.zIndex = '';
        dragEl.style.willChange = '';
      }
      dragEl = null;
      dragFieldType = null;
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    }

    canvas.addEventListener('pointerdown', onPointerDown);
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      canvas.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [chapterIdx, spreadIdx]);

  // Resize handle logic
  const handleResizePointerDown = useCallback((e, el, field) => {
    e.stopPropagation();
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const containerRect = canvas.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();

    const startX = e.clientX;
    const startWidth = elRect.width;
    const containerWidth = containerRect.width;

    function onMove(ev) {
      const dx = ev.clientX - startX;
      const newWidth = startWidth + dx;
      const newPct = Math.max(30, Math.min(100, (newWidth / containerWidth) * 100));
      el.style.maxWidth = `${newPct}%`;
    }

    function onUp(ev) {
      const dx = ev.clientX - startX;
      const newWidth = startWidth + dx;
      const newPct = Math.max(30, Math.min(100, (newWidth / containerWidth) * 100));
      // Persist the width override
      const key = `${chapterIdx}-${spreadIdx}-${field}`;
      // Map percentage to nearest named width or store as custom
      const widthMap = { 60: 'narrow', 75: 'medium', 90: 'wide', 100: 'full' };
      let nearest = 'medium';
      let minDist = Infinity;
      for (const [pct, name] of Object.entries(widthMap)) {
        const dist = Math.abs(newPct - Number(pct));
        if (dist < minDist) { minDist = dist; nearest = name; }
      }
      setTextStyleOverride(key, { maxWidth: nearest });

      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      resizeCleanupRef.current = null;
      setResizeTarget(null);
    }

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    resizeCleanupRef.current = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    setResizeTarget({ field });
  }, [chapterIdx, spreadIdx, setTextStyleOverride]);

  // Clean up resize listeners on unmount
  useEffect(() => () => { resizeCleanupRef.current?.(); }, []);

  // Add resize handles to text elements when in edit mode
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !editingTextEl) return;

    // Create resize handle
    const handle = document.createElement('div');
    handle.style.cssText = 'position:absolute;right:-4px;top:50%;transform:translateY(-50%);width:8px;height:24px;background:rgba(139,92,246,0.6);border-radius:4px;cursor:ew-resize;z-index:40;';
    handle.setAttribute('data-resize-handle', 'true');

    // Position handle relative to the editing element
    const parent = editingTextEl.parentElement;
    if (parent) {
      const origPosition = getComputedStyle(parent).position;
      if (origPosition === 'static') parent.style.position = 'relative';

      editingTextEl.style.position = 'relative';
      editingTextEl.appendChild(handle);

      const field = textFieldTarget || 'body_text';
      const onDown = (e) => handleResizePointerDown(e, editingTextEl, field);
      handle.addEventListener('pointerdown', onDown);

      return () => {
        handle.removeEventListener('pointerdown', onDown);
        if (handle.parentElement) handle.parentElement.removeChild(handle);
        if (origPosition === 'static') parent.style.position = '';
      };
    }
  }, [editingTextEl, textFieldTarget, handleResizePointerDown]);

  return (
    <div ref={canvasRef} className="relative group/canvas" onClick={handlePageClick} onContextMenu={handleContextMenu}>
      <div className="[&_h2]:cursor-grab [&_h3]:cursor-grab [&_p]:cursor-grab [&_h2]:hover:ring-1 [&_h2]:hover:ring-violet-400/30 [&_h2]:hover:rounded [&_h3]:hover:ring-1 [&_h3]:hover:ring-violet-400/30 [&_h3]:hover:rounded [&_p]:hover:ring-1 [&_p]:hover:ring-violet-400/30 [&_p]:hover:rounded [&_h2]:transition-[box-shadow,outline] [&_h3]:transition-[box-shadow,outline] [&_p]:transition-[box-shadow,outline] [&_h2]:select-none [&_h3]:select-none [&_p]:select-none">
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

      <ShapeOverlay
        shapes={shapeOverlays?.[`${chapterIdx}-${spreadIdx}`] || []}
        isEditMode
        onUpdate={(shapeId, updates) => updateShapeOverlay(chapterIdx, spreadIdx, shapeId, updates)}
        onRemove={(shapeId) => removeShapeOverlay(chapterIdx, spreadIdx, shapeId)}
        containerRef={canvasRef}
      />

      <div className="absolute inset-0 rounded-xl border-2 border-transparent group-hover/canvas:border-violet-500/30 transition-colors pointer-events-none" />

      {selected?.type === 'photo' && !activePopover && !contextMenu && (
        <FloatingToolbar onAction={handleAction} />
      )}

      {bgRemovalLoading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm rounded-xl">
          <div className="flex flex-col items-center gap-2">
            <div className="w-6 h-6 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-white/80">Removing background...</span>
          </div>
        </div>
      )}

      {contextMenu && (() => {
        let blendState = null;
        if (contextMenu.targetType === 'photo' && contextMenu.targetInfo?.slotKey) {
          const key = contextMenu.targetInfo.slotKey;
          const isBlended = blendOverrides[key] != null ? blendOverrides[key] : globalBlend;
          blendState = { isBlended };
        }
        return (
          <ContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            targetType={contextMenu.targetType}
            clipboardItem={editorClipboard}
            blendState={blendState}
            onAction={handleContextAction}
            onClose={() => setContextMenu(null)}
            containerEl={canvasRef.current}
          />
        );
      })()}

      <AnimatePresence>
        {activePopover === 'text' && (
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-40" data-popover>
            <InlineTextEditor
              page={page}
              chapterIdx={chapterIdx}
              spreadIdx={spreadIdx}
              pageType={pageType}
              onClose={closePopover}
              initialField={textFieldTarget}
              contentEditableRef={contentEditableRef}
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

      {showShapePicker && (
        <ShapePickerModal
          onSelect={(shapeData) => {
            const pos = contextMenuClickPos || { xPct: 40, yPct: 40 };
            addShapeOverlay(chapterIdx, spreadIdx, { ...shapeData, xPct: pos.xPct, yPct: pos.yPct });
            setContextMenuClickPos(null);
          }}
          onClose={() => { setShowShapePicker(false); setContextMenuClickPos(null); }}
        />
      )}

      {showFramePicker && modalTarget && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50" data-popover>
          <ImageFramePickerPanel
            currentFrameId={imageFrameOverrides?.[modalTarget.slotKey]?.id || 'none'}
            onSelect={(preset) => {
              setImageFrameOverride(modalTarget.slotKey, preset);
              setShowFramePicker(false);
              setModalTarget(null);
            }}
            onClose={() => { setShowFramePicker(false); setModalTarget(null); }}
          />
        </div>
      )}

      {showPageFramePicker && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50" data-popover>
          <PageFramePickerPanel
            currentFrameId={pageFrameOverrides?.[`${chapterIdx}-${spreadIdx}`]?.id || 'none'}
            bookFrameId={bookPageFrame?.id || 'none'}
            onSelectPage={(preset) => {
              setPageFrameOverride(`${chapterIdx}-${spreadIdx}`, preset.id === 'none' ? null : preset);
              setShowPageFramePicker(false);
            }}
            onSelectBook={(preset) => {
              setBookPageFrame(preset.id === 'none' ? null : preset);
              setShowPageFramePicker(false);
            }}
            onClose={() => setShowPageFramePicker(false)}
          />
        </div>
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
          log.action('image', 'addImages', { count: files.length, chapterIdx, spreadIdx });
          files.forEach((file, i) => {
            const idx = addImageToBook(file);
            addPhotoToSpread(chapterIdx, spreadIdx, idx);
            log.action('image', 'addedImage', { fileIndex: i, bookIndex: idx });
          });
          e.target.value = '';
        }}
      />
    </div>
  );
}
