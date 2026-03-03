import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Eye, Ban, ShieldCheck, Coins } from 'lucide-react';
import useAdminStore from '../../../stores/adminStore';
import * as api from '../../../api/adminApi';
import DataTable from '../components/DataTable';
import ConfirmModal from '../components/ConfirmModal';
import toast from 'react-hot-toast';

export default function AdminUsersPage() {
  const { t } = useTranslation('admin');
  const navigate = useNavigate();
  const { users, usersTotal, usersPage, usersLoading, fetchUsers, setUsersPage } = useAdminStore();
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  // Modal states
  const [banModal, setBanModal] = useState(null);
  const [banReason, setBanReason] = useState('');
  const [creditsModal, setCreditsModal] = useState(null);
  const [creditsAmount, setCreditsAmount] = useState('');
  const [creditsReason, setCreditsReason] = useState('');
  const [roleModal, setRoleModal] = useState(null);
  const [newRole, setNewRole] = useState('user');

  const load = useCallback(() => {
    fetchUsers({ search, plan: planFilter, role: roleFilter });
  }, [search, planFilter, roleFilter, fetchUsers]);

  useEffect(() => { load(); }, [usersPage, planFilter, roleFilter]);
  useEffect(() => {
    const timer = setTimeout(load, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const handleBan = async () => {
    if (!banModal) return;
    try {
      if (banModal.banned_at) {
        await api.unbanUser(banModal.id);
        toast.success(t('users.unbanned'));
      } else {
        await api.banUser(banModal.id, banReason);
        toast.success(t('users.banned'));
      }
      setBanModal(null);
      setBanReason('');
      load();
    } catch (e) { toast.error(e.message); }
  };

  const handleCredits = async () => {
    if (!creditsModal) return;
    try {
      await api.adjustCredits(creditsModal.id, parseInt(creditsAmount, 10), creditsReason);
      toast.success(t('users.creditsAdjusted'));
      setCreditsModal(null);
      setCreditsAmount('');
      setCreditsReason('');
      load();
    } catch (e) { toast.error(e.message); }
  };

  const handleRole = async () => {
    if (!roleModal) return;
    try {
      await api.changeUserRole(roleModal.id, newRole);
      toast.success(t('users.roleChanged'));
      setRoleModal(null);
      load();
    } catch (e) { toast.error(e.message); }
  };

  const columns = [
    { key: 'display_name', label: t('users.name'), render: (row) => (
      <span className="font-medium text-white">{row.display_name || '—'}</span>
    )},
    { key: 'plan', label: t('users.plan'), render: (row) => (
      <span className={`text-xs px-2 py-0.5 rounded-full ${
        row.plan?.includes('pro') ? 'bg-violet-500/15 text-violet-400' : 'bg-gray-700 text-gray-300'
      }`}>
        {row.plan || 'free'}
      </span>
    )},
    { key: 'role', label: t('users.role'), render: (row) => (
      <span className={`text-xs px-2 py-0.5 rounded-full ${
        row.role === 'admin' ? 'bg-rose-500/15 text-rose-400' :
        row.role === 'moderator' ? 'bg-amber-500/15 text-amber-400' :
        'bg-gray-700 text-gray-300'
      }`}>
        {row.role || 'user'}
      </span>
    )},
    { key: 'credits', label: t('users.credits') },
    { key: 'books_created', label: t('users.books') },
    { key: 'created_at', label: t('users.joined'), render: (row) => (
      <span className="text-gray-500">{row.created_at ? new Date(row.created_at).toLocaleDateString() : '—'}</span>
    )},
    { key: 'actions', label: '', render: (row) => (
      <div className="flex items-center gap-1">
        <button onClick={() => navigate(`/admin/users/${row.id}`)}
          className="p-1.5 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white" title={t('users.view')}>
          <Eye className="w-4 h-4" />
        </button>
        <button onClick={() => setCreditsModal(row)}
          className="p-1.5 rounded-lg hover:bg-white/5 text-gray-400 hover:text-amber-400" title={t('users.adjustCredits')}>
          <Coins className="w-4 h-4" />
        </button>
        <button onClick={() => setBanModal(row)}
          className={`p-1.5 rounded-lg hover:bg-white/5 ${row.banned_at ? 'text-red-400' : 'text-gray-400 hover:text-red-400'}`}
          title={row.banned_at ? t('users.unban') : t('users.ban')}>
          <Ban className="w-4 h-4" />
        </button>
        <button onClick={() => { setRoleModal(row); setNewRole(row.role || 'user'); }}
          className="p-1.5 rounded-lg hover:bg-white/5 text-gray-400 hover:text-violet-400" title={t('users.changeRole')}>
          <ShieldCheck className="w-4 h-4" />
        </button>
      </div>
    )},
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-white">{t('users.title')}</h2>

      <DataTable
        columns={columns}
        data={users}
        total={usersTotal}
        page={usersPage}
        onPageChange={setUsersPage}
        loading={usersLoading}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder={t('users.searchPlaceholder')}
        toolbar={
          <div className="flex gap-2">
            <select value={planFilter} onChange={(e) => setPlanFilter(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300">
              <option value="">{t('users.allPlans')}</option>
              <option value="free">Free</option>
              <option value="credits">Credits</option>
              <option value="monthly_pro">Monthly Pro</option>
              <option value="annual_pro">Annual Pro</option>
            </select>
            <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300">
              <option value="">{t('users.allRoles')}</option>
              <option value="user">User</option>
              <option value="admin">Admin</option>
              <option value="moderator">Moderator</option>
            </select>
          </div>
        }
      />

      {/* Ban/Unban Modal */}
      {banModal && (
        <ConfirmModal
          title={banModal.banned_at ? t('users.unbanTitle') : t('users.banTitle')}
          message={banModal.banned_at ? t('users.unbanMessage', { name: banModal.display_name }) : undefined}
          onConfirm={handleBan}
          onClose={() => { setBanModal(null); setBanReason(''); }}
          danger={!banModal.banned_at}
          confirmLabel={banModal.banned_at ? t('users.unban') : t('users.ban')}
        >
          {!banModal.banned_at && (
            <textarea
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
              placeholder={t('users.banReasonPlaceholder')}
              className="w-full mt-2 p-3 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 placeholder-gray-500 resize-none"
              rows={3}
            />
          )}
        </ConfirmModal>
      )}

      {/* Adjust Credits Modal */}
      {creditsModal && (
        <ConfirmModal
          title={t('users.adjustCreditsTitle')}
          onConfirm={handleCredits}
          onClose={() => { setCreditsModal(null); setCreditsAmount(''); setCreditsReason(''); }}
          confirmLabel={t('users.adjustCredits')}
        >
          <div className="space-y-3 mt-2">
            <p className="text-sm text-gray-400">{t('users.adjustCreditsFor', { name: creditsModal.display_name })}</p>
            <input
              type="number"
              value={creditsAmount}
              onChange={(e) => setCreditsAmount(e.target.value)}
              placeholder={t('users.amountPlaceholder')}
              className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 placeholder-gray-500"
            />
            <input
              type="text"
              value={creditsReason}
              onChange={(e) => setCreditsReason(e.target.value)}
              placeholder={t('users.reasonPlaceholder')}
              className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 placeholder-gray-500"
            />
          </div>
        </ConfirmModal>
      )}

      {/* Change Role Modal */}
      {roleModal && (
        <ConfirmModal
          title={t('users.changeRoleTitle')}
          onConfirm={handleRole}
          onClose={() => setRoleModal(null)}
          confirmLabel={t('users.changeRole')}
        >
          <div className="space-y-3 mt-2">
            <p className="text-sm text-gray-400">{t('users.changeRoleFor', { name: roleModal.display_name })}</p>
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-300"
            >
              <option value="user">User</option>
              <option value="moderator">Moderator</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </ConfirmModal>
      )}
    </div>
  );
}
