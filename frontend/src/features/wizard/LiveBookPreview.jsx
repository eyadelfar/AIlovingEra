import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown, Heart, Film as FilmIcon, Award,
  Image as ImageIcon, BookOpen, Sparkles,
} from 'lucide-react';
import useBookStore from '../../stores/bookStore';
import { TEMPLATE_STYLES } from '../viewer/templateStyles';
import { PageOrnaments, PageBgPattern } from '../viewer/PageOrnaments';
import { IMAGE_LOOK_CSS_FILTERS } from '../../lib/previewFilters';
import { IMAGE_LOOKS, VIBES, PAGE_ASPECT } from '../../lib/constants';
import SamplePhoto from './SamplePhoto';

// ── Vibe-contextual sample copy ─────────────────────────────────────────
const VIBE_COPY = {
  romantic_warm: {
    coverTitle: 'Our First Dance',
    heading: 'The Moment I Knew',
    body: 'The way you smiled under the fairy lights made everything else disappear.',
    caption: 'A night we will never forget',
  },
  bittersweet_lovely: {
    coverTitle: 'Time Stood Still',
    heading: 'Fading Light',
    body: 'Some moments are too beautiful to forget, too fleeting to hold onto forever.',
    caption: 'Captured before it slipped away',
  },
  playful_meme: {
    coverTitle: 'That One Time...',
    heading: 'Absolute Chaos',
    body: 'When you tried to cook dinner and set off every alarm in the building.',
    caption: 'No regrets, only vibes',
  },
  comic_illustrated: {
    coverTitle: 'Episode One',
    heading: 'Origin Story',
    body: 'The origin story of us begins here, with an unexpected plot twist.',
    caption: 'To be continued...',
  },
  cinematic_poetic: {
    coverTitle: 'Act I: The Meeting',
    heading: 'Golden Hour',
    body: 'In the golden hour light, two paths converged and the world rewrote itself.',
    caption: 'Scene 1 of forever',
  },
  minimal_luxury: {
    coverTitle: 'Beginnings',
    heading: 'Chapter One',
    body: 'A quiet start to an extraordinary story.',
    caption: 'Simply us',
  },
};

const DEFAULT_COPY = VIBE_COPY.romantic_warm;

// ── Photo (real or sample) renderer ─────────────────────────────────────
function PhotoSlot({ src, cssFilter, className = '' }) {
  if (src) {
    return (
      <img
        src={src}
        alt=""
        className={`w-full h-full object-cover ${className}`}
        style={cssFilter !== 'none' ? { filter: cssFilter } : undefined}
        draggable={false}
      />
    );
  }
  return <SamplePhoto cssFilter={cssFilter} className={`w-full h-full ${className}`} />;
}

// ── Cover page ──────────────────────────────────────────────────────────
function CoverPage({ style, cssFilter, photo, aspect, copy, partnerTitle, anniversaryOn }) {
  return (
    <div className={`${aspect} w-full ${style.pageBg} overflow-hidden border ${style.pageBorder} relative ${style.pageTexture} rounded-l-lg`}>
      <PageBgPattern bgPattern={style.bgPattern} />
      {style.cornerOrnament && (
        <PageOrnaments templateType={style.cornerOrnament} stroke={style.ornamentStroke} fill={style.ornamentFill} />
      )}

      {/* Full-bleed photo */}
      <div className="absolute inset-0 z-0">
        <PhotoSlot src={photo} cssFilter={cssFilter} />
      </div>

      {/* Cover gradient overlay */}
      <div className={`absolute inset-0 z-10 ${style.coverOverlay}`} />

      {/* Cover text */}
      <div className="absolute inset-x-0 bottom-0 z-20 p-3">
        <h2 className={`${style.headingLg} text-[11px] leading-tight font-bold truncate`}>
          {partnerTitle || copy.coverTitle}
        </h2>
        <div className={`${style.divider} mt-1.5 mb-1`} />
        <p className={`${style.caption} text-[8px]`}>{copy.caption}</p>
        {anniversaryOn && (
          <p className={`${style.accent} text-[7px] mt-1 font-medium opacity-90`}>
            <Sparkles className="w-2.5 h-2.5 inline-block mr-0.5 -mt-px" />
            Celebrating Our Anniversary
          </p>
        )}
      </div>
    </div>
  );
}

