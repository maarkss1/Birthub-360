import { motion, useReducedMotion } from 'framer-motion';
import type React from 'react';
import { cn } from '../../lib/utils';

export interface HolographicCardProps {
  children: React.ReactNode;
  className?: string;
  intensity?: 'low' | 'medium' | 'high';
  variant?: 'cyan' | 'purple' | 'gold' | 'mixed';
  onClick?: () => void;
}

export function HolographicCard({
  children,
  className,
  intensity = 'medium',
  variant = 'mixed',
  onClick,
}: HolographicCardProps) {
  const shouldReduceMotion = useReducedMotion();

  const intensityMap = {
    low: 'border-opacity-30 shadow-glow-opacity-20',
    medium: 'border-opacity-50 shadow-glow-opacity-40',
    high: 'border-opacity-70 shadow-glow-opacity-60',
  };

  const variantColors = {
    cyan: 'from-cyan-400/20 to-blue-500/20 border-cyan-400/50',
    purple: 'from-purple-400/20 to-pink-500/20 border-purple-400/50',
    gold: 'from-yellow-400/20 to-orange-500/20 border-yellow-400/50',
    mixed: 'from-brand/20 via-iris/20 to-orbit-blue/20 border-brand/50',
  };

  return (
    <motion.div
      className={cn(
        'relative overflow-hidden rounded-2xl bg-surface-elevated/80 backdrop-blur-xl border transition-all duration-300',
        variantColors[variant],
        intensityMap[intensity],
        onClick && 'cursor-pointer hover:scale-[1.02] active:scale-[0.98]',
        shouldReduceMotion && 'hover:scale-100 active:scale-100',
        className,
      )}
      whileHover={!shouldReduceMotion && onClick ? { scale: 1.02 } : undefined}
      whileTap={!shouldReduceMotion && onClick ? { scale: 0.98 } : undefined}
      onClick={onClick}
    >
      {/* Efeito holográfico - linhas de scan */}
      <div className="absolute inset-0 opacity-30 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(transparent_49%,rgba(255,255,255,0.1)_50%,transparent_51%)] bg-[length:100%_4px] animate-pulse-slow" />
      </div>

      {/* Glow no topo */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />

      {/* Glow no canto superior direito */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-white/10 to-transparent rounded-bl-full" />

      {/* Conteúdo */}
      <div className="relative z-10 p-6">{children}</div>

      {/* Borda animada */}
      <motion.div
        className="absolute inset-0 rounded-2xl border-2 border-transparent"
        style={{
          background: 'linear-gradient(45deg, transparent, rgba(255,255,255,0.1), transparent)',
          backgroundSize: '200% 200%',
        }}
        animate={
          !shouldReduceMotion
            ? {
                backgroundPosition: ['0% 0%', '100% 100%', '0% 0%'],
              }
            : undefined
        }
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: 'linear',
        }}
      />
    </motion.div>
  );
}
