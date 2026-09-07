import type React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../../lib/utils';
import { useTilt } from '../../../lib/motion';

export interface BentoCardProps extends React.HTMLAttributes<HTMLDivElement> {
  colSpan?: 1 | 2 | 3 | 4;
  rowSpan?: 1 | 2;
  tilt?: boolean;
  variant?: 'surface' | 'glass' | 'accent';
}

export function BentoCard({
  colSpan = 1,
  rowSpan = 1,
  tilt = false,
  variant = 'surface',
  className,
  children,
  style,
  ...props
}: BentoCardProps) {
  const { ref, style: tiltStyle, onPointerMove, onPointerLeave } = useTilt(4);

  const colSpanClasses = {
    1: 'col-span-1',
    2: 'col-span-1 md:col-span-2',
    3: 'col-span-1 md:col-span-2 lg:col-span-3',
    4: 'col-span-1 md:col-span-2 lg:col-span-4',
  }[colSpan];

  const rowSpanClasses = {
    1: 'row-span-1',
    2: 'row-span-1 md:row-span-2',
  }[rowSpan];

  const variantClasses = {
    surface: 'bg-surface border border-line shadow-card',
    glass: 'atlas-glass',
    accent: 'bg-surface border border-brand/30 shadow-glow-brand',
  }[variant];

  if (tilt) {
    return (
      <motion.div
        ref={ref as React.RefObject<HTMLDivElement>}
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
        style={{ ...tiltStyle, ...style }}
        className={cn(
          'relative rounded-xl p-6 transition-colors duration-200 overflow-hidden flex flex-col justify-between',
          colSpanClasses,
          rowSpanClasses,
          variantClasses,
          className,
        )}
        {...(props as React.ComponentProps<typeof motion.div>)}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <div
      className={cn(
        'relative rounded-xl p-6 transition-all duration-200 overflow-hidden flex flex-col justify-between',
        colSpanClasses,
        rowSpanClasses,
        variantClasses,
        className,
      )}
      style={style}
      {...props}
    >
      {children}
    </div>
  );
}
