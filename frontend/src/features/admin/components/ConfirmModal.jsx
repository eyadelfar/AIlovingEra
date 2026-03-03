import { useTranslation } from 'react-i18next';
import BaseModal from '../../shared/BaseModal';

export default function ConfirmModal({ title, message, onConfirm, onClose, danger = false, confirmLabel, children }) {
  const { t } = useTranslation('admin');

  return (
    <BaseModal title={title} onClose={onClose} size="sm">
      {message && <p className="text-sm text-gray-400 mb-4">{message}</p>}
      {children}
      <div className="flex justify-end gap-3 mt-6">
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/5"
        >
          {t('cancel')}
        </button>
        <button
          onClick={onConfirm}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            danger
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-violet-600 hover:bg-violet-700 text-white'
          }`}
        >
          {confirmLabel || t('confirm')}
        </button>
      </div>
    </BaseModal>
  );
}
