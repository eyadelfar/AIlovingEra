import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Crown, CreditCard, BookOpen } from 'lucide-react';
import toast from 'react-hot-toast';
import { fetchUsage } from '../../api/usageApi';

const STATUS_COLORS = {
  completed: 'bg-green-500/10 text-green-400 border-green-500/20',
  started: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  failed: 'bg-red-500/10 text-red-400 border-red-500/20',
  cancelled: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
};

export default function UsagePage() {
  const { t } = useTranslation('profile');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsage();
  }, []);

  async function loadUsage() {
    try {
      const result = await fetchUsage();
      setData(result);
    } catch {
      toast.error(t('common:operationFailed'));
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const profile = data?.profile;
  const generations = data?.generation_history || [];
  const credits = data?.credit_history || [];
  const isPro = profile?.plan === 'monthly_pro' || profile?.plan === 'annual_pro';

  const planLabel = {
    free: t('planFree'),
    credits: t('planCredits'),
    monthly_pro: t('planMonthlyPro'),
    annual_pro: t('planAnnualPro'),
  }[profile?.plan] || profile?.plan;

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-6">{t('usageTitle')}</h1>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 text-center">
            <Crown className={`w-6 h-6 mx-auto mb-2 ${isPro ? 'text-amber-400' : 'text-gray-500'}`} />
            <p className="text-xs text-gray-400 mb-1">{t('plan')}</p>
            <p className="text-lg font-semibold text-white">{planLabel}</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 text-center">
            <CreditCard className="w-6 h-6 mx-auto mb-2 text-violet-400" />
            <p className="text-xs text-gray-400 mb-1">{t('credits')}</p>
            <p className="text-lg font-semibold text-white">{isPro ? t('unlimited') : profile?.credits}</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 text-center">
            <BookOpen className="w-6 h-6 mx-auto mb-2 text-rose-400" />
            <p className="text-xs text-gray-400 mb-1">{t('booksCreated')}</p>
            <p className="text-lg font-semibold text-white">{profile?.books_created}</p>
          </div>
        </div>

        {/* Generation History */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">{t('generationHistory')}</h2>
          {generations.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8">{t('noGenerations')}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-400 border-b border-gray-800">
                    <th className="text-start pb-3 font-medium">{t('date')}</th>
                    <th className="text-start pb-3 font-medium">{t('template')}</th>
                    <th className="text-center pb-3 font-medium">{t('pages')}</th>
                    <th className="text-center pb-3 font-medium">{t('photos')}</th>
                    <th className="text-center pb-3 font-medium">{t('duration')}</th>
                    <th className="text-center pb-3 font-medium">{t('status')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/50">
                  {generations.map((g) => (
                    <tr key={g.id} className="text-gray-300">
                      <td className="py-3">{new Date(g.created_at).toLocaleDateString()}</td>
                      <td className="py-3 capitalize">{g.template_slug || '—'}</td>
                      <td className="py-3 text-center">{g.num_pages || '—'}</td>
                      <td className="py-3 text-center">{g.num_photos || '—'}</td>
                      <td className="py-3 text-center">
                        {g.duration_ms ? `${(g.duration_ms / 1000).toFixed(1)}s` : '—'}
                      </td>
                      <td className="py-3 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs border ${STATUS_COLORS[g.status] || STATUS_COLORS.cancelled}`}>
                          {t(g.status) || g.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Credit Ledger */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">{t('creditHistory')}</h2>
          {credits.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8">{t('noCredits')}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-400 border-b border-gray-800">
                    <th className="text-start pb-3 font-medium">{t('date')}</th>
                    <th className="text-center pb-3 font-medium">{t('amount')}</th>
                    <th className="text-start pb-3 font-medium">{t('reason')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/50">
                  {credits.map((c) => (
                    <tr key={c.id} className="text-gray-300">
                      <td className="py-3">{new Date(c.created_at).toLocaleDateString()}</td>
                      <td className={`py-3 text-center font-medium ${c.delta > 0 ? 'text-green-400' : c.delta < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                        {c.delta > 0 ? '+' : ''}{c.delta}
                      </td>
                      <td className="py-3 capitalize">{c.reason?.replace(/_/g, ' ') || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
