import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Users, DollarSign, Zap, CreditCard, Palette, MessageSquare } from 'lucide-react';
import useAdminStore from '../../../stores/adminStore';
import { fetchFunnelStats, fetchPdfStats } from '../../../api/adminApi';
import KpiCard from '../components/KpiCard';
import MiniChart from '../components/MiniChart';

const FUNNEL_STEPS = [
  { key: 'signups', label: 'Signups', color: '#3b82f6' },
  { key: 'started_generation', label: 'Started Gen', color: '#8b5cf6' },
  { key: 'completed_generation', label: 'Completed Gen', color: '#a855f7' },
  { key: 'downloaded_pdf', label: 'Downloaded PDF', color: '#10b981' },
  { key: 'purchased', label: 'Purchased', color: '#f59e0b' },
];

function FunnelChart({ funnel }) {
  const maxVal = Math.max(
    ...FUNNEL_STEPS.map((s) => funnel[s.key] ?? 0),
    1
  );

  return (
    <div className="space-y-3">
      {FUNNEL_STEPS.map((step) => {
        const val = funnel[step.key] ?? 0;
        const pct = maxVal > 0 ? (val / maxVal) * 100 : 0;
        return (
          <div key={step.key}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-400">{step.label}</span>
              <span className="text-xs font-medium text-gray-300">{val}</span>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-4 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.max(pct, 2)}%`,
                  backgroundColor: step.color,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function AdminDashboardPage() {
  const { t } = useTranslation('admin');
  const {
    stats, statsLoading, fetchStats,
    revenueChart, fetchRevenueChart,
    userGrowthChart, fetchUserGrowthChart,
    generationChart, fetchGenerationChart,
    templatePopularity, fetchTemplatePopularity,
  } = useAdminStore();

  const [funnel, setFunnel] = useState(null);
  const [pdfStats, setPdfStats] = useState(null);

  useEffect(() => {
    fetchStats();
    fetchRevenueChart(30);
    fetchUserGrowthChart(30);
    fetchGenerationChart(30);
    fetchTemplatePopularity(10);

    fetchFunnelStats(30).then(setFunnel).catch(() => {});
    fetchPdfStats(30).then(setPdfStats).catch(() => {});
  }, []);

  const formatCents = (cents) => {
    if (cents == null) return '—';
    return `$${(cents / 100).toFixed(2)}`;
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-white">{t('dashboard.title')}</h2>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <KpiCard
          label={t('dashboard.totalUsers')}
          value={stats?.total_users}
          icon={Users}
          color="blue"
          loading={statsLoading}
        />
        <KpiCard
          label={t('dashboard.totalRevenue')}
          value={formatCents(stats?.total_revenue_cents)}
          icon={DollarSign}
          color="green"
          loading={statsLoading}
        />
        <KpiCard
          label={t('dashboard.totalGenerations')}
          value={stats?.total_generations}
          icon={Zap}
          color="purple"
          loading={statsLoading}
        />
        <KpiCard
          label={t('dashboard.activeSubscriptions')}
          value={stats?.active_subscriptions}
          icon={CreditCard}
          color="cyan"
          loading={statsLoading}
        />
        <KpiCard
          label={t('dashboard.pendingReviews')}
          value={stats?.pending_submissions}
          icon={Palette}
          color="amber"
          loading={statsLoading}
        />
        <KpiCard
          label={t('dashboard.openTickets')}
          value={stats?.open_contacts}
          icon={MessageSquare}
          color="rose"
          loading={statsLoading}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <MiniChart
          data={revenueChart}
          dataKey="revenue_cents"
          label={t('dashboard.revenueChart')}
          color="#10b981"
          height={160}
        />
        <MiniChart
          data={userGrowthChart}
          dataKey="new_users"
          label={t('dashboard.userGrowthChart')}
          color="#3b82f6"
          height={160}
        />
        <MiniChart
          data={generationChart}
          dataKey="total"
          label={t('dashboard.generationChart')}
          color="#8b5cf6"
          height={160}
        />
      </div>

      {/* Template Popularity */}
      <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
        <h3 className="text-sm font-medium text-gray-300 mb-3">{t('dashboard.templatePopularity')}</h3>
        {templatePopularity.length === 0 ? (
          <p className="text-sm text-gray-500">{t('noData')}</p>
        ) : (
          <div className="space-y-2">
            {templatePopularity.map((item, i) => (
              <div key={item.template_slug} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 w-5">{i + 1}.</span>
                  <span className="text-sm text-gray-300">{item.template_slug}</span>
                </div>
                <span className="text-sm font-medium text-violet-400">{item.usage_count}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Conversion Funnel */}
      <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
        <h3 className="text-sm font-medium text-gray-300 mb-4">Conversion Funnel (30 days)</h3>
        {funnel ? (
          <FunnelChart funnel={funnel} />
        ) : (
          <p className="text-sm text-gray-500">Loading funnel data...</p>
        )}
      </div>

      {/* PDF Stats */}
      <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
        <h3 className="text-sm font-medium text-gray-300 mb-4">PDF Stats (30 days)</h3>
        {pdfStats ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-emerald-400">{pdfStats.total_downloads ?? 0}</p>
              <p className="text-xs text-gray-500 mt-1">Total Downloads</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-400">{pdfStats.unique_users ?? 0}</p>
              <p className="text-xs text-gray-500 mt-1">Unique Users</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-violet-400">{pdfStats.avg_pages != null ? pdfStats.avg_pages.toFixed(1) : '—'}</p>
              <p className="text-xs text-gray-500 mt-1">Avg Pages</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-amber-400">{pdfStats.avg_duration_seconds != null ? `${pdfStats.avg_duration_seconds.toFixed(1)}s` : '—'}</p>
              <p className="text-xs text-gray-500 mt-1">Avg Duration</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500">Loading PDF stats...</p>
        )}
      </div>
    </div>
  );
}
