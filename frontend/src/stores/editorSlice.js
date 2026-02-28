import { generateAIImage, enhanceImage, regenerateText } from '../api/bookApi';

const MAX_HISTORY = 50;
const MIXED_LAYOUTS = new Set(['PHOTO_PLUS_QUOTE', 'COLLAGE_PLUS_LETTER']);

/** Rebuild flat pages array from chapters (lightweight sync, no bookDraft update). */
function rebuildPages(draft) {
  if (!draft) return [];
  const pages = [];
  let pageNum = 1;

  pages.push({
    page_number: pageNum++, page_type: 'cover', layout_type: 'HERO_FULLBLEED',
    photo_indices: draft.chapters?.[0]?.spreads?.[0]?.photo_indices?.slice(0, 1) || [],
    heading_text: draft.title, body_text: '', caption_text: '', quote_text: '',
  });
  pages.push({
    page_number: pageNum++, page_type: 'dedication', layout_type: 'DEDICATION',
    photo_indices: [], heading_text: 'For Us', body_text: draft.dedication || '',
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
    page_number: pageNum, page_type: 'back_cover', layout_type: 'QUOTE_PAGE',
    photo_indices: [], heading_text: 'The End',
    body_text: draft.closing_page?.text || "Here's to many more memories together.",
    caption_text: '', quote_text: '',
  });
  return pages;
}

