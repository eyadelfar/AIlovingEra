import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import MiniCouple from './MiniCouple';

const STAGES = [
  {
    threshold: 0,
    labels: [
      'Creating your characters...',
      'Scanning your photos...',
      'Reading EXIF data...',
    ],
  },
  {
    threshold: 10,
    labels: [
      'Identifying the couple...',
      'Examining the light in your photos...',
      'Detecting faces and scenes...',
    ],
  },
  {
    threshold: 20,
    labels: [
      'Finding story patterns...',
      'Grouping memories by moment...',
      'Identifying your best shots...',
    ],
  },
  {
    threshold: 30,
    labels: [
      'Organizing your timeline...',
      'Recognizing familiar places...',
      'Clustering related moments...',
    ],
  },
  {
    threshold: 40,
    labels: [
      'Outlining chapters...',
      'Mapping your story arc...',
      'Planning page layouts...',
    ],
  },
  {
    threshold: 50,
    labels: [
      'Writing your love story...',
      'Crafting chapter titles...',
      'Finding the perfect words...',
    ],
  },
  {
    threshold: 60,
    labels: [
      'Composing captions...',
      'Adding heartfelt details...',
      'Weaving your narrative...',
    ],
  },
  {
    threshold: 70,
    labels: [
      'Designing spreads...',
      'Selecting layouts...',
      'Placing photos...',
    ],
  },
  {
    threshold: 80,
    labels: [
      'Styling typography...',
      'Arranging page compositions...',
      'Refining the design...',
    ],
  },
  {
    threshold: 88,
    labels: [
      'Adding finishing touches...',
      'Polishing text...',
      'Your book is almost ready...',
    ],
  },
  {
    threshold: 95,
    labels: [
      'Preparing your masterpiece...',
      'Final quality check...',
      'Wrapping it all up...',
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
    const cols = Math.min(4, displayPhotos.length);
    return displayPhotos.map((_, i) => {
      const row = Math.floor(i / cols);
      const col = i % cols;
      const gridX = (col / cols) * 100;
      const gridY = row * 50;
      const scatterX = (rng() - 0.5) * 60;
      const scatterY = (rng() - 0.5) * 40;
      const sign = rng() > 0.5 ? 1 : -1;
      return { gridX, gridY, scatterX, scatterY, sign };
    });
  }, [displayPhotos]);

  if (displayPhotos.length === 0) return null;

  const organization = Math.min(progress / 80, 1);

  return (
    <div className="relative w-80 h-56 sm:w-96 sm:h-64 mx-auto mb-6">
      {displayPhotos.map((img, i) => {
        const p = positions[i];
        const angle = (1 - organization) * p.sign * (8 + i * 3);
        const x = p.scatterX * (1 - organization) + p.gridX * organization;
        const y = p.scatterY * (1 - organization) + p.gridY * organization;

        return (
          <motion.div
            key={img.id}
            className="absolute w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden border-2 border-white/10 shadow-lg"
            style={{ willChange: 'transform' }}
            initial={{ opacity: 0, scale: 0.5, rotate: angle, x: p.scatterX, y: p.scatterY }}
            animate={{
              opacity: progress > 5 ? 1 : 0,
              scale: progress > 5 ? 1 : 0.5,
              rotate: angle * (1 - organization),
              x,
              y,
            }}
            transition={{
              duration: 1.2,
              delay: i * 0.15,
              ease: 'easeOut',
            }}
          >
            <img
              src={img.previewUrl}
              alt=""
              className="w-full h-full object-cover"
            />
          </motion.div>
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

export default function GenerationAnimation({ progress, images, cartoonImages }) {
  const stageIndex = getCurrentStageIndex(progress);
  const stage = STAGES[stageIndex];
  const completedStages = STAGES.filter(s => progress >= s.threshold).length;

  // Rotate labels within each stage
  const [labelIndex, setLabelIndex] = useState(0);
  useEffect(() => {
    setLabelIndex(0);
  }, [stageIndex]);

  useEffect(() => {
    const interval = setInterval(() => {
      setLabelIndex(prev => (prev + 1) % stage.labels.length);
    }, 3500);
    return () => clearInterval(interval);
  }, [stageIndex, stage.labels.length]);

  const currentLabel = stage.labels[labelIndex];

  return (
    <div className="text-center">
      <PhotoCollage images={images} progress={progress} />

      <MiniCouple progress={progress} stageIndex={stageIndex} cartoonImages={cartoonImages} />

      <div className="relative w-20 h-20 mx-auto mb-6">
        <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r="34" fill="none" stroke="#1f2937" strokeWidth="3" />
          <motion.circle
            cx="40" cy="40" r="34"
            fill="none"
            stroke="url(#gen-gradient)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 34}
            initial={{ strokeDashoffset: 2 * Math.PI * 34 }}
            animate={{ strokeDashoffset: 2 * Math.PI * 34 * (1 - progress / 100) }}
            transition={{ duration: 0.5 }}
          />
          <defs>
            <linearGradient id="gen-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f43f5e" />
              <stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-base font-bold text-gray-200">{Math.round(progress)}%</span>
        </div>
      </div>

      <div className="h-14 flex items-center justify-center">
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

      <div className="flex justify-center gap-1.5 mt-4">
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

      <div className="mt-6">
        <PageFanAnimation progress={progress} stageIndex={stageIndex} />
      </div>
    </div>
  );
}
