/**
 * Shared photo utility functions.
 * Pure functions — no React dependency.
 */

/**
 * Compute CSS object-position from AI safe_crop_box analysis.
 * Returns undefined when no adjustment needed, allowing default center-center.
 */
export function getObjectPosition(photoIndex, photoAnalyses) {
  if (!photoAnalyses?.length) return undefined;
  const a = photoAnalyses.find(p => p.photo_index === photoIndex);

  if (!a) return undefined;

  if (!a.safe_crop_box) {
    // No crop box but people detected — bias toward faces (typically upper portion)
    if (a.people_count > 0) return 'center 25%';
    return undefined;
  }

  const box = a.safe_crop_box;
  const isFullFrame = box.x === 0 && box.y === 0 && box.w >= 0.99 && box.h >= 0.99;

  if (isFullFrame) {
    // Full-frame box with people — slight upward bias for faces
    if (a.people_count > 0) return 'center 30%';
    return undefined;
  }

  const cx = (box.x + box.w / 2) * 100;
  const cy = (box.y + box.h / 2) * 100;
  return `${cx}% ${cy}%`;
}
