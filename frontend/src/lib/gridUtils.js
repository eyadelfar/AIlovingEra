/**
 * Compute grid dimensions for displaying pages in an X*Y grid.
 * Returns { cols, rows } where last row may have fewer items.
 */
export function computeGridDimensions(pageCount) {
  if (pageCount <= 0) return { cols: 0, rows: 0 };
  if (pageCount <= 3) return { cols: pageCount, rows: 1 };
  if (pageCount <= 6) return { cols: 3, rows: Math.ceil(pageCount / 3) };
  if (pageCount <= 12) return { cols: 4, rows: Math.ceil(pageCount / 4) };
  if (pageCount <= 20) return { cols: 5, rows: Math.ceil(pageCount / 5) };
  return { cols: 6, rows: Math.ceil(pageCount / 6) };
}

/**
 * Build mapping from flat page index → { chapterIdx, spreadIdx, side }.
 * Mirrors commitEditorDraft logic in editorSlice.js:
 *   page 0 = cover, page 1 = dedication, then content spreads, last = back_cover.
 * Mixed layouts (PHOTO_PLUS_QUOTE, COLLAGE_PLUS_LETTER) produce two flat pages.
 */
const MIXED_LAYOUTS = new Set(['PHOTO_PLUS_QUOTE', 'COLLAGE_PLUS_LETTER']);

export function buildPageToSpreadMap(chapters) {
  if (!chapters?.length) return [];
  const map = [];

  // page 0 = cover (synthetic)
  map.push(null);
  // page 1 = dedication (synthetic)
  map.push(null);

  for (let ci = 0; ci < chapters.length; ci++) {
    const spreads = chapters[ci].spreads || [];
    for (let si = 0; si < spreads.length; si++) {
      if (MIXED_LAYOUTS.has(spreads[si].layout_type)) {
        map.push({ chapterIdx: ci, spreadIdx: si, side: 'left' });
        map.push({ chapterIdx: ci, spreadIdx: si, side: 'right' });
      } else {
        map.push({ chapterIdx: ci, spreadIdx: si, side: null });
      }
    }
  }

  // last page = back_cover (synthetic)
  map.push(null);
  return map;
}

/**
 * Create a unique drag ID encoding element location.
 * Format: "photo:chapterIdx:spreadIdx:slotIdx" or "text:chapterIdx:spreadIdx:fieldName"
 */
export function makeDragId(type, chapterIdx, spreadIdx, slot) {
  return `${type}:${chapterIdx}:${spreadIdx}:${slot}`;
}

/**
 * Parse a drag ID back to structured data.
 */
export function parseDragId(id) {
  const parts = id.split(':');
  return {
    type: parts[0],
    chapterIdx: parseInt(parts[1], 10),
    spreadIdx: parseInt(parts[2], 10),
    slot: parts[3],
  };
}
