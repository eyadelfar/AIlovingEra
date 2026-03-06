import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, useScroll, useTransform } from 'framer-motion';
import ImportBookModal from '../shared/ImportBookModal';
import {
  heroContainerVariants,
  heroWordVariants,
  badgeVariants,
  ctaVariants,
  previewCardVariants,
  floatingVariants,
} from '../../lib/landing-animations';

function AnimatedWords({ text, className }: { text: string; className?: string }) {
  const words = text.split(' ');
  return (
    <motion.span
      variants={heroContainerVariants}
      initial="hidden"
      animate="visible"
      className={className}
    >
      {words.map((word, i) => (
        <motion.span
          key={i}
          variants={heroWordVariants}
          className="inline-block mr-[0.3em]"
        >
          {word}
        </motion.span>
      ))}
    </motion.span>
  );
}

export default function HeroSection() {
  const { t } = useTranslation();
  const [showImport, setShowImport] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end start'],
  });
  const bgY = useTransform(scrollYProgress, [0, 1], [0, 150]);
  const contentY = useTransform(scrollYProgress, [0, 1], [0, 60]);
  const previewY = useTransform(scrollYProgress, [0, 1], [0, -30]);

  return (
    <section ref={sectionRef} className="relative overflow-hidden py-24 sm:py-32">
      {/* Background gradient with parallax */}
      <motion.div style={{ y: bgY }} className="absolute inset-0 bg-gradient-to-b from-rose-950/20 via-gray-950 to-gray-950" />
      <motion.div style={{ y: bgY }} className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[800px] h-[60vh] max-h-[600px] bg-gradient-to-r from-rose-500/10 via-pink-500/10 to-violet-500/10 blur-3xl rounded-full" />

      {/* Floating ambient elements */}
      <motion.div
        className="absolute top-20 left-[15%] w-2 h-2 rounded-full bg-rose-400/30"
        variants={floatingVariants}
        animate="animate"
      />
      <motion.div
        className="absolute top-40 right-[20%] w-1.5 h-1.5 rounded-full bg-violet-400/20"
        variants={floatingVariants}
        animate="animate"
        style={{ animationDelay: '1.5s' }}
      />
      <motion.div
        className="absolute bottom-32 left-[25%] w-1 h-1 rounded-full bg-pink-400/25"
        variants={floatingVariants}
        animate="animate"
        style={{ animationDelay: '3s' }}
      />

      <motion.div style={{ y: contentY }} className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div>
          {/* Badge with spring entrance */}
          <motion.span
            variants={badgeVariants}
            initial="hidden"
            animate="visible"
            className="inline-block mb-6 px-4 py-1.5 rounded-full text-sm font-medium bg-rose-500/10 text-rose-300 border border-rose-500/20"
          >
            {t('aiPoweredMemoryBooks')}
          </motion.span>

          {/* Headline with word-by-word reveal */}
          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold leading-tight mb-6">
            <AnimatedWords text={t('heroTitle')} />{' '}
            <motion.span
              className="bg-gradient-to-r from-rose-400 via-pink-400 to-violet-400 bg-clip-text text-transparent inline-block"
              style={{ backgroundSize: '200% 100%' }}
              animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
              transition={{ duration: 6, ease: 'easeInOut', repeat: Infinity }}
            >
              <AnimatedWords text={t('heroTitleHighlight')} />
            </motion.span>
          </h1>

          {/* Description with delayed fade */}
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 100, damping: 20, delay: 0.5 }}
            className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            {t('heroDescription')}
          </motion.p>

          {/* CTAs with delayed entrance */}
          <motion.div
            variants={ctaVariants}
            initial="hidden"
            animate="visible"
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link
              to="/create"
              className="w-full sm:w-auto bg-gradient-to-r from-rose-500 to-violet-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:from-rose-600 hover:to-violet-700 transition-all shadow-lg shadow-rose-900/30 focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950 outline-none"
            >
              {t('createYourMemoryBook')}
            </Link>
            <a
              href="#how-it-works"
              className="w-full sm:w-auto text-gray-400 hover:text-white px-8 py-4 rounded-xl text-lg font-medium border border-gray-700 hover:border-gray-500 transition-all focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950 outline-none"
            >
              {t('seeHowItWorks')}
            </a>
          </motion.div>
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            onClick={() => setShowImport(true)}
            className="text-sm text-gray-500 hover:text-gray-300 underline underline-offset-4 transition-colors mt-4"
          >
            {t('orImportSavedBook')}
          </motion.button>
          {showImport && <ImportBookModal onClose={() => setShowImport(false)} />}
        </div>

        {/* Sample book preview with refined entrance */}
        <motion.div
          variants={previewCardVariants}
          initial="hidden"
          animate="visible"
          style={{ y: previewY }}
          className="mt-16 relative"
        >
          <div className="bg-gradient-to-b from-gray-800/50 to-gray-900/50 border border-gray-700/50 rounded-2xl p-8 max-w-lg mx-auto shadow-2xl">
            <div className="aspect-[3/4] bg-gradient-to-br from-rose-900/30 to-violet-900/30 rounded-xl flex items-center justify-center border border-gray-700/30">
              <div className="text-center px-8">
                <p className="text-3xl mb-2">&#10084;&#65039;</p>
                <p className="text-xl font-serif text-rose-200 italic">&ldquo;{t('ourStory')}&rdquo;</p>
                <p className="text-sm text-gray-400 mt-2">{t('memoryBookCraftedByAi')}</p>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
