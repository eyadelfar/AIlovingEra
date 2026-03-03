import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trans, useTranslation } from 'react-i18next';
import { LogIn, UserPlus } from 'lucide-react';
import useAuthStore from '../../stores/authStore';
import BaseModal from './BaseModal';

const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

const inputClass = 'w-full px-4 py-2.5 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500';

export default function AuthModal({ onClose, initialTab = 'login' }) {
  const { t } = useTranslation('auth');
  const navigate = useNavigate();
  const [tab, setTab] = useState(initialTab);

  // Login state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Signup state
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupError, setSignupError] = useState('');
  const [signupLoading, setSignupLoading] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);

  const signIn = useAuthStore((s) => s.signIn);
  const signUp = useAuthStore((s) => s.signUp);
  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);
    try {
      await signIn(loginEmail, loginPassword);
      onClose();
      navigate('/create');
    } catch (err) {
      setLoginError(err.message || t('failedToSignIn'));
    } finally {
      setLoginLoading(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setSignupError('');
    if (signupPassword.length < 6) {
      setSignupError(t('passwordMinLength'));
      return;
    }
    setSignupLoading(true);
    try {
      const data = await signUp(signupEmail, signupPassword, signupName);
      if (data.session) {
        onClose();
        navigate('/create');
      } else {
        setSignupSuccess(true);
      }
    } catch (err) {
      setSignupError(err.message || t('failedToSignUp'));
    } finally {
      setSignupLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoginError('');
    setSignupError('');
    try {
      await signInWithGoogle();
    } catch (err) {
      const msg = err.message || t('failedToSignInWithGoogle');
      if (tab === 'login') setLoginError(msg);
      else setSignupError(msg);
    }
  };

  const switchTab = (newTab) => {
    setTab(newTab);
    setLoginError('');
    setSignupError('');
  };

  // Email confirmation success screen
  if (signupSuccess) {
    return (
      <BaseModal onClose={onClose} size="sm">
        <div className="text-center py-2">
          <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">{t('checkYourEmail')}</h2>
          <p className="text-gray-400 text-sm">
            <Trans i18nKey="auth:confirmationEmailSent" values={{ email: signupEmail }}>
              We sent a confirmation link to <strong>{{ email: signupEmail }}</strong>. Click the link to activate your account.
            </Trans>
          </p>
          <button
            onClick={() => { setSignupSuccess(false); switchTab('login'); }}
            className="mt-6 text-rose-400 hover:text-rose-300 text-sm"
          >
            {t('backToLogin')}
          </button>
        </div>
      </BaseModal>
    );
  }

  return (
    <BaseModal onClose={onClose} size="sm">
      {/* Tab bar */}
      <div className="flex mb-6 border-b border-gray-700">
        <button
          onClick={() => switchTab('login')}
          className={`flex-1 pb-3 text-sm font-medium transition-colors relative ${
            tab === 'login'
              ? 'text-white'
              : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          {t('signIn')}
          {tab === 'login' && (
            <span className="absolute bottom-0 inset-x-0 h-0.5 bg-gradient-to-r from-rose-500 to-violet-600 rounded-full" />
          )}
        </button>
        <button
          onClick={() => switchTab('signup')}
          className={`flex-1 pb-3 text-sm font-medium transition-colors relative ${
            tab === 'signup'
              ? 'text-white'
              : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          {t('createAccount')}
          {tab === 'signup' && (
            <span className="absolute bottom-0 inset-x-0 h-0.5 bg-gradient-to-r from-rose-500 to-violet-600 rounded-full" />
          )}
        </button>
      </div>

      {/* ── Login tab ── */}
      {tab === 'login' && (
        <>
          {loginError && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {loginError}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">{t('email')}</label>
              <input
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                required
                className={inputClass}
                placeholder={t('emailPlaceholder')}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm text-gray-400">{t('password')}</label>
                <Link to="/forgot-password" onClick={onClose} className="text-xs text-rose-400 hover:text-rose-300">
                  {t('forgotPassword')}
                </Link>
              </div>
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                required
                className={inputClass}
                placeholder={t('passwordPlaceholder')}
              />
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full py-2.5 rounded-lg bg-gradient-to-r from-rose-500 to-violet-600 text-white font-medium hover:from-rose-600 hover:to-violet-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              {loginLoading ? t('signingIn') : t('signIn')}
            </button>
          </form>
        </>
      )}

      {/* ── Signup tab ── */}
      {tab === 'signup' && (
        <>
          {signupError && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {signupError}
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">{t('displayName')}</label>
              <input
                type="text"
                value={signupName}
                onChange={(e) => setSignupName(e.target.value)}
                required
                className={inputClass}
                placeholder={t('namePlaceholder')}
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1.5">{t('email')}</label>
              <input
                type="email"
                value={signupEmail}
                onChange={(e) => setSignupEmail(e.target.value)}
                required
                className={inputClass}
                placeholder={t('emailPlaceholder')}
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1.5">{t('password')}</label>
              <input
                type="password"
                value={signupPassword}
                onChange={(e) => setSignupPassword(e.target.value)}
                required
                minLength={6}
                className={inputClass}
                placeholder={t('passwordMinPlaceholder')}
              />
            </div>

            <button
              type="submit"
              disabled={signupLoading}
              className="w-full py-2.5 rounded-lg bg-gradient-to-r from-rose-500 to-violet-600 text-white font-medium hover:from-rose-600 hover:to-violet-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              {signupLoading ? t('creatingAccount') : t('createAccount')}
            </button>
          </form>
        </>
      )}

      {/* ── Shared Google OAuth divider + button ── */}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-700" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-3 bg-gray-900 text-gray-500">{t('orContinueWith')}</span>
        </div>
      </div>

      <button
        onClick={handleGoogle}
        className="w-full py-2.5 rounded-lg border border-gray-700 bg-gray-800 text-white font-medium hover:bg-gray-750 transition-all flex items-center justify-center gap-2"
      >
        <GoogleIcon />
        {tab === 'login' ? t('signInWithGoogle') : t('signUpWithGoogle')}
      </button>
    </BaseModal>
  );
}
