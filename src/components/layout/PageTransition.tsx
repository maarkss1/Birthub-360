import { motion, useReducedMotion } from 'framer-motion';
import type React from 'react';
import { EASE_PREMIUM } from '../../lib/motion';
import { cn } from '../../lib/utils';

export interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
  id?: string;
}

export function PageTransition({ children, className, id }: PageTransitionProps) {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return (
      <div className={cn('flex-1 flex flex-col min-h-0 overflow-hidden', className)}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      key={id}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.25, ease: EASE_PREMIUM }}
      className={cn('flex-1 flex flex-col min-h-0 overflow-hidden', className)}
    >
      {children}
    </motion.div>
  );
}
