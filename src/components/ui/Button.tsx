/* eslint-disable react-refresh/only-export-components */
import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Magnetic } from './Magnetic';
import { SoundFX, type UiSound } from '../../lib/soundEffects';

const buttonVariants = cva(
  // disabled:text-gray-600 (não gray-400) — gray-400 sobre disabled:bg-gray-200 dá só 2.1:1,
  // abaixo do mínimo WCAG AA de 4.5:1 (achado real do axe-core, tests/e2e/accessibility.spec.ts).
  // ease-[EASE_PREMIUM] (src/lib/motion.ts) em vez do ease padrão do Tailwind — mesma curva de
  // desaceleração usada no resto do motion system, pra hover não ficar "solto" da linguagem de
  // movimento do produto. active:scale continua rápido/linear (feedback de press é instantâneo).
  'inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-semibold transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 active:scale-[0.97] active:duration-100 active:ease-out cursor-pointer disabled:pointer-events-none disabled:bg-gray-200 disabled:text-gray-600 disabled:opacity-100',
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
          'bg-brand-active text-on-brand hover:bg-brand-2 hover:scale-[1.02] hover:shadow-glow-brand',
        // bg-btn-danger (color-mix com --danger, globals.css) — bg-red-500 cru com texto branco
        // media ~3.76:1, abaixo do mínimo AA 4.5:1 (mesma classe de achado do DQA-19 que motivou
        // bg-brand-active acima). btn-danger-hover escurece mais, mesma lógica de bg-brand-2.
        destructive: 'bg-btn-danger text-white shadow-sm hover:bg-btn-danger-hover hover:scale-[1.02]',
        // border-gray-300/hover:bg-gray-100/200 (Tailwind cru, não token) nunca reagiam ao tema —
        // no dark mode (padrão do produto, CREATIVE_SYSTEM_01.md seção C) produziam borda
        // praticamente invisível e um hover claro incoerente sobre superfície escura. Trocados
        // pelos tokens já usados em todo o resto do design system (border-line/bg-surface-2),
        // mesmo padrão de hover já usado pelos itens de navegação da Sidebar. hover:scale-[1.02]
        // novo — outline/ghost eram os únicos sem nenhum feedback de hover (achado real, catálogo
        // visual "Neon Tokyo × Cosmic Gold", 10/09/2026).
        outline: 'border border-line bg-transparent text-ink hover:bg-surface-2 hover:scale-[1.02]',
        secondary: 'bg-surface-2 text-ink hover:bg-line hover:scale-[1.02]',
        ghost: 'hover:bg-surface-2 hover:text-ink hover:scale-[1.02]',
        // text-brand-ink dark:text-brand (não text-brand cru) — mesmo achado do axe-core que
        // motivou bg-brand-active acima: texto de marca direto sobre bg-bg/bg-surface só atinge
        // ~3.0:1, abaixo do mínimo AA de 4.5:1. Sem hover:scale de propósito — é texto inline, não
        // uma caixa; escalar um link no meio de uma frase lê como bug, não como polish.
        link: 'text-brand-ink dark:text-brand underline-offset-4 hover:underline',
        // --- Propostas "Neon Tokyo × Cosmic Gold" (catálogo visual, 10/09/2026) ---
        // Nunca preenchimento sólido — só borda + glow de texto/sombra no hover/focus, e o glow só
        // acende no escuro (--accent-violet/--accent-cyan/--pulse divergem de --iris/--orbit-blue
        // só em .dark; --iris/--orbit-blue em si continuam intocados em todo o resto do produto).
        iris: 'border border-accent-violet/45 bg-transparent text-accent-violet hover:scale-[1.02] hover:border-accent-violet/70 hover:shadow-glow-accent-violet dark:hover:[text-shadow:0_0_10px_currentColor]',
        cyan: 'border border-accent-cyan/45 bg-transparent text-accent-cyan hover:scale-[1.02] hover:border-accent-cyan/70 hover:shadow-glow-accent-cyan dark:hover:[text-shadow:0_0_10px_currentColor]',
        pulse: 'border border-pulse/45 bg-transparent text-pulse hover:scale-[1.02] hover:border-pulse/70 hover:shadow-glow-pulse dark:hover:[text-shadow:0_0_10px_currentColor]',
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
