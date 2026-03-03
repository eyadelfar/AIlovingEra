import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PLANS, ONE_TIME_PLANS, SUBSCRIPTION_PLANS } from '../../lib/pricing';
import useAuthStore from '../../stores/authStore';
import { apiJson } from '../../lib/api';
import PlanToggle from './PlanToggle';
import PricingCard from './PricingCard';
import FeatureTable from './FeatureTable';

export default function PricingPage() {
  const { t } = useTranslation('pricing');
  const [billing, setBilling] = useState('one_time');
  const [loading, setLoading] = useState('');
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);

  const currentPlan = profile?.plan || 'free';

  const visiblePlans = billing === 'one_time'
    ? ['free', ...ONE_TIME_PLANS]
    : ['free', ...SUBSCRIPTION_PLANS];

  const handleSelect = async (planId) => {
    if (!user) {
      navigate(`/signup?redirect=/pricing`);
      return;
    }

    setLoading(planId);
    try {
      const { url } = await apiJson('/api/payments/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan_id: planId }),
      });
      window.location.href = url;
    } catch (err) {
      console.error('Checkout error:', err);
      setLoading('');
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 pt-24 pb-16 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Hero */}
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold">
            <span className="bg-gradient-to-r from-rose-400 to-violet-400 bg-clip-text text-transparent">
              {t('chooseYourPlan')}
            </span>
          </h1>
          <p className="text-gray-400 mt-3 text-lg max-w-xl mx-auto">
            {t('subtitle')}
          </p>
        </div>

        {/* Toggle */}
        <div className="mb-10">
          <PlanToggle billing={billing} onChange={setBilling} />
        </div>

        {/* Cards */}
        <div className={`grid gap-6 mb-16 ${
          visiblePlans.length <= 3
            ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 max-w-4xl mx-auto'
            : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
        }`}>
          {visiblePlans.map((id) => (
            <PricingCard
              key={id}
              plan={PLANS[id]}
              isCurrent={currentPlan === id}
              onSelect={handleSelect}
              loading={loading === id}
            />
          ))}
        </div>

        {/* Promo code hint */}
        <p className="text-center text-sm text-gray-500 mb-10">
          {t('promoCodeHint')}
        </p>

        {/* Feature Comparison */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h2 className="text-xl font-semibold text-white mb-6 text-center">{t('featureComparison')}</h2>
          <FeatureTable />
        </div>
      </div>
    </div>
  );
}
