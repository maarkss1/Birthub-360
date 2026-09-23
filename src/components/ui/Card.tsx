/* eslint-disable react-refresh/only-export-components */

import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';
import { cn } from '../../lib/utils';
import { BorderBeam, type BorderBeamProps } from './BorderBeam';

const cardVariants = cva('relative overflow-hidden rounded-card text-ink', {
  variants: {
    variant: {
      default:
        'bg-surface-elevated/80 backdrop-blur-md border border-line shadow-card transition-all duration-300 hover:border-ink-2/20 hover:shadow-card-hover hover:-translate-y-0.5',
      stat: 'bg-surface-elevated/80 backdrop-blur-md border border-line shadow-card transition-all duration-300 hover:border-brand/25 hover:shadow-card-hover hover:-translate-y-0.5',
      outline: 'border border-line bg-transparent transition-all duration-300 hover:border-ink-2/30',
      accent:
        'bg-surface-elevated/80 backdrop-blur-md border border-brand/35 shadow-card transition-all duration-300 hover:border-brand/55 hover:shadow-glow-brand hover:-translate-y-0.5',
      elevated:
        'bg-surface-elevated border border-line shadow-card-hover transition-all duration-300 hover:border-brand/25 hover:-translate-y-0.5',
      interactive:
        'group bg-surface-elevated/80 backdrop-blur-md border border-line shadow-card cursor-pointer transition-all duration-300 hover:border-brand/30 hover:bg-surface-interactive hover:shadow-card-hover hover:-translate-y-0.5 hover:scale-[1.01] active:scale-[0.99]',
      // --- Propostas "Neon Tokyo × Cosmic Gold" (catálogo visual, 10/09/2026) ---
      // Mesmo idioma do "accent" acima (borda + shadow-glow em repouso, pra marcar destaque
      // persistente — não é o glow transitório de hover do Button). shadow-glow-accent-*/pulse
      // já são discretos no claro (20%) e vívidos no escuro (duas camadas) — o mesmo token
      // resolve os dois temas sem precisar de dark: aqui.
      iris: 'bg-surface border border-accent-violet/30 shadow-glow-accent-violet transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5',
      cyan: 'bg-surface border border-accent-cyan/30 shadow-glow-accent-cyan transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5',
      pulse:
        'bg-surface border border-pulse/30 shadow-glow-pulse transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5',
    },
    padding: {
      default: 'p-6',
      sm: 'p-4',
      lg: 'p-8',
      none: 'p-0',
    },
  },
  defaultVariants: {
    variant: 'default',
    padding: 'default',
  },
});

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  /** Faixa de destaque no topo do card — usa os tokens de marca (`--brand`/`--brand-2`). */
  accentBar?: boolean;
  /** Ativa o efeito de borda em órbita contínua durante carregamento. */
  isLoading?: boolean;
  /** Ativa o feixe laser luminoso contínuo no perímetro do card (efeito BorderBeam). */
  borderBeam?: boolean;
  /** Variação cromática do feixe laser (padrão: 'cyan', idêntico ao vídeo). */
  borderBeamVariant?: BorderBeamProps['variant'];
  /** Duração em segundos da volta completa do feixe. */
  borderBeamDuration?: number;
  /** Comprimento do feixe em pixels. */
  borderBeamSize?: number;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (
    {
      className,
      variant,
      padding,
      accentBar,
      isLoading,
      borderBeam,
      borderBeamVariant = 'cyan',
      borderBeamDuration = 12,
      borderBeamSize = 220,
      children,
      ...props
    },
    ref,
  ) => (
    <div
      ref={ref}
      className={cn(
        cardVariants({ variant, padding, className }),
        (isLoading || borderBeam) && 'overflow-hidden isolate',
      )}
      {...props}
    >
      {isLoading && (
        <BorderBeam
          variant="brand"
          size={200}
          duration={3.5}
          borderWidth={2}
          glow
          radius="var(--radius-card)"
        />
      )}
      {!isLoading && borderBeam && (
        <BorderBeam
          variant={borderBeamVariant}
          size={borderBeamSize}
          duration={borderBeamDuration}
          borderWidth={1.5}
          glow
          radius="var(--radius-card)"
        />
      )}
      {accentBar && (
        <>
          <span className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-brand to-transparent" />
          <span className="pointer-events-none absolute -right-12 -top-16 h-28 w-28 rounded-full bg-brand/10 blur-[38px]" />
        </>
      )}
      <div
        className={cn(
          'relative z-10 transition-opacity duration-300',
          isLoading && 'opacity-60 pointer-events-none select-none',
        )}
      >
        {children}
      </div>
    </div>
  ),
);
Card.displayName = 'Card';

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex flex-col gap-1 mb-4', className)} {...props} />
  ),
);
CardHeader.displayName = 'CardHeader';

const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    // eslint-disable-next-line jsx-a11y/heading-has-content -- children chega via {...props} (wrapper genérico), o lint não enxerga isso estaticamente
    <h3
      ref={ref}
      className={cn('font-display text-lg font-bold text-ink tracking-tight', className)}
      {...props}
    />
  ),
);
CardTitle.displayName = 'CardTitle';

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn('text-sm text-ink-2', className)} {...props} />
));
CardDescription.displayName = 'CardDescription';

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('text-sm text-ink-2', className)} {...props} />
  ),
);
CardContent.displayName = 'CardContent';

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex items-center gap-3 mt-4 pt-4 border-t border-line', className)}
      {...props}
    />
  ),
);
CardFooter.displayName = 'CardFooter';

export { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, cardVariants };
