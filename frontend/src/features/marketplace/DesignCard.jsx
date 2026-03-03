import { useTranslation } from 'react-i18next';

export default function DesignCard({ design, onPreview }) {
  const { t } = useTranslation('marketplace');
  const isFree = design.is_free;

  return (
    <button
      onClick={() => onPreview(design)}
      className="group text-left bg-gray-900 border border-gray-800 rounded-xl overflow-hidden hover:border-gray-700 hover:scale-[1.02] transition-all"
    >
      <div className="relative aspect-[4/3] bg-gray-800 overflow-hidden">
        <img
          src={design.thumbnail_url}
          alt={design.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
        <div className="absolute top-2 right-2">
          {isFree ? (
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              {t('free')}
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-400 border border-rose-500/30">
              ${(design.price_cents / 100).toFixed(2)}
            </span>
          )}
        </div>
        {design.is_featured && (
          <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30">
            {t('featured')}
          </div>
        )}
      </div>

      <div className="p-3">
        <h3 className="text-sm font-medium text-white truncate">{design.name}</h3>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-gray-500 capitalize">{design.category.replace('_', ' ')}</span>
          {design.subcategory && (
            <span className="text-xs text-gray-600">/ {design.subcategory}</span>
          )}
        </div>
      </div>
    </button>
  );
}
