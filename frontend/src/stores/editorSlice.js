import { generateAIImage, enhanceImage, regenerateText } from '../api/bookApi';
import { MAX_PHOTOS, getNextLayoutUp } from '../features/viewer/layouts/index';
import { trackEvent } from '../lib/eventTracker';

const MAX_HISTORY = 30;
const HISTORY_DEBOUNCE_MS = 100;
const MIXED_LAYOUTS = new Set(['PHOTO_PLUS_QUOTE', 'COLLAGE_PLUS_LETTER']);
const OVERRIDE_MAP_NAMES = [
  'cropOverrides', 'filterOverrides', 'positionOffsets',
  'blendOverrides', 'textStyleOverrides', 'textPositionOffsets', 'sizeOverrides',
  'imageFrameOverrides', 'pageFrameOverrides', 'shapeOverlays',
];
let _historyDebounceTimer = null;
let _pendingSnapshot = null;

/**
 * Re-key all override maps when chapter/spread/slot indices change.
 * @param {Object} state - Current store state
 * @param {Function} keyTransform - (oldKey) => newKey | null (null to delete)
 * @returns {Object} - Updated override map entries for set()
 */
function remapOverrideKeys(state, keyTransform) {
  const result = {};
  for (const mapName of OVERRIDE_MAP_NAMES) {
    const oldMap = state[mapName];
    if (!oldMap || Object.keys(oldMap).length === 0) continue;
    const newMap = {};
    for (const [oldKey, value] of Object.entries(oldMap)) {
      const newKey = keyTransform(oldKey);
      if (newKey != null) {
        newMap[newKey] = value;
      }
    }
    result[mapName] = newMap;
  }
  return result;
}

/** Capture all visual state into a single snapshot for undo/redo. */
function captureVisualState(s) {
  const draft = structuredClone(s.editorDraft);
  // Exclude derived pages[] — it's rebuilt from chapters via rebuildPages()
  if (draft) delete draft.pages;
  return {
    editorDraft: draft,
    cropOverrides: structuredClone(s.cropOverrides),
    filterOverrides: structuredClone(s.filterOverrides),
    positionOffsets: structuredClone(s.positionOffsets),
    blendOverrides: structuredClone(s.blendOverrides),
    textStyleOverrides: structuredClone(s.textStyleOverrides),
    textPositionOffsets: structuredClone(s.textPositionOffsets),
    sizeOverrides: structuredClone(s.sizeOverrides),
    imageFrameOverrides: structuredClone(s.imageFrameOverrides),
    pageFrameOverrides: structuredClone(s.pageFrameOverrides),
    bookPageFrame: s.bookPageFrame != null ? structuredClone(s.bookPageFrame) : null,
    shapeOverlays: structuredClone(s.shapeOverlays),
    customTheme: structuredClone(s.customTheme),
    selectedTemplate: s.selectedTemplate,
    images: s.images.map(img => ({ ...img })),
  };
}

/** Restore all visual state fields from a snapshot. */
function restoreVisualState(snapshot) {
  const clone = structuredClone(snapshot);
  clone.editorDraft.pages = rebuildPages(clone.editorDraft);
  const result = {
    editorDraft: clone.editorDraft,
    cropOverrides: clone.cropOverrides,
    filterOverrides: clone.filterOverrides,
    positionOffsets: clone.positionOffsets,
    blendOverrides: clone.blendOverrides,
    textStyleOverrides: clone.textStyleOverrides,
    textPositionOffsets: clone.textPositionOffsets,
    sizeOverrides: clone.sizeOverrides,
    imageFrameOverrides: clone.imageFrameOverrides,
    pageFrameOverrides: clone.pageFrameOverrides,
    bookPageFrame: clone.bookPageFrame,
    shapeOverlays: clone.shapeOverlays,
    customTheme: clone.customTheme,
    selectedTemplate: clone.selectedTemplate,
  };
  if (clone.images) result.images = clone.images;
  return result;
}

