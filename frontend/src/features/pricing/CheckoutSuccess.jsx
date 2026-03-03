import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckCircle } from 'lucide-react';
import useAuthStore from '../../stores/authStore';

export default function CheckoutSuccess() {
  const { t } = useTranslation('pricing');
  const [params] = useSearchParams();
  const sessionId = params.get('session_id');
  const refreshCredits = useAuthStore((s) => s.refreshCredits);
  const profile = useAuthStore((s) => s.profile);
  const [refreshed, setRefreshed] = useState(false);

  useEffect(() => {
    if (!refreshed) {
      refreshCredits().then(() => setRefreshed(true));
    }
  }, [refreshCredits, refreshed]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gray-950">
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-8 h-8 text-emerald-400" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">{t('paymentSuccessTitle')}</h1>
        <p className="text-gray-400 mb-6">
          {t('paymentSuccessMessage')}
          {profile && profile.credits > 0 && (
            <span className="block mt-2 text-amber-400 font-medium">
              {t('credits', { count: profile.credits })}
            </span>
          )}
          {profile && (profile.plan === 'monthly_pro' || profile.plan === 'annual_pro') && (
            <span className="block mt-2 text-emerald-400 font-medium">
              {t('proSubscriptionActive')}
            </span>
          )}
        </p>
        <div className="flex gap-3 justify-center">
          <Link
            to="/create"
            className="bg-gradient-to-r from-rose-500 to-violet-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:from-rose-600 hover:to-violet-700 transition-all"
          >
            {t('createABook')}
          </Link>
          <Link
            to="/pricing"
            className="border border-gray-700 text-gray-300 px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-white/5 transition-all"
          >
            {t('viewPlans')}
          </Link>
        </div>
      </div>
    </div>
  );
}
