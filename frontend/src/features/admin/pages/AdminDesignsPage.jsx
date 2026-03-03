import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import useAdminStore from '../../../stores/adminStore';
import * as api from '../../../api/adminApi';
import DataTable from '../components/DataTable';
import ConfirmModal from '../components/ConfirmModal';
import toast from 'react-hot-toast';

export default function AdminDesignsPage() {
  const { t } = useTranslation('admin');
  const { submissions, submissionsTotal, submissionsPage, submissionsLoading, fetchSubmissions, setSubmissionsPage } = useAdminStore();
  const [statusFilter, setStatusFilter] = useState('');
  const [reviewModal, setReviewModal] = useState(null);
  const [reviewAction, setReviewAction] = useState('approved');
  const [reviewNotes, setReviewNotes] = useState('');

  useEffect(() => {
    fetchSubmissions({ status: statusFilter });
  }, [submissionsPage, statusFilter]);

  const handleReview = async () => {
    if (!reviewModal) return;
    try {
      await api.reviewSubmission(reviewModal.id, reviewAction, reviewNotes);
      toast.success(t('designs.reviewed'));
      setReviewModal(null);
      setReviewNotes('');
      fetchSubmissions({ status: statusFilter });
    } catch (e) { toast.error(e.message); }
  };

  const columns = [
    { key: 'name', label: t('designs.name'), render: (row) => (
      <span className="font-medium text-white">{row.name}</span>
    )},
    { key: 'category', label: t('designs.category'), render: (row) => (
      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-700 text-gray-300">{row.category}</span>
    )},
    { key: 'status', label: t('revenue.status'), render: (row) => (
      <span className={`text-xs px-2 py-0.5 rounded-full ${
        row.status === 'approved' ? 'bg-emerald-500/15 text-emerald-400' :
        row.status === 'rejected' ? 'bg-red-500/15 text-red-400' :
        'bg-amber-500/15 text-amber-400'
      }`}>{row.status}</span>
    )},
    { key: 'submitted_at', label: t('designs.submittedAt'), render: (row) => (
      <span className="text-gray-500">{row.submitted_at ? new Date(row.submitted_at).toLocaleDateString() : '—'}</span>
    )},
    { key: 'actions', label: '', render: (row) => (
      row.status === 'pending' && (
        <button onClick={() => { setReviewModal(row); setReviewAction('approved'); }}
          className="text-xs px-3 py-1 rounded-lg border border-violet-500/30 text-violet-400 hover:bg-violet-500/10 transition-colors">
          {t('designs.review')}
        </button>
      )
    )},
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-white">{t('designs.title')}</h2>

      <DataTable
        columns={columns}
        data={submissions}
        total={submissionsTotal}
        page={submissionsPage}
        onPageChange={setSubmissionsPage}
        loading={submissionsLoading}
        toolbar={
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300">
            <option value="">{t('designs.allStatuses')}</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        }
      />

      {reviewModal && (
        <ConfirmModal
          title={t('designs.reviewTitle')}
          onConfirm={handleReview}
          onClose={() => { setReviewModal(null); setReviewNotes(''); }}
          confirmLabel={reviewAction === 'approved' ? t('designs.approve') : t('designs.reject')}
          danger={reviewAction === 'rejected'}
        >
          <div className="space-y-3 mt-2">
            <div className="rounded-lg border border-gray-800 bg-gray-800/50 p-3">
              <p className="text-sm font-medium text-white">{reviewModal.name}</p>
              <p className="text-xs text-gray-500 mt-1">{reviewModal.category} — {reviewModal.subcategory || '—'}</p>
              {reviewModal.description && <p className="text-sm text-gray-400 mt-2">{reviewModal.description}</p>}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setReviewAction('approved')}
                className={`flex-1 py-2 text-sm rounded-lg border transition-colors ${
                  reviewAction === 'approved'
                    ? 'border-emerald-500 bg-emerald-500/15 text-emerald-400'
                    : 'border-gray-700 text-gray-400 hover:bg-white/5'
                }`}
              >
                {t('designs.approve')}
              </button>
              <button
                onClick={() => setReviewAction('rejected')}
                className={`flex-1 py-2 text-sm rounded-lg border transition-colors ${
                  reviewAction === 'rejected'
                    ? 'border-red-500 bg-red-500/15 text-red-400'
                    : 'border-gray-700 text-gray-400 hover:bg-white/5'
                }`}
              >
                {t('designs.reject')}
              </button>
            </div>
            <textarea
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              placeholder={t('designs.notesPlaceholder')}
              className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 placeholder-gray-500 resize-none"
              rows={3}
            />
          </div>
        </ConfirmModal>
      )}
    </div>
  );
}
