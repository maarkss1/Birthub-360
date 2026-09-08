import { api } from '../../lib/api';
import type { UserDailyPlanSummary } from '../../shared/contracts/dailyPlan.contract';

/**
 * Cliente HTTP do Plano Diário Operacional, consumido por `DailyPlanHub.tsx`. Achado real (fix de
 * CI): este componente importava `bitrixApi` direto de `integrations/bitrix/bitrix.api.ts` —
 * violação de `no-cross-feature-imports`. Mesmo padrão já usado por qualquer outro consumo
 * cross-feature deste repo: chamada HTTP própria à rota da outra feature, nunca o cliente da
 * feature vizinha. As rotas (`/api/bitrix/daily-plan*`) e o dono real da lógica continuam em
 * `integrations/bitrix` — este arquivo só espelha as 5 chamadas que `DailyPlanHub.tsx` já fazia.
 */
export const dailyPlanApi = {
  getDailyPlan: async (assignedById?: string): Promise<UserDailyPlanSummary> => {
    const query = assignedById ? `?assignedById=${encodeURIComponent(assignedById)}` : '';
    const res = await api.get<{ success: boolean; data: UserDailyPlanSummary }>(
      `/api/bitrix/daily-plan${query}`,
    );
    return res.data;
  },

  syncDailyPlan: async (
    assignedById?: string,
  ): Promise<{ data: UserDailyPlanSummary; message: string }> => {
    const res = await api.post<{ success: boolean; data: UserDailyPlanSummary; message: string }>(
      '/api/bitrix/daily-plan/sync',
      { assignedById },
    );
    return { data: res.data, message: res.message };
  },

  completeDailyPlanItem: async (itemType: string, itemId: string) => {
    return api.post<{ success: boolean; message: string }>('/api/bitrix/daily-plan/complete', {
      itemType,
      itemId,
    });
  },

  addDailyPlanNote: async (itemType: string, itemId: string, note: string) => {
    return api.post<{ success: boolean; message: string }>('/api/bitrix/daily-plan/note', {
      itemType,
      itemId,
      note,
    });
  },

  createDailyPlanActivity: async (payload: {
    title: string;
    channel: string;
    contactName?: string;
    phone?: string;
    dueTime?: string;
    observations?: string;
    leadId?: string;
  }) => {
    return api.post<{ success: boolean; message: string }>(
      '/api/bitrix/daily-plan/activity',
      payload,
    );
  },
};
