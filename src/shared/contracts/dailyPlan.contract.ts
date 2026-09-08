/**
 * Contrato de dados do Plano Diário Operacional (Bitrix24) — DTO puro, sem comportamento,
 * compartilhado entre o backend (`src/features/integrations/bitrix/service/dailyPlan.service.ts`,
 * dono real da lógica de montagem) e o frontend que consome o plano
 * (`src/features/commercial-intelligence/components/DailyPlanHub.tsx`).
 *
 * Achado real (fix de CI): `DailyPlanHub.tsx` importava esses tipos direto de
 * `integrations/bitrix/service/dailyPlan.service.ts` — violação de `no-cross-feature-imports`
 * (`.dependency-cruiser.cjs`), que exige composição via `src/shared/` (contratos) ou chamada HTTP,
 * nunca import direto de internals de outra feature. Mesmo padrão já usado em
 * `analytics.contract.ts` para o mesmo tipo de problema.
 */

export type DailyPlanPriorityLevel = 'URGENT' | 'HIGH' | 'MEDIUM' | 'COMPLETED';

export type DailyPlanItemOrigin =
  | 'BITRIX_TASK'
  | 'BITRIX_ACTIVITY'
  | 'BITRIX_LEAD'
  | 'LOCAL_ACTIVITY';

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
  dueTime?: string;
  priority: DailyPlanPriorityLevel;
  completed: boolean;
  completedAt?: string;
  leadId?: string;
  bitrixLeadId?: string;
  bitrixDealId?: string;
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
