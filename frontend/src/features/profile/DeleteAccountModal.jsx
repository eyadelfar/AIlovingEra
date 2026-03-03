import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import BaseModal from '../shared/BaseModal';

export default function DeleteAccountModal({ onClose, onConfirm, deleting }) {
  const { t } = useTranslation('profile');
  const [typed, setTyped] = useState('');

  return (
    <BaseModal title={t('deleteAccount')} onClose={onClose} size="sm">
      <p className="text-gray-400 text-sm mb-4">{t('deleteAccountWarning')}</p>
      <p className="text-gray-300 text-sm mb-3">
        {t('typeDeleteToConfirm')}
      </p>
      <input
        type="text"
        value={typed}
        onChange={(e) => setTyped(e.target.value)}
        placeholder="DELETE"
        className="w-full px-4 py-2.5 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 mb-4"
      />
      <div className="flex gap-3">
        <button
          onClick={onClose}
          className="flex-1 py-2.5 rounded-lg border border-gray-700 text-gray-300 hover:bg-gray-800 transition-colors text-sm"
        >
          {t('common:cancel')}
        </button>
        <button
          onClick={onConfirm}
          disabled={typed !== 'DELETE' || deleting}
          className="flex-1 py-2.5 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {deleting ? t('deleting') : t('deleteAccountConfirm')}
        </button>
      </div>
    </BaseModal>
  );
}
