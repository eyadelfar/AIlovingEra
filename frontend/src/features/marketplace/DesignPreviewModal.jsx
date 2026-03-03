import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { X, Check, ShoppingBag } from 'lucide-react';
import { apiJson } from '../../lib/api';
import useAuthStore from '../../stores/authStore';

export default function DesignPreviewModal({ design, onClose }) {
  const { t } = useTranslation('marketplace');
  const [loading, setLoading] = useState(false);
  const [purchased, setPurchased] = useState(false);
  const [error, setError] = useState('');
  const user = useAuthStore((s) => s.user);
  const refreshCredits = useAuthStore((s) => s.refreshCredits);
  const navigate = useNavigate();

  if (!design) return null;

  const handlePurchase = async () => {
    if (!user) {
      navigate(`/signup?redirect=/marketplace`);
      onClose();
      return;
    }

    setLoading(true);
    setError('');
    try {
      await apiJson(`/api/marketplace/designs/${design.slug}/purchase`, {
        method: 'POST',
      });
      setPurchased(true);
      await refreshCredits();
    } catch (err) {
      setError(err.message || t('purchaseFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    // Navigate to create page with the design's config applied
    navigate('/create', { state: { marketplaceDesign: design } });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-gray-900 border border-gray-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-lg font-semibold text-white">{design.name}</h2>
          <button onClick={onClose} className="p-1 hover:bg-white/5 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Preview image */}
        <div className="px-6 pt-4">
          <img
            src={design.preview_image_url}
            alt={design.name}
            className="w-full rounded-xl border border-gray-800"
          />
        </div>

        {/* Details */}
        <div className="p-6">
          {design.description && (
            <p className="text-gray-300 text-sm mb-4">{design.description}</p>
          )}

          <div className="flex flex-wrap gap-2 mb-4">
            <span className="px-2.5 py-1 rounded-full text-xs bg-gray-800 text-gray-400 border border-gray-700 capitalize">
              {design.category.replace('_', ' ')}
            </span>
            {design.subcategory && (
              <span className="px-2.5 py-1 rounded-full text-xs bg-gray-800 text-gray-400 border border-gray-700">
                {design.subcategory}
              </span>
            )}
            {(design.tags || []).map((tag) => (
              <span key={tag} className="px-2.5 py-1 rounded-full text-xs bg-gray-800 text-gray-400 border border-gray-700">
                {tag}
              </span>
            ))}
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* CTA */}
          <div className="flex gap-3">
            {purchased || design.is_free ? (
              <button
                onClick={handleApply}
                className="flex-1 py-2.5 rounded-lg bg-gradient-to-r from-rose-500 to-violet-600 text-white font-medium hover:from-rose-600 hover:to-violet-700 transition-all flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                {t('applyToBook')}
              </button>
            ) : (
              <button
                onClick={handlePurchase}
                disabled={loading}
                className="flex-1 py-2.5 rounded-lg bg-gradient-to-r from-rose-500 to-violet-600 text-white font-medium hover:from-rose-600 hover:to-violet-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <ShoppingBag className="w-4 h-4" />
                {loading ? t('purchasing') : t('purchaseWithPrice', { price: (design.price_cents / 100).toFixed(2) })}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
