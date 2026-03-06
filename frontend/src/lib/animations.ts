import type { Transition, Variants } from 'framer-motion';

export const pageSlide: Variants = {
  enter: (dir: number) => ({ opacity: 0, x: dir > 0 ? 80 : -80, scale: 0.97 }),
  center: { opacity: 1, x: 0, scale: 1 },
  exit: (dir: number) => ({ opacity: 0, x: dir > 0 ? -80 : 80, scale: 0.97 }),
};

export const pageTransition: Transition = {
  type: 'spring',
  stiffness: 200,
  damping: 28,
  mass: 0.8,
};
