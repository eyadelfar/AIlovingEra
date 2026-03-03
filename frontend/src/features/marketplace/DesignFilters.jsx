import { Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function DesignFilters({ category, search, freeOnly, onCategoryChange, onSearchChange, onFreeOnlyChange }) {
  const { t } = useTranslation('marketplace');

  const CATEGORIES = [
    { value: '', label: t('categoryAll') },
    { value: 'theme', label: t('categoryThemes') },
    { value: 'cover', label: t('categoryCovers') },
    { value: 'layout_pack', label: t('categoryLayoutPacks') },
  ];
  return (
    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
      {/* Category pills */}
      <div className="flex gap-2 flex-wrap">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => onCategoryChange(cat.value)}
            className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
              category === cat.value
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                : 'bg-gray-800 text-gray-400 border border-gray-700 hover:border-gray-600'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t('searchDesigns')}
          className="w-full pl-9 pr-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500"
        />
      </div>

      {/* Free toggle */}
      <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer whitespace-nowrap">
        <input
          type="checkbox"
          checked={freeOnly}
          onChange={(e) => onFreeOnlyChange(e.target.checked)}
          className="rounded bg-gray-800 border-gray-700 text-rose-500 focus:ring-rose-500/50"
        />
        {t('freeOnly')}
      </label>
    </div>
  );
}
