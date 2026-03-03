import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Server, Clock, Users, Cpu } from 'lucide-react';
import useAdminStore from '../../../stores/adminStore';
import KpiCard from '../components/KpiCard';
import DataTable from '../components/DataTable';

export default function AdminSystemPage() {
  const { t } = useTranslation('admin');
  const { health, errors, fetchHealth, fetchErrors } = useAdminStore();

  useEffect(() => {
    fetchHealth();
    fetchErrors(20);
  }, []);

  const formatUptime = (seconds) => {
    if (!seconds) return '—';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  };

  const errorColumns = [
    { key: 'template_slug', label: t('system.template'), render: (row) => (
      <span className="text-gray-300">{row.template_slug || '—'}</span>
    )},
    { key: 'error_message', label: t('system.errorMessage'), render: (row) => (
      <span className="text-red-400 text-xs truncate max-w-[400px] block" title={row.error_message}>
        {row.error_message?.slice(0, 100) || '—'}
      </span>
    )},
    { key: 'created_at', label: t('revenue.date'), render: (row) => (
      <span className="text-gray-500">{new Date(row.created_at).toLocaleString()}</span>
    )},
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-white">{t('system.title')}</h2>

      {/* Health Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label={t('system.status')}
          value={health?.status?.toUpperCase() || '—'}
          icon={Server}
          color="green"
        />
        <KpiCard
          label={t('system.uptime')}
          value={formatUptime(health?.uptime_s)}
          icon={Clock}
          color="blue"
        />
        <KpiCard
          label={t('system.sessions')}
          value={health?.sessions}
          icon={Users}
          color="purple"
        />
        <KpiCard
          label={t('system.aiModel')}
          value={health?.ai_model || '—'}
          icon={Cpu}
          color="cyan"
        />
      </div>

      {/* Additional system info */}
      {health && (
        <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
          <h3 className="text-sm font-medium text-gray-300 mb-3">{t('system.configuration')}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">{t('system.aiProvider')}</span>
              <span className="text-gray-300">{health.ai_provider}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">{t('system.artModel')}</span>
              <span className="text-gray-300">{health.art_model}</span>
            </div>
          </div>
        </div>
      )}

      {/* Recent Errors */}
      <div>
        <h3 className="text-sm font-medium text-gray-300 mb-3">{t('system.recentErrors')}</h3>
        <DataTable
          columns={errorColumns}
          data={errors}
          total={errors.length}
          emptyMessage={t('system.noErrors')}
        />
      </div>
    </div>
  );
}
