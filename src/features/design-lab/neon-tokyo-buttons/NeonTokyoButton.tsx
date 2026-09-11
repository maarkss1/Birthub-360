/* eslint-disable react-refresh/only-export-components */
/**
 * Proposta "Neon Tokyo × Cosmic Gold" para Button — protótipo isolado, não substitui
 * src/components/ui/Button.tsx. Mesma API/tamanhos do Button real; adiciona:
 *   1. Animação de hover/press em TODAS as variantes (hoje só default/destructive/secondary
 *      têm isso em Button.tsx — outline/ghost/link ficam sem feedback nenhum ao passar o mouse).
 *   2. Três variantes novas (iris/cyan/pulse) que usam os acentos propostos da órbita 360º —
 *      nunca preenchimento neon sólido, só borda + glow no hover/focus, e só no modo escuro.
 * Ver README.md nesta pasta para status e como testar dentro do app.
 */

import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import * as React from 'react';
import { cn } from '../../../lib/utils';
import './neon-tokyo-buttons.css';

const neonTokyoButtonVariants = cva(
  'ntb-btn inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 cursor-pointer disabled:pointer-events-none disabled:bg-gray-200 disabled:text-gray-600 disabled:opacity-100',
  {
    variants: {
      variant: {
        default:
          'ntb-glow-brand bg-brand-active text-on-brand hover:bg-brand-2 hover:shadow-brand-sm',
        destructive: 'ntb-destructive text-white shadow-sm',
        outline: 'border border-line bg-transparent text-ink hover:bg-surface-2',
        secondary: 'bg-surface-2 text-ink hover:bg-line',
        ghost: 'hover:bg-surface-2 hover:text-ink',
        link: 'text-brand-ink dark:text-brand underline-offset-4 hover:underline',
        // Propostas — não existem em Button.tsx ainda.
        iris: 'ntb-glow-iris bg-transparent',
        cyan: 'ntb-glow-cyan bg-transparent',
        pulse: 'ntb-glow-pulse bg-transparent',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 px-3 text-xs',
        lg: 'h-10 px-8',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

const ACCENT_COLOR: Partial<
  Record<NonNullable<VariantProps<typeof neonTokyoButtonVariants>['variant']>, string>
> = {
  iris: 'var(--ntb-iris)',
  cyan: 'var(--ntb-cyan)',
  pulse: 'var(--ntb-pulse)',
};

export interface NeonTokyoButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof neonTokyoButtonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

/**
 * Envolve o botão num wrapper `.ntb-scope` — é essa classe que carrega os tokens propostos
 * (--ntb-iris/cyan/pulse) e reage à classe `.dark` real do produto. Sem ela, iris/cyan/pulse
 * caem nos valores claros por padrão (proposta ainda não integrada a globals.css).
 */
export const NeonTokyoButton = React.forwardRef<HTMLButtonElement, NeonTokyoButtonProps>(
  (
    { className, variant, size, asChild = false, loading = false, children, style, ...props },
    ref,
  ) => {
    const Comp = asChild ? Slot : 'button';
    const accent = variant ? ACCENT_COLOR[variant] : undefined;

    return (
      <span className="ntb-scope" style={{ display: 'contents' }}>
        <Comp
          className={cn(neonTokyoButtonVariants({ variant, size, className }))}
          style={accent ? { color: accent, ...style } : style}
          ref={ref}
          disabled={loading || props.disabled}
          {...props}
        >
          {loading && <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden="true" />}
          {children}
        </Comp>
      </span>
    );
  },
);
NeonTokyoButton.displayName = 'NeonTokyoButton';

export { neonTokyoButtonVariants };
