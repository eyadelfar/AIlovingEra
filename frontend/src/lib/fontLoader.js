const loadedFonts = new Set();

const CURATED_FONTS = [
  'Playfair Display',
  'Lora',
  'Dancing Script',
  'Montserrat',
  'Raleway',
  'Merriweather',
  'Great Vibes',
  'Cormorant Garamond',
  'Open Sans',
  'Pacifico',
];

/**
 * Load a Google Font dynamically by injecting a <link> tag.
 * Returns a promise that resolves when the font is ready.
 */
export function loadGoogleFont(fontFamily) {
  if (loadedFonts.has(fontFamily)) return Promise.resolve();

  const id = `gfont-${fontFamily.replace(/\s+/g, '-')}`;
  if (document.getElementById(id)) {
    loadedFonts.add(fontFamily);
    return Promise.resolve();
  }

  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontFamily)}:wght@400;700&display=swap`;
  document.head.appendChild(link);

  return new Promise((resolve) => {
    link.onload = () => {
      loadedFonts.add(fontFamily);
      document.fonts.ready.then(() => resolve());
    };
    link.onerror = () => resolve(); // Don't block on failure
  });
}

export { CURATED_FONTS };
