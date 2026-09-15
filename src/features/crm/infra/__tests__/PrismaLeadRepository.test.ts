import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * Priorização de pipeline por probabilidade de fechamento (item 4 de "IA Agêntica de Vendas"):
 * até esta mudança, `findAllWithFilters` ordenava só por `createdAt desc` — o Kanban inteiro
 * herdava essa ordem sem nenhum critério de probabilidade. Cobre o novo `orderBy` e o join
 * (não N+1) com o `forecastProbabilityAi` mais recente do Copiloto IA.
 */
const prismaMock = {
  lead: { findMany: vi.fn(), count: vi.fn() },
  copilotoDealHealthSnapshot: { findMany: vi.fn() },
};

vi.mock('../../../../lib/prisma', () => ({ prisma: prismaMock }));
vi.mock('../../../../lib/search/index.js', () => ({ searchLeadIds: vi.fn() }));
vi.mock('../../../../shared/services/leadFieldChangeHistory.service.js', () => ({
  recordLeadFieldChanges: vi.fn(),
}));

const { PrismaLeadRepository } = await import('../PrismaLeadRepository');

afterEach(() => {
  vi.clearAllMocks();
});

describe('PrismaLeadRepository.findAllWithFilters — priorização por probabilidade', () => {
  it('ordena por probabilidade (nulls last), depois última interação (nulls last), depois criação — nunca só por createdAt', async () => {
    prismaMock.lead.findMany.mockResolvedValue([]);
    prismaMock.lead.count.mockResolvedValue(0);

    const repo = new PrismaLeadRepository();
    await repo.findAllWithFilters('org-1');

    expect(prismaMock.lead.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [
          { probability: { sort: 'desc', nulls: 'last' } },
          { lastInteraction: { sort: 'desc', nulls: 'last' } },
          { createdAt: 'desc' },
        ],
      }),
    );
  });

  it('anexa o forecastProbabilityAi mais recente por lead, numa única query em lote (sem N+1)', async () => {
    prismaMock.lead.findMany.mockResolvedValue([
      { id: 'lead-1', status: 'Lead_Recebido' },
      { id: 'lead-2', status: 'Lead_Recebido' },
    ]);
    prismaMock.lead.count.mockResolvedValue(2);
    prismaMock.copilotoDealHealthSnapshot.findMany.mockResolvedValue([
      { leadId: 'lead-1', forecastProbabilityAi: 72 },
    ]);

    const repo = new PrismaLeadRepository();
    const result = await repo.findAllWithFilters('org-1');

    expect(prismaMock.copilotoDealHealthSnapshot.findMany).toHaveBeenCalledTimes(1);
    expect(prismaMock.copilotoDealHealthSnapshot.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { organizationId: 'org-1', leadId: { in: ['lead-1', 'lead-2'] } },
        distinct: ['leadId'],
      }),
    );

    const byId = Object.fromEntries(
      (result.data as unknown as { id: string; forecastProbabilityAi: number | null }[]).map(
        (lead) => [lead.id, lead.forecastProbabilityAi],
      ),
    );
    expect(byId['lead-1']).toBe(72);
    // lead-2 nunca teve conversa processada pelo Copiloto IA — null, nunca 0 fabricado.
    expect(byId['lead-2']).toBeNull();
  });

  it('não consulta o Copiloto IA quando a página de leads vem vazia', async () => {
    prismaMock.lead.findMany.mockResolvedValue([]);
    prismaMock.lead.count.mockResolvedValue(0);

    const repo = new PrismaLeadRepository();
    await repo.findAllWithFilters('org-1');

    expect(prismaMock.copilotoDealHealthSnapshot.findMany).not.toHaveBeenCalled();
  });
});
