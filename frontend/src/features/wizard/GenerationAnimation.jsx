import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import MiniCouple from './MiniCouple';

const STAGES = [
  {
    threshold: 0,
    labelKeys: [
      'stageCreatingCharacters',
      'stageScanningPhotos',
      'stageReadingExif',
    ],
  },
  {
    threshold: 10,
    labelKeys: [
      'stageIdentifyingCouple',
      'stageExaminingLight',
      'stageDetectingFaces',
    ],
  },
  {
    threshold: 20,
    labelKeys: [
      'stageFindingPatterns',
      'stageGroupingMemories',
      'stageIdentifyingBestShots',
    ],
  },
  {
    threshold: 30,
    labelKeys: [
      'stageOrganizingTimeline',
      'stageRecognizingPlaces',
      'stageClusteringMoments',
    ],
  },
  {
    threshold: 40,
    labelKeys: [
      'stageOutliningChapters',
      'stageMappingStoryArc',
      'stagePlanningLayouts',
    ],
  },
  {
    threshold: 50,
    labelKeys: [
      'stageWritingLoveStory',
      'stageCraftingChapterTitles',
      'stageFindingPerfectWords',
    ],
  },
  {
    threshold: 60,
    labelKeys: [
      'stageComposingCaptions',
      'stageAddingDetails',
      'stageWeavingNarrative',
    ],
  },
  {
    threshold: 70,
    labelKeys: [
      'stageDesigningSpreads',
      'stageSelectingLayouts',
      'stagePlacingPhotos',
    ],
  },
  {
    threshold: 80,
    labelKeys: [
      'stageStylingTypography',
      'stageArrangingCompositions',
      'stageRefiningDesign',
    ],
  },
  {
    threshold: 88,
    labelKeys: [
      'stageAddingFinishingTouches',
      'stagePolishingText',
      'stageBookAlmostReady',
    ],
  },
  {
    threshold: 95,
    labelKeys: [
      'stagePreparingMasterpiece',
      'stageFinalQualityCheck',
      'stageWrappingUp',
    ],
  },
];

function getCurrentStageIndex(progress) {
  for (let i = STAGES.length - 1; i >= 0; i--) {
    if (progress >= STAGES[i].threshold) return i;
  }
  return 0;
}

// Seeded pseudo-random for deterministic scatter positions (no flicker on re-render)
function seededRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function PhotoCollage({ images, progress }) {
  const displayPhotos = useMemo(() => {
    if (!images?.length) return [];
    const shuffled = [...images];
    return shuffled.slice(0, Math.min(8, shuffled.length));
  }, [images]);

  // Memoize scatter positions so they don't change on every render
  const positions = useMemo(() => {
    const rng = seededRandom(displayPhotos.reduce((acc, img, i) => acc + i * 7 + 1, 42));
    const count = displayPhotos.length;
    const cols = Math.min(4, count);
    const rows = Math.ceil(count / cols);
    const spacing = 100; // px between grid items
    return displayPhotos.map((_, i) => {
      const row = Math.floor(i / cols);
      const col = i % cols;
      // Grid target: centered around origin (0,0)
      const gridX = (col - (cols - 1) / 2) * spacing;
      const gridY = (row - (rows - 1) / 2) * (spacing * 0.6);
      // Scatter: ring/ellipse distribution around center
      const angle = (i / count) * 2 * Math.PI + rng() * 0.5;
      const radiusX = 100 + rng() * 80;
      const radiusY = 60 + rng() * 50;
      const scatterX = Math.cos(angle) * radiusX;
      const scatterY = Math.sin(angle) * radiusY;
      const sign = rng() > 0.5 ? 1 : -1;
      return { gridX, gridY, scatterX, scatterY, sign };
    });
  }, [displayPhotos]);

  if (displayPhotos.length === 0) return null;

  const organization = Math.min(progress / 80, 1);

  return (
    <div className="relative w-full max-w-2xl h-44 sm:h-56 mx-auto mb-3 overflow-hidden">
      {displayPhotos.map((img, i) => {
        const p = positions[i];
        const angle = (1 - organization) * p.sign * (8 + i * 3);
        const x = p.scatterX * (1 - organization) + p.gridX * organization;
        const y = p.scatterY * (1 - organization) + p.gridY * organization;
        const opacity = progress > 5 ? 1 : 0;
        const scale = progress > 5 ? 1 : 0.5;

        return (
          <div
            key={img.id}
            className="absolute w-20 h-20 sm:w-24 sm:h-24 rounded-lg overflow-hidden border-2 border-white/10 shadow-lg"
            style={{
              left: '50%',
              top: '50%',
              marginLeft: 'calc(-1 * var(--photo-half))',
              marginTop: 'calc(-1 * var(--photo-half))',
              '--photo-half': '2.5rem',
              opacity,
              transform: `translateX(${x}px) translateY(${y}px) rotate(${angle * (1 - organization)}deg) scale(${scale})`,
              transition: 'transform 1.5s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.8s ease',
              willChange: 'transform, opacity',
            }}
          >
            <img src={img.previewUrl} alt="" className="w-full h-full object-cover" />
          </div>
        );
      })}
    </div>
  );
}

