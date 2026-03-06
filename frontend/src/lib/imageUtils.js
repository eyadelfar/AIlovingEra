import log from './editorLogger';

/**
 * Returns true if the value is a File or Blob (i.e. uploadable via FormData).
 */
export function isUploadable(val) {
  return val instanceof File || val instanceof Blob;
}

/**
 * Ensure every image object has a real File/Blob in its .file property.
 * After generation, File objects are evicted to free memory (only previewUrl remains).
 * This re-fetches the blob from previewUrl and reconstructs a File object.
 */
export async function ensureFiles(images) {
  log.action('imageUtils', 'ensureFiles', { count: images?.length });
  return Promise.all(images.map(async (img) => {
    if (isUploadable(img.file)) return img;
    if (!img.previewUrl) return img; // nothing we can do
    try {
      const res = await fetch(img.previewUrl);
      if (!res.ok) return img;
      const blob = await res.blob();
      if (!blob.size) return img;
      const file = new File([blob], img.name || 'image.jpg', { type: blob.type || 'image/jpeg' });
      return { ...img, file };
    } catch {
      return img; // keep as-is, upload will skip it
    }
  }));
}

/**
 * Compress an image file for API upload using Canvas API.
 * Resizes to maxWidth and compresses to JPEG at given quality.
 * Returns a compressed Blob (~100-200KB instead of 3-10MB).
 */
export function compressForAPI(file, maxWidth = 1200, quality = 0.7) {
  return new Promise((resolve) => {
    // If file is missing or not a real File/Blob, resolve null
    if (!isUploadable(file)) { resolve(null); return; }
    // If file is already small enough, return as-is
    if (file.size < 200 * 1024) {
      resolve(file);
      return;
    }

    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      let { width, height } = img;
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file); // fallback to original
            return;
          }
          // Preserve original filename with .jpg extension
          const name = file.name.replace(/\.[^.]+$/, '.jpg');
          resolve(new File([blob], name, { type: 'image/jpeg' }));
        },
        'image/jpeg',
        quality,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file); // fallback to original on error
    };

    img.src = url;
  });
}

/**
 * Compress multiple image objects (with .file property) for API upload.
 * Returns new image objects with compressed .file while preserving other properties.
 * Automatically re-hydrates File objects from previewUrl if they were evicted.
 */
export async function compressImagesForAPI(images, maxWidth = 1200, quality = 0.7) {
  // Re-hydrate any missing File objects first
  const hydrated = await ensureFiles(images);
  return Promise.all(
    hydrated.map(async (img) => {
      const compressed = await compressForAPI(img.file, maxWidth, quality);
      return { ...img, file: compressed };
    }),
  );
}

/**
 * Compress images for PDF export — higher quality than API compression.
 * 2400px at 0.92 quality = ~300 DPI for A4 page with photo taking ~60% width.
 * Runs in browser (client CPU), reports progress via onProgress callback.
 */
export async function compressImagesForPDF(images, { maxWidth = 2400, quality = 0.92, onProgress } = {}) {
  log.action('imageUtils', 'compressForPDF', { count: images?.length, maxWidth, quality });
  // Re-hydrate any missing File objects first
  const hydrated = await ensureFiles(images);
  const results = [];
  for (let i = 0; i < hydrated.length; i++) {
    onProgress?.({ stage: 'compressing', current: i + 1, total: hydrated.length });
    const compressed = await compressForAPI(hydrated[i].file, maxWidth, quality);
    results.push({ ...hydrated[i], file: compressed });
  }
  return results;
}
