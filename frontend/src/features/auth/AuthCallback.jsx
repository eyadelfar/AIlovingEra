import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import { processReferral } from '../../api/referralApi';
import useAuthStore from '../../stores/authStore';
import LoadingSpinner from '../shared/LoadingSpinner';

export default function AuthCallback() {
  const { t } = useTranslation('auth');
  const navigate = useNavigate();

  useEffect(() => {
    if (!supabase) {
      navigate('/login');
      return;
    }

    // Process pending referral from localStorage (set during OAuth signup)
    async function handlePendingReferral() {
      const pendingRef = localStorage.getItem('keepsqueak_ref');
      if (pendingRef) {
        try {
          await processReferral(pendingRef);
        } catch { /* ignore referral errors */ }
        localStorage.removeItem('keepsqueak_ref');
      }
    }

    // Wait for actual auth state instead of a fixed timeout
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        await handlePendingReferral();
        navigate('/create', { replace: true });
      }
    });

    // Fallback timeout in case auth event never fires (e.g., user navigated here directly)
    const fallback = setTimeout(() => {
      const user = useAuthStore.getState().user;
      navigate(user ? '/create' : '/login', { replace: true });
    }, 5000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(fallback);
    };
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-950">
      <LoadingSpinner size="lg" />
      <p className="mt-4 text-gray-400">{t('completingSignIn')}</p>
    </div>
  );
}
