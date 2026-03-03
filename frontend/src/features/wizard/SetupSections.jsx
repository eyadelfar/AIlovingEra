import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Heart, CloudRain, Laugh, Zap, Film, Gem,
  ChevronRight,
} from 'lucide-react';
import {
  OCCASIONS, VIBES, IMAGE_LOOKS, PAGE_SIZES, ADD_ONS, IMAGE_DENSITIES,
} from '../../lib/constants';
import { IMAGE_LOOK_CSS_FILTERS } from '../../lib/previewFilters';
import SamplePhoto from './SamplePhoto';

const VIBE_ICONS = {
  romantic_warm: Heart,
  bittersweet_lovely: CloudRain,
  playful_meme: Laugh,
  comic_illustrated: Zap,
  cinematic_poetic: Film,
  minimal_luxury: Gem,
};

function PhotoLookThumbnail({ lookValue, previewUrl }) {
  const filter = IMAGE_LOOK_CSS_FILTERS[lookValue] || 'none';
  return (
    <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 border border-gray-700">
      {previewUrl ? (
        <img src={previewUrl} alt="" className="w-full h-full object-cover" style={{ filter }} />
      ) : (
        <SamplePhoto cssFilter={filter} className="w-full h-full" />
      )}
    </div>
  );
}

export function DesignStyleSection({ selectedTemplate, templates, onSelectTemplate, imageLook, setImageLook, previewPhoto, compact }) {
  const { t } = useTranslation('wizard');
  const [showPhotoLookCustomize, setShowPhotoLookCustomize] = useState(false);

  return (
    <div className={compact ? 'space-y-4' : 'space-y-8'}>
      {templates.length > 0 && (
        <div className={compact ? 'grid grid-cols-2 gap-2' : 'grid grid-cols-1 sm:grid-cols-2 gap-4 p-1'}>
          {templates.map(t => (
            <button
              key={t.slug}
              onClick={() => onSelectTemplate(t.slug)}
              className={`p-2 rounded-xl text-start transition-all border ${
                selectedTemplate === t.slug
                  ? 'border-rose-500 bg-rose-500/10 ring-1 ring-rose-500/30'
                  : 'border-gray-700 bg-gray-900/40 hover:border-gray-600'
              }`}
            >
              <span className={`block text-sm font-medium ${selectedTemplate === t.slug ? 'text-rose-300' : 'text-gray-300'}`}>
                {t.name}
              </span>
            </button>
          ))}
        </div>
      )}

      {selectedTemplate && (
        <div>
          <button
            onClick={() => setShowPhotoLookCustomize(prev => !prev)}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-300 transition-colors"
          >
            <ChevronRight className={`h-4 w-4 transition-transform ${showPhotoLookCustomize ? 'rotate-90' : ''}`} />
            {t('photoStyle')}
            <span className="text-xs text-gray-600">
              ({t(IMAGE_LOOKS.find(l => l.value === imageLook)?.i18nLabel || 'lookNatural')})
            </span>
          </button>
          <AnimatePresence initial={false}>
            {showPhotoLookCustomize && (
              <motion.div
                key="photo-look"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: 'easeInOut' }}
                className="overflow-hidden"
              >
                <div className={`mt-3 grid ${compact ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4'} gap-3`}>
                  {IMAGE_LOOKS.map(look => (
                    <button
                      key={look.value}
                      onClick={() => setImageLook(look.value)}
                      className={`flex items-start gap-2 px-2 py-2 rounded-xl text-start transition-all border ${
                        imageLook === look.value
                          ? 'border-rose-500 bg-rose-500/10 ring-1 ring-rose-500/30'
                          : 'border-gray-700 bg-gray-900/40 hover:border-gray-600'
                      }`}
                    >
                      <PhotoLookThumbnail lookValue={look.value} previewUrl={previewPhoto} />
                      <div className="min-w-0 flex-1">
                        <span className={`block text-xs font-medium ${imageLook === look.value ? 'text-rose-300' : 'text-gray-300'}`}>
                          {t(look.i18nLabel)}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

export function AboutYouSection({ partnerNames, setPartnerNames, occasion, setOccasion, vibe, setVibe, compact }) {
  const { t } = useTranslation('wizard');
  function updateName(index, value) {
    const updated = [...partnerNames];
    updated[index] = value;
    setPartnerNames(updated);
  }

  return (
    <div className={compact ? 'space-y-3' : 'space-y-6'}>
      <div className={`grid grid-cols-1 ${compact ? '' : 'sm:grid-cols-2'} gap-3`}>
        <div>
          <label className="block text-xs text-gray-500 mb-1">{t('yourNames')}</label>
          <input
            type="text"
            value={partnerNames[0]}
            onChange={e => updateName(0, e.target.value)}
            placeholder={t('yourNamesPlaceholderShort')}
            className="w-full bg-gray-900/60 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-rose-500/50"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">{t('partnerNames')}</label>
          <input
            type="text"
            value={partnerNames[1]}
            onChange={e => updateName(1, e.target.value)}
            placeholder={t('partnerNamesPlaceholderShort')}
            className="w-full bg-gray-900/60 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-rose-500/50"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-1">{t('occasion')}</label>
        <select
          value={occasion}
          onChange={e => setOccasion(e.target.value)}
          className="w-full bg-gray-900/60 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-rose-500/50"
        >
          {OCCASIONS.map(o => (
            <option key={o.value} value={o.value}>{t(o.i18nLabel)}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-1">{t('vibe')}</label>
        <div className={`grid ${compact ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'} gap-2`}>
          {VIBES.map(v => {
            const VibeIcon = VIBE_ICONS[v.value];
            return (
              <button
                key={v.value}
                onClick={() => setVibe(v.value)}
                className={`px-2 py-2 rounded-xl text-start transition-all border ${
                  vibe === v.value
                    ? 'border-rose-500 bg-rose-500/10 ring-1 ring-rose-500/30'
                    : 'border-gray-700 bg-gray-900/40 hover:border-gray-600'
                }`}
              >
                <span className={`flex items-center gap-1 text-xs font-medium ${vibe === v.value ? 'text-rose-300' : 'text-gray-300'}`}>
                  {VibeIcon && <VibeIcon className="w-3 h-3 flex-shrink-0" />}
                  {t(v.i18nLabel)}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function BookFormatSection({ designScale, setDesignScale, imageDensity, setImageDensity, compact }) {
  const { t } = useTranslation('wizard');
  return (
    <div className={compact ? 'space-y-3' : 'space-y-6'}>
      <div>
        <label className="block text-xs text-gray-500 mb-1">{t('pageSize')}</label>
        <div className={`grid ${compact ? 'grid-cols-2' : 'grid-cols-4'} gap-2`}>
          {PAGE_SIZES.map(s => (
            <button
              key={s.value}
              onClick={() => setDesignScale({ pageSize: s.value })}
              className={`px-2 py-2 rounded-xl text-center transition-all border ${
                designScale.pageSize === s.value
                  ? 'border-rose-500 bg-rose-500/10 ring-1 ring-rose-500/30'
                  : 'border-gray-700 bg-gray-900/40 hover:border-gray-600'
              }`}
            >
              <span className={`block text-xs font-medium ${designScale.pageSize === s.value ? 'text-rose-300' : 'text-gray-200'}`}>
                {t(s.i18nLabel)}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-1">{t('imageDensity')}</label>
        <div className={`grid ${compact ? 'grid-cols-2' : 'grid-cols-4'} gap-2`}>
          {IMAGE_DENSITIES.map(d => (
            <button
              key={d.value}
              onClick={() => setImageDensity(d.value)}
              className={`px-2 py-2 rounded-xl text-center transition-all border ${
                imageDensity === d.value
                  ? 'border-rose-500 bg-rose-500/10 ring-1 ring-rose-500/30'
                  : 'border-gray-700 bg-gray-900/40 hover:border-gray-600'
              }`}
            >
              <span className={`block text-xs font-medium ${imageDensity === d.value ? 'text-rose-300' : 'text-gray-200'}`}>
                {t(d.i18nLabel)}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-1">{t('pageCount')}</label>
        <div className="flex gap-2">
          <button
            onClick={() => setDesignScale({ pageCountTarget: 0 })}
            className={`px-3 py-2 rounded-lg text-xs font-medium transition-all border ${
              designScale.pageCountTarget === 0
                ? 'border-rose-500 bg-rose-500/10 text-rose-300'
                : 'border-gray-700 bg-gray-900/40 text-gray-400 hover:border-gray-600'
            }`}
          >
            {t('auto')}
          </button>
          <input
            type="number"
            min={8}
            max={200}
            step={2}
            value={designScale.pageCountTarget === 0 ? '' : designScale.pageCountTarget}
            onChange={e => {
              const val = parseInt(e.target.value, 10);
              if (!isNaN(val) && val >= 1 && val <= 200) setDesignScale({ pageCountTarget: val });
            }}
            onFocus={() => { if (designScale.pageCountTarget === 0) setDesignScale({ pageCountTarget: 24 }); }}
            placeholder={t('pageCountPlaceholder')}
            className="flex-1 bg-gray-900/60 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-rose-500/50"
          />
        </div>
      </div>
    </div>
  );
}

export function ExtrasSection({ addOns, setAddOn, includeQuotes, setIncludeQuotes }) {
  const { t } = useTranslation('wizard');
  return (
    <div className="space-y-3">
      {ADD_ONS.map(addon => {
        const isComingSoon = addon.key === 'audioQrCodes';
        return (
          <label
            key={addon.key}
            className={`flex items-start gap-2 p-2 rounded-lg border border-gray-800 transition-colors ${
              isComingSoon ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-gray-700'
            }`}
          >
            <input
              type="checkbox"
              checked={addOns[addon.key] ?? false}
              onChange={e => setAddOn(addon.key, e.target.checked)}
              disabled={isComingSoon}
              className="mt-0.5 w-4 h-4 rounded border-gray-600 text-rose-500 focus:ring-rose-500 bg-gray-800"
            />
            <div>
              <span className="text-xs text-gray-200 font-medium">{t(addon.i18nLabel)}</span>
              <span className="block text-[10px] text-gray-500">{t(addon.i18nDesc)}</span>
            </div>
          </label>
        );
      })}
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={includeQuotes}
          onChange={e => setIncludeQuotes(e.target.checked)}
          className="w-4 h-4 rounded border-gray-600 text-rose-500 focus:ring-rose-500 bg-gray-800"
        />
        <span className="text-xs text-gray-300">{t('includeQuotesShort')}</span>
      </label>
    </div>
  );
}
