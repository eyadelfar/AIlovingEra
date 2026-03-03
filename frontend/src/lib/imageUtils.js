/**
 * Compress an image file for API upload using Canvas API.
 * Resizes to maxWidth and compresses to JPEG at given quality.
 * Returns a compressed Blob (~100-200KB instead of 3-10MB).
 */
export function compressForAPI(file, maxWidth = 1200, quality = 0.7) {
  return new Promise((resolve, reject) => {
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
 */
export async function compressImagesForAPI(images, maxWidth = 1200, quality = 0.7) {
  return Promise.all(
    images.map(async (img) => {
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
  const results = [];
  for (let i = 0; i < images.length; i++) {
    onProgress?.({ stage: 'compressing', current: i + 1, total: images.length });
    const compressed = await compressForAPI(images[i].file, maxWidth, quality);
    results.push({ ...images[i], file: compressed });
  }
  return results;
}
