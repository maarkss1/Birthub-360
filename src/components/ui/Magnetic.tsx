import { motion, useReducedMotion } from 'framer-motion';
import type React from 'react';
import { useRef, useState } from 'react';

export interface MagneticProps {
  children: React.ReactElement;
  /** Deslocamento máximo em pixels (conforme regra do Prompt 07: 4 a 8px) */
  maxDisplacement?: number;
  disabled?: boolean;
}

export function Magnetic({ children, maxDisplacement = 6, disabled = false }: MagneticProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion || disabled) {
    return children;
  }

  const handleMouse = (e: React.MouseEvent<HTMLDivElement>) => {
    const { clientX, clientY } = e;
    if (!ref.current) return;
    const { height, width, left, top } = ref.current.getBoundingClientRect();
    const middleX = clientX - (left + width / 2);
    const middleY = clientY - (top + height / 2);

    const deltaX = Math.max(
      Math.min((middleX / width) * maxDisplacement * 2, maxDisplacement),
      -maxDisplacement,
    );
    const deltaY = Math.max(
      Math.min((middleY / height) * maxDisplacement * 2, maxDisplacement),
      -maxDisplacement,
    );

    setPosition({ x: deltaX, y: deltaY });
  };

  const reset = () => {
    setPosition({ x: 0, y: 0 });
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouse}
      onMouseLeave={reset}
      animate={{ x: position.x, y: position.y }}
      transition={{ type: 'spring', stiffness: 350, damping: 25, mass: 0.1 }}
      className="inline-block"
    >
      {children}
    </motion.div>
  );
}
