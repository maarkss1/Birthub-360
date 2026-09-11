/* eslint-disable react-refresh/only-export-components */

import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';
import { cn } from '../../lib/utils';

const cardVariants = cva(
  'relative overflow-hidden rounded-card text-ink transform-gpu [transform-style:preserve-3d]',
  {
    variants: {
      variant: {
        default:
          'bg-surface border border-line shadow-card transition-[box-shadow,border-color] duration-300 hover:border-brand/15 hover:shadow-card-hover',
        stat: 'bg-gradient-to-br from-surface to-surface-2 border border-line shadow-card transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-0.5 hover:border-brand/20 hover:shadow-card-hover',
        outline: 'border border-line bg-transparent',
        accent:
          'bg-surface border border-brand/30 shadow-glow-brand transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5',
        elevated:
          'bg-surface/96 border border-line shadow-[0_28px_65px_-42px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.06)] transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-0.5 hover:border-brand/20 hover:shadow-[0_34px_72px_-40px_rgba(0,0,0,0.95),inset_0_1px_0_rgba(255,255,255,0.08)]',
        interactive:
          'group bg-surface border border-line shadow-card cursor-pointer transition-[transform,box-shadow,border-color,background-color] duration-200 hover:-translate-y-1 hover:border-brand/25 hover:bg-surface-2/75 hover:shadow-card-hover active:translate-y-0 active:scale-[0.995]',
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
  },
);

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  /** Faixa de destaque no topo do card — usa os tokens de marca (`--brand`/`--brand-2`). */
  accentBar?: boolean;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, padding, accentBar, children, ...props }, ref) => (
    <div ref={ref} className={cn(cardVariants({ variant, padding, className }))} {...props}>
      {accentBar && (
        <>
          <span className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-brand to-transparent" />
          <span className="pointer-events-none absolute -right-12 -top-16 h-28 w-28 rounded-full bg-brand/10 blur-[38px]" />
        </>
      )}
      {children}
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
