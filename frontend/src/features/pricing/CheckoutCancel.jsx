import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { XCircle } from 'lucide-react';

export default function CheckoutCancel() {
  const { t } = useTranslation('pricing');

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gray-950">
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center mx-auto mb-6">
          <XCircle className="w-8 h-8 text-gray-400" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">{t('paymentCancelledTitle')}</h1>
        <p className="text-gray-400 mb-6">
          {t('paymentCancelledMessage')}
        </p>
        <div className="flex gap-3 justify-center">
          <Link
            to="/pricing"
            className="bg-gradient-to-r from-rose-500 to-violet-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:from-rose-600 hover:to-violet-700 transition-all"
          >
            {t('tryAgain')}
          </Link>
          <Link
            to="/"
            className="border border-gray-700 text-gray-300 px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-white/5 transition-all"
          >
            {t('goHome')}
          </Link>
        </div>
      </div>
    </div>
  );
}
