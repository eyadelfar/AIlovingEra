import { Lock, CreditCard, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import useBookStore from '../../stores/bookStore';
import useAuthStore from '../../stores/authStore';
import toast from 'react-hot-toast';

export default function LockedPageOverlay({ totalPages }) {
  const { t } = useTranslation('viewer');
  const navigate = useNavigate();
  const unlockBook = useBookStore(s => s.unlockBook);
  const refreshCredits = useAuthStore(s => s.refreshCredits);
  const credits = useAuthStore(s => s.profile?.credits ?? 0);
  const plan = useAuthStore(s => s.profile?.plan);

  const isPro = plan === 'monthly_pro' || plan === 'annual_pro';
  const hasCredits = isPro || credits > 0;

  async function handleUnlock() {
    try {
      const success = await unlockBook();
      if (success) {
        toast.success(t('bookUnlocked'));
        await refreshCredits();
      }
    } catch {
      toast.error(t('unlockFailed'));
    }
  }

  return (
    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center">
      <div className="absolute inset-0 bg-gradient-to-b from-gray-950/60 via-gray-950/80 to-gray-950/95 backdrop-blur-sm rounded-xl" />

      <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-xs">
        <div className="w-14 h-14 rounded-2xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center mb-4">
          <Lock className="w-7 h-7 text-violet-400" />
        </div>

        <h3 className="text-lg font-semibold text-white mb-2">
          {t('unlockAllPages', { count: totalPages })}
        </h3>
        <p className="text-sm text-gray-400 mb-6">
          {t('previewDescription')}
        </p>

        {hasCredits ? (
          <button
            onClick={handleUnlock}
            className="w-full px-6 py-3 rounded-xl font-medium text-white bg-gradient-to-r from-rose-500 to-violet-600 hover:from-rose-600 hover:to-violet-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-violet-500/20"
          >
            <Sparkles className="w-4 h-4" />
            {t('unlockNow')}
          </button>
        ) : (
          <button
            onClick={() => navigate('/pricing')}
            className="w-full px-6 py-3 rounded-xl font-medium text-white bg-gradient-to-r from-rose-500 to-violet-600 hover:from-rose-600 hover:to-violet-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-violet-500/20"
          >
            <CreditCard className="w-4 h-4" />
            {t('getCredits')}
          </button>
        )}
      </div>
    </div>
  );
}
