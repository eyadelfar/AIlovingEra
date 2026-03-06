import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import Logo from '../shared/Logo';
import { footerFadeVariants } from '../../lib/landing-animations';

export default function FooterSection() {
  const { t } = useTranslation();

  return (
    <motion.footer
      variants={footerFadeVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-50px' }}
      className="py-12 border-t border-gray-800/50"
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid sm:grid-cols-3 gap-8 mb-8">
          {/* Brand */}
          <div>
            <Logo className="text-lg" />
            <p className="text-gray-500 text-sm mt-3">
              {t('footerTagline')}
            </p>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-sm font-semibold text-gray-300 mb-3">{t('company')}</h4>
            <div className="space-y-2">
              <Link to="/about" className="block text-sm text-gray-500 hover:text-gray-300 transition-colors">
                {t('aboutUs')}
              </Link>
              <Link to="/contact" className="block text-sm text-gray-500 hover:text-gray-300 transition-colors">
                {t('contactUs')}
              </Link>
            </div>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-sm font-semibold text-gray-300 mb-3">{t('legal')}</h4>
            <div className="space-y-2">
              <Link to="/privacy" className="block text-sm text-gray-500 hover:text-gray-300 transition-colors">
                {t('privacyPolicy')}
              </Link>
              <Link to="/terms" className="block text-sm text-gray-500 hover:text-gray-300 transition-colors">
                {t('termsOfService')}
              </Link>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800/50 pt-6 text-center">
          <p className="text-gray-600 text-xs">
            {t('footerCopyright', { year: new Date().getFullYear() })}
          </p>
        </div>
      </div>
    </motion.footer>
  );
}
