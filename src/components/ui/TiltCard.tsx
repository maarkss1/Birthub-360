import { motion, useReducedMotion } from 'framer-motion';
import type React from 'react';
import { useTilt } from '../../lib/motion';
import { cn } from '../../lib/utils';

export interface TiltCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  /** Rotação máxima em graus (Prompt 08: máximo 4 a 5 graus) */
  maxTiltDegrees?: number;
  className?: string;
  disabled?: boolean;
}

export function TiltCard({
  children,
  maxTiltDegrees = 4.5,
  className,
  disabled = false,
  style,
  ...props
}: TiltCardProps) {
  const shouldReduceMotion = useReducedMotion();
  const { ref, style: tiltStyle, onPointerMove, onPointerLeave } = useTilt(maxTiltDegrees);

  if (shouldReduceMotion || disabled) {
    return (
      <div className={cn('relative rounded-xl', className)} style={style} {...props}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      ref={ref as React.RefObject<HTMLDivElement>}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      style={{ ...tiltStyle, ...style }}
      className={cn(
        'relative rounded-xl transition-[border-color,box-shadow] duration-200 [transform-style:preserve-3d]',
        className,
      )}
      {...(props as React.ComponentProps<typeof motion.div>)}
    >
      {children}
    </motion.div>
  );
}
