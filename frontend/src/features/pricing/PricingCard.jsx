import { Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatPrice } from '../../lib/pricing';

export default function PricingCard({ plan, isCurrent, onSelect, loading }) {
  const { t } = useTranslation('pricing');
  const isSubscription = !!plan.interval;
  const isFree = plan.price === 0;

  return (
    <div
      className={`relative rounded-2xl border p-6 flex flex-col ${
        plan.popular
          ? 'border-rose-500/50 bg-gray-900 shadow-lg shadow-rose-500/10'
          : 'border-gray-800 bg-gray-900'
      }`}
    >
      {plan.popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-gradient-to-r from-rose-500 to-violet-600 text-white text-xs font-semibold">
          {t('mostPopular')}
        </div>
      )}

      {plan.badge && !plan.popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
          {plan.badge}
        </div>
      )}

      <h3 className="text-lg font-semibold text-white">{plan.name}</h3>
      <p className="text-sm text-gray-400 mt-1">{plan.description}</p>

      <div className="mt-4 mb-6">
        <span className="text-3xl font-bold text-white">{formatPrice(plan.price)}</span>
        {isSubscription && (
          <span className="text-sm text-gray-400 ms-1">{plan.interval === 'month' ? t('perMonth') : t('perYear')}</span>
        )}
        {!isSubscription && !isFree && (
          <span className="text-sm text-gray-400 ms-1">{t('oneTime').toLowerCase()}</span>
        )}
      </div>

      <ul className="space-y-2.5 flex-1 mb-6">
        {plan.features.map((feature, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
            <Check className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
            {feature}
          </li>
        ))}
      </ul>

      {isCurrent ? (
        <div className="py-2.5 rounded-lg text-center text-sm font-medium text-gray-400 border border-gray-700 bg-gray-800">
          {t('currentPlan')}
        </div>
      ) : isFree ? (
        <div className="py-2.5 rounded-lg text-center text-sm font-medium text-gray-500 border border-gray-800">
          {t('default')}
        </div>
      ) : (
        <button
          onClick={() => onSelect(plan.id)}
          disabled={loading}
          className={`py-2.5 rounded-lg text-sm font-medium transition-all disabled:opacity-50 ${
            plan.popular
              ? 'bg-gradient-to-r from-rose-500 to-violet-600 text-white hover:from-rose-600 hover:to-violet-700'
              : 'bg-white/5 text-white border border-gray-700 hover:bg-white/10'
          }`}
        >
          {loading ? t('redirecting') : isSubscription ? t('subscribe') : t('getStarted')}
        </button>
      )}
    </div>
  );
}