/** Rebuild flat pages array from chapters (lightweight sync, no bookDraft update). */
export function rebuildPages(draft) {
  if (!draft) return [];
  const pages = [];
  let pageNum = 1;

  // Book front cover — decorative themed cover before first page
  pages.push({
    page_number: pageNum++, page_type: 'book_cover_front', layout_type: 'BOOK_COVER',
    photo_indices: [], heading_text: draft.title || '', body_text: draft.partner_names?.join(' & ') || '',
    caption_text: '', quote_text: '',
  });

  pages.push({
    page_number: pageNum++, page_type: 'cover', layout_type: 'HERO_FULLBLEED',
    photo_indices: draft.chapters?.[0]?.spreads?.[0]?.photo_indices?.slice(0, 1) || [],
    heading_text: draft.title, body_text: '', caption_text: '', quote_text: '',
  });
  pages.push({
    page_number: pageNum++, page_type: 'dedication', layout_type: 'DEDICATION',
    photo_indices: [], heading_text: draft.dedication_heading || 'For Us', body_text: draft.dedication || '',
    caption_text: '', quote_text: '',
  });
  for (const ch of (draft.chapters || [])) {
    for (const sp of (ch.spreads || [])) {
      if (MIXED_LAYOUTS.has(sp.layout_type)) {
        pages.push({
          page_number: pageNum++, page_type: 'content', layout_type: sp.layout_type,
          photo_indices: sp.photo_indices, heading_text: '', body_text: '',
          caption_text: sp.caption_text, quote_text: '', page_side: 'left',
        });
        pages.push({
          page_number: pageNum++, page_type: 'content', layout_type: sp.layout_type,
          photo_indices: [], heading_text: sp.heading_text, body_text: sp.body_text,
          caption_text: '', quote_text: sp.quote_text, page_side: 'right',
        });
      } else {
        pages.push({
          page_number: pageNum++, page_type: 'content', layout_type: sp.layout_type,
          photo_indices: sp.photo_indices, heading_text: sp.heading_text,
          body_text: sp.body_text, caption_text: sp.caption_text,
          quote_text: sp.quote_text, page_side: '',
        });
      }
    }
  }
  pages.push({
    page_number: pageNum++, page_type: 'back_cover', layout_type: 'QUOTE_PAGE',
    photo_indices: [], heading_text: draft.closing_heading || 'The End',
    body_text: draft.closing_page?.text || "Here's to many more memories together.",
    caption_text: '', quote_text: '',
  });

  // Book back cover — leather-like closing cover after last page
  pages.push({
    page_number: pageNum, page_type: 'book_cover_back', layout_type: 'BOOK_COVER',
    photo_indices: [], heading_text: '', body_text: '',
    caption_text: '', quote_text: '',
  });

  return pages;
}

