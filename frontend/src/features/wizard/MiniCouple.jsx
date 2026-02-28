import { motion } from 'framer-motion';

// Scene-based animations for the AI cartoon
const sceneAnimations = {
  analyze: { animate: { y: [0, -3, 0] }, transition: { duration: 2, repeat: Infinity } },
  plan: { animate: { rotate: [-2, 2, -2] }, transition: { duration: 3, repeat: Infinity } },
  write: { animate: { y: [0, -2, 0] }, transition: { duration: 1.5, repeat: Infinity } },
  givebook: { animate: { scale: [1, 1.05, 1] }, transition: { duration: 2, repeat: Infinity } },
  heart: { animate: { scale: [1, 1.08, 1] }, transition: { duration: 1.5, repeat: Infinity } },
  design: { animate: { x: [0, 3, 0] }, transition: { duration: 2, repeat: Infinity } },
  hug: { animate: { scale: [1, 1.03, 1] }, transition: { duration: 1.2, repeat: Infinity } },
  celebrate: { animate: { y: [0, -8, 0] }, transition: { duration: 0.7, repeat: Infinity } },
  walk: { animate: { x: [0, 5, 0] }, transition: { duration: 3, repeat: Infinity } },
};

function getSceneKey(stageIndex) {
  if (stageIndex <= 1) return 'analyze';
  if (stageIndex === 2) return 'plan';
  if (stageIndex === 3) return 'write';
  if (stageIndex === 4) return 'givebook';
  if (stageIndex === 5) return 'heart';
  if (stageIndex === 6) return 'design';
  if (stageIndex === 7) return 'hug';
  if (stageIndex === 8) return 'celebrate';
  return 'walk';
}

export default function MiniCouple({ progress, stageIndex, cartoonImages }) {
  const sceneKey = getSceneKey(stageIndex);
  const anim = sceneAnimations[sceneKey] || sceneAnimations.analyze;

  // Show AI-generated cartoon
  if (cartoonImages?.length > 0) {
    return (
      <div className="relative w-full h-28 flex items-center justify-center">
        <motion.img
          src={cartoonImages[0]}
          alt="Cartoon couple"
          className="h-24 w-auto object-contain"
          {...anim}
        />
      </div>
    );
  }

  // Nothing until cartoon is ready
  return null;
}
