import type { Variants } from 'framer-motion';
import { useReducedMotion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

export const EASE_PREMIUM = [0.22, 1, 0.36, 1] as const;
export const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;
export const SPRING_SNAPPY = { mass: 0.6, stiffness: 300, damping: 26 } as const;
export const SPRING_SOFT = { mass: 0.8, stiffness: 150, damping: 20 } as const;

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

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.3, ease: EASE_PREMIUM } },
};

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: EASE_PREMIUM },
  },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  show: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.4, ease: EASE_PREMIUM },
  },
};

export const slideInLeft: Variants = {
  hidden: { opacity: 0, x: -30 },
  show: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.5, ease: EASE_PREMIUM },
  },
};

export const slideInRight: Variants = {
  hidden: { opacity: 0, x: 30 },
  show: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.5, ease: EASE_PREMIUM },
  },
};

/** Hook magnético: elemento segue sutilmente o cursor, desativado com reduced motion */
export function useMagnetic<T extends HTMLElement = HTMLElement>(strength = 20) {
  const reduceMotion = useReducedMotion();
  const ref = useRef<T>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (reduceMotion || !ref.current) return;

    const el = ref.current;
    const handleMouseMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const x = (e.clientX - centerX) / strength;
      const y = (e.clientY - centerY) / strength;
      setPosition({ x, y });
    };

    const handleMouseLeave = () => setPosition({ x: 0, y: 0 });

    el.addEventListener('mousemove', handleMouseMove);
    el.addEventListener('mouseleave', handleMouseLeave);
    return () => {
      el.removeEventListener('mousemove', handleMouseMove);
      el.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [strength, reduceMotion]);

  return { ref, position, disabled: reduceMotion };
}

/** Hook de tilt 3D sutil: inclinação que segue o cursor, desativado com reduced motion */
export function useTilt(intensity = 15) {
  const reduceMotion = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const [rotation, setRotation] = useState({ rotateX: 0, rotateY: 0 });

  useEffect(() => {
    if (reduceMotion || !ref.current) return;

    const el = ref.current;
    const handleMouseMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const rotateY = ((e.clientX - centerX) / rect.width) * intensity;
      const rotateX = -((e.clientY - centerY) / rect.height) * intensity;
      setRotation({ rotateX, rotateY });
    };

    const handleMouseLeave = () => setRotation({ rotateX: 0, rotateY: 0 });

    el.addEventListener('mousemove', handleMouseMove);
    el.addEventListener('mouseleave', handleMouseLeave);
    return () => {
      el.removeEventListener('mousemove', handleMouseMove);
      el.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [intensity, reduceMotion]);

  return { ref, rotation, disabled: reduceMotion };
}
