import { describe, expect, it, vi } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { StaleDealsAlertService } from '../../../../src/features/crm/services/staleDealsAlert.service.js';

describe('StaleDealsAlertService (Agente 04)', () => {
  it('calcula o health score corretamente dependendo da inatividade e responsável', () => {
    const service = new StaleDealsAlertService();

    // Negócio ativo e recente
    const health1 = service.calculateHealthScore(2, true, 80);
    expect(health1).toBe(80);

    // Inativo por 8 dias com responsável
    const health2 = service.calculateHealthScore(8, true, 80);
    expect(health2).toBe(60);

    // Inativo por 15 dias sem responsável
    const health3 = service.calculateHealthScore(15, false, 50);
    expect(health3).toBe(0); // 50 - 40 - 15 = -5 => clamped to 0
  });

  it('busca negócios estagnados acima do limite de dias', async () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 10);

    const mockDb = {
      lead: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'lead-stale-1',
            organizationId: 'org-test-crm',
            status: 'Qualificacao_SDR',
            updatedAt: pastDate,
            score: 70,
            owner: 'Carlos SDR',
          },
        ]),
      },
    } as unknown as PrismaClient;

    const service = new StaleDealsAlertService(mockDb);
    const alerts = await service.findStaleDeals('org-test-crm', 5);

    expect(alerts).toHaveLength(1);
    expect(alerts[0].leadId).toBe('lead-stale-1');
    expect(alerts[0].daysInactive).toBeGreaterThanOrEqual(10);
    expect(alerts[0].owner).toBe('Carlos SDR');
    expect(alerts[0].reason).toContain('Score de Saúde');
  });
});
