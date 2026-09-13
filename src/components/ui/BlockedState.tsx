import { motion } from 'framer-motion';
import { Ban, Clock, ShieldQuestion } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

export type BlockedStateTone = 'neutral' | 'warning' | 'info' | 'iris';

const TONE_STYLES: Record<BlockedStateTone, { icon: string; ring: string }> = {
  neutral: { icon: 'bg-surface-2 text-ink-2 border-line', ring: 'shadow-none' },
  warning: {
    icon: 'bg-warning/10 text-warning-active dark:text-warning border-warning/20',
    ring: 'shadow-lg shadow-warning/5',
  },
  info: {
    icon: 'bg-info/10 text-info-active dark:text-info border-info/20',
    ring: 'shadow-lg shadow-info/5',
  },
  // Proposta "Neon Tokyo × Cosmic Gold" — bloqueio por motivo de IA/inteligência ainda
  // processando (ex.: "aguardando enriquecimento", "modelo ainda não treinado pra este caso").
  // text-iris-active no claro (íris crua mede 3.9:1, ver comentário em globals.css).
  iris: {
    icon: 'bg-accent-violet/10 text-iris-active dark:text-accent-violet border-accent-violet/20',
    ring: 'shadow-glow-accent-violet',
  },
};

interface BlockedStateProps {
  title: string;
  description: string;
  tone?: BlockedStateTone;
  icon?: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

/** Contraparte de `EmptyState.tsx` para quando a ausência de conteúdo não é "nada aconteceu ainda"
 *  e sim "isto está bloqueado por um motivo real" (cargo não atribuído, fonte de dado ausente,
 *  ferramenta ainda não construída, aprovação pendente) — mesmo vocabulário visual (glass-card,
 *  ícone circular, título + descrição), tom distinto para não confundir os dois estados.
 *  `role="status"` anuncia a mudança de estado a leitores de tela sem exigir foco (achado real do
 *  Piloto 002: presença de handler não é prova de acessibilidade — aqui verificamos com o
 *  checklist da skill accessibility, não só a leitura do código). */
export function BlockedState({
  title,
  description,
  tone = 'neutral',
  icon,
  actionLabel,
  onAction,
  className,
}: BlockedStateProps) {
  const t = TONE_STYLES[tone];
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      role="status"
      className={cn(
        'flex flex-col items-center justify-center rounded-card-lg border bg-surface p-10 text-center backdrop-blur-xl',
        t.ring,
        className,
      )}
    >
      <div
        className={cn(
          'mb-4 flex h-14 w-14 items-center justify-center rounded-card border',
          t.icon,
        )}
        aria-hidden="true"
      >
        {icon ?? <Ban className="h-6 w-6" />}
      </div>
      <h3 className="mb-2 text-lg font-bold text-ink">{title}</h3>
      <p className="max-w-md text-sm leading-relaxed text-ink-2">{description}</p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-5 rounded-full border border-line bg-surface-2 px-4 py-2 text-xs font-bold uppercase tracking-wide text-ink-2 transition-colors hover:bg-brand/10 hover:text-brand-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          {actionLabel}
        </button>
      )}
    </motion.div>
  );
}

/** Ícones prontos pros dois motivos de bloqueio de ferramenta já modelados em
 *  `tool-bindings.ts`/`workspace.service.ts` — reaproveitados no lugar de escolher um ícone novo
 *  por chamada. */
export const SourceRequiredIcon = <ShieldQuestion className="h-6 w-6" />;
export const FutureToolIcon = <Clock className="h-6 w-6" />;
