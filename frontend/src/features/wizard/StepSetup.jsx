import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Heart, CloudRain, Laugh, Zap, Film, Gem,
  ChevronDown, ChevronRight,
} from 'lucide-react';
import { fetchTemplates } from '../../api/templateApi';
import useBookStore from '../../stores/bookStore';
import {
  STRUCTURE_TEMPLATES, OCCASIONS, VIBES,
  IMAGE_LOOKS, PAGE_SIZES, ADD_ONS, TEMPLATE_DEFAULTS, IMAGE_DENSITIES,
} from '../../lib/constants';
import { IMAGE_LOOK_CSS_FILTERS } from '../../lib/previewFilters';
import TemplateCard from './TemplateCard';
import SamplePhoto from './SamplePhoto';
import LoadingSpinner from '../shared/LoadingSpinner';

const VIBE_ICONS = {
  romantic_warm: Heart,
  bittersweet_lovely: CloudRain,
  playful_meme: Laugh,
  comic_illustrated: Zap,
  cinematic_poetic: Film,
  minimal_luxury: Gem,
};

const sectionVariants = {
  hidden: { height: 0, opacity: 0, overflow: 'hidden' },
  visible: { height: 'auto', opacity: 1, overflow: 'hidden' },
  exit: { height: 0, opacity: 0, overflow: 'hidden' },
};

