import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, X } from 'lucide-react';
import useBookStore from '../../stores/bookStore';
import { useShallow } from 'zustand/shallow';
import GenerationAnimation from './GenerationAnimation';
import { DesignStyleSection, AboutYouSection, BookFormatSection, ExtrasSection } from './SetupSections';
import { fetchTemplates } from '../../api/bookApi';
import { TEMPLATE_DEFAULTS } from '../../lib/constants';

export default function StepGenerating() {
  const { t } = useTranslation('wizard');
  const navigate = useNavigate();
  const isGenerating = useBookStore(s => s.isGenerating);
  const generationProgress = useBookStore(s => s.generationProgress);
  const generationStage = useBookStore(s => s.generationStage);
  const generationTotalPages = useBookStore(s => s.generationTotalPages);
  const generationCurrentPage = useBookStore(s => s.generationCurrentPage);
  const bookDraft = useBookStore(s => s.bookDraft);
  const error = useBookStore(s => s.error);
  const generationId = useBookStore(s => s.generationId);
  const startGeneration = useBookStore(s => s.startGeneration);
  const retryGeneration = useBookStore(s => s.retryGeneration);
  const cancelGeneration = useBookStore(s => s.cancelGeneration);
  const prevStep = useBookStore(s => s.prevStep);
  const images = useBookStore(s => s.images);
  const cartoonImages = useBookStore(s => s.cartoonImages);

  const settings = useBookStore(
    useShallow(s => ({
      selectedTemplate: s.selectedTemplate,
      setTemplate: s.setTemplate,
      partnerNames: s.partnerNames,
      setPartnerNames: s.setPartnerNames,
      occasion: s.occasion,
      setOccasion: s.setOccasion,
      vibe: s.vibe,
      setVibe: s.setVibe,
      imageLook: s.imageLook,
      setImageLook: s.setImageLook,
      designScale: s.designScale,
      setDesignScale: s.setDesignScale,
      imageDensity: s.imageDensity,
      setImageDensity: s.setImageDensity,
      addOns: s.addOns,
      setAddOn: s.setAddOn,
      includeQuotes: s.includeQuotes,
      setIncludeQuotes: s.setIncludeQuotes,
    })),
  );

  const [showSettings, setShowSettings] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [settingsChanged, setSettingsChanged] = useState(false);

  const hasStarted = useRef(false);
  useEffect(() => {
    if (!bookDraft && !isGenerating && !error && !hasStarted.current) {
      hasStarted.current = true;
      startGeneration();
    }
  }, []);

  // Load templates for the settings panel
  useEffect(() => {
    fetchTemplates().then(setTemplates).catch(() => {});
  }, []);

  useEffect(() => {
    if (bookDraft && !isGenerating) {
      const timer = setTimeout(() => navigate('/book/view?edit=true', { replace: true }), 1000);
      return () => clearTimeout(timer);
    }
  }, [bookDraft, isGenerating, navigate]);

  function handleSettingChange(setter) {
    return (...args) => {
      setter(...args);
      setSettingsChanged(true);
    };
  }

  function handleTemplateSelect(slug) {
    settings.setTemplate(slug);
    const defaults = TEMPLATE_DEFAULTS[slug];
    if (defaults?.imageLook) settings.setImageLook(defaults.imageLook);
    setSettingsChanged(true);
  }

  const rewriteWithNewSettings = useBookStore(s => s.rewriteWithNewSettings);

  function handleRegenerate() {
    cancelGeneration();
    setSettingsChanged(false);
    hasStarted.current = true;
    // Use fast rewrite path — skips re-upload and re-analysis
    rewriteWithNewSettings();
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h3 className="text-xl font-semibold mb-2 text-red-300">{t('generationFailed')}</h3>
        <p className="text-gray-400 mb-4 max-w-md mx-auto">{error}</p>
        {generationId && (
          <p className="text-xs text-gray-600 mb-6 font-mono">
            Ref: {generationId.slice(0, 12)}
          </p>
        )}
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => {
              hasStarted.current = true;
              retryGeneration();
            }}
            className="px-6 py-2.5 rounded-lg bg-violet-600 text-white hover:bg-violet-500 transition-colors font-medium"
          >
            {t('retry') || 'Retry'}
          </button>
          <button
            onClick={prevStep}
            className="px-6 py-2.5 rounded-lg border border-gray-700 text-gray-300 hover:border-gray-500 transition-colors"
          >
            {t('goBackTryAgain')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="py-6 relative">
      {bookDraft ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-2xl font-bold mb-2">{t('yourBookIsReady')}</h3>
          <p className="text-gray-400">{t('openingTheEditor')}</p>
          {settingsChanged && (
            <button
              onClick={handleRegenerate}
              className="mt-4 px-6 py-2.5 rounded-lg bg-rose-500/20 border border-rose-500/30 text-rose-300 hover:bg-rose-500/30 transition-colors"
            >
              {t('regenerateWithNewSettings')}
            </button>
          )}
        </motion.div>
      ) : (
        <>
          <h3 className="text-2xl font-bold mb-8 text-center">{t('creatingYourMemoryBook')}</h3>
          <GenerationAnimation progress={generationProgress} images={images} cartoonImages={cartoonImages} generationStage={generationStage} totalPages={generationTotalPages} currentPage={generationCurrentPage} />

          {/* Settings toggle button */}
          <div className="flex justify-center mt-6">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-gray-400 border border-gray-700 hover:border-gray-600 hover:text-gray-300 transition-all"
            >
              <Settings className="w-4 h-4" />
              {showSettings ? t('hideSettings') : t('adjustSettings')}
            </button>
          </div>
        </>
      )}

      {/* Collapsible settings panel */}
      <AnimatePresence>
        {showSettings && !bookDraft && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="mt-6 max-w-lg mx-auto bg-gray-900/80 backdrop-blur-md border border-gray-700 rounded-2xl p-5 space-y-5">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-gray-200">{t('settings')}</h4>
                <button onClick={() => setShowSettings(false)} className="text-gray-500 hover:text-gray-300">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] text-violet-400 uppercase tracking-wider font-medium mb-2">{t('designStyle')}</label>
                  <DesignStyleSection
                    selectedTemplate={settings.selectedTemplate}
                    templates={templates}
                    onSelectTemplate={handleTemplateSelect}
                    imageLook={settings.imageLook}
                    setImageLook={handleSettingChange(settings.setImageLook)}
                    previewPhoto={images[0]?.previewUrl}
                    compact
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-violet-400 uppercase tracking-wider font-medium mb-2">{t('aboutYou')}</label>
                  <AboutYouSection
                    partnerNames={settings.partnerNames}
                    setPartnerNames={handleSettingChange(settings.setPartnerNames)}
                    occasion={settings.occasion}
                    setOccasion={handleSettingChange(settings.setOccasion)}
                    vibe={settings.vibe}
                    setVibe={handleSettingChange(settings.setVibe)}
                    compact
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-violet-400 uppercase tracking-wider font-medium mb-2">{t('bookFormat')}</label>
                  <BookFormatSection
                    designScale={settings.designScale}
                    setDesignScale={handleSettingChange(settings.setDesignScale)}
                    imageDensity={settings.imageDensity}
                    setImageDensity={handleSettingChange(settings.setImageDensity)}
                    compact
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-violet-400 uppercase tracking-wider font-medium mb-2">{t('extras')}</label>
                  <ExtrasSection
                    addOns={settings.addOns}
                    setAddOn={(key, val) => { settings.setAddOn(key, val); setSettingsChanged(true); }}
                    includeQuotes={settings.includeQuotes}
                    setIncludeQuotes={handleSettingChange(settings.setIncludeQuotes)}
                  />
                </div>
              </div>

              {settingsChanged && isGenerating && (
                <button
                  onClick={handleRegenerate}
                  className="w-full py-2.5 rounded-lg bg-rose-500/20 border border-rose-500/30 text-rose-300 hover:bg-rose-500/30 transition-colors text-sm font-medium"
                >
                  {t('regenerateWithNewSettings')}
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
