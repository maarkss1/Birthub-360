import { motion, useReducedMotion } from 'framer-motion';
import type React from 'react';
import { SoundFX } from '../../lib/soundEffects';
import { cn } from '../../lib/utils';

export interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  description?: string;
  className?: string;
  id?: string;
  'aria-label'?: string;
  variant?: 'classic' | 'neon' | 'cyber';
  glowColor?: 'brand' | 'cyan' | 'purple' | 'green';
}

export function Toggle({
  checked,
  onChange,
  disabled = false,
  label,
  description,
  className,
  id,
  'aria-label': ariaLabel,
  variant = 'classic',
  glowColor = 'brand',
}: ToggleProps) {
  const shouldReduceMotion = useReducedMotion();
  const toggleId = id || (label ? `toggle-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

  const handleToggle = () => {
    if (disabled) return;
    SoundFX.play('focus');
    onChange(!checked);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      handleToggle();
    }
  };

  const variantStyles = {
    classic: {
      container: 'h-6 w-11',
      checked: 'bg-brand shadow-glow-brand hover:brightness-110',
      unchecked: 'bg-surface-2 dark:bg-surface border-line hover:bg-line',
      thumb: 'h-5 w-5 bg-white shadow-md',
    },
    neon: {
      container: 'h-7 w-12',
      checked: 'bg-gradient-to-r from-brand to-brand-2 shadow-lg shadow-brand/30',
      unchecked: 'bg-surface-2 dark:bg-surface border border-line/50',
      thumb: 'h-5 w-5 bg-gradient-to-br from-white to-gray-100 shadow-lg',
    },
    cyber: {
      container: 'h-8 w-14',
      checked: 'bg-surface-elevated border-2 border-brand shadow-[0_0_20px_rgba(212,175,55,0.4)]',
      unchecked: 'bg-surface-elevated border-2 border-line/30',
      thumb: 'h-6 w-6 bg-gradient-to-br from-brand to-brand-2 shadow-xl',
    },
  };

  const glowColorStyles = {
    brand: 'shadow-[0_0_20px_rgba(212,175,55,0.4)]',
    cyan: 'shadow-[0_0_20px_rgba(34,211,238,0.4)]',
    purple: 'shadow-[0_0_20px_rgba(168,85,247,0.4)]',
    green: 'shadow-[0_0_20px_rgba(74,222,128,0.4)]',
  };

  const styles = variantStyles[variant];

  return (
    <div className={cn('flex items-center justify-between gap-3', className)}>
      {(label || description) && (
        <label htmlFor={toggleId} className="flex flex-col select-none cursor-pointer">
          {label && <span className="text-sm font-semibold text-ink">{label}</span>}
          {description && <span className="text-xs text-ink-2 leading-relaxed">{description}</span>}
        </label>
      )}

      <button
        type="button"
        role="switch"
        id={toggleId}
        aria-checked={checked}
        aria-label={ariaLabel || label}
        disabled={disabled}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        className={cn(
          'relative inline-flex shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2',
          styles.container,
          checked
            ? cn(styles.checked, variant !== 'classic' && glowColorStyles[glowColor])
            : styles.unchecked,
          disabled && 'cursor-not-allowed opacity-50 hover:brightness-100',
        )}
      >
        <motion.span
          className={cn('pointer-events-none rounded-full', styles.thumb)}
          animate={{
            x: checked ? (variant === 'cyber' ? 24 : variant === 'neon' ? 20 : 20) : 0,
            scale: 1,
          }}
          transition={
            shouldReduceMotion
              ? { duration: 0.1 }
              : {
                  x: { type: 'spring', stiffness: 500, damping: 30, mass: 0.8 },
                  scale: { duration: 0.25, ease: 'easeOut' },
                }
          }
        />

        {/* Efeito de brilho no thumb para variantes neon/cyber */}
        {(variant === 'neon' || variant === 'cyber') && checked && !shouldReduceMotion && (
          <motion.div
            className="absolute inset-0 rounded-full bg-white/20 blur-sm"
            animate={{
              opacity: [0.5, 0.8, 0.5],
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        )}
      </button>
    </div>
  );
}
