const ART_STYLES = [
  { value: 'superhero', label: 'Superhero' },
  { value: 'manga',     label: 'Manga' },
  { value: 'noir',      label: 'Noir' },
  { value: 'watercolor',label: 'Watercolor' },
  { value: 'indie',     label: 'Indie / Alt' },
];

/**
 * Single responsibility: renders comic settings selects (panels per page + art style).
 */
export default function ComicSettings({ panelsPerPage, artStyle, setPanelsPerPage, setArtStyle }) {
  const selectClass =
    'w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-colors';

  return (
    <div>
      <h2 className="text-lg font-semibold text-white mb-4">Comic Settings</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">Panels per Page</label>
          <select
            value={panelsPerPage}
            onChange={e => setPanelsPerPage(Number(e.target.value))}
            className={selectClass}
          >
            {[2, 3, 4, 6, 8].map(n => (
              <option key={n} value={n}>{n} panels</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">Art Style</label>
          <select
            value={artStyle}
            onChange={e => setArtStyle(e.target.value)}
            className={selectClass}
          >
            {ART_STYLES.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
