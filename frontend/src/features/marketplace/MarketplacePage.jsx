import { useState, useEffect, useCallback } from 'react';
import { Store } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { apiJson } from '../../lib/api';
import DesignFilters from './DesignFilters';
import DesignCard from './DesignCard';
import DesignPreviewModal from './DesignPreviewModal';

export default function MarketplacePage() {
  const { t } = useTranslation('marketplace');
  const [designs, setDesigns] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [freeOnly, setFreeOnly] = useState(false);
  const [previewDesign, setPreviewDesign] = useState(null);

  const fetchDesigns = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), page_size: '20' });
      if (category) params.set('category', category);
      if (search) params.set('search', search);
      if (freeOnly) params.set('free_only', 'true');

      const data = await apiJson(`/api/marketplace/designs?${params}`);
      setDesigns(data.designs || []);
      setTotal(data.total || 0);
    } catch (err) {
      toast.error(err?.message || t('loadError', { defaultValue: 'Failed to load designs.' }));
    } finally {
      setLoading(false);
    }
  }, [page, category, search, freeOnly]);

  useEffect(() => {
    fetchDesigns();
  }, [fetchDesigns]);

  // Debounce search
  const [searchInput, setSearchInput] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const handleCategoryChange = (val) => {
    setCategory(val);
    setPage(1);
  };

  const handleFreeOnlyChange = (val) => {
    setFreeOnly(val);
    setPage(1);
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="min-h-screen bg-gray-950 pt-24 pb-16 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Hero */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Store className="w-6 h-6 text-rose-400" />
            <h1 className="text-3xl sm:text-4xl font-bold">
              <span className="bg-gradient-to-r from-rose-400 to-violet-400 bg-clip-text text-transparent">
                {t('designMarketplace')}
              </span>
            </h1>
          </div>
          <p className="text-gray-400 max-w-lg mx-auto">
            {t('marketplaceSubtitle')}
          </p>
        </div>

        {/* Filters */}
        <div className="mb-8">
          <DesignFilters
            category={category}
            search={searchInput}
            freeOnly={freeOnly}
            onCategoryChange={handleCategoryChange}
            onSearchChange={setSearchInput}
            onFreeOnlyChange={handleFreeOnlyChange}
          />
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden animate-pulse">
                <div className="aspect-[4/3] bg-gray-800" />
                <div className="p-3 space-y-2">
                  <div className="h-4 w-2/3 bg-gray-800 rounded" />
                  <div className="h-3 w-1/3 bg-gray-800 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : designs.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-500">{t('noDesignsFound')}</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {designs.map((design) => (
                <DesignCard
                  key={design.id}
                  design={design}
                  onPreview={setPreviewDesign}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-8">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 rounded-lg bg-gray-800 border border-gray-700 text-sm text-gray-400 disabled:opacity-50"
                >
                  {t('previous')}
                </button>
                <span className="px-3 py-1.5 text-sm text-gray-400">
                  {t('pageOf', { current: page, total: totalPages })}
                </span>
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 rounded-lg bg-gray-800 border border-gray-700 text-sm text-gray-400 disabled:opacity-50"
                >
                  {t('next')}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Preview Modal */}
      {previewDesign && (
        <DesignPreviewModal
          design={previewDesign}
          onClose={() => setPreviewDesign(null)}
        />
      )}
    </div>
  );
}