export const createEditorSlice = (set, get) => ({
  useOriginalPhotos: false,
  editorDraft: null,
  editorHistory: [],
  editorFuture: [],
  selectedChapterIndex: null,
  selectedSpreadIndex: null,
  isRegenerating: false,
  editorDirty: false,
  cropOverrides: {},
  filterOverrides: {},
  positionOffsets: {},
  blendOverrides: {},
  textStyleOverrides: {},
  textPositionOffsets: {},
  sizeOverrides: {},
  imageFrameOverrides: {},
  pageFrameOverrides: {},
  bookPageFrame: null,
  shapeOverlays: {},
  /** Shared clipboard for copy/paste across pages. */
  editorClipboard: null, // { type: 'photo'|'text', photoIdx, content, field, sourceChapterIdx, sourceSpreadIdx }

  /** Compute overrides on-demand for PDF — no need to store a duplicate snapshot. */
  getCommittedOverrides: () => {
    const s = get();
    return {
      cropOverrides: { ...s.cropOverrides },
      filterOverrides: { ...s.filterOverrides },
      positionOffsets: { ...s.positionOffsets },
      blendOverrides: { ...s.blendOverrides },
      textStyleOverrides: structuredClone(s.textStyleOverrides),
      textPositionOffsets: { ...s.textPositionOffsets },
      sizeOverrides: { ...s.sizeOverrides },
      imageFrameOverrides: { ...s.imageFrameOverrides },
      pageFrameOverrides: { ...s.pageFrameOverrides },
      bookPageFrame: s.bookPageFrame,
      shapeOverlays: structuredClone(s.shapeOverlays),
    };
  },

  initEditor: () => {
    clearTimeout(_historyDebounceTimer);
    _historyDebounceTimer = null;
    _pendingSnapshot = null;
    const s = get();
    if (!s.bookDraft) return;
    const draft = structuredClone(s.bookDraft);
    draft.pages = rebuildPages(draft);
    // Do NOT reset override maps — keep them intact across edit sessions
    set({
      editorDraft: draft,
      editorHistory: [],
      editorFuture: [],
      selectedChapterIndex: s.bookDraft.chapters?.length > 0 ? 0 : null,
      selectedSpreadIndex: null,
      editorDirty: false,
    });
  },

  pushHistory: () => {
    const s = get();
    if (!s.editorDraft) return;
    // Set dirty immediately so toggleEditMode won't miss it
    if (!s.editorDirty) set({ editorDirty: true });
    // Capture immediately but debounce the actual history commit
    if (!_pendingSnapshot) {
      _pendingSnapshot = captureVisualState(s);
    }
    clearTimeout(_historyDebounceTimer);
    _historyDebounceTimer = setTimeout(() => {
      const snap = _pendingSnapshot;
      _pendingSnapshot = null;
      if (!snap) return;
      set((s) => ({
        editorHistory: [...s.editorHistory.slice(-MAX_HISTORY + 1), snap],
        editorFuture: [],
      }));
    }, HISTORY_DEBOUNCE_MS);
  },

  undo: () => {
    const s = get();
    if (s.editorHistory.length === 0) return;
    const prevSnapshot = s.editorHistory[s.editorHistory.length - 1];
    const currentSnapshot = captureVisualState(s);
    set({
      editorFuture: [currentSnapshot, ...s.editorFuture],
      ...restoreVisualState(prevSnapshot),
      editorHistory: s.editorHistory.slice(0, -1),
    });
  },

  redo: () => {
    const s = get();
    if (s.editorFuture.length === 0) return;
    const nextSnapshot = s.editorFuture[0];
    const currentSnapshot = captureVisualState(s);
    set({
      editorHistory: [...s.editorHistory, currentSnapshot],
      ...restoreVisualState(nextSnapshot),
      editorFuture: s.editorFuture.slice(1),
    });
  },

  updateSpreadField: (chapterIdx, spreadIdx, field, value) => {
    if (chapterIdx == null || spreadIdx == null) return;
    get().pushHistory();
    set((s) => {
      if (!s.editorDraft) return {};
      const draft = structuredClone(s.editorDraft);
      const ch = draft.chapters?.[chapterIdx];
      if (ch?.spreads?.[spreadIdx]) {
        ch.spreads[spreadIdx][field] = value;
      }
      draft.pages = rebuildPages(draft);
      return { editorDraft: draft };
    });
    if (['heading_text', 'body_text', 'caption_text', 'quote_text'].includes(field)) {
      trackEvent('text_edited', 'editor');
    }
    if (field === 'layout_type') {
      trackEvent('layout_changed', 'editor');
    }
  },

  updateChapterField: (chapterIdx, field, value) => {
    get().pushHistory();
    set((s) => {
      const draft = structuredClone(s.editorDraft);
      if (draft.chapters?.[chapterIdx]) {
        draft.chapters[chapterIdx][field] = value;
      }
      draft.pages = rebuildPages(draft);
      return { editorDraft: draft };
    });
  },

  updateBookField: (field, value) => {
    get().pushHistory();
    set((s) => {
      const draft = structuredClone(s.editorDraft);
      draft[field] = value;
      draft.pages = rebuildPages(draft);
      return { editorDraft: draft };
    });
  },

  reorderSpread: (chapterIdx, fromIdx, toIdx) => {
    get().pushHistory();
    set((s) => {
      const draft = structuredClone(s.editorDraft);
      const ch = draft.chapters?.[chapterIdx];
      if (!ch?.spreads) return {};
      const [moved] = ch.spreads.splice(fromIdx, 1);
      ch.spreads.splice(toIdx, 0, moved);
      ch.spreads.forEach((sp, i) => { sp.spread_index = i; });
      draft.pages = rebuildPages(draft);

      // Build index mapping for the affected range
      const min = Math.min(fromIdx, toIdx);
      const max = Math.max(fromIdx, toIdx);
      const indexMap = {};
      for (let i = min; i <= max; i++) {
        if (i === fromIdx) {
          indexMap[i] = toIdx;
        } else if (fromIdx < toIdx) {
          indexMap[i] = i - 1;
        } else {
          indexMap[i] = i + 1;
        }
      }

      const remapped = remapOverrideKeys(s, (key) => {
        const parts = key.split('-');
        if (parts.length < 3) return key;
        const ci = parseInt(parts[0]);
        const si = parseInt(parts[1]);
        if (ci !== chapterIdx || indexMap[si] == null) return key;
        return `${ci}-${indexMap[si]}-${parts.slice(2).join('-')}`;
      });

      return { editorDraft: draft, ...remapped };
    });
  },

  reorderChapter: (fromIdx, toIdx) => {
    get().pushHistory();
    set((s) => {
      const draft = structuredClone(s.editorDraft);
      if (!draft.chapters) return {};
      const [moved] = draft.chapters.splice(fromIdx, 1);
      draft.chapters.splice(toIdx, 0, moved);
      draft.chapters.forEach((ch, i) => { ch.chapter_index = i; });
      draft.pages = rebuildPages(draft);

      const min = Math.min(fromIdx, toIdx);
      const max = Math.max(fromIdx, toIdx);
      const indexMap = {};
      for (let i = min; i <= max; i++) {
        if (i === fromIdx) {
          indexMap[i] = toIdx;
        } else if (fromIdx < toIdx) {
          indexMap[i] = i - 1;
        } else {
          indexMap[i] = i + 1;
        }
      }

      const remapped = remapOverrideKeys(s, (key) => {
        const parts = key.split('-');
        if (parts.length < 3) return key;
        const ci = parseInt(parts[0]);
        if (indexMap[ci] == null) return key;
        return `${indexMap[ci]}-${parts.slice(1).join('-')}`;
      });

      return { editorDraft: draft, ...remapped };
    });
  },

  swapPhoto: (chapterIdx, spreadIdx, slotIdx, newImageId) => {
    get().pushHistory();
    set((s) => {
      const draft = structuredClone(s.editorDraft);
      const ch = draft.chapters?.[chapterIdx];
      if (ch?.spreads?.[spreadIdx]?.photo_indices) {
        ch.spreads[spreadIdx].photo_indices[slotIdx] = newImageId;
      }
      draft.pages = rebuildPages(draft);
      return { editorDraft: draft };
    });
  },

  removeSpread: (chapterIdx, spreadIdx) => {
    get().pushHistory();
    set((s) => {
      const draft = structuredClone(s.editorDraft);
      const ch = draft.chapters?.[chapterIdx];
      if (ch?.spreads) {
        ch.spreads.splice(spreadIdx, 1);
        ch.spreads.forEach((sp, i) => { sp.spread_index = i; });
      }
      draft.pages = rebuildPages(draft);

      // Re-key: delete removed spread's keys, shift higher spreads down
      const remapped = remapOverrideKeys(s, (key) => {
        const parts = key.split('-');
        if (parts.length < 3) return key;
        const ci = parseInt(parts[0]);
        const si = parseInt(parts[1]);
        if (ci !== chapterIdx) return key;
        if (si === spreadIdx) return null;
        if (si > spreadIdx) return `${ci}-${si - 1}-${parts.slice(2).join('-')}`;
        return key;
      });

      return { editorDraft: draft, ...remapped };
    });
  },

  addBlankSpread: (chapterIdx, position) => {
    get().pushHistory();
    set((s) => {
      const draft = structuredClone(s.editorDraft);
      const ch = draft.chapters?.[chapterIdx];
      if (!ch) return {};
      const newSpread = {
        spread_index: position,
        layout_type: 'QUOTE_PAGE',
        photo_indices: [],
        heading_text: 'New Spread',
        body_text: '',
        caption_text: '',
        quote_text: '',
        image_look_override: '',
        ai_generated_image_prompt: '',
        elements: [],
        assigned_clusters: [],
        design_notes: '',
        regen_policy: null,
      };
      ch.spreads.splice(position, 0, newSpread);
      ch.spreads.forEach((sp, i) => { sp.spread_index = i; });
      draft.pages = rebuildPages(draft);

      // Shift override keys at or above the insertion point up
      const remapped = remapOverrideKeys(s, (key) => {
        const parts = key.split('-');
        if (parts.length < 3) return key;
        const ci = parseInt(parts[0]);
        const si = parseInt(parts[1]);
        if (ci !== chapterIdx || si < position) return key;
        return `${ci}-${si + 1}-${parts.slice(2).join('-')}`;
      });

      return { editorDraft: draft, ...remapped };
    });
  },

  duplicateSpread: (chapterIdx, spreadIdx) => {
    get().pushHistory();
    set((s) => {
      const draft = structuredClone(s.editorDraft);
      const ch = draft.chapters?.[chapterIdx];
      if (!ch?.spreads?.[spreadIdx]) return {};
      const clone = structuredClone(ch.spreads[spreadIdx]);
      ch.spreads.splice(spreadIdx + 1, 0, clone);
      ch.spreads.forEach((sp, i) => { sp.spread_index = i; });
      draft.pages = rebuildPages(draft);

      // Shift override keys above the duplicated spread up; clone overrides for the duplicate
      const remapped = remapOverrideKeys(s, (key) => {
        const parts = key.split('-');
        if (parts.length < 3) return key;
        const ci = parseInt(parts[0]);
        const si = parseInt(parts[1]);
        if (ci !== chapterIdx || si <= spreadIdx) return key;
        return `${ci}-${si + 1}-${parts.slice(2).join('-')}`;
      });

      // Copy overrides from original spread to the duplicate
      for (const mapName of OVERRIDE_MAP_NAMES) {
        const map = remapped[mapName] || { ...s[mapName] };
        const srcPrefix = `${chapterIdx}-${spreadIdx}-`;
        const dstPrefix = `${chapterIdx}-${spreadIdx + 1}-`;
        for (const [key, value] of Object.entries(s[mapName] || {})) {
          if (key.startsWith(srcPrefix)) {
            map[dstPrefix + key.slice(srcPrefix.length)] = structuredClone(value);
          }
        }
        remapped[mapName] = map;
      }

      return { editorDraft: draft, ...remapped };
    });
  },

  swapPhotoBetweenSpreads: (fromChIdx, fromSpIdx, fromSlotIdx, toChIdx, toSpIdx, toSlotIdx) => {
    get().pushHistory();
    set((s) => {
      const draft = structuredClone(s.editorDraft);
      const fromSpread = draft.chapters?.[fromChIdx]?.spreads?.[fromSpIdx];
      const toSpread = draft.chapters?.[toChIdx]?.spreads?.[toSpIdx];
      if (!fromSpread?.photo_indices || !toSpread?.photo_indices) return {};
      const temp = fromSpread.photo_indices[fromSlotIdx];
      fromSpread.photo_indices[fromSlotIdx] = toSpread.photo_indices[toSlotIdx];
      toSpread.photo_indices[toSlotIdx] = temp;
      draft.pages = rebuildPages(draft);
      return { editorDraft: draft };
    });
  },

  swapTextBetweenSpreads: (fromChIdx, fromSpIdx, fromField, toChIdx, toSpIdx, toField) => {
    get().pushHistory();
    set((s) => {
      const draft = structuredClone(s.editorDraft);
      const fromSpread = draft.chapters?.[fromChIdx]?.spreads?.[fromSpIdx];
      const toSpread = draft.chapters?.[toChIdx]?.spreads?.[toSpIdx];
      if (!fromSpread || !toSpread) return {};
      const temp = fromSpread[fromField];
      fromSpread[fromField] = toSpread[toField];
      toSpread[toField] = temp;
      draft.pages = rebuildPages(draft);
      return { editorDraft: draft };
    });
  },

  setUseOriginalPhotos: (val) => set({ useOriginalPhotos: val }),

  setCropOverride: (key, cropData) => {
    get().pushHistory();
    set((s) => ({ cropOverrides: { ...s.cropOverrides, [key]: cropData } }));
    trackEvent('photo_cropped', 'editor');
  },
  clearCropOverride: (key) => {
    get().pushHistory();
    set((s) => {
      const next = { ...s.cropOverrides };
      delete next[key];
      return { cropOverrides: next };
    });
  },
  setFilterOverride: (key, filterData) => {
    get().pushHistory();
    set((s) => ({ filterOverrides: { ...s.filterOverrides, [key]: filterData } }));
  },
  clearFilterOverride: (key) => {
    get().pushHistory();
    set((s) => {
      const next = { ...s.filterOverrides };
      delete next[key];
      return { filterOverrides: next };
    });
  },

  setPositionOffset: (key, offset) => {
    get().pushHistory();
    set((s) => ({ positionOffsets: { ...s.positionOffsets, [key]: offset } }));
  },
  clearPositionOffset: (key) => {
    get().pushHistory();
    set((s) => {
      const next = { ...s.positionOffsets };
      delete next[key];
      return { positionOffsets: next };
    });
  },

  setBlendOverride: (key, val) => {
    get().pushHistory();
    set((s) => ({ blendOverrides: { ...s.blendOverrides, [key]: val } }));
  },

  setTextStyleOverride: (key, styleObj) => {
    get().pushHistory();
    set((s) => ({ textStyleOverrides: { ...s.textStyleOverrides, [key]: { ...(s.textStyleOverrides[key] || {}), ...styleObj } } }));
  },
  clearTextStyleOverride: (key) => {
    get().pushHistory();
    set((s) => {
      const next = { ...s.textStyleOverrides };
      delete next[key];
      return { textStyleOverrides: next };
    });
  },

  setTextPositionOffset: (key, offset) => {
    get().pushHistory();
    set((s) => ({ textPositionOffsets: { ...s.textPositionOffsets, [key]: offset } }));
  },
  clearTextPositionOffset: (key) => {
    get().pushHistory();
    set((s) => {
      const next = { ...s.textPositionOffsets };
      delete next[key];
      return { textPositionOffsets: next };
    });
  },

  // ── Size overrides (photo resize persistence) ──
  setSizeOverride: (key, size) => {
    get().pushHistory();
    set((s) => ({ sizeOverrides: { ...s.sizeOverrides, [key]: size } }));
  },
  clearSizeOverride: (key) => {
    get().pushHistory();
    set((s) => {
      const next = { ...s.sizeOverrides };
      delete next[key];
      return { sizeOverrides: next };
    });
  },

  // ── Image frame overrides (per-photo decorative borders) ──
  setImageFrameOverride: (slotKey, frameData) => {
    get().pushHistory();
    set((s) => ({ imageFrameOverrides: { ...s.imageFrameOverrides, [slotKey]: frameData } }));
  },
  clearImageFrameOverride: (slotKey) => {
    get().pushHistory();
    set((s) => {
      const next = { ...s.imageFrameOverrides };
      delete next[slotKey];
      return { imageFrameOverrides: next };
    });
  },

  // ── Page frame overrides (decorative border around page shell) ──
  setPageFrameOverride: (key, frameData) => {
    get().pushHistory();
    set((s) => ({ pageFrameOverrides: { ...s.pageFrameOverrides, [key]: frameData } }));
  },
  setBookPageFrame: (frameData) => {
    get().pushHistory();
    set({ bookPageFrame: frameData, editorDirty: true });
  },

  // ── Shape overlays (per-spread decorative shapes) ──
  addShapeOverlay: (chapterIdx, spreadIdx, shapeData) => {
    get().pushHistory();
    const key = `${chapterIdx}-${spreadIdx}`;
    set((s) => {
      const existing = s.shapeOverlays[key] || [];
      return { shapeOverlays: { ...s.shapeOverlays, [key]: [...existing, { id: `shape-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, xPct: 40, yPct: 40, widthPct: 15, heightPct: 15, color: '#ffffff', rotation: 0, ...shapeData }] } };
    });
  },
  updateShapeOverlay: (chapterIdx, spreadIdx, shapeId, updates) => {
    get().pushHistory();
    const key = `${chapterIdx}-${spreadIdx}`;
    set((s) => {
      const shapes = (s.shapeOverlays[key] || []).map(sh =>
        sh.id === shapeId ? { ...sh, ...updates } : sh
      );
      return { shapeOverlays: { ...s.shapeOverlays, [key]: shapes } };
    });
  },
  removeShapeOverlay: (chapterIdx, spreadIdx, shapeId) => {
    get().pushHistory();
    const key = `${chapterIdx}-${spreadIdx}`;
    set((s) => {
      const shapes = (s.shapeOverlays[key] || []).filter(sh => sh.id !== shapeId);
      return { shapeOverlays: { ...s.shapeOverlays, [key]: shapes } };
    });
  },

  // ── Template/theme with history (undoable) ──
  setTemplateWithHistory: (slug) => {
    get().pushHistory();
    set({ selectedTemplate: slug, editorDirty: true });
    trackEvent('layout_changed', 'editor');
  },
  setCustomThemeWithHistory: (updates) => {
    get().pushHistory();
    set((s) => ({ customTheme: { ...s.customTheme, ...updates }, editorDirty: true }));
  },

  // ── Add/remove/move photos in editor ──
  addImageToBook: (file) => {
    const previewUrl = URL.createObjectURL(file);
    set((s) => ({
      images: [...s.images, { id: `user-${Date.now()}`, file, previewUrl }],
    }));
    return get().images.length - 1; // return new photo index
  },

  addPhotoToSpread: (chapterIdx, spreadIdx, photoIdx) => {
    get().pushHistory();
    set((s) => {
      const draft = structuredClone(s.editorDraft);
      const spread = draft.chapters?.[chapterIdx]?.spreads?.[spreadIdx];
      if (!spread) return {};
      spread.photo_indices = [...(spread.photo_indices || []), photoIdx];
      // Auto-upgrade layout if needed
      const count = spread.photo_indices.length;
      const maxForLayout = MAX_PHOTOS[spread.layout_type] || 1;
      if (count > maxForLayout) {
        const next = getNextLayoutUp(spread.layout_type);
        if (next) spread.layout_type = next;
      }
      draft.pages = rebuildPages(draft);
      return { editorDraft: draft };
    });
  },

  removePhotoFromSpread: (chapterIdx, spreadIdx, slotIdx) => {
    get().pushHistory();
    set((s) => {
      const draft = structuredClone(s.editorDraft);
      const spread = draft.chapters?.[chapterIdx]?.spreads?.[spreadIdx];
      if (!spread?.photo_indices) return {};
      spread.photo_indices.splice(slotIdx, 1);
      draft.pages = rebuildPages(draft);

      // Shift override keys: delete removed slot, decrement slots above it
      const prefix = `${chapterIdx}-${spreadIdx}-`;
      const remapped = remapOverrideKeys(s, (key) => {
        if (!key.startsWith(prefix)) return key;
        const suffix = key.slice(prefix.length);
        const slotNum = parseInt(suffix);
        if (isNaN(slotNum)) return key; // Text keys like 'heading_text'
        if (slotNum === slotIdx) return null; // Remove overrides for deleted slot
        if (slotNum > slotIdx) return `${prefix}${slotNum - 1}`; // Shift down
        return key;
      });

      return { editorDraft: draft, ...remapped };
    });
  },

  movePhotoBetweenPages: (fromChIdx, fromSpIdx, fromSlot, toChIdx, toSpIdx, toSlot) => {
    get().pushHistory();
    set((s) => {
      const draft = structuredClone(s.editorDraft);
      const fromSpread = draft.chapters?.[fromChIdx]?.spreads?.[fromSpIdx];
      const toSpread = draft.chapters?.[toChIdx]?.spreads?.[toSpIdx];
      if (!fromSpread?.photo_indices || !toSpread) return {};
      const [movedPhoto] = fromSpread.photo_indices.splice(fromSlot, 1);
      if (movedPhoto == null) return {};
      if (!toSpread.photo_indices) toSpread.photo_indices = [];
      const insertAt = toSlot != null ? toSlot : toSpread.photo_indices.length;
      toSpread.photo_indices.splice(insertAt, 0, movedPhoto);
      // Auto-upgrade target layout if needed
      const count = toSpread.photo_indices.length;
      const maxForLayout = MAX_PHOTOS[toSpread.layout_type] || 1;
      if (count > maxForLayout) {
        const next = getNextLayoutUp(toSpread.layout_type);
        if (next) toSpread.layout_type = next;
      }
      draft.pages = rebuildPages(draft);

      // --- Migrate overrides from source slot to destination slot ---
      const srcKey = `${fromChIdx}-${fromSpIdx}-${fromSlot}`;
      const dstKey = `${toChIdx}-${toSpIdx}-${insertAt}`;
      const fromPrefix = `${fromChIdx}-${fromSpIdx}-`;
      const toPrefix = `${toChIdx}-${toSpIdx}-`;

      // Step 1: Extract overrides for source slot
      const extracted = {};
      for (const mapName of OVERRIDE_MAP_NAMES) {
        if (s[mapName]?.[srcKey] != null) {
          extracted[mapName] = structuredClone(s[mapName][srcKey]);
        }
      }

      // Step 2: Remove source slot & shift source slots down
      const remapped = remapOverrideKeys(s, (key) => {
        if (!key.startsWith(fromPrefix)) return key;
        const suffix = key.slice(fromPrefix.length);
        const slotNum = parseInt(suffix);
        if (isNaN(slotNum)) return key;
        if (slotNum === fromSlot) return null;
        if (slotNum > fromSlot) return `${fromPrefix}${slotNum - 1}`;
        return key;
      });

      // Step 3: Shift destination slots up & insert extracted overrides
      const shifted = {};
      for (const mapName of OVERRIDE_MAP_NAMES) {
        const map = { ...(remapped[mapName] || s[mapName] || {}) };
        const newMap = {};
        for (const [key, value] of Object.entries(map)) {
          if (!key.startsWith(toPrefix)) { newMap[key] = value; continue; }
          const suffix = key.slice(toPrefix.length);
          const slotNum = parseInt(suffix);
          if (isNaN(slotNum)) { newMap[key] = value; continue; }
          newMap[slotNum >= insertAt ? `${toPrefix}${slotNum + 1}` : key] = value;
        }
        if (extracted[mapName] !== undefined) newMap[dstKey] = extracted[mapName];
        shifted[mapName] = newMap;
      }

      return { editorDraft: draft, ...shifted };
    });
  },

  getCropStyle: (photoIndex) => {
    const analyses = get().photoAnalyses;
    if (!analyses || !analyses.length) return {};
    const analysis = analyses.find(a => a.photo_index === photoIndex);
    if (!analysis?.safe_crop_box) return {};
    const box = analysis.safe_crop_box;
    if (box.x === 0 && box.y === 0 && box.w >= 0.99 && box.h >= 0.99) return {};
    const centerX = (box.x + box.w / 2) * 100;
    const centerY = (box.y + box.h / 2) * 100;
    return { objectPosition: `${centerX}% ${centerY}%` };
  },

  replacePhotoPreviewUrl: (photoIdx, newUrl) => {
    get().pushHistory();
    set((s) => {
      const images = [...s.images];
      if (images[photoIdx]) {
        if (images[photoIdx].previewUrl) URL.revokeObjectURL(images[photoIdx].previewUrl);
        images[photoIdx] = { ...images[photoIdx], previewUrl: newUrl };
      }
      return { images };
    });
  },

  setEditorClipboard: (item) => set({ editorClipboard: item }),

  setSelectedChapter: (idx) => set({ selectedChapterIndex: idx, selectedSpreadIndex: null }),
  setSelectedSpread: (chapterIdx, spreadIdx) => set({ selectedChapterIndex: chapterIdx, selectedSpreadIndex: spreadIdx }),

  commitEditorDraft: () => {
    const s = get();
    if (!s.editorDraft) return;
    const committed = structuredClone(s.editorDraft);
    committed.pages = rebuildPages(committed);
    set({ bookDraft: committed, editorDirty: false });
  },

  generateAIImageAction: async (prompt, imageLook) => {
    return generateAIImage({ prompt, styleHint: '', imageLook: imageLook || get().imageLook });
  },

  enhanceImageAction: async (photoIndex, imageLook, styleHint = '') => {
    const s = get();
    const img = s.images[photoIndex];
    if (!img) return null;
    // After generation, File objects are stripped to save memory — reconstruct from previewUrl
    let imageFile = img.file;
    if (!imageFile && img.previewUrl) {
      const resp = await fetch(img.previewUrl);
      const blob = await resp.blob();
      imageFile = new File([blob], img.name || `photo-${photoIndex}.jpg`, { type: blob.type });
    }
    if (!imageFile) return null;
    return enhanceImage({
      imageFile,
      styleHint,
      imageLook: imageLook || s.imageLook,
      vibe: s.vibe,
      context: '',
    });
  },

  regenerateTextAction: async (chapterIdx, spreadIdx, field, instruction) => {
    const s = get();
    const SPECIAL_PAGES = { bcf: 'book_cover_front', cov: 'cover', ded: 'dedication', bck: 'back_cover', bcb: 'book_cover_back' };
    let currentText = '';
    const contextParts = [`Book: ${s.editorDraft?.title || ''}`];

    if (SPECIAL_PAGES[chapterIdx]) {
      const pageType = SPECIAL_PAGES[chapterIdx];
      if ((pageType === 'cover' || pageType === 'book_cover_front') && field === 'heading_text') currentText = s.editorDraft?.title || '';
      else if (pageType === 'dedication' && field === 'heading_text') currentText = s.editorDraft?.dedication_heading || '';
      else if (pageType === 'dedication' && field === 'body_text') currentText = s.editorDraft?.dedication || '';
      else if (pageType === 'back_cover' && field === 'heading_text') currentText = s.editorDraft?.closing_heading || '';
      else if (pageType === 'back_cover' && field === 'body_text') currentText = s.editorDraft?.closing_page?.text || '';
      contextParts.push(`Page type: ${pageType}`);
    } else {
      const ch = s.editorDraft?.chapters?.[chapterIdx];
      const spread = ch?.spreads?.[spreadIdx];
      if (!spread) return null;
      currentText = spread[field] || '';
      if (ch.title) contextParts.push(`Chapter: ${ch.title}`);
      if (ch.blurb) contextParts.push(`Chapter blurb: ${ch.blurb}`);
      if (spread.heading_text && field !== 'heading_text') contextParts.push(`Heading: ${spread.heading_text}`);
      if (spread.body_text && field !== 'body_text') contextParts.push(`Body: ${spread.body_text.slice(0, 200)}`);
    }

    set({ isRegenerating: true });
    try {
      const result = await regenerateText({
        chapter_index: typeof chapterIdx === 'number' ? chapterIdx : 0,
        spread_index: typeof spreadIdx === 'number' ? spreadIdx : 0,
        field_name: field,
        current_text: currentText,
        instruction,
        context: contextParts.join('. '),
      });
      set({ isRegenerating: false });
      return result.new_text;
    } catch {
      set({ isRegenerating: false });
      return null;
    }
  },
});
