import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import { processReferral } from '../../api/referralApi';
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

    // Supabase handles the hash fragment automatically
    // The onAuthStateChange listener in authStore will pick up the session
    const timer = setTimeout(async () => {
      await handlePendingReferral();
      navigate('/create');
    }, 2000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-950">
      <LoadingSpinner size="lg" />
      <p className="mt-4 text-gray-400">{t('completingSignIn')}</p>
    </div>
  );
}
