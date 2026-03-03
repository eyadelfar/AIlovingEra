import { useTranslation } from 'react-i18next';
import { Shield } from 'lucide-react';

const SECTIONS = [
  'privacyInfoCollected',
  'privacyHowWeUse',
  'privacyDataStorage',
  'privacySharing',
  'privacyCookies',
  'privacyYourRights',
  'privacyChanges',
  'privacyContact',
];

export default function PrivacyPolicyPage() {
  const { t } = useTranslation('pages');

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Hero */}
        <div className="text-center mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-rose-400 to-violet-400 bg-clip-text text-transparent">
            {t('privacyTitle')}
          </h1>
          <p className="text-gray-400 mt-3 max-w-xl mx-auto">{t('privacySubtitle')}</p>
        </div>

        <div className="space-y-6">
          {SECTIONS.map((key) => (
            <div key={key} className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Shield className="w-4 h-4 text-violet-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white mb-2">{t(`${key}Title`)}</h2>
                  <p className="text-gray-400 text-sm leading-relaxed">{t(`${key}Text`)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
