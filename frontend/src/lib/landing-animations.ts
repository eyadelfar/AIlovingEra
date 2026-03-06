import type { Variants } from 'framer-motion';

// Hero text reveal — word-by-word fade+blur with staggered spring
export const heroContainerVariants: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08, delayChildren: 0.2 },
  },
};

export const heroWordVariants: Variants = {
  hidden: { opacity: 0, y: 20, filter: 'blur(8px)' },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { type: 'spring', stiffness: 100, damping: 20 },
  },
};

// Badge — spring scale entrance
export const badgeVariants: Variants = {
  hidden: { opacity: 0, scale: 0.8, y: -10 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 150, damping: 15, delay: 0.1 },
  },
};

// CTA buttons — delayed y-slide
export const ctaVariants: Variants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 120, damping: 18, delay: 0.6 },
  },
};

// Preview card — spring scale entrance
export const previewCardVariants: Variants = {
  hidden: { opacity: 0, y: 50, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring', stiffness: 80, damping: 20, delay: 0.4 },
  },
};

// Floating ambient dots — infinite gentle y-oscillation
export const floatingVariants: Variants = {
  animate: {
    y: [0, -10, 0],
    opacity: [0.4, 0.7, 0.4],
    transition: {
      duration: 4,
      ease: 'easeInOut',
      repeat: Infinity,
    },
  },
};

// HowItWorks — blur-to-focus card reveal with spring
export const blurFocusVariants: Variants = {
  hidden: { opacity: 0, y: 30, filter: 'blur(10px)' },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: {
      type: 'spring',
      stiffness: 80,
      damping: 18,
      delay: i * 0.15,
    },
  }),
};

// Feature cards — scale+y entrance with stagger
export const featureCardVariants: Variants = {
  hidden: { opacity: 0, y: 20, scale: 0.98 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 100,
      damping: 20,
      delay: i * 0.08,
    },
  }),
};

// Footer — simple fade+y on scroll-into-view
export const footerFadeVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: 'easeOut' },
  },
};

// Gradient text shimmer — subtle background-position animation
export const gradientShimmer = {
  animate: {
    backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
  },
  transition: {
    duration: 6,
    ease: 'easeInOut' as const,
    repeat: Infinity,
  },
};
