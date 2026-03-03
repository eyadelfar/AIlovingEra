import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import useAdminStore from '../../../stores/adminStore';
import DataTable from '../components/DataTable';

export default function AdminAuditLogPage() {
  const { t } = useTranslation('admin');
  const { auditLog, auditLogTotal, auditLogPage, fetchAuditLog, setAuditLogPage } = useAdminStore();
  const [actionFilter, setActionFilter] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await fetchAuditLog({ action: actionFilter });
      setLoading(false);
    };
    load();
  }, [auditLogPage, actionFilter]);

  const columns = [
    { key: 'action', label: t('audit.action'), render: (row) => (
      <span className="text-xs px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-400 font-medium">{row.action}</span>
    )},
    { key: 'target_type', label: t('audit.targetType'), render: (row) => (
      <span className="text-gray-400">{row.target_type || '—'}</span>
    )},
    { key: 'target_id', label: t('audit.targetId'), render: (row) => (
      <span className="text-gray-500 text-xs font-mono">{row.target_id ? `${row.target_id.slice(0, 8)}...` : '—'}</span>
    )},
    { key: 'admin_id', label: t('audit.admin'), render: (row) => (
      <span className="text-gray-500 text-xs font-mono">{row.admin_id?.slice(0, 8)}...</span>
    )},
    { key: 'ip_address', label: t('audit.ip'), render: (row) => (
      <span className="text-gray-500 text-xs">{row.ip_address || '—'}</span>
    )},
    { key: 'created_at', label: t('revenue.date'), render: (row) => (
      <span className="text-gray-500">{new Date(row.created_at).toLocaleString()}</span>
    )},
    { key: 'details', label: t('audit.details'), render: (row) => (
      row.details ? (
        <span className="text-gray-500 text-xs truncate max-w-[200px] block" title={JSON.stringify(row.details)}>
          {JSON.stringify(row.details).slice(0, 60)}...
        </span>
      ) : '—'
    )},
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-white">{t('audit.title')}</h2>

      <DataTable
        columns={columns}
        data={auditLog}
        total={auditLogTotal}
        page={auditLogPage}
        onPageChange={setAuditLogPage}
        loading={loading}
        toolbar={
          <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300">
            <option value="">{t('audit.allActions')}</option>
            <option value="update_user">Update User</option>
            <option value="adjust_credits">Adjust Credits</option>
            <option value="ban_user">Ban User</option>
            <option value="unban_user">Unban User</option>
            <option value="change_role">Change Role</option>
            <option value="refund_purchase">Refund Purchase</option>
            <option value="review_submission">Review Submission</option>
            <option value="update_contact">Update Contact</option>
          </select>
        }
      />
    </div>
  );
}
