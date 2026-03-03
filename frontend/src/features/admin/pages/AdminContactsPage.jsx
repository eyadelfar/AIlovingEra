import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import useAdminStore from '../../../stores/adminStore';
import * as api from '../../../api/adminApi';
import DataTable from '../components/DataTable';
import ConfirmModal from '../components/ConfirmModal';
import toast from 'react-hot-toast';

export default function AdminContactsPage() {
  const { t } = useTranslation('admin');
  const { contacts, contactsTotal, contactsPage, contactsLoading, fetchContacts, setContactsPage } = useAdminStore();
  const [statusFilter, setStatusFilter] = useState('');
  const [respondModal, setRespondModal] = useState(null);
  const [responseStatus, setResponseStatus] = useState('in_progress');
  const [responseText, setResponseText] = useState('');

  useEffect(() => {
    fetchContacts({ status: statusFilter });
  }, [contactsPage, statusFilter]);

  const handleRespond = async () => {
    if (!respondModal) return;
    try {
      await api.updateContact(respondModal.id, responseStatus, responseText);
      toast.success(t('contacts.updated'));
      setRespondModal(null);
      setResponseText('');
      fetchContacts({ status: statusFilter });
    } catch (e) { toast.error(e.message); }
  };

  const columns = [
    { key: 'name', label: t('contacts.name'), render: (row) => (
      <span className="font-medium text-white">{row.name}</span>
    )},
    { key: 'email', label: t('contacts.email'), render: (row) => (
      <span className="text-gray-400 text-xs">{row.email}</span>
    )},
    { key: 'subject', label: t('contacts.subject'), render: (row) => (
      <span className="text-gray-300 truncate max-w-[200px] block">{row.subject}</span>
    )},
    { key: 'status', label: t('revenue.status'), render: (row) => (
      <span className={`text-xs px-2 py-0.5 rounded-full ${
        row.status === 'closed' ? 'bg-gray-700 text-gray-400' :
        row.status === 'in_progress' ? 'bg-blue-500/15 text-blue-400' :
        'bg-amber-500/15 text-amber-400'
      }`}>{row.status || 'open'}</span>
    )},
    { key: 'created_at', label: t('revenue.date'), render: (row) => (
      <span className="text-gray-500">{new Date(row.created_at).toLocaleDateString()}</span>
    )},
    { key: 'actions', label: '', render: (row) => (
      <button onClick={() => { setRespondModal(row); setResponseStatus(row.status === 'open' ? 'in_progress' : 'closed'); }}
        className="text-xs px-3 py-1 rounded-lg border border-violet-500/30 text-violet-400 hover:bg-violet-500/10 transition-colors">
        {row.status === 'closed' ? t('contacts.view') : t('contacts.respond')}
      </button>
    )},
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-white">{t('contacts.title')}</h2>

      <DataTable
        columns={columns}
        data={contacts}
        total={contactsTotal}
        page={contactsPage}
        onPageChange={setContactsPage}
        loading={contactsLoading}
        toolbar={
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300">
            <option value="">{t('contacts.allStatuses')}</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="closed">Closed</option>
          </select>
        }
      />

      {respondModal && (
        <ConfirmModal
          title={t('contacts.respondTitle')}
          onConfirm={handleRespond}
          onClose={() => { setRespondModal(null); setResponseText(''); }}
          confirmLabel={t('contacts.send')}
        >
          <div className="space-y-3 mt-2">
            <div className="rounded-lg border border-gray-800 bg-gray-800/50 p-3">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-medium text-white">{respondModal.name}</p>
                <span className="text-xs text-gray-500">{respondModal.email}</span>
              </div>
              <p className="text-xs text-gray-400 font-medium">{respondModal.subject}</p>
              <p className="text-sm text-gray-300 mt-2 whitespace-pre-wrap">{respondModal.message}</p>
            </div>

            {respondModal.admin_response && (
              <div className="rounded-lg border border-violet-500/20 bg-violet-500/5 p-3">
                <p className="text-xs text-violet-400 font-medium mb-1">{t('contacts.previousResponse')}</p>
                <p className="text-sm text-gray-300">{respondModal.admin_response}</p>
              </div>
            )}

            <select
              value={responseStatus}
              onChange={(e) => setResponseStatus(e.target.value)}
              className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-300"
            >
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="closed">Closed</option>
            </select>

            <textarea
              value={responseText}
              onChange={(e) => setResponseText(e.target.value)}
              placeholder={t('contacts.responsePlaceholder')}
              className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 placeholder-gray-500 resize-none"
              rows={4}
            />
          </div>
        </ConfirmModal>
      )}
    </div>
  );
}