// ── Interior content page ───────────────────────────────────────────────
function InteriorPage({ style, cssFilter, photo, aspect, copy, isSpreadRight }) {
  const roundingClass = isSpreadRight ? 'rounded-r-lg' : 'rounded-lg';

  return (
    <div className={`${aspect} w-full ${style.pageBg} overflow-hidden border ${style.pageBorder} relative ${style.pageTexture} ${roundingClass}`}>
      <PageBgPattern bgPattern={style.bgPattern} />
      {style.cornerOrnament && (
        <PageOrnaments templateType={style.cornerOrnament} stroke={style.ornamentStroke} fill={style.ornamentFill} />
      )}

      <div className={`relative z-20 flex flex-col h-full ${style.innerPadding}`}>
        {/* Photo area — always shows sample or real photo */}
        <div className={`flex-1 min-h-0 mb-2 ${style.photoFrame} overflow-hidden`}>
          <PhotoSlot src={photo} cssFilter={cssFilter} />
        </div>

        {/* Divider */}
        <div className={`${style.divider} mb-1.5`} />

        {/* Text content */}
        <div className="space-y-1">
          <h3 className={`${style.heading} text-[10px] font-semibold truncate`}>
            {copy.heading}
          </h3>
          <p className={`${style.body} text-[8px] leading-relaxed line-clamp-2 opacity-80`}>
            {copy.body}
          </p>
          <p className={`${style.caption} text-[7px] mt-0.5`}>{copy.caption}</p>
        </div>
      </div>
    </div>
  );
}

// ── Love Letter mini preview ────────────────────────────────────────────
function LoveLetterPreview({ style }) {
  return (
    <div className={`${style.pageBg} rounded-lg border ${style.pageBorder} relative ${style.pageTexture} overflow-hidden p-3`}>
      <PageBgPattern bgPattern={style.bgPattern} />
      {style.cornerOrnament && (
        <div className="scale-[0.4] origin-top-left">
          <PageOrnaments templateType={style.cornerOrnament} stroke={style.ornamentStroke} fill={style.ornamentFill} />
        </div>
      )}
      <div className="relative z-20 flex flex-col items-center">
        <h4 className={`${style.heading} text-[9px] font-bold mb-1`}>A Letter For You</h4>
        <div className={`${style.divider} mb-2 !w-10`} />
        {/* Faux text lines */}
        <div className="w-full space-y-1">
          <div className={`h-[2px] rounded-full w-[85%] mx-auto opacity-25 ${_accentBg(style)}`} />
          <div className={`h-[2px] rounded-full w-[70%] mx-auto opacity-20 ${_accentBg(style)}`} />
          <div className={`h-[2px] rounded-full w-[80%] mx-auto opacity-25 ${_accentBg(style)}`} />
          <div className={`h-[2px] rounded-full w-[60%] mx-auto opacity-20 ${_accentBg(style)}`} />
          <div className={`h-[2px] rounded-full w-[75%] mx-auto opacity-25 ${_accentBg(style)}`} />
        </div>
        {/* Heart divider */}
        <div className="mt-2 flex items-center gap-1 opacity-40">
          <div className={`w-5 h-px ${_accentBg(style)}`} />
          <Heart className={`w-2.5 h-2.5 ${_accentText(style)}`} fill="currentColor" />
          <div className={`w-5 h-px ${_accentBg(style)}`} />
        </div>
      </div>
    </div>
  );
}

// ── Anniversary Cover mini preview ──────────────────────────────────────
function AnniversaryCoverPreview({ style, cssFilter, photo, copy, partnerTitle }) {
  return (
    <div className={`aspect-[3/4] w-full ${style.pageBg} rounded-lg overflow-hidden border ${style.pageBorder} relative ${style.pageTexture}`}>
      <PageBgPattern bgPattern={style.bgPattern} />
      {/* Photo background */}
      <div className="absolute inset-0 z-0">
        <PhotoSlot src={photo} cssFilter={cssFilter} />
      </div>
      <div className={`absolute inset-0 z-10 ${style.coverOverlay}`} />
      {/* Cover text with anniversary tagline */}
      <div className="absolute inset-x-0 bottom-0 z-20 p-2">
        <h4 className={`${style.headingLg} text-[9px] font-bold truncate`}>
          {partnerTitle || copy.coverTitle}
        </h4>
        <div className={`${style.divider} mt-1 mb-0.5`} />
        <p className={`${style.caption} text-[6px]`}>{copy.caption}</p>
        <div className={`mt-1 flex items-center gap-0.5 ${style.accent} text-[7px] font-semibold`}>
          <Sparkles className="w-2.5 h-2.5" />
          <span>Celebrating Our Anniversary</span>
        </div>
      </div>
    </div>
  );
}

