import * as React from 'react';
import { cn } from '../../lib/utils.js';

export interface BorderBeamProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Comprimento do feixe de luz em pixels (padrão: 220) */
  size?: number;
  /** Duração em segundos de uma volta completa no perímetro (padrão: 12) */
  duration?: number;
  /** Espessura do traçado em pixels (padrão: 1.5) */
  borderWidth?: number;
  /** Posição da âncora/cabeça do feixe ao longo do caminho em % (padrão: 90) */
  anchor?: number;
  /** Cor de início / ponta laser do feixe */
  colorFrom?: string;
  /** Cor intermediária do feixe */
  colorMid?: string;
  /** Cor final / cauda do feixe (padrão: 'transparent') */
  colorTo?: string;
  /** Presets cromáticos da plataforma (padrão: 'cyan', idêntico ao vídeo de execução) */
  variant?: 'cyan' | 'brand' | 'violet' | 'emerald';
  /** Atraso inicial da animação em segundos */
  delay?: number;
  /** Inverter direção do movimento (sentido anti-horário) */
  reverse?: boolean;
  /** Adicionar halo de glow difuso (bloom atmosférico ao redor da borda) */
  glow?: boolean;
  /** Raio dos cantos arredondados (ex: 16, 24 ou string CSS como 'var(--radius-card-lg)') */
  radius?: number | string;
}

const PRESET_PALETTES = {
  cyan: {
    from: '#38bdf8', // Sky-400 luminoso
    mid: '#00f0ff', // Ciano laser elétrico
    to: 'transparent',
    glow: 'rgba(0, 240, 255, 0.55)',
  },
  brand: {
    from: '#fef08a', // Ouro claro
    mid: '#d4af37', // Cosmic Gold institucional
    to: 'transparent',
    glow: 'rgba(212, 175, 55, 0.55)',
  },
  violet: {
    from: '#f3e8ff', // Íris iluminada
    mid: '#a855f7', // Roxo de inteligência comercial
    to: 'transparent',
    glow: 'rgba(168, 85, 247, 0.55)',
  },
  emerald: {
    from: '#d1fae5', // Menta brilhante
    mid: '#10b981', // Esmeralda de operação ativa
    to: 'transparent',
    glow: 'rgba(16, 185, 129, 0.55)',
  },
} as const;

export const BorderBeam = React.forwardRef<HTMLDivElement, BorderBeamProps>(
  (
    {
      className,
      size = 220,
      duration = 12,
      borderWidth = 1.5,
      anchor = 90,
      colorFrom,
      colorMid,
      colorTo,
      variant = 'cyan',
      delay = 0,
      reverse = false,
      glow = true,
      radius = 16,
      style,
      ...props
    },
    ref,
  ) => {
    const palette = PRESET_PALETTES[variant] || PRESET_PALETTES.cyan;
    const activeFrom = colorFrom || palette.from;
    const activeMid = colorMid || palette.mid;
    const activeTo = colorTo || palette.to;
    const radiusValue = typeof radius === 'number' ? `${radius}px` : radius;

    const dynamicVariables: React.CSSProperties = {
      '--beam-size': `${size}px`,
      '--beam-duration': `${duration}s`,
      '--beam-anchor': `${anchor}%`,
      '--beam-border-width': `${borderWidth}px`,
      '--beam-color-from': activeFrom,
      '--beam-color-mid': activeMid,
      '--beam-color-to': activeTo,
      '--beam-delay': `-${delay}s`,
      '--beam-radius': radiusValue,
      ...style,
    } as React.CSSProperties;

    return (
      <div
        ref={ref}
        style={dynamicVariables}
        className={cn(
          'pointer-events-none absolute inset-0 rounded-[inherit] overflow-hidden',
          className,
        )}
        {...props}
      >
        {/* Camada 1: Halo Atmosférico Difuso (Glow ambiental idêntico ao vídeo) */}
        {glow && (
          <div
            aria-hidden="true"
            className={cn(
              'pointer-events-none absolute inset-0 rounded-[inherit] opacity-60 blur-md',
              reverse && 'scale-x-[-1]',
            )}
          >
            <div
              className="absolute aspect-square w-[var(--beam-size)] [offset-anchor:var(--beam-anchor)_50%] [offset-path:rect(0_auto_auto_0_round_var(--beam-radius))] animate-[border-beam_var(--beam-duration)_infinite_linear]"
              style={{
                background: `linear-gradient(to left, #ffffff, ${activeFrom}, ${activeMid}, ${activeTo})`,
                animationDelay: 'var(--beam-delay)',
                animationDirection: reverse ? 'reverse' : 'normal',
              }}
            />
          </div>
        )}

        {/* Camada 2: Traçado Laser de Precisão Mascado (Stroke exato na borda) */}
        <div
          aria-hidden="true"
          className={cn(
            'pointer-events-none absolute inset-0 rounded-[inherit]',
            // Máscara composta que preserva exclusivamente o stroke da borda e exclui o miolo
            '[border:var(--beam-border-width)_solid_transparent]',
            '![mask-clip:padding-box,border-box] ![mask-composite:intersect]',
            '[mask:linear-gradient(transparent,transparent),linear-gradient(white,white)]',
            '[-webkit-mask:linear-gradient(#fff_0_0)_padding-box,linear-gradient(#fff_0_0)]',
            '[-webkit-mask-composite:xor]',
            reverse && 'scale-x-[-1]',
          )}
        >
          <div
            className="absolute aspect-square w-[var(--beam-size)] [offset-anchor:var(--beam-anchor)_50%] [offset-path:rect(0_auto_auto_0_round_var(--beam-radius))] animate-[border-beam_var(--beam-duration)_infinite_linear]"
            style={{
              background: `linear-gradient(to left, #ffffff, ${activeFrom}, ${activeMid}, ${activeTo})`,
              animationDelay: 'var(--beam-delay)',
              animationDirection: reverse ? 'reverse' : 'normal',
            }}
          />
        </div>
      </div>
    );
  },
);

BorderBeam.displayName = 'BorderBeam';
