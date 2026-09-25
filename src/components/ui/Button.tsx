/* eslint-disable react-refresh/only-export-components */

import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import * as React from 'react';
import { SoundFX, type UiSound } from '../../lib/soundEffects.js';
import { cn } from '../../lib/utils.js';
import { Magnetic } from './Magnetic.js';

const buttonVariants = cva(
  // disabled:text-gray-600 (não gray-400) — gray-400 sobre disabled:bg-gray-200 dá só 2.1:1,
  // abaixo do mínimo WCAG AA de 4.5:1 (achado real do axe-core, tests/e2e/accessibility.spec.ts).
  // ease-[EASE_PREMIUM] (src/lib/motion.ts) em vez do ease padrão do Tailwind — mesma curva de
  // desaceleração usada no resto do motion system, pra hover não ficar "solto" da linguagem de
  // movimento do produto. active:scale continua rápido/linear (feedback de press é instantâneo).
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-control border border-transparent text-sm font-semibold transition-[background-color,border-color,color,box-shadow,transform] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-bg active:translate-y-px active:duration-100 active:ease-out cursor-pointer disabled:pointer-events-none disabled:border-line disabled:bg-surface-subtle disabled:text-ink-2 disabled:opacity-60',
  {
    variants: {
      variant: {
        // Redesign simplificado: Fundo sólido, sem borda agressiva.
        // bg-brand-active (não bg-brand) — texto branco direto sobre --brand só atinge ~3.2:1
        // (Birth Hub 360) / ~3.9:1 (Birth Hub 360), abaixo do mínimo WCAG AA de 4.5:1 (achado real do
        // axe-core em accessibility.spec.ts, mesmo padrão do DQA-19 documentado em globals.css).
        // `hover:bg-brand-accent` (usado antes aqui) não gerava nenhuma utility real: `--brand-accent`
        // em globals.css não tem o prefixo `--color-` que o Tailwind 4 exige pra virar classe — hover
        // era um no-op silencioso. `--color-brand-2`/`--brand-2` já existem, já são atualizados
        // dinamicamente na troca de marca (BrandContext.tsx) e já geram `bg-brand-2` de verdade.
        // hover:shadow-glow-brand (era shadow-brand-sm, mais discreto) — glow difuso de verdade,
        // acende só no hover/focus, nunca em repouso (regra do brief "Neon Tokyo × Cosmic Gold").
        default:
          'bg-brand-active text-on-brand shadow-brand-sm hover:bg-brand hover:shadow-glow-brand hover:scale-[1.02] hover:-translate-y-0.5 active:scale-95',
        // bg-btn-danger (color-mix com --danger, globals.css) — bg-red-500 cru com texto branco
        // media ~3.76:1, abaixo do mínimo AA 4.5:1 (mesma classe de achado do DQA-19 que motivou
        // bg-brand-active acima). btn-danger-hover escurece mais, mesma lógica de bg-brand-2.
        destructive:
          'bg-btn-danger text-white shadow-sm hover:bg-btn-danger-hover hover:shadow-card hover:scale-[1.02] hover:-translate-y-0.5 active:scale-95',
        // border-gray-300/hover:bg-gray-100/200 (Tailwind cru, não token) nunca reagiam ao tema —
        // no dark mode (padrão do produto, CREATIVE_SYSTEM_01.md seção C) produziam borda
        // praticamente invisível e um hover claro incoerente sobre superfície escura. Trocados
        // pelos tokens já usados em todo o resto do design system (border-line/bg-surface-2),
        // mesmo padrão de hover já usado pelos itens de navegação da Sidebar. hover:scale-[1.02]
        // novo — outline/ghost eram os únicos sem nenhum feedback de hover (achado real, catálogo
        // visual "Neon Tokyo × Cosmic Gold", 10/09/2026).
        outline:
          'border-line bg-transparent text-ink hover:border-ink-2/30 hover:bg-surface-subtle hover:scale-[1.02] active:scale-95',
        secondary:
          'border-line bg-surface-elevated text-ink shadow-sm hover:bg-surface-interactive hover:scale-[1.02] hover:-translate-y-0.5 active:scale-95',
        ghost:
          'text-ink-2 hover:bg-surface-interactive hover:text-ink hover:scale-[1.02] active:scale-95',
        // text-brand-ink dark:text-brand (não text-brand cru) — mesmo achado do axe-core que
        // motivou bg-brand-active acima: texto de marca direto sobre bg-bg/bg-surface só atinge
        // ~3.0:1, abaixo do mínimo AA de 4.5:1. Sem hover:scale de propósito — é texto inline, não
        // uma caixa; escalar um link no meio de uma frase lê como bug, não como polish.
        link: 'text-brand-ink dark:text-brand underline-offset-4 hover:underline',
        // --- Propostas "Neon Tokyo × Cosmic Gold" (catálogo visual, 10/09/2026) ---
        // Nunca preenchimento sólido — só borda + glow de texto/sombra no hover/focus, e o glow só
        // acende no escuro (--accent-violet/--accent-cyan/--pulse divergem de --iris/--orbit-blue
        // só em .dark; --iris/--orbit-blue em si continuam intocados em todo o resto do produto).
        iris: 'border-accent-violet/45 bg-transparent text-accent-violet hover:border-accent-violet/70 hover:bg-accent-violet/8 hover:shadow-glow-accent-violet hover:scale-[1.02] active:scale-95',
        cyan: 'border-accent-cyan/45 bg-transparent text-accent-cyan hover:border-accent-cyan/70 hover:bg-accent-cyan/8 hover:shadow-glow-accent-cyan hover:scale-[1.02] active:scale-95',
        pulse:
          'border-pulse/45 bg-transparent text-pulse hover:border-pulse/70 hover:bg-pulse/8 hover:shadow-glow-pulse hover:scale-[1.02] active:scale-95',
        // Nova variante glass para efeito moderno
        glass:
          'bg-surface/60 backdrop-blur-md border-line/50 text-ink hover:bg-surface/80 hover:border-brand/30 hover:shadow-card hover:scale-[1.02] active:scale-95',
        // Nova variante gradient para destaque
        gradient:
          'bg-gradient-to-r from-brand to-brand-2 text-on-brand shadow-brand-sm hover:shadow-glow-brand hover:scale-[1.02] hover:-translate-y-0.5 active:scale-95',
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

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  magnetic?: boolean;
  loading?: boolean;
  sound?: UiSound;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      magnetic = false,
      loading = false,
      sound,
      children,
      onClick,
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? Slot : 'button';

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (sound && !loading && !props.disabled) {
        SoundFX.play(sound);
      }
      onClick?.(e);
    };

    const buttonNode = (
      <Comp
        className={cn(
          buttonVariants({ variant, size, className }),
          loading && 'bh-state-loading opacity-75 cursor-wait',
        )}
        ref={ref}
        disabled={loading || props.disabled}
        onClick={handleClick}
        {...props}
      >
        {loading && <Loader2 className="mr-2 h-4 w-4 shrink-0 animate-spin" aria-hidden="true" />}
        {children}
      </Comp>
    );

    if (magnetic && !props.disabled && !loading) {
      return <Magnetic maxDisplacement={6}>{buttonNode}</Magnetic>;
    }

    return buttonNode;
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