export const createEditorSlice = (set, get) => ({
  // Editor state
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

  // Editor actions
  initEditor: () => {
    const s = get();
    if (!s.bookDraft) return;
    const draft = JSON.parse(JSON.stringify(s.bookDraft));
    draft.pages = rebuildPages(draft);
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
    const snapshot = JSON.parse(JSON.stringify(s.editorDraft));
    set((s) => ({
      editorHistory: [...s.editorHistory.slice(-MAX_HISTORY + 1), snapshot],
      editorFuture: [],
      editorDirty: true,
    }));
  },

  undo: () => {
    const s = get();
    if (s.editorHistory.length === 0) return;
    const prev = s.editorHistory[s.editorHistory.length - 1];
    prev.pages = rebuildPages(prev);
    set({
      editorFuture: [JSON.parse(JSON.stringify(s.editorDraft)), ...s.editorFuture],
      editorDraft: prev,
      editorHistory: s.editorHistory.slice(0, -1),
    });
  },

  redo: () => {
    const s = get();
    if (s.editorFuture.length === 0) return;
    const next = s.editorFuture[0];
    next.pages = rebuildPages(next);
    set({
      editorHistory: [...s.editorHistory, JSON.parse(JSON.stringify(s.editorDraft))],
      editorDraft: next,
      editorFuture: s.editorFuture.slice(1),
    });
  },

  updateSpreadField: (chapterIdx, spreadIdx, field, value) => {
    get().pushHistory();
    set((s) => {
      const draft = JSON.parse(JSON.stringify(s.editorDraft));
      const ch = draft.chapters?.[chapterIdx];
      if (ch?.spreads?.[spreadIdx]) {
        ch.spreads[spreadIdx][field] = value;
      }
      draft.pages = rebuildPages(draft);
      return { editorDraft: draft };
    });
  },

  updateChapterField: (chapterIdx, field, value) => {
    get().pushHistory();
    set((s) => {
      const draft = JSON.parse(JSON.stringify(s.editorDraft));
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
      const draft = JSON.parse(JSON.stringify(s.editorDraft));
      draft[field] = value;
      draft.pages = rebuildPages(draft);
      return { editorDraft: draft };
    });
  },

  reorderSpread: (chapterIdx, fromIdx, toIdx) => {
    get().pushHistory();
    set((s) => {
      const draft = JSON.parse(JSON.stringify(s.editorDraft));
      const ch = draft.chapters?.[chapterIdx];
      if (!ch?.spreads) return {};
      const [moved] = ch.spreads.splice(fromIdx, 1);
      ch.spreads.splice(toIdx, 0, moved);
      ch.spreads.forEach((sp, i) => { sp.spread_index = i; });
      draft.pages = rebuildPages(draft);
      return { editorDraft: draft };
    });
  },

  reorderChapter: (fromIdx, toIdx) => {
    get().pushHistory();
    set((s) => {
      const draft = JSON.parse(JSON.stringify(s.editorDraft));
      if (!draft.chapters) return {};
      const [moved] = draft.chapters.splice(fromIdx, 1);
      draft.chapters.splice(toIdx, 0, moved);
      draft.chapters.forEach((ch, i) => { ch.chapter_index = i; });
      draft.pages = rebuildPages(draft);
      return { editorDraft: draft };
    });
  },

  swapPhoto: (chapterIdx, spreadIdx, slotIdx, newImageId) => {
    get().pushHistory();
    set((s) => {
      const draft = JSON.parse(JSON.stringify(s.editorDraft));
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
      const draft = JSON.parse(JSON.stringify(s.editorDraft));
      const ch = draft.chapters?.[chapterIdx];
      if (ch?.spreads) {
        ch.spreads.splice(spreadIdx, 1);
        ch.spreads.forEach((sp, i) => { sp.spread_index = i; });
      }
      draft.pages = rebuildPages(draft);
      return { editorDraft: draft };
    });
  },

  addBlankSpread: (chapterIdx, position) => {
    get().pushHistory();
    set((s) => {
      const draft = JSON.parse(JSON.stringify(s.editorDraft));
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
      return { editorDraft: draft };
    });
  },

  duplicateSpread: (chapterIdx, spreadIdx) => {
    get().pushHistory();
    set((s) => {
      const draft = JSON.parse(JSON.stringify(s.editorDraft));
      const ch = draft.chapters?.[chapterIdx];
      if (!ch?.spreads?.[spreadIdx]) return {};
      const clone = JSON.parse(JSON.stringify(ch.spreads[spreadIdx]));
      ch.spreads.splice(spreadIdx + 1, 0, clone);
      ch.spreads.forEach((sp, i) => { sp.spread_index = i; });
      draft.pages = rebuildPages(draft);
      return { editorDraft: draft };
    });
  },

  swapPhotoBetweenSpreads: (fromChIdx, fromSpIdx, fromSlotIdx, toChIdx, toSpIdx, toSlotIdx) => {
    get().pushHistory();
    set((s) => {
      const draft = JSON.parse(JSON.stringify(s.editorDraft));
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
      const draft = JSON.parse(JSON.stringify(s.editorDraft));
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

  // Crop & filter override actions
  setCropOverride: (key, cropData) => {
    get().pushHistory();
    set((s) => ({ cropOverrides: { ...s.cropOverrides, [key]: cropData } }));
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

  setSelectedChapter: (idx) => set({ selectedChapterIndex: idx, selectedSpreadIndex: null }),
  setSelectedSpread: (chapterIdx, spreadIdx) => set({ selectedChapterIndex: chapterIdx, selectedSpreadIndex: spreadIdx }),

  commitEditorDraft: () => {
    const s = get();
    if (!s.editorDraft) return;
    const committed = JSON.parse(JSON.stringify(s.editorDraft));
    committed.pages = rebuildPages(committed);
    set({ bookDraft: committed, editorDirty: false });
  },

  // AI editor features
  generateAIImageAction: async (prompt, imageLook) => {
    return generateAIImage({ prompt, styleHint: '', imageLook: imageLook || get().imageLook });
  },

  enhanceImageAction: async (photoIndex, imageLook, styleHint = '') => {
    const s = get();
    const img = s.images[photoIndex];
    if (!img?.file) return null;
    return enhanceImage({
      imageFile: img.file,
      styleHint,
      imageLook: imageLook || s.imageLook,
      vibe: s.vibe,
      context: '',
    });
  },

  regenerateTextAction: async (chapterIdx, spreadIdx, field, instruction) => {
    const s = get();
    const ch = s.editorDraft?.chapters?.[chapterIdx];
    const spread = ch?.spreads?.[spreadIdx];
    if (!spread) return null;

    set({ isRegenerating: true });
    try {
      const contextParts = [`Book: ${s.editorDraft.title}`];
      if (ch.title) contextParts.push(`Chapter: ${ch.title}`);
      if (ch.blurb) contextParts.push(`Chapter blurb: ${ch.blurb}`);
      if (spread.heading_text && field !== 'heading_text') contextParts.push(`Heading: ${spread.heading_text}`);
      if (spread.body_text && field !== 'body_text') contextParts.push(`Body: ${spread.body_text.slice(0, 200)}`);

      const result = await regenerateText({
        chapter_index: chapterIdx,
        spread_index: spreadIdx,
        field_name: field,
        current_text: spread[field] || '',
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