// ── Mini Reel storyboard preview ────────────────────────────────────────
function MiniReelPreview() {
  const frames = ['The couple meets', 'First adventure', 'A promise made'];
  return (
    <div className="flex gap-1.5 overflow-hidden relative">
      {frames.map((text, idx) => (
        <div key={idx} className="flex-shrink-0 w-[72px] rounded-md border border-gray-700 bg-gray-900/80 overflow-hidden">
          {/* Film header */}
          <div className="flex items-center justify-between px-1.5 py-0.5 bg-gray-800/90 border-b border-gray-700">
            <div className="flex gap-0.5">
              {[0, 1].map(i => (
                <div key={i} className="w-1 h-1 rounded-full bg-gray-600" />
              ))}
            </div>
            <span className="text-[6px] font-mono text-gray-500">{String(idx + 1).padStart(2, '0')}</span>
            <div className="flex gap-0.5">
              {[0, 1].map(i => (
                <div key={i} className="w-1 h-1 rounded-full bg-gray-600" />
              ))}
            </div>
          </div>
          {/* Frame text */}
          <div className="p-1.5">
            <p className="text-[6px] text-gray-400 leading-tight">{text}</p>
          </div>
        </div>
      ))}
      {/* Fade-out right edge */}
      <div className="absolute right-0 top-0 bottom-0 w-4 bg-gradient-to-l from-gray-900/80 to-transparent pointer-events-none" />
    </div>
  );
}

// ── Helper: accent background/text colors from template style ───────────
function _accentBg(style) {
  if (style.accent?.includes('amber')) return 'bg-amber-300';
  if (style.accent?.includes('slate')) return 'bg-slate-400';
  if (style.accent?.includes('rose')) return 'bg-rose-300';
  return 'bg-rose-300';
}
function _accentText(style) {
  if (style.accent?.includes('amber')) return 'text-amber-400';
  if (style.accent?.includes('slate')) return 'text-slate-400';
  if (style.accent?.includes('rose')) return 'text-rose-400';
  return 'text-rose-400';
}

