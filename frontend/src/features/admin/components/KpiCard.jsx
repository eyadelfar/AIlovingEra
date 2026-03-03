const COLOR_VARIANTS = {
  blue: 'from-blue-600/20 to-blue-400/5 border-blue-500/20',
  green: 'from-emerald-600/20 to-emerald-400/5 border-emerald-500/20',
  purple: 'from-violet-600/20 to-violet-400/5 border-violet-500/20',
  amber: 'from-amber-600/20 to-amber-400/5 border-amber-500/20',
  rose: 'from-rose-600/20 to-rose-400/5 border-rose-500/20',
  cyan: 'from-cyan-600/20 to-cyan-400/5 border-cyan-500/20',
};

const ICON_COLORS = {
  blue: 'text-blue-400',
  green: 'text-emerald-400',
  purple: 'text-violet-400',
  amber: 'text-amber-400',
  rose: 'text-rose-400',
  cyan: 'text-cyan-400',
};

export default function KpiCard({ label, value, icon: Icon, color = 'blue', loading = false }) {
  return (
    <div className={`rounded-xl border bg-gradient-to-br p-4 ${COLOR_VARIANTS[color]}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">{label}</p>
          {loading ? (
            <div className="h-8 w-20 bg-gray-700/50 animate-pulse rounded" />
          ) : (
            <p className="text-2xl font-bold text-white">{value ?? '—'}</p>
          )}
        </div>
        {Icon && <Icon className={`w-8 h-8 ${ICON_COLORS[color]} opacity-60`} />}
      </div>
    </div>
  );
}
