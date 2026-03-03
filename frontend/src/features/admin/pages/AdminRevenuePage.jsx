import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ReceiptText } from 'lucide-react';
import useAdminStore from '../../../stores/adminStore';
import * as api from '../../../api/adminApi';
import DataTable from '../components/DataTable';
import MiniChart from '../components/MiniChart';
import ConfirmModal from '../components/ConfirmModal';
import toast from 'react-hot-toast';

export default function AdminRevenuePage() {
  const { t } = useTranslation('admin');
  const {
    purchases, purchasesTotal, purchasesPage, purchasesLoading,
    fetchPurchases, setPurchasesPage,
    revenueChart, fetchRevenueChart,
  } = useAdminStore();

  const [tab, setTab] = useState('purchases');
  const [statusFilter, setStatusFilter] = useState('');
  const [refundModal, setRefundModal] = useState(null);
  const [refundReason, setRefundReason] = useState('');
  const [auditEntries, setAuditEntries] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);

  useEffect(() => {
    fetchRevenueChart(30);
  }, []);

  useEffect(() => {
    if (tab === 'purchases') {
      fetchPurchases({ status: statusFilter });
    } else {
      loadAudit();
    }
  }, [tab, purchasesPage, statusFilter]);

  const loadAudit = async () => {
    setAuditLoading(true);
    try {
      const data = await api.fetchPaymentAudit({ page: 1 });
      setAuditEntries(data.entries || []);
    } catch {} finally { setAuditLoading(false); }
  };

  const handleRefund = async () => {
    if (!refundModal) return;
    try {
      await api.refundPurchase(refundModal.id, refundReason);
      toast.success(t('revenue.refunded'));
      setRefundModal(null);
      setRefundReason('');
      fetchPurchases({ status: statusFilter });
    } catch (e) { toast.error(e.message); }
  };

  const purchaseColumns = [
    { key: 'plan_id', label: t('revenue.planId') },
    { key: 'type', label: t('revenue.type') },
    { key: 'amount', label: t('revenue.amount'), render: (row) => (
      <span className="font-medium text-white">${(row.amount_cents / 100).toFixed(2)}</span>
    )},
    { key: 'status', label: t('revenue.status'), render: (row) => (
      <span className={`text-xs px-2 py-0.5 rounded-full ${
        row.status === 'completed' ? 'bg-emerald-500/15 text-emerald-400' :
        row.status === 'refunded' ? 'bg-red-500/15 text-red-400' :
        row.status === 'failed' ? 'bg-red-500/15 text-red-400' :
        'bg-amber-500/15 text-amber-400'
      }`}>{row.status}</span>
    )},
    { key: 'created_at', label: t('revenue.date'), render: (row) => (
      <span className="text-gray-500">{new Date(row.created_at).toLocaleDateString()}</span>
    )},
    { key: 'actions', label: '', render: (row) => (
      row.status === 'completed' && (
        <button onClick={() => setRefundModal(row)}
          className="text-xs px-3 py-1 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors">
          {t('revenue.refund')}
        </button>
      )
    )},
  ];

  const auditColumns = [
    { key: 'event_type', label: t('revenue.eventType'), render: (row) => (
      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-700 text-gray-300">{row.event_type}</span>
    )},
    { key: 'user_id', label: t('revenue.userId'), render: (row) => (
      <span className="text-gray-500 text-xs font-mono">{row.user_id?.slice(0, 8)}...</span>
    )},
    { key: 'created_at', label: t('revenue.date'), render: (row) => (
      <span className="text-gray-500">{new Date(row.created_at).toLocaleString()}</span>
    )},
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-white">{t('revenue.title')}</h2>

      <MiniChart data={revenueChart} dataKey="revenue_cents" label={t('dashboard.revenueChart')} color="#10b981" height={140} />

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-800">
        <button
          onClick={() => setTab('purchases')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === 'purchases' ? 'border-violet-500 text-violet-400' : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          {t('revenue.purchases')}
        </button>
        <button
          onClick={() => setTab('audit')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === 'audit' ? 'border-violet-500 text-violet-400' : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          {t('revenue.paymentAudit')}
        </button>
      </div>

      {tab === 'purchases' ? (
        <DataTable
          columns={purchaseColumns}
          data={purchases}
          total={purchasesTotal}
          page={purchasesPage}
          onPageChange={setPurchasesPage}
          loading={purchasesLoading}
          toolbar={
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300">
              <option value="">{t('revenue.allStatuses')}</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
              <option value="refunded">Refunded</option>
            </select>
          }
        />
      ) : (
        <DataTable
          columns={auditColumns}
          data={auditEntries}
          total={auditEntries.length}
          loading={auditLoading}
        />
      )}

      {refundModal && (
        <ConfirmModal
          title={t('revenue.refundTitle')}
          onConfirm={handleRefund}
          onClose={() => { setRefundModal(null); setRefundReason(''); }}
          danger
          confirmLabel={t('revenue.refund')}
        >
          <div className="mt-2 space-y-2">
            <p className="text-sm text-gray-400">
              {t('revenue.refundMessage', { amount: `$${(refundModal.amount_cents / 100).toFixed(2)}` })}
            </p>
            <textarea
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              placeholder={t('revenue.refundReasonPlaceholder')}
              className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 placeholder-gray-500 resize-none"
              rows={3}
            />
          </div>
        </ConfirmModal>
      )}
    </div>
  );
}
