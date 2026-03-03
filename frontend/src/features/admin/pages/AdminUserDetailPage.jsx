import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import useAdminStore from '../../../stores/adminStore';

export default function AdminUserDetailPage() {
  const { t } = useTranslation('admin');
  const { id } = useParams();
  const navigate = useNavigate();
  const { userDetail, fetchUserDetail } = useAdminStore();

  useEffect(() => { fetchUserDetail(id); }, [id]);

  if (!userDetail) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const { profile, purchases, generations, credit_history } = userDetail;

  return (
    <div className="space-y-6">
      <button onClick={() => navigate('/admin/users')} className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors">
        <ArrowLeft className="w-4 h-4" /> {t('users.backToList')}
      </button>

      {/* Profile Card */}
      <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-rose-500 to-violet-600 flex items-center justify-center text-white text-xl font-bold shrink-0">
            {(profile.display_name || '?').charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-white">{profile.display_name || '—'}</h3>
            <p className="text-sm text-gray-500 truncate">{profile.id}</p>
            <div className="flex flex-wrap gap-2 mt-2">
              <span className="text-xs px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-400">{profile.plan || 'free'}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-700 text-gray-300">{profile.role || 'user'}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400">{profile.credits} {t('users.credits')}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400">{profile.books_created} {t('users.books')}</span>
              {profile.banned_at && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/15 text-red-400">{t('users.bannedBadge')}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Purchases */}
      <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
        <h3 className="text-sm font-medium text-gray-300 mb-3">{t('userDetail.purchases')} ({purchases.length})</h3>
        {purchases.length === 0 ? (
          <p className="text-sm text-gray-500">{t('noData')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-start px-3 py-2 text-xs text-gray-500">{t('revenue.planId')}</th>
                  <th className="text-start px-3 py-2 text-xs text-gray-500">{t('revenue.amount')}</th>
                  <th className="text-start px-3 py-2 text-xs text-gray-500">{t('revenue.status')}</th>
                  <th className="text-start px-3 py-2 text-xs text-gray-500">{t('revenue.date')}</th>
                </tr>
              </thead>
              <tbody>
                {purchases.map((p) => (
                  <tr key={p.id} className="border-b border-gray-800/50">
                    <td className="px-3 py-2 text-gray-300">{p.plan_id}</td>
                    <td className="px-3 py-2 text-gray-300">${(p.amount_cents / 100).toFixed(2)}</td>
                    <td className="px-3 py-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        p.status === 'completed' ? 'bg-emerald-500/15 text-emerald-400' :
                        p.status === 'refunded' ? 'bg-red-500/15 text-red-400' :
                        'bg-gray-700 text-gray-300'
                      }`}>{p.status}</span>
                    </td>
                    <td className="px-3 py-2 text-gray-500">{new Date(p.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Generations */}
      <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
        <h3 className="text-sm font-medium text-gray-300 mb-3">{t('userDetail.generations')} ({generations.length})</h3>
        {generations.length === 0 ? (
          <p className="text-sm text-gray-500">{t('noData')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-start px-3 py-2 text-xs text-gray-500">{t('userDetail.template')}</th>
                  <th className="text-start px-3 py-2 text-xs text-gray-500">{t('revenue.status')}</th>
                  <th className="text-start px-3 py-2 text-xs text-gray-500">{t('userDetail.duration')}</th>
                  <th className="text-start px-3 py-2 text-xs text-gray-500">{t('revenue.date')}</th>
                </tr>
              </thead>
              <tbody>
                {generations.map((g) => (
                  <tr key={g.id} className="border-b border-gray-800/50">
                    <td className="px-3 py-2 text-gray-300">{g.template_slug || '—'}</td>
                    <td className="px-3 py-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        g.status === 'completed' ? 'bg-emerald-500/15 text-emerald-400' :
                        g.status === 'failed' ? 'bg-red-500/15 text-red-400' :
                        'bg-amber-500/15 text-amber-400'
                      }`}>{g.status}</span>
                    </td>
                    <td className="px-3 py-2 text-gray-500">{g.duration_ms ? `${(g.duration_ms / 1000).toFixed(1)}s` : '—'}</td>
                    <td className="px-3 py-2 text-gray-500">{new Date(g.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Credit History */}
      <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
        <h3 className="text-sm font-medium text-gray-300 mb-3">{t('userDetail.creditHistory')} ({credit_history.length})</h3>
        {credit_history.length === 0 ? (
          <p className="text-sm text-gray-500">{t('noData')}</p>
        ) : (
          <div className="overflow-x-auto max-h-64 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gray-900">
                <tr className="border-b border-gray-800">
                  <th className="text-start px-3 py-2 text-xs text-gray-500">{t('userDetail.delta')}</th>
                  <th className="text-start px-3 py-2 text-xs text-gray-500">{t('userDetail.reason')}</th>
                  <th className="text-start px-3 py-2 text-xs text-gray-500">{t('revenue.date')}</th>
                </tr>
              </thead>
              <tbody>
                {credit_history.map((c) => (
                  <tr key={c.id} className="border-b border-gray-800/50">
                    <td className={`px-3 py-2 font-medium ${c.delta > 0 ? 'text-emerald-400' : c.delta < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                      {c.delta > 0 ? '+' : ''}{c.delta}
                    </td>
                    <td className="px-3 py-2 text-gray-300">{c.reason}</td>
                    <td className="px-3 py-2 text-gray-500">{new Date(c.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
