/**
 * Fonte única de verdade para o formato do Plano Diário — consumido tanto pelo backend
 * (`src/features/integrations/bitrix/service/dailyPlan.service.ts`, que monta o plano a partir do
 * Bitrix24 + atividades locais) quanto pelo frontend
 * (`src/features/commercial-intelligence/components/DailyPlanHub.tsx`, que renderiza esse plano
 * para qualquer papel autenticado). As duas features não podem importar uma da outra
 * (`no-cross-feature-imports` em `.dependency-cruiser.cjs`) — este contrato em `src/shared/` é o
 * ponto de composição correto, mesmo padrão já usado em `notification.contract.ts`.
 */
export type DailyPlanPriorityLevel = 'URGENT' | 'HIGH' | 'MEDIUM' | 'COMPLETED';

export type DailyPlanItemOrigin =
  'BITRIX_TASK' | 'BITRIX_ACTIVITY' | 'BITRIX_LEAD' | 'LOCAL_ACTIVITY';

export type DailyPlanItemChannel = 'CALL' | 'WHATSAPP' | 'MEETING' | 'EMAIL' | 'TASK';

export interface DailyPlanItem {
  id: string;
  externalId?: string;
  origin: DailyPlanItemOrigin;
  channel: DailyPlanItemChannel;
  title: string;
  description?: string;
  contactName?: string;
  companyName?: string;
  phone?: string;
  email?: string;
  /** Data-limite (YYYY-MM-DD, fuso do time comercial). Ausente = sem prazo definido. Itens do
   * Bitrix são TODOS os pendentes do usuário (não só os de hoje) — o frontend usa esta data para
   * sinalizar atrasados e agendados para outro dia. */
  dueDate?: string;
  /** Hora-limite (HH:MM, fuso do time comercial). */
  dueTime?: string;
  priority: DailyPlanPriorityLevel;
  completed: boolean;
  completedAt?: string;
  leadId?: string;
  bitrixLeadId?: string;
  bitrixDealId?: string;
  /** Entidade CRM real por trás do item (lead/negócio/contato/empresa) — usada para postar e
   * buscar comentários no lugar certo do Bitrix24 (`crm.timeline.comment.*`). Ausente quando não
   * há vínculo CRM resolvido (ex.: tarefa Bitrix sem `UF_CRM_TASK`). */
  bitrixEntityType?: 'lead' | 'deal' | 'contact' | 'company';
  bitrixEntityId?: string;
  tacticalGuidance: {
    recommendedAction: string;
    scriptOrPrompt?: string;
    suggestedHook?: string;
  };
  notes: string[];
}

export interface UserDailyPlanSummary {
  date: string;
  userId: string;
  userName: string;
  userEmail: string;
  bitrixUserId: string | null;
  bitrixUserName?: string;
  isBitrixConnected: boolean;
  lastSyncedAt: string;
  kpis: {
    totalItems: number;
    pendingItems: number;
    completedItems: number;
    urgentItems: number;
    completionRate: number;
  };
  items: DailyPlanItem[];
}

/**
 * Fechamento do Plano Diário (`DailyPlanClosing`) — parecer de fim de dia + planejamento do novo
 * dia, exigido antes de liberar o resto do app (ver `DailyClosingGate.tsx`/`ProtectedRoute.tsx`).
 * Métricas calculadas só a partir de `Activity` locais de `referenceDate`: o Bitrix24 não expõe um
 * snapshot histórico do que estava pendente num dia específico do passado, só o estado ao vivo.
 */
export interface DailyClosingMetrics {
  totalItems: number;
  completedItems: number;
  pendingItems: number;
  completionRate: number;
}

export interface PendingDailyClosing {
  pending: boolean;
  /** Dia (YYYY-MM-DD) com atividades e sem fechamento registrado. Ausente quando `pending` é falso. */
  referenceDate?: string;
  metrics?: DailyClosingMetrics;
}

export interface DailyPlanClosingInput {
  referenceDate: string;
  userComment: string;
  nextDayGoals: string[];
}
