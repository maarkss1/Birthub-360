import { api } from '../../lib/api';

export type LeadOutcome =
  | 'contato'
  | 'reuniao_agendada'
  | 'reuniao_realizada'
  | 'retorno'
  | 'convertido'
  | 'sem_fit'
  | 'dados_invalidos'
  | 'revisao';

export interface QueuePriorityScoreBreakdownItem {
  label: string;
  points: number;
  detail: string;
}

export interface QueuePriorityScore {
  score: number;
  breakdown: QueuePriorityScoreBreakdownItem[];
}

export interface QueueLeadSummary {
  id: string;
  title: string;
  status: string;
  temperature: string | null;
  daysSinceTouch: number | null;
  owner: string | null;
  priorityScore: QueuePriorityScore;
}

/** Subconjunto de `LeadQualification` (`src/types/index.ts`) mais relevante pra decidir o que
 *  fazer agora numa call — não o checklist inteiro (~20 campos), que já tem tela própria de
 *  edição em outro lugar do CRM. */
export interface QueueLeadQualificationSnapshot {
  dorPrincipal?: string;
  detalhamentoDor?: string;
  solucaoAtlas?: string;
  nivelAutoridade?: string;
  interessePercebido?: string;
  horizonteDecisao?: string;
  temaProximaReuniao?: string;
}

export interface QueueLeadDetail extends QueueLeadSummary {
  segment: string | null;
  contactName: string | null;
  contactRole: string | null;
  phone: string | null;
  email: string | null;
  score: number | null;
  bitrixStageLabel: string | null;
  nextAction: string | null;
  qualification: QueueLeadQualificationSnapshot | null;
}

export interface BitrixLeadStageOption {
  id: string;
  name: string;
}

export interface MesaQueueResponse {
  queue: QueueLeadSummary[];
  current: QueueLeadDetail | null;
  connectionId: string | null;
  leadStatuses: BitrixLeadStageOption[];
}

export interface RegisterLeadInput {
  outcome: LeadOutcome;
  note: string;
  bitrixStatusId?: string;
  lossReasonId?: string;
  nextActionTitle?: string;
  nextActionWhen?: string;
}

export type DashboardPeriod = 'today' | '7d' | '30d' | 'all';

export interface DailyActivityPoint {
  date: string;
  tratados: number;
  reunioes: number;
  oportunidades: number;
  desqualificados: number;
  minutosFoco: number;
}

export interface OutcomeSlice {
  outcome: string;
  count: number;
}

export interface DashboardKpis {
  totalTratados: number;
  taxaConversaoPercent: number;
  taxaDesqualificacaoPercent: number;
  totalFocusMinutes: number;
  pomodoroCycles: number;
}

export interface MesaDashboardResponse {
  period: DashboardPeriod;
  dailyActivity: DailyActivityPoint[];
  outcomeCounts: OutcomeSlice[];
  kpis: DashboardKpis;
}

export const mesaTratamentoApi = {
  queue: () => api.get<MesaQueueResponse>('/api/mesa-tratamento/queue'),
  register: (leadId: string, input: RegisterLeadInput) =>
    api.post<{ registered: boolean }>(`/api/mesa-tratamento/lead/${leadId}/register`, input),
  logPomodoroSession: (input: { durationMinutes: number; cycleNumber?: number }) =>
    api.post<{ logged: boolean }>('/api/mesa-tratamento/pomodoro/session', input),
  dashboard: (period: DashboardPeriod) =>
    api.get<MesaDashboardResponse>(`/api/mesa-tratamento/dashboard?period=${period}`),
};

export const OUTCOME_LABELS: Record<LeadOutcome, string> = {
  contato: 'Contato realizado • manter cadência',
  reuniao_agendada: 'Reunião agendada',
  reuniao_realizada: 'Reunião realizada',
  retorno: 'Cliente pediu retorno futuro',
  convertido: 'Avançou para oportunidade',
  sem_fit: 'Sem aderência/recusou • desqualificar',
  dados_invalidos: 'Dados inválidos • desqualificar',
  revisao: 'Enviar para revisão da gestão',
};

export function isDisqualifyOutcome(outcome: LeadOutcome | ''): boolean {
  return outcome === 'sem_fit' || outcome === 'dados_invalidos';
}

/** Desfechos gerados só pelo painel de gestão (`/lead/:id/decide`), nunca pelo formulário de
 *  registro do SDR — mantidos separados de `OUTCOME_LABELS`/`LeadOutcome` de propósito, pra não
 *  aparecerem como opção selecionável no dropdown "Resultado" de `CurrentLeadCard.tsx` (que itera
 *  `OUTCOME_LABELS`). Usado só para rotular o gráfico/lista de desfechos do dashboard. */
export const MANAGEMENT_OUTCOME_LABELS: Record<string, string> = {
  decidido_pela_gestao: 'Revisado e decidido pela gestão',
};

export interface ReassignLeadResponse {
  reassigned: boolean;
  ownerId: string | null;
  ownerName: string;
}

export const mesaTratamentoManagementApi = {
  reassign: (leadId: string, bitrixUserId: string) =>
    api.post<ReassignLeadResponse>(`/api/mesa-tratamento/lead/${leadId}/reassign`, {
      bitrixUserId,
    }),
  comment: (leadId: string, comment: string) =>
    api.post<{ commented: boolean }>(`/api/mesa-tratamento/lead/${leadId}/comment`, { comment }),
  decide: (leadId: string, note?: string) =>
    api.post<{ decided: boolean }>(`/api/mesa-tratamento/lead/${leadId}/decide`, { note }),
};
