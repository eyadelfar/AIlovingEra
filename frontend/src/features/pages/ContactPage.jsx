import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Mail, Send, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import useAuthStore from '../../stores/authStore';
import { submitContactForm } from '../../api/contactApi';

const SUBJECTS = ['general', 'bug', 'feature', 'billing', 'other'];

export default function ContactPage() {
  const { t } = useTranslation('pages');
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);

  const [name, setName] = useState(profile?.display_name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [subject, setSubject] = useState('general');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await submitContactForm({ name, email, subject, message });
      setSubmitted(true);
    } catch {
      toast.error(t('common:operationFailed'));
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen pt-24 pb-16 px-4 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">{t('contactSuccess')}</h2>
          <p className="text-gray-400">{t('contactSuccessDesc')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Hero */}
        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-rose-400 to-violet-400 bg-clip-text text-transparent">
            {t('contactTitle')}
          </h1>
          <p className="text-gray-400 mt-3">{t('contactSubtitle')}</p>
        </div>

        <div className="grid md:grid-cols-5 gap-8">
          {/* Info Column */}
          <div className="md:col-span-2 space-y-4">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <Mail className="w-5 h-5 text-violet-400 mb-3" />
              <h3 className="text-sm font-semibold text-white mb-1">{t('emailUs')}</h3>
              <p className="text-xs text-gray-400">support@keepsqueak.com</p>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-white mb-2">{t('followUs')}</h3>
              <div className="space-y-1.5 text-xs text-gray-400">
                <p>Twitter: @keepsqueak</p>
                <p>Instagram: @keepsqueak</p>
              </div>
            </div>
          </div>

          {/* Form Column */}
          <div className="md:col-span-3">
            <form onSubmit={handleSubmit} className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">{t('formName')}</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500"
                  placeholder={t('formNamePlaceholder')}
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1.5">{t('formEmail')}</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500"
                  placeholder={t('formEmailPlaceholder')}
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1.5">{t('formSubject')}</label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg bg-gray-800 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500"
                >
                  {SUBJECTS.map((s) => (
                    <option key={s} value={s}>{t(`subject_${s}`)}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1.5">{t('formMessage')}</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                  rows={5}
                  className="w-full px-4 py-2.5 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 resize-none"
                  placeholder={t('formMessagePlaceholder')}
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-gradient-to-r from-rose-500 to-violet-600 text-white font-medium hover:from-rose-600 hover:to-violet-700 transition-all disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                {submitting ? t('common:loading') : t('sendMessage')}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