function SectionHeader({ title, subtitle, isOpen, onToggle }) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between py-3 group"
    >
      <div className="text-left">
        <h3 className="text-lg font-semibold text-gray-100 group-hover:text-white transition-colors">
          {title}
        </h3>
        {subtitle && !isOpen && (
          <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>
        )}
      </div>
      <ChevronDown
        className={`h-5 w-5 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
      />
    </button>
  );
}

function PageSizeIcon({ type, isSelected }) {
  const stroke = isSelected ? '#fb7185' : '#6b7280';
  const fill = isSelected ? 'rgba(251,113,133,0.08)' : 'rgba(107,114,128,0.06)';

  if (type === 'a4') {
    // Tall rectangle: A4 proportions 210x297 => ~0.707 ratio
    return (
      <svg viewBox="0 0 40 56" className="w-8 h-11 mx-auto">
        <rect x="2" y="2" width="36" height="52" rx="2" fill={fill} stroke={stroke} strokeWidth="2" />
        <line x1="8" y1="14" x2="32" y2="14" stroke={stroke} strokeWidth="1" opacity="0.4" />
        <line x1="8" y1="20" x2="28" y2="20" stroke={stroke} strokeWidth="1" opacity="0.3" />
        <rect x="8" y="26" width="24" height="16" rx="1" fill={stroke} opacity="0.15" />
      </svg>
    );
  }
  if (type === 'us_letter') {
    // Slightly shorter rectangle: 8.5x11 => ~0.773 ratio
    return (
      <svg viewBox="0 0 40 52" className="w-8 h-10 mx-auto">
        <rect x="2" y="2" width="36" height="48" rx="2" fill={fill} stroke={stroke} strokeWidth="2" />
        <line x1="8" y1="12" x2="32" y2="12" stroke={stroke} strokeWidth="1" opacity="0.4" />
        <line x1="8" y1="18" x2="28" y2="18" stroke={stroke} strokeWidth="1" opacity="0.3" />
        <rect x="8" y="24" width="24" height="14" rx="1" fill={stroke} opacity="0.15" />
      </svg>
    );
  }
  // Square: 8.5x8.5
  return (
    <svg viewBox="0 0 44 44" className="w-9 h-9 mx-auto">
      <rect x="2" y="2" width="40" height="40" rx="2" fill={fill} stroke={stroke} strokeWidth="2" />
      <line x1="8" y1="12" x2="36" y2="12" stroke={stroke} strokeWidth="1" opacity="0.4" />
      <line x1="8" y1="17" x2="30" y2="17" stroke={stroke} strokeWidth="1" opacity="0.3" />
      <rect x="8" y="22" width="28" height="14" rx="1" fill={stroke} opacity="0.15" />
    </svg>
  );
}

function DensityIcon({ type, isSelected }) {
  const stroke = isSelected ? '#fb7185' : '#6b7280';
  const fill = isSelected ? 'rgba(251,113,133,0.08)' : 'rgba(107,114,128,0.06)';

  if (type === 'grid') {
    return (
      <svg viewBox="0 0 40 40" className="w-8 h-8 mx-auto">
        <rect x="2" y="2" width="17" height="17" rx="2" fill={fill} stroke={stroke} strokeWidth="1.5" />
        <rect x="21" y="2" width="17" height="17" rx="2" fill={fill} stroke={stroke} strokeWidth="1.5" />
        <rect x="2" y="21" width="17" height="17" rx="2" fill={fill} stroke={stroke} strokeWidth="1.5" />
        <rect x="21" y="21" width="17" height="17" rx="2" fill={fill} stroke={stroke} strokeWidth="1.5" opacity="0.5" />
      </svg>
    );
  }
  if (type === 'stack') {
    return (
      <svg viewBox="0 0 40 40" className="w-8 h-8 mx-auto">
        <rect x="4" y="2" width="32" height="17" rx="2" fill={fill} stroke={stroke} strokeWidth="1.5" />
        <rect x="4" y="22" width="15" height="16" rx="2" fill={fill} stroke={stroke} strokeWidth="1.5" />
        <line x1="23" y1="26" x2="35" y2="26" stroke={stroke} strokeWidth="1" opacity="0.4" />
        <line x1="23" y1="31" x2="32" y2="31" stroke={stroke} strokeWidth="1" opacity="0.3" />
      </svg>
    );
  }
  // frame (airy)
  return (
    <svg viewBox="0 0 40 40" className="w-8 h-8 mx-auto">
      <rect x="8" y="4" width="24" height="24" rx="2" fill={fill} stroke={stroke} strokeWidth="1.5" />
      <line x1="10" y1="32" x2="30" y2="32" stroke={stroke} strokeWidth="1" opacity="0.4" />
      <line x1="12" y1="36" x2="28" y2="36" stroke={stroke} strokeWidth="1" opacity="0.3" />
    </svg>
  );
}

function PhotoLookThumbnail({ lookValue, previewUrl }) {
  const filter = IMAGE_LOOK_CSS_FILTERS[lookValue] || 'none';

  return (
    <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 border border-gray-700">
      {previewUrl ? (
        <img
          src={previewUrl}
          alt=""
          className="w-full h-full object-cover"
          style={{ filter }}
        />
      ) : (
        <SamplePhoto cssFilter={filter} className="w-full h-full" />
      )}
    </div>
  );
}

function SettingsSummary({
  selectedTemplate, templates, vibe, imageLook,
  designScale, images, isAutoPageCount, partnerNames,
  occasion, openSections,
}) {
  const anyCollapsed = Object.values(openSections).some(v => !v);
  if (!anyCollapsed) return null;

  const chips = [];

  if (selectedTemplate) {
    const t = templates.find(t => t.slug === selectedTemplate);
    chips.push({ key: 'template', label: t?.name || selectedTemplate });
  }
  if (vibe) {
    const v = VIBES.find(v => v.value === vibe);
    const VibeIcon = VIBE_ICONS[vibe];
    chips.push({ key: 'vibe', label: v?.label || vibe, icon: VibeIcon });
  }
  if (imageLook && imageLook !== 'natural') {
    const l = IMAGE_LOOKS.find(l => l.value === imageLook);
    chips.push({ key: 'look', label: l?.label || imageLook });
  }
  const sizeObj = PAGE_SIZES.find(s => s.value === designScale.pageSize);
  if (sizeObj) {
    chips.push({ key: 'size', label: sizeObj.label });
  }
  if (isAutoPageCount && images.length > 0) {
    chips.push({ key: 'pages', label: `~${estimatePageCount(images.length)} pages` });
  } else if (!isAutoPageCount && designScale.pageCountTarget > 0) {
    chips.push({ key: 'pages', label: `${designScale.pageCountTarget} pages` });
  }
  if (images.length > 0) {
    chips.push({ key: 'photos', label: `${images.length} photo${images.length !== 1 ? 's' : ''}` });
  }
  const names = partnerNames.filter(Boolean).join(' & ');
  if (names) {
    chips.push({ key: 'names', label: names });
  }
  if (occasion) {
    const o = OCCASIONS.find(o => o.value === occasion);
    if (o) chips.push({ key: 'occasion', label: o.label });
  }

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5 mb-5">
      {chips.map(chip => (
        <span
          key={chip.key}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-800 text-gray-300 border border-gray-700"
        >
          {chip.icon && <chip.icon className="w-3 h-3" />}
          {chip.label}
        </span>
      ))}
    </div>
  );
}

function estimatePageCount(numPhotos) {
  const base = Math.max(8, Math.round(numPhotos * 1.2));
  return Math.min(200, base + 4);
}

export default function StepSetup() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openSections, setOpenSections] = useState({
    design: true,
    about: true,
    format: true,
    extras: false,
  });
  const [showPhotoLookCustomize, setShowPhotoLookCustomize] = useState(false);

  const selectedTemplate = useBookStore(s => s.selectedTemplate);
  const setTemplate = useBookStore(s => s.setTemplate);
  const structureTemplate = useBookStore(s => s.structureTemplate);
  const setStructureTemplate = useBookStore(s => s.setStructureTemplate);

  const partnerNames = useBookStore(s => s.partnerNames);
  const setPartnerNames = useBookStore(s => s.setPartnerNames);
  const occasion = useBookStore(s => s.occasion);
  const setOccasion = useBookStore(s => s.setOccasion);
  const vibe = useBookStore(s => s.vibe);
  const setVibe = useBookStore(s => s.setVibe);

  const imageLook = useBookStore(s => s.imageLook);
  const setImageLook = useBookStore(s => s.setImageLook);
  const designScale = useBookStore(s => s.designScale);
  const setDesignScale = useBookStore(s => s.setDesignScale);

  const includeQuotes = useBookStore(s => s.includeQuotes);
  const setIncludeQuotes = useBookStore(s => s.setIncludeQuotes);
  const addOns = useBookStore(s => s.addOns);
  const setAddOn = useBookStore(s => s.setAddOn);
  const images = useBookStore(s => s.images);
  const imageDensity = useBookStore(s => s.imageDensity);
  const setImageDensity = useBookStore(s => s.setImageDensity);

  useEffect(() => {
    fetchTemplates()
      .then(setTemplates)
      .catch(() => toast.error('Failed to load templates'))
      .finally(() => setLoading(false));
  }, []);

  function toggleSection(key) {
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
  }

  function updateName(index, value) {
    const updated = [...partnerNames];
    updated[index] = value;
    setPartnerNames(updated);
  }

  function handleTemplateSelect(slug) {
    setTemplate(slug);
    const defaults = TEMPLATE_DEFAULTS[slug];
    if (defaults?.imageLook) {
      setImageLook(defaults.imageLook);
      setShowPhotoLookCustomize(false);
    }
  }

  const isAutoPageCount = designScale.pageCountTarget === 0;
  const previewPhoto = images[0]?.previewUrl || null;

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner size="lg" className="text-rose-400" />
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-1">Set Up Your Book</h2>
      <p className="text-gray-400 mb-6">Choose your style, add your details, and pick the format.</p>

      <SettingsSummary
        selectedTemplate={selectedTemplate}
        templates={templates}
        vibe={vibe}
        imageLook={imageLook}
        designScale={designScale}
        images={images}
        isAutoPageCount={isAutoPageCount}
        partnerNames={partnerNames}
        occasion={occasion}
        openSections={openSections}
      />

      <div className="space-y-1">
        <div className="border-b border-gray-800">
          <SectionHeader
            title="Design Style"
            subtitle={selectedTemplate ? `${selectedTemplate} \u00B7 ${IMAGE_LOOKS.find(l => l.value === imageLook)?.label || 'Natural'} photos` : 'Choose a template'}
            isOpen={openSections.design}
            onToggle={() => toggleSection('design')}
          />
          <AnimatePresence initial={false}>
            {openSections.design && (
              <motion.div
                key="design-content"
                initial="hidden"
                animate="visible"
                exit="exit"
                variants={sectionVariants}
                transition={{ duration: 0.25, ease: 'easeInOut' }}
              >
                <div className="pb-6 space-y-8">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-1">
                    {templates.map(t => (
                      <TemplateCard
                        key={t.slug}
                        template={t}
                        isSelected={selectedTemplate === t.slug}
                        onSelect={handleTemplateSelect}
                        previewPhoto={previewPhoto}
                        imageLook={imageLook}
                      />
                    ))}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Book Structure</label>
                    <p className="text-xs text-gray-500 mb-3">How your story will be organized into chapters.</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {STRUCTURE_TEMPLATES.map(st => (
                        <button
                          key={st.value}
                          onClick={() => setStructureTemplate(st.value)}
                          className={`p-3 rounded-xl text-left transition-all border ${
                            structureTemplate === st.value
                              ? 'border-rose-500 bg-rose-500/10 ring-1 ring-rose-500/30'
                              : 'border-gray-700 bg-gray-900/40 hover:border-gray-600'
                          }`}
                        >
                          <span className={`block text-sm font-semibold ${
                            structureTemplate === st.value ? 'text-rose-300' : 'text-gray-200'
                          }`}>
                            {st.label}
                          </span>
                          <span className="block text-xs text-gray-500 mt-1">{st.description}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {selectedTemplate && (
                    <div>
                      <button
                        onClick={() => setShowPhotoLookCustomize(prev => !prev)}
                        className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-300 transition-colors"
                      >
                        <ChevronRight
                          className={`h-4 w-4 transition-transform ${showPhotoLookCustomize ? 'rotate-90' : ''}`}
                        />
                        Customize Photo Style
                        <span className="text-xs text-gray-600">
                          (currently: {IMAGE_LOOKS.find(l => l.value === imageLook)?.label || 'Natural'})
                        </span>
                      </button>
                      <AnimatePresence initial={false}>
                        {showPhotoLookCustomize && (
                          <motion.div
                            key="photo-look-content"
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2, ease: 'easeInOut' }}
                            className="overflow-hidden"
                          >
                            <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
                              {IMAGE_LOOKS.map(look => (
                                <button
                                  key={look.value}
                                  onClick={() => setImageLook(look.value)}
                                  className={`flex items-start gap-3 px-3 py-3 rounded-xl text-left transition-all border ${
                                    imageLook === look.value
                                      ? 'border-rose-500 bg-rose-500/10 ring-1 ring-rose-500/30'
                                      : 'border-gray-700 bg-gray-900/40 hover:border-gray-600'
                                  }`}
                                >
                                  <PhotoLookThumbnail
                                    lookValue={look.value}
                                    previewUrl={previewPhoto}
                                  />
                                  <div className="min-w-0 flex-1">
                                    <span className={`block text-sm font-medium ${imageLook === look.value ? 'text-rose-300' : 'text-gray-300'}`}>
                                      {look.label}
                                    </span>
                                    <span className="block text-xs text-gray-500 mt-0.5">{look.description}</span>
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
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="border-b border-gray-800">
          <SectionHeader
            title="About You"
            subtitle={partnerNames.filter(Boolean).join(' & ') || 'Names, occasion, mood'}
            isOpen={openSections.about}
            onToggle={() => toggleSection('about')}
          />
          <AnimatePresence initial={false}>
            {openSections.about && (
              <motion.div
                key="about-content"
                initial="hidden"
                animate="visible"
                exit="exit"
                variants={sectionVariants}
                transition={{ duration: 0.25, ease: 'easeInOut' }}
              >
                <div className="pb-6 space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Your Names</label>
                    <div className="grid grid-cols-2 gap-4">
                      <input
                        type="text"
                        value={partnerNames[0]}
                        onChange={e => updateName(0, e.target.value)}
                        placeholder="Your name"
                        className="bg-gray-900/60 border border-gray-700 rounded-lg px-4 py-2.5 text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500/50"
                      />
                      <input
                        type="text"
                        value={partnerNames[1]}
                        onChange={e => updateName(1, e.target.value)}
                        placeholder="Partner's name"
                        className="bg-gray-900/60 border border-gray-700 rounded-lg px-4 py-2.5 text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500/50"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-2">So AI can address you by name throughout the book</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Special Occasion</label>
                    <select
                      value={occasion}
                      onChange={e => setOccasion(e.target.value)}
                      className="w-full bg-gray-900/60 border border-gray-700 rounded-lg px-4 py-2.5 text-gray-200 focus:outline-none focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500/50"
                    >
                      {OCCASIONS.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Vibe & Mood</label>
                    <p className="text-xs text-gray-500 mb-3">Sets the tone for writing and visual style</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {VIBES.map(v => {
                        const VibeIcon = VIBE_ICONS[v.value];
                        return (
                          <button
                            key={v.value}
                            onClick={() => setVibe(v.value)}
                            className={`px-3 py-3 rounded-xl text-left transition-all border ${
                              vibe === v.value
                                ? 'border-rose-500 bg-rose-500/10 ring-1 ring-rose-500/30'
                                : 'border-gray-700 bg-gray-900/40 hover:border-gray-600'
                            }`}
                          >
                            <span className={`flex items-center gap-1.5 text-sm font-medium ${vibe === v.value ? 'text-rose-300' : 'text-gray-300'}`}>
                              {VibeIcon && <VibeIcon className="w-4 h-4 flex-shrink-0" />}
                              {v.label}
                            </span>
                            <span className="block text-xs text-gray-500 mt-0.5">{v.description}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="border-b border-gray-800">
          <SectionHeader
            title="Book Format"
            subtitle={`${PAGE_SIZES.find(s => s.value === designScale.pageSize)?.label || 'A4'} \u00B7 ${isAutoPageCount ? 'Auto pages' : `${designScale.pageCountTarget} pages`}`}
            isOpen={openSections.format}
            onToggle={() => toggleSection('format')}
          />
          <AnimatePresence initial={false}>
            {openSections.format && (
              <motion.div
                key="format-content"
                initial="hidden"
                animate="visible"
                exit="exit"
                variants={sectionVariants}
                transition={{ duration: 0.25, ease: 'easeInOut' }}
              >
                <div className="pb-6 space-y-6">
                  <div>
                    <label className="block text-xs text-gray-500 mb-2">Page Size</label>
                    <div className="grid grid-cols-3 gap-3">
                      {PAGE_SIZES.map(s => (
                        <button
                          key={s.value}
                          onClick={() => setDesignScale({ pageSize: s.value })}
                          className={`flex flex-col items-center gap-2 p-3 sm:p-4 rounded-xl transition-all border ${
                            designScale.pageSize === s.value
                              ? 'border-rose-500 bg-rose-500/10 ring-1 ring-rose-500/30'
                              : 'border-gray-700 bg-gray-900/40 hover:border-gray-600'
                          }`}
                        >
                          <PageSizeIcon type={s.value} isSelected={designScale.pageSize === s.value} />
                          <div className="text-center">
                            <span className={`block text-sm font-semibold ${
                              designScale.pageSize === s.value ? 'text-rose-300' : 'text-gray-200'
                            }`}>
                              {s.label}
                            </span>
                            <span className="block text-[11px] text-gray-500 mt-0.5">{s.description}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-500 mb-2">Photos Per Page</label>
                    <div className="grid grid-cols-3 gap-3">
                      {IMAGE_DENSITIES.map(d => (
                        <button
                          key={d.value}
                          onClick={() => setImageDensity(d.value)}
                          className={`flex flex-col items-center gap-2 p-3 sm:p-4 rounded-xl transition-all border ${
                            imageDensity === d.value
                              ? 'border-rose-500 bg-rose-500/10 ring-1 ring-rose-500/30'
                              : 'border-gray-700 bg-gray-900/40 hover:border-gray-600'
                          }`}
                        >
                          <DensityIcon type={d.icon} isSelected={imageDensity === d.value} />
                          <div className="text-center">
                            <span className={`block text-sm font-semibold ${
                              imageDensity === d.value ? 'text-rose-300' : 'text-gray-200'
                            }`}>
                              {d.label}
                            </span>
                            <span className="block text-[11px] text-gray-500 mt-0.5">{d.description}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Page Count</label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setDesignScale({ pageCountTarget: 0 })}
                        className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all border ${
                          isAutoPageCount
                            ? 'border-rose-500 bg-rose-500/10 text-rose-300'
                            : 'border-gray-700 bg-gray-900/40 text-gray-400 hover:border-gray-600'
                        }`}
                      >
                        Auto
                      </button>
                      <input
                        type="number"
                        min={8}
                        max={200}
                        step={2}
                        value={isAutoPageCount ? '' : designScale.pageCountTarget}
                        onChange={e => {
                          const val = parseInt(e.target.value, 10);
                          if (!isNaN(val) && val >= 1 && val <= 200) {
                            setDesignScale({ pageCountTarget: val });
                          }
                        }}
                        onFocus={() => {
                          if (isAutoPageCount) setDesignScale({ pageCountTarget: 24 });
                        }}
                        placeholder="e.g. 36"
                        className="flex-1 bg-gray-900/60 border border-gray-700 rounded-lg px-3 py-2.5 text-gray-200 placeholder-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500/50"
                      />
                    </div>
                    {isAutoPageCount && images.length > 0 && (
                      <p className="text-xs text-gray-500 mt-1.5">
                        ~{estimatePageCount(images.length)} pages based on {images.length} photo{images.length !== 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div>
          <SectionHeader
            title="Extras"
            subtitle="Add-ons and quotes"
            isOpen={openSections.extras}
            onToggle={() => toggleSection('extras')}
          />
          <AnimatePresence initial={false}>
            {openSections.extras && (
              <motion.div
                key="extras-content"
                initial="hidden"
                animate="visible"
                exit="exit"
                variants={sectionVariants}
                transition={{ duration: 0.25, ease: 'easeInOut' }}
              >
                <div className="pb-6 space-y-5">
                  <div className="space-y-3">
                    {ADD_ONS.map(addon => {
                      const isComingSoon = addon.key === 'audioQrCodes';
                      return (
                        <label
                          key={addon.key}
                          className={`flex items-start gap-3 p-3 rounded-lg border border-gray-800 transition-colors ${
                            isComingSoon ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-gray-700'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={addOns[addon.key] ?? false}
                            onChange={e => setAddOn(addon.key, e.target.checked)}
                            disabled={isComingSoon}
                            className="mt-0.5 w-4 h-4 rounded border-gray-600 text-rose-500 focus:ring-rose-500 bg-gray-800 disabled:opacity-40"
                          />
                          <div>
                            <span className="text-sm text-gray-200 font-medium">
                              {addon.label}
                              {isComingSoon && (
                                <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full bg-gray-700 text-gray-400 font-normal">
                                  Coming Soon
                                </span>
                              )}
                            </span>
                            <span className="block text-xs text-gray-500 mt-0.5">{addon.description}</span>
                          </div>
                        </label>
                      );
                    })}
                  </div>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeQuotes}
                      onChange={e => setIncludeQuotes(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-600 text-rose-500 focus:ring-rose-500 bg-gray-800"
                    />
                    <span className="text-sm text-gray-300">Include inspirational quotes in the book</span>
                  </label>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
