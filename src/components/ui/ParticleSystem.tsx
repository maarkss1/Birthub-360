import { motion, useReducedMotion } from 'framer-motion';
import type React from 'react';
import { cn } from '../../lib/utils.js';

export interface ParticleSystemProps {
  className?: string;
  count?: number;
  color?: 'brand' | 'iris' | 'cyan' | 'mixed';
  intensity?: 'low' | 'medium' | 'high';
}

export function ParticleSystem({
  className,
  count = 50,
  color = 'mixed',
  intensity = 'medium',
}: ParticleSystemProps) {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) return null;

  const colorMap = {
    brand: 'bg-brand',
    iris: 'bg-iris',
    cyan: 'bg-cyan-400',
    mixed: ['bg-brand', 'bg-iris', 'bg-cyan-400', 'bg-pink-400'],
  };

  const intensityMap = {
    low: { opacity: 0.3, scale: 0.5 },
    medium: { opacity: 0.5, scale: 0.75 },
    high: { opacity: 0.7, scale: 1 },
  };

  const particles = Array.from({ length: count }).map((_, i) => {
    const colorClass = Array.isArray(colorMap[color])
      ? colorMap[color][i % colorMap[color].length]
      : colorMap[color];

    return {
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 3 + 1,
      duration: Math.random() * 10 + 10,
      delay: Math.random() * 5,
      color: colorClass,
    };
  });

  return (
    <div className={cn('absolute inset-0 overflow-hidden pointer-events-none', className)}>
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className={cn(
            'absolute rounded-full',
            particle.color,
            intensity === 'low' && 'opacity-30',
            intensity === 'medium' && 'opacity-50',
            intensity === 'high' && 'opacity-70',
          )}
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: particle.size,
            height: particle.size,
          }}
          animate={{
            y: [0, -100, 0],
            opacity: [intensityMap[intensity].opacity, 0, intensityMap[intensity].opacity],
            scale: [1, 0, 1],
          }}
          transition={{
            duration: particle.duration,
            repeat: Infinity,
            delay: particle.delay,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}

export interface DigitalRainProps {
  className?: string;
  color?: 'brand' | 'iris' | 'cyan' | 'green';
}

export function DigitalRain({ className, color = 'cyan' }: DigitalRainProps) {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) return null;

  const colorMap = {
    brand: 'text-brand/20',
    iris: 'text-iris/20',
    cyan: 'text-cyan-400/20',
    green: 'text-green-400/20',
  };

  const columns = Array.from({ length: 20 }).map((_, i) => ({
    id: i,
    x: (i / 20) * 100,
    delay: Math.random() * 5,
    duration: Math.random() * 3 + 2,
  }));

  return (
    <div className={cn('absolute inset-0 overflow-hidden pointer-events-none', className)}>
      {columns.map((column) => (
        <motion.div
          key={column.id}
          className={cn('absolute top-0 text-[10px] font-mono leading-none', colorMap[color])}
          style={{ left: `${column.x}%` }}
          animate={{
            y: ['-100%', '100%'],
          }}
          transition={{
            duration: column.duration,
            repeat: Infinity,
            delay: column.delay,
            ease: 'linear',
          }}
        >
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="mb-1">
              {Math.random() > 0.5 ? '1' : '0'}
            </div>
          ))}
        </motion.div>
      ))}
    </div>
  );
}

export interface GlitchEffectProps {
  children: React.ReactNode;
  className?: string;
  intensity?: 'low' | 'medium' | 'high';
}

export function GlitchEffect({ children, className, intensity = 'medium' }: GlitchEffectProps) {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>;
  }

  const intensityMap = {
    low: { duration: 0.1, x: 2 },
    medium: { duration: 0.15, x: 4 },
    high: { duration: 0.2, x: 6 },
  };

  return (
    <motion.div
      className={cn('relative', className)}
      whileHover={{
        x: [0, intensityMap[intensity].x, -intensityMap[intensity].x, 0],
        transition: {
          duration: intensityMap[intensity].duration,
          repeat: 3,
        },
      }}
    >
      {/* Camada de erro RGB */}
      <motion.div
        className="absolute inset-0 text-red-500/20 mix-blend-screen"
        style={{ filter: 'blur(1px)' }}
        animate={{
          x: [0, -intensityMap[intensity].x, 0],
        }}
        transition={{
          duration: intensityMap[intensity].duration,
          repeat: Infinity,
          repeatDelay: 2,
        }}
      >
        {children}
      </motion.div>

      <motion.div
        className="absolute inset-0 text-blue-500/20 mix-blend-screen"
        style={{ filter: 'blur(1px)' }}
        animate={{
          x: [0, intensityMap[intensity].x, 0],
        }}
        transition={{
          duration: intensityMap[intensity].duration,
          repeat: Infinity,
          repeatDelay: 2,
        }}
      >
        {children}
      </motion.div>

      {/* Camada principal */}
      <div className="relative">{children}</div>
    </motion.div>
  );
}
