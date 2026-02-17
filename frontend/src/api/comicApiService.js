const BASE = import.meta.env.VITE_API_BASE_URL ?? '';

/**
 * Single responsibility: knows the backend URL and FormData shape.
 * No state, no UI — pure data fetch.
 *
 * @param {{ images: Array<{file: File}>, textInput: string, panelsPerPage: number, artStyle: string }} params
 * @returns {Promise<import('../types').ComicBook>}
 */
export async function generateComic({ images, textInput, panelsPerPage, artStyle }) {
  const form = new FormData();
  form.append('text', textInput);
  form.append('panels_per_page', String(panelsPerPage));
  form.append('art_style', artStyle);
  images.forEach(img => form.append('images', img.file));

  const res = await fetch(`${BASE}/api/comic/generate`, { method: 'POST', body: form });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

/**
 * POST the ComicBook JSON to the backend, receive a PDF blob, and trigger a browser download.
 *
 * @param {object} comicBook  Full ComicBook JSON object
 * @param {string} filename   Download filename (without .pdf)
 */
export async function downloadComicPdf(comicBook, filename = 'comic') {
  const res = await fetch(`${BASE}/api/comic/pdf`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(comicBook),
  });
  if (!res.ok) throw new Error(await res.text());

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
