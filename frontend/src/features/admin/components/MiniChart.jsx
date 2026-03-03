export default function MiniChart({ data = [], dataKey = 'value', height = 120, color = '#8b5cf6', label = '' }) {
  if (!data.length) return null;

  const values = data.map((d) => d[dataKey] ?? 0);
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;

  const w = 100;
  const h = height;
  const padding = 4;
  const chartW = w - padding * 2;
  const chartH = h - padding * 2 - 16; // leave room for label

  const points = values.map((v, i) => {
    const x = padding + (i / Math.max(values.length - 1, 1)) * chartW;
    const y = padding + 16 + chartH - ((v - min) / range) * chartH;
    return `${x},${y}`;
  });

  const line = points.join(' ');
  const area = `${padding},${padding + 16 + chartH} ${line} ${padding + chartW},${padding + 16 + chartH}`;

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-3">
      {label && <p className="text-xs text-gray-400 mb-1">{label}</p>}
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height }} preserveAspectRatio="none">
        <defs>
          <linearGradient id={`grad-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={area} fill={`url(#grad-${dataKey})`} />
        <polyline points={line} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
