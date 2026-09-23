import { motion, useReducedMotion } from 'framer-motion';
import type React from 'react';
import { useState } from 'react';
import { SoundFX } from '../../lib/soundEffects';
import { cn } from '../../lib/utils';

export interface CyberInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  variant?: 'neon' | 'glass' | 'metallic';
  size?: 'sm' | 'md' | 'lg';
  glowColor?: 'cyan' | 'purple' | 'gold' | 'green';
}

export function CyberInput({
  variant = 'neon',
  size = 'md',
  glowColor = 'cyan',
  className,
  onFocus,
  onBlur,
  ...props
}: CyberInputProps) {
  const shouldReduceMotion = useReducedMotion();
  const [isFocused, setIsFocused] = useState(false);

  const variantStyles = {
    neon: {
      base: 'bg-surface-elevated/60 backdrop-blur-xl border-2',
      focused: 'border-opacity-100 shadow-glow',
      unfocused: 'border-opacity-30',
    },
    glass: {
      base: 'bg-surface/80 backdrop-blur-2xl border border-line/50',
      focused: 'border-brand/50 shadow-lg',
      unfocused: 'border-line/30',
    },
    metallic: {
      base: 'bg-gradient-to-b from-surface to-surface-2 border border-line/60',
      focused: 'border-brand/40 shadow-lg',
      unfocused: 'border-line/40',
    },
  };

  const glowColors = {
    cyan: 'shadow-[0_0_20px_rgba(34,211,238,0.5)]',
    purple: 'shadow-[0_0_20px_rgba(168,85,247,0.5)]',
    gold: 'shadow-[0_0_20px_rgba(250,204,21,0.5)]',
    green: 'shadow-[0_0_20px_rgba(74,222,128,0.5)]',
  };

  const sizeStyles = {
    sm: 'h-8 px-3 text-sm',
    md: 'h-10 px-4 text-base',
    lg: 'h-12 px-5 text-lg',
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    SoundFX.play('focus');
    onFocus?.(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);
    onBlur?.(e);
  };

  return (
    <div className="relative">
      <motion.input
        className={cn(
          'w-full rounded-xl text-ink placeholder:text-ink-2/50 transition-all duration-300 outline-none',
          variantStyles[variant].base,
          isFocused ? variantStyles[variant].focused : variantStyles[variant].unfocused,
          isFocused && variant === 'neon' && glowColors[glowColor],
          sizeStyles[size],
          shouldReduceMotion && 'transition-none',
          className,
        )}
        onFocus={handleFocus}
        onBlur={handleBlur}
        {...props}
      />

      {/* Efeito de scan line para variante neon */}
      {variant === 'neon' && !shouldReduceMotion && (
        <motion.div
          className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: isFocused ? 1 : 0 }}
          transition={{ duration: 0.3 }}
        >
          <motion.div
            className="absolute inset-0 bg-gradient-to-b from-transparent via-white/5 to-transparent"
            animate={{
              y: ['-100%', '100%'],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'linear',
            }}
          />
        </motion.div>
      )}

      {/* Indicadores de canto para variante neon */}
      {variant === 'neon' && (
        <>
          <motion.div
            className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-brand/50 rounded-tl-lg"
            animate={{
              opacity: isFocused ? 1 : 0.3,
              scale: isFocused ? 1 : 0.8,
            }}
            transition={{ duration: 0.2 }}
          />
          <motion.div
            className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-brand/50 rounded-tr-lg"
            animate={{
              opacity: isFocused ? 1 : 0.3,
              scale: isFocused ? 1 : 0.8,
            }}
            transition={{ duration: 0.2 }}
          />
          <motion.div
            className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-brand/50 rounded-bl-lg"
            animate={{
              opacity: isFocused ? 1 : 0.3,
              scale: isFocused ? 1 : 0.8,
            }}
            transition={{ duration: 0.2 }}
          />
          <motion.div
            className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-brand/50 rounded-br-lg"
            animate={{
              opacity: isFocused ? 1 : 0.3,
              scale: isFocused ? 1 : 0.8,
            }}
            transition={{ duration: 0.2 }}
          />
        </>
      )}
    </div>
  );
}
