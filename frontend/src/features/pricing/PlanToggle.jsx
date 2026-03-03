import { useTranslation } from 'react-i18next';

export default function PlanToggle({ billing, onChange }) {
  const { t } = useTranslation('pricing');

  return (
    <div className="flex items-center justify-center gap-3">
      <span className={`text-sm ${billing === 'one_time' ? 'text-white' : 'text-gray-500'}`}>
        {t('oneTime')}
      </span>
      <button
        onClick={() => onChange(billing === 'one_time' ? 'subscription' : 'one_time')}
        className="relative w-14 h-7 rounded-full bg-gray-800 border border-gray-700 transition-colors"
      >
        <div
          className={`absolute top-0.5 w-6 h-6 rounded-full bg-gradient-to-r from-rose-500 to-violet-600 transition-transform ${
            billing === 'subscription' ? 'translate-x-7' : 'translate-x-0.5'
          }`}
        />
      </button>
      <div className="flex items-center gap-1.5">
        <span className={`text-sm ${billing === 'subscription' ? 'text-white' : 'text-gray-500'}`}>
          {t('subscription')}
        </span>
        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-full">
          {t('savePercent', { percent: 37 })}
        </span>
      </div>
    </div>
  );
}
