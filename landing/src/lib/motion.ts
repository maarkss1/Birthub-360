import type { Variants } from 'framer-motion';

export const EASE_PREMIUM = [0.22, 1, 0.36, 1] as const;
export const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

export const staggerContainer = (stagger = 0.06, delayChildren = 0): Variants => ({
  hidden: {},
  show: { transition: { staggerChildren: stagger, delayChildren } },
});

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 14, filter: 'blur(4px)' },
  show: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.4, ease: EASE_PREMIUM },
  },
};
