import type React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
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
          'relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2',
          checked ? 'bg-brand' : 'bg-surface-2 dark:bg-surface border-line',
          disabled && 'cursor-not-allowed opacity-50',
        )}
      >
        <motion.span
          className="pointer-events-none block h-5 w-5 rounded-full bg-white shadow-md ring-0"
          animate={{
            x: checked ? 20 : 0,
            scale: 1,
          }}
          transition={
            shouldReduceMotion
              ? { duration: 0.1 }
              : {
                  // `scale` anima em 3 keyframes (squish de ida e volta) — spring/inertia do
                  // Framer Motion só suporta exatamente 2 keyframes (lança em runtime com 3+,
                  // reproduzido via testes reais, não teórico). `x` (2 keyframes) continua com a
                  // mola; `scale` usa easing por tempo, que suporta múltiplos keyframes.
                  x: { type: 'spring', stiffness: 500, damping: 30, mass: 0.8 },
                  scale: { duration: 0.25, ease: 'easeOut' },
                }
          }
        />
      </button>
    </div>
  );
}
