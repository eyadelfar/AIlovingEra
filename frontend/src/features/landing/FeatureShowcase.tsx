import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { featureCardVariants } from '../../lib/landing-animations';

interface FeatureKey {
  titleKey: string;
  descKey: string;
  gradient: string;
}

const FEATURE_KEYS: readonly FeatureKey[] = [
  { titleKey: 'featureNarratives', descKey: 'featureNarrativesDesc', gradient: 'from-rose-500 to-pink-500' },
  { titleKey: 'featureTemplates', descKey: 'featureTemplatesDesc', gradient: 'from-violet-500 to-purple-500' },
  { titleKey: 'featureAnalysis', descKey: 'featureAnalysisDesc', gradient: 'from-blue-500 to-cyan-500' },
  { titleKey: 'featurePdf', descKey: 'featurePdfDesc', gradient: 'from-amber-500 to-orange-500' },
  { titleKey: 'featureVoice', descKey: 'featureVoiceDesc', gradient: 'from-green-500 to-emerald-500' },
  { titleKey: 'featurePersonalized', descKey: 'featurePersonalizedDesc', gradient: 'from-pink-500 to-rose-500' },
];

export default function FeatureShowcase() {
  const { t } = useTranslation();

  return (
    <section className="py-24 sm:py-32 bg-gray-900/30">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">{t('whyYoullLoveIt')}</h2>
          <p className="text-gray-400 text-lg max-w-xl mx-auto">
            {t('featuresSubtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURE_KEYS.map((feat, i) => (
            <motion.div
              key={feat.titleKey}
              variants={featureCardVariants}
              custom={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-30px' }}
              whileHover={{
                scale: 1.02,
                boxShadow: '0 8px 30px rgba(244, 63, 94, 0.08)',
                borderColor: 'rgba(156, 163, 175, 0.3)',
              }}
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}
              className="bg-gray-900/60 border border-gray-800 rounded-xl p-6 cursor-default"
            >
              <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${feat.gradient} flex items-center justify-center mb-4 opacity-80`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <h3 className="font-semibold mb-2">{t(feat.titleKey)}</h3>
              <p className="text-sm text-gray-400 leading-relaxed">{t(feat.descKey)}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