// ── Add-on card wrapper ─────────────────────────────────────────────────
function AddonPreviewCard({ icon: Icon, label, color, children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
      className="rounded-lg border border-gray-800/80 bg-gray-900/50 overflow-hidden"
    >
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 border-b border-gray-800/50">
        <Icon className={`w-3 h-3 ${color}`} />
        <span className="text-[10px] font-medium text-gray-300">{label}</span>
      </div>
      <div className="p-2">
        {children}
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ── MAIN COMPONENT ──────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════
export default function LiveBookPreview() {
  const selectedTemplate = useBookStore(s => s.selectedTemplate);
  const imageLook = useBookStore(s => s.imageLook);
  const pageSize = useBookStore(s => s.designScale).pageSize;
  const images = useBookStore(s => s.images);
  const vibe = useBookStore(s => s.vibe);
  const partnerNames = useBookStore(s => s.partnerNames);
  const addOns = useBookStore(s => s.addOns);

  const [collapsed, setCollapsed] = useState(false);
  const [viewMode, setViewMode] = useState('spread');

  // Derive preview data
  const style = TEMPLATE_STYLES[selectedTemplate] || TEMPLATE_STYLES.romantic;
  const cssFilter = IMAGE_LOOK_CSS_FILTERS[imageLook] || 'none';
  const aspect = PAGE_ASPECT[pageSize] || 'aspect-[3/4]';
  const lookLabel = IMAGE_LOOKS.find(l => l.value === imageLook)?.label || 'Natural';

  // Pick user photos (null = will show SamplePhoto)
  const photos = useMemo(() => {
    const urls = images.slice(0, 3).map(img => img.previewUrl);
    return [urls[0] || null, urls[1] || null, urls[2] || null];
  }, [images]);

  // Vibe-contextual sample copy
  const copy = useMemo(() => VIBE_COPY[vibe] || DEFAULT_COPY, [vibe]);

  // Partner names integration
  const partnerTitle = useMemo(() => {
    const [a, b] = partnerNames;
    if (a && b) return `${a} & ${b}'s Story`;
    if (a) return `${a}'s Story`;
    if (b) return `${b}'s Story`;
    return null;
  }, [partnerNames]);

  // Template display name
  const templateLabel = useMemo(() => {
    const labels = { romantic: 'Romantic', vintage: 'Vintage', elegant: 'Elegant', meme_funny: 'Meme & Fun' };
    return labels[selectedTemplate] || selectedTemplate || '---';
  }, [selectedTemplate]);

  // Count active extras
  const hasAnyExtras = addOns.loveLetter || addOns.anniversaryCover || addOns.miniReel;

  // ── Empty state ─────────────────────────────────────────────────────
  if (!selectedTemplate) {
    return (
      <div className="rounded-xl border border-gray-800 bg-gray-900/40 p-6 text-center">
        <BookOpen className="w-8 h-8 text-gray-700 mx-auto mb-2" />
        <div className="text-gray-600 text-sm">Select a template to see preview</div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/40 overflow-hidden">
      {/* ── Header — collapsible on mobile ───────────────────────────── */}
      <button
        onClick={() => setCollapsed(prev => !prev)}
        className="w-full flex items-center justify-between px-4 py-3 lg:cursor-default"
      >
        <span className="text-sm font-medium text-gray-300">Live Preview</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 truncate max-w-[120px]">
            {templateLabel} &middot; {lookLabel}
          </span>
          <ChevronDown
            className={`h-4 w-4 text-gray-500 transition-transform lg:hidden ${collapsed ? '' : 'rotate-180'}`}
          />
        </div>
      </button>

      {/* ── Collapsible body ─────────────────────────────────────────── */}
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4">
              {/* ── Single / Spread toggle ─────────────────────────────── */}
              <div className="flex items-center justify-center gap-1 mb-3">
                {['single', 'spread'].map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    className={`px-3 py-1 text-[10px] font-medium rounded-md transition-all ${
                      viewMode === mode
                        ? 'bg-violet-600 text-white shadow-sm shadow-violet-900/40'
                        : 'bg-gray-800 text-gray-400 hover:text-gray-300 hover:bg-gray-750'
                    }`}
                  >
                    {mode === 'single' ? 'Single' : 'Spread'}
                  </button>
                ))}
              </div>

              {/* ── Page preview area ──────────────────────────────────── */}
              <AnimatePresence mode="wait">
                {viewMode === 'spread' ? (
                  <motion.div
                    key={`spread-${selectedTemplate}-${vibe}-${imageLook}`}
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                    className="relative"
                  >
                    <div className="flex items-stretch">
                      {/* Left page — cover */}
                      <div className="flex-1 min-w-0">
                        <CoverPage
                          style={style}
                          cssFilter={cssFilter}
                          photo={photos[0]}
                          aspect={aspect}
                          copy={copy}
                          partnerTitle={partnerTitle}
                          anniversaryOn={addOns.anniversaryCover}
                        />
                      </div>

                      {/* Spine */}
                      <div className="w-[3px] flex-shrink-0 relative z-30">
                        <div className="absolute inset-0 bg-gray-950/80" />
                        <div className="absolute -left-2 inset-y-0 w-2 bg-gradient-to-r from-transparent to-black/20 pointer-events-none" />
                        <div className="absolute -right-2 inset-y-0 w-2 bg-gradient-to-l from-transparent to-black/20 pointer-events-none" />
                      </div>

                      {/* Right page — interior */}
                      <div className="flex-1 min-w-0">
                        <InteriorPage
                          style={style}
                          cssFilter={cssFilter}
                          photo={photos[1]}
                          aspect={aspect}
                          copy={copy}
                          isSpreadRight
                        />
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key={`single-${selectedTemplate}-${vibe}-${imageLook}`}
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                  >
                    <InteriorPage
                      style={style}
                      cssFilter={cssFilter}
                      photo={photos[2] || photos[0]}
                      aspect={aspect}
                      copy={copy}
                      isSpreadRight={false}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ── Info chips ─────────────────────────────────────────── */}
              <div className="flex flex-wrap gap-1.5 mt-3">
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-800 text-gray-400">
                  {templateLabel}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-800 text-gray-400">
                  {lookLabel} photos
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-800 text-gray-400">
                  {pageSize === 'a4' ? 'A4' : pageSize === 'us_letter' ? 'US Letter' : 'Square'}
                </span>
                {images.length === 0 && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-900/30 text-violet-400 border border-violet-800/40">
                    <ImageIcon className="w-2.5 h-2.5 inline-block mr-0.5 -mt-px" />
                    Sample photo
                  </span>
                )}
              </div>

              {/* ── EXTRAS VISUAL PREVIEWS ────────────────────────────── */}
              <AnimatePresence>
                {hasAnyExtras && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-4 pt-3 border-t border-gray-800/60">
                      <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider block mb-2">
                        Your Extras
                      </span>
                      <div className="space-y-2.5">
                        {/* Love Letter */}
                        <AnimatePresence>
                          {addOns.loveLetter && (
                            <AddonPreviewCard
                              icon={Heart}
                              label="Love Letter Insert"
                              color="text-rose-400"
                            >
                              <LoveLetterPreview style={style} />
                            </AddonPreviewCard>
                          )}
                        </AnimatePresence>

                        {/* Anniversary Cover */}
                        <AnimatePresence>
                          {addOns.anniversaryCover && (
                            <AddonPreviewCard
                              icon={Award}
                              label="Anniversary Edition Cover"
                              color="text-amber-400"
                            >
                              <div className="w-24 mx-auto">
                                <AnniversaryCoverPreview
                                  style={style}
                                  cssFilter={cssFilter}
                                  photo={photos[0]}
                                  copy={copy}
                                  partnerTitle={partnerTitle}
                                />
                              </div>
                            </AddonPreviewCard>
                          )}
                        </AnimatePresence>

                        {/* Mini Reel */}
                        <AnimatePresence>
                          {addOns.miniReel && (
                            <AddonPreviewCard
                              icon={FilmIcon}
                              label="Mini Reel Storyboard"
                              color="text-violet-400"
                            >
                              <MiniReelPreview />
                            </AddonPreviewCard>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
