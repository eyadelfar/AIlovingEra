import useBookStore from '../../stores/bookStore';

const FONT_SIZES = [
  { value: 'small', label: 'S', className: 'text-xs' },
  { value: 'medium', label: 'M', className: 'text-sm' },
  { value: 'large', label: 'L', className: 'text-base' },
];

const ALIGNMENTS = [
  { value: 'left', icon: '&#x2261;' },
  { value: 'center', icon: '&#x2261;' },
  { value: 'right', icon: '&#x2261;' },
];

const PALETTE_COLORS = [
  '#ffffff', '#f1f5f9', '#fbbf24', '#fb7185', '#a78bfa', '#34d399',
];

export default function TextStyleToolbar({ overrideKey, style, templateSlug }) {
  const setTextStyleOverride = useBookStore(s => s.setTextStyleOverride);

  function updateStyle(updates) {
    setTextStyleOverride(overrideKey, { ...style, ...updates });
  }

  return (
    <div className="absolute -top-10 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 bg-gray-900 border border-gray-700 rounded-lg px-2 py-1 shadow-xl">
      {FONT_SIZES.map(fs => (
        <button
          key={fs.value}
          onClick={() => updateStyle({ fontSize: fs.value })}
          className={`w-6 h-6 rounded text-[10px] font-bold flex items-center justify-center transition-all ${
            style?.fontSize === fs.value
              ? 'bg-violet-500/30 text-violet-300'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          {fs.label}
        </button>
      ))}

      <div className="w-px h-4 bg-gray-700 mx-0.5" />

      {ALIGNMENTS.map(a => (
        <button
          key={a.value}
          onClick={() => updateStyle({ align: a.value })}
          className={`w-6 h-6 rounded text-[10px] flex items-center justify-center transition-all ${
            style?.align === a.value
              ? 'bg-violet-500/30 text-violet-300'
              : 'text-gray-400 hover:text-gray-200'
          }`}
          style={{ textAlign: a.value }}
          title={a.value}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 16 16" fill="currentColor">
            <rect y="2" width={a.value === 'center' ? 16 : a.value === 'right' ? 16 : 12} height="1.5" rx="0.5" x={a.value === 'right' ? 4 : a.value === 'center' ? 2 : 0} />
            <rect y="6" width={a.value === 'center' ? 12 : 16} height="1.5" rx="0.5" x={a.value === 'center' ? 2 : 0} />
            <rect y="10" width={a.value === 'center' ? 16 : a.value === 'right' ? 16 : 10} height="1.5" rx="0.5" x={a.value === 'right' ? 6 : a.value === 'center' ? 0 : 0} />
          </svg>
        </button>
      ))}

      <div className="w-px h-4 bg-gray-700 mx-0.5" />

      {PALETTE_COLORS.map(color => (
        <button
          key={color}
          onClick={() => updateStyle({ color })}
          className={`w-4 h-4 rounded-full border transition-all ${
            style?.color === color ? 'border-violet-400 scale-110' : 'border-gray-600 hover:border-gray-400'
          }`}
          style={{ backgroundColor: color }}
        />
      ))}
    </div>
  );
}
