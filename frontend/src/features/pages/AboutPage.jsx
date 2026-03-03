import { useTranslation } from 'react-i18next';
import { Sparkles, Shield, Accessibility } from 'lucide-react';

export default function AboutPage() {
  const { t } = useTranslation('pages');

  const values = [
    { icon: Sparkles, color: 'text-rose-400', title: t('valueCreativity'), desc: t('valueCreativityDesc') },
    { icon: Shield, color: 'text-violet-400', title: t('valuePrivacy'), desc: t('valuePrivacyDesc') },
    { icon: Accessibility, color: 'text-amber-400', title: t('valueAccessibility'), desc: t('valueAccessibilityDesc') },
  ];

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Hero */}
        <div className="text-center mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-rose-400 to-violet-400 bg-clip-text text-transparent">
            {t('aboutTitle')}
          </h1>
          <p className="text-gray-400 mt-3 max-w-xl mx-auto">{t('aboutSubtitle')}</p>
        </div>

        {/* Mission */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 mb-8">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5 text-rose-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white mb-3">{t('missionTitle')}</h2>
              <p className="text-gray-400 leading-relaxed">{t('missionText')}</p>
            </div>
          </div>
        </div>

        {/* Values */}
        <h2 className="text-xl font-semibold text-white mb-4">{t('ourValues')}</h2>
        <div className="grid sm:grid-cols-3 gap-4 mb-8">
          {values.map(({ icon: Icon, color, title, desc }) => (
            <div key={title} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <Icon className={`w-6 h-6 ${color} mb-3`} />
              <h3 className="text-sm font-semibold text-white mb-2">{title}</h3>
              <p className="text-xs text-gray-400 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>

        {/* Story */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
          <h2 className="text-xl font-semibold text-white mb-3">{t('storyTitle')}</h2>
          <p className="text-gray-400 leading-relaxed">{t('storyText')}</p>
        </div>
      </div>
    </div>
  );
}