function PageFanAnimation({ progress, stageIndex }) {
  if (stageIndex < 5) return null;

  const pageCount = Math.min(7, Math.floor((stageIndex - 4) * 1.5));

  return (
    <div className="relative h-20 flex items-center justify-center">
      {Array.from({ length: pageCount }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-12 h-16 rounded-sm border border-gray-600/40 bg-gradient-to-b from-gray-800/80 to-gray-900/80 shadow-md"
          style={{ willChange: 'transform' }}
          initial={{ opacity: 0, y: 30, rotate: 0, scale: 0.8 }}
          animate={{
            opacity: 1,
            y: 0,
            rotate: (i - Math.floor(pageCount / 2)) * 8,
            scale: 1,
            x: (i - Math.floor(pageCount / 2)) * 18,
          }}
          transition={{
            duration: 0.6,
            delay: i * 0.12,
            ease: 'backOut',
          }}
        >
          <div className="p-1.5 space-y-1">
            <div className="w-6 h-0.5 bg-gray-600/50 rounded" />
            <div className="w-8 h-0.5 bg-gray-600/30 rounded" />
            <div className="w-4 h-4 bg-gray-700/30 rounded-sm mt-1" />
            <div className="w-7 h-0.5 bg-gray-600/30 rounded" />
          </div>
        </motion.div>
      ))}

      {progress > 95 && (
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
        >
          {[0, 1, 2].map(i => (
            <motion.div
              key={`sparkle-${i}`}
              className="absolute w-1.5 h-1.5 bg-amber-400 rounded-full"
              style={{ willChange: 'transform, opacity' }}
              animate={{
                opacity: [0, 1, 0],
                scale: [0.5, 1.5, 0.5],
                x: [0, (i - 1) * 30],
                y: [0, -20 - i * 10],
              }}
              transition={{
                duration: 1.5,
                repeat: 3,
                delay: i * 0.3,
              }}
            />
          ))}
        </motion.div>
      )}
    </div>
  );
}

export default function GenerationAnimation({ progress, images, cartoonImages, totalPages, currentPage, generationStage }) {
  const { t } = useTranslation('wizard');

  // Smooth progress interpolation — eases toward target instead of jumping
  const [displayProgress, setDisplayProgress] = useState(0);
  useEffect(() => {
    let raf;
    const animate = () => {
      setDisplayProgress(prev => {
        const diff = progress - prev;
        if (Math.abs(diff) < 0.3) return progress;
        return prev + diff * 0.08;
      });
      raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [progress]);

  const stageIndex = getCurrentStageIndex(displayProgress);
  const stage = STAGES[stageIndex];
  const completedStages = STAGES.filter(s => displayProgress >= s.threshold).length;

  // Rotate labels within each stage (combined to avoid race condition)
  const [labelIndex, setLabelIndex] = useState(0);
  useEffect(() => {
    setLabelIndex(0);
    const interval = setInterval(() => {
      setLabelIndex(prev => (prev + 1) % stage.labelKeys.length);
    }, 3500);
    return () => clearInterval(interval);
  }, [stageIndex, stage.labelKeys.length]);

  const currentLabel = t(stage.labelKeys[labelIndex]);

  return (
    <div className="text-center">
      <PhotoCollage images={images} progress={displayProgress} />

      <MiniCouple progress={displayProgress} stageIndex={stageIndex} cartoonImages={cartoonImages} />

      <div className="relative w-16 h-16 mx-auto mb-3">
        <svg className="w-16 h-16 -rotate-90" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r="34" fill="none" stroke="#1f2937" strokeWidth="3" />
          <motion.circle
            cx="40" cy="40" r="34"
            fill="none"
            stroke="url(#gen-gradient)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 34}
            initial={{ strokeDashoffset: 2 * Math.PI * 34 }}
            animate={{ strokeDashoffset: 2 * Math.PI * 34 * (1 - displayProgress / 100) }}
            transition={{ duration: 0.3 }}
          />
          <defs>
            <linearGradient id="gen-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f43f5e" />
              <stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-base font-bold text-gray-200">{Math.round(displayProgress)}%</span>
        </div>
      </div>

      <div className="h-10 flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.p
            key={currentLabel}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.35 }}
            className="text-lg font-medium text-gray-300"
          >
            {currentLabel}
          </motion.p>
        </AnimatePresence>
      </div>

      {/* Real-time status from backend SSE */}
      {totalPages > 0 && (
        <div className="mt-1">
          <p className="text-sm text-gray-500">
            {t('buildingPages', { count: totalPages })}
          </p>
        </div>
      )}
      {/* generationStage is raw backend English — the i18n rotating labels above are the translated equivalent */}

      <div className="flex justify-center gap-1.5 mt-2">
        {STAGES.map((s, i) => (
          <motion.div
            key={i}
            className={`w-2 h-2 rounded-full transition-colors ${
              i < completedStages ? 'bg-rose-500' : 'bg-gray-800'
            }`}
            animate={i < completedStages ? { scale: [1, 1.3, 1] } : {}}
            transition={{ duration: 0.3 }}
          />
        ))}
      </div>

      <div className="mt-2">
        <PageFanAnimation progress={displayProgress} stageIndex={stageIndex} />
      </div>
    </div>
  );
}
