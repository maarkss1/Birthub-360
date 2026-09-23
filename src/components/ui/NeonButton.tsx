import { motion, useReducedMotion } from 'framer-motion';
import type React from 'react';
import { SoundFX, type UiSound } from '../../lib/soundEffects';
import { cn } from '../../lib/utils';

// Omite os 4 handlers cujo tipo o framer-motion redefine em `motion.button` (drag/animation): sem
// isto, o spread de `...props` no <motion.button> não compila.
export interface NeonButtonProps
  extends Omit<
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    'onDrag' | 'onDragStart' | 'onDragEnd' | 'onAnimationStart'
  > {
  variant?: 'cyan' | 'purple' | 'gold' | 'pink' | 'green';
  size?: 'sm' | 'md' | 'lg';
  sound?: UiSound;
  children: React.ReactNode;
}

export function NeonButton({
  variant = 'cyan',
  size = 'md',
  sound = 'click',
  children,
  className,
  onClick,
  ...props
}: NeonButtonProps) {
  const shouldReduceMotion = useReducedMotion();

  const variantStyles = {
    cyan: {
      base: 'border-cyan-400/50 text-cyan-300 hover:border-cyan-400 hover:text-cyan-200',
      glow: 'shadow-[0_0_20px_rgba(34,211,238,0.3)] hover:shadow-[0_0_30px_rgba(34,211,238,0.5)]',
      bg: 'bg-cyan-400/10 hover:bg-cyan-400/20',
    },
    purple: {
      base: 'border-purple-400/50 text-purple-300 hover:border-purple-400 hover:text-purple-200',
      glow: 'shadow-[0_0_20px_rgba(168,85,247,0.3)] hover:shadow-[0_0_30px_rgba(168,85,247,0.5)]',
      bg: 'bg-purple-400/10 hover:bg-purple-400/20',
    },
    gold: {
      base: 'border-yellow-400/50 text-yellow-300 hover:border-yellow-400 hover:text-yellow-200',
      glow: 'shadow-[0_0_20px_rgba(250,204,21,0.3)] hover:shadow-[0_0_30px_rgba(250,204,21,0.5)]',
      bg: 'bg-yellow-400/10 hover:bg-yellow-400/20',
    },
    pink: {
      base: 'border-pink-400/50 text-pink-300 hover:border-pink-400 hover:text-pink-200',
      glow: 'shadow-[0_0_20px_rgba(244,114,182,0.3)] hover:shadow-[0_0_30px_rgba(244,114,182,0.5)]',
      bg: 'bg-pink-400/10 hover:bg-pink-400/20',
    },
    green: {
      base: 'border-green-400/50 text-green-300 hover:border-green-400 hover:text-green-200',
      glow: 'shadow-[0_0_20px_rgba(74,222,128,0.3)] hover:shadow-[0_0_30px_rgba(74,222,128,0.5)]',
      bg: 'bg-green-400/10 hover:bg-green-400/20',
    },
  };

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (sound && !props.disabled) {
      SoundFX.play(sound);
    }
    onClick?.(e);
  };

  return (
    <motion.button
      className={cn(
        'relative overflow-hidden rounded-xl border backdrop-blur-md font-semibold transition-all duration-300',
        variantStyles[variant].base,
        variantStyles[variant].glow,
        variantStyles[variant].bg,
        sizeStyles[size],
        shouldReduceMotion && 'hover:scale-100 active:scale-100',
        className,
      )}
      whileHover={!shouldReduceMotion ? { scale: 1.05 } : undefined}
      whileTap={!shouldReduceMotion ? { scale: 0.95 } : undefined}
      onClick={handleClick}
      {...props}
    >
      {/* Efeito de luz interna */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
        initial={{ x: '-100%' }}
        whileHover={!shouldReduceMotion ? { x: '100%' } : undefined}
        transition={{ duration: 0.6 }}
      />

      {/* Partículas de luz */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/4 w-1 h-1 bg-white/50 rounded-full animate-pulse" />
        <div
          className="absolute top-1/3 right-1/3 w-1 h-1 bg-white/50 rounded-full animate-pulse"
          style={{ animationDelay: '0.5s' }}
        />
        <div
          className="absolute bottom-1/4 left-1/2 w-1 h-1 bg-white/50 rounded-full animate-pulse"
          style={{ animationDelay: '1s' }}
        />
      </div>

      <span className="relative z-10">{children}</span>
    </motion.button>
  );
}
