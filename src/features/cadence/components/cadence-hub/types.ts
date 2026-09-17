import type { BadgeProps } from '../../../../components/ui/Badge';
import type { Lead } from '../../../../types';
import type {
  CadenceChannel,
  CadenceRunStatus,
  CadenceStopReason,
  CadenceTouchResult,
  OptOutOriginChannel,
  OptOutScope,
} from '../../cadence.api';

export const CHANNEL_LABEL: Record<CadenceChannel, string> = {
  email: 'E-mail',
  whatsapp: 'WhatsApp',
  voice: 'Voz',
};

export const SCOPE_LABEL: Record<OptOutScope, string> = {
  email: 'E-mail',
  whatsapp: 'WhatsApp',
  voice: 'Voz',
  global: 'Global (todos os canais)',
};

export const ORIGIN_LABEL: Record<OptOutOriginChannel, string> = {
  email: 'E-mail',
  whatsapp: 'WhatsApp',
  voice: 'Voz',
  manual: 'Registro manual',
  import: 'Importação',
};

export const STATUS_LABEL: Record<CadenceRunStatus, string> = {
  active: 'Ativa',
  paused: 'Pausada',
  stopped: 'Encerrada',
  completed: 'Concluída',
  failed: 'Falhou',
};

export const STOP_REASON_LABEL: Record<CadenceStopReason, string> = {
  'opt-out': 'Opt-out',
  'lead-reply': 'Lead respondeu',
  completed: 'Sequência concluída',
  'manual-stop': 'Parada manual',
  'policy-guardrail': 'Falha estrutural (sequência inválida)',
};

export const TOUCH_RESULT_LABEL: Record<CadenceTouchResult, string> = {
  sent: 'Enviado',
  failed: 'Falhou',
  skipped: 'Pulado',
};

export const STATUS_FILTERS: CadenceRunStatus[] = [
  'active',
  'paused',
  'stopped',
  'completed',
  'failed',
];

/** Mesmo conjunto de `writeRoles` do backend (`cadence.routes.ts`) — criar/iniciar/encerrar
 * sequência e pausar/retomar/parar um run exigem todos o mesmo papel mínimo. Duplicado aqui (não
 * importável do backend no bundle do cliente) como o resto do app já faz — ver
 * `ObjectionsMatrixPage.tsx`/`QualificationMatrixPage.tsx`. */
export const CADENCE_WRITE_ROLES = ['ADMIN', 'GESTOR', 'CLOSER', 'SDR'];

export function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function runStatusBadgeVariant(status: CadenceRunStatus): BadgeProps['variant'] {
  if (status === 'active') return 'success';
  if (status === 'paused') return 'warning';
  if (status === 'completed') return 'info';
  if (status === 'failed') return 'danger';
  return 'default';
}

export function stopReasonBadgeVariant(reason: CadenceStopReason): BadgeProps['variant'] {
  if (reason === 'opt-out') return 'danger';
  if (reason === 'lead-reply') return 'info';
  if (reason === 'manual-stop') return 'outline';
  if (reason === 'policy-guardrail') return 'danger';
  return 'default';
}

export function scopeBadgeVariant(scope: OptOutScope): BadgeProps['variant'] {
  return scope === 'global' ? 'danger' : 'info';
}

export function touchResultBadgeVariant(result: CadenceTouchResult): BadgeProps['variant'] {
  if (result === 'sent') return 'success';
  if (result === 'failed') return 'danger';
  return 'outline';
}

export function leadLabel(lead: Lead): string {
  const company = lead.company?.tradeName || lead.company?.legalName;
  return [lead.title || 'Negócio sem título', company].filter(Boolean).join(' — ');
}
