import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Trans, useTranslation } from 'react-i18next';
import { Mail } from 'lucide-react';
import useAuthStore from '../../stores/authStore';
import Logo from '../shared/Logo';

export default function ForgotPasswordPage() {
  const { t } = useTranslation('auth');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const resetPassword = useAuthStore((s) => s.resetPassword);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await resetPassword(email);
      setSent(true);
    } catch (err) {
      setError(err.message || t('failedToSendResetEmail'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gray-950">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/">
            <Logo className="text-2xl justify-center" />
          </Link>
          <p className="text-gray-400 mt-2">{t('resetYourPassword')}</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
          {sent ? (
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                <Mail className="w-6 h-6 text-green-400" />
              </div>
              <h2 className="text-lg font-semibold text-white mb-2">{t('checkYourEmail')}</h2>
              <p className="text-gray-400 text-sm mb-6">
                <Trans i18nKey="auth:resetEmailSent" values={{ email }}>
                  If an account exists for <strong>{{ email }}</strong>, you'll receive a password reset link.
                </Trans>
              </p>
              <Link to="/login" className="text-rose-400 hover:text-rose-300 text-sm">
                {t('backToLogin')}
              </Link>
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1.5">{t('email')}</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500"
                    placeholder={t('emailPlaceholder')}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 rounded-lg bg-gradient-to-r from-rose-500 to-violet-600 text-white font-medium hover:from-rose-600 hover:to-violet-700 transition-all disabled:opacity-50"
                >
                  {loading ? t('sending') : t('sendResetLink')}
                </button>
              </form>

              <p className="mt-6 text-center text-sm text-gray-500">
                {t('rememberYourPassword')}{' '}
                <Link to="/login" className="text-rose-400 hover:text-rose-300">
                  {t('signInLink')}
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
