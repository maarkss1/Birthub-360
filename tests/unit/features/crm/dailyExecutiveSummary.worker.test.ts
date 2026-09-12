import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Cobre `runDailyExecutiveSummaryJob` (dailyExecutiveSummary.worker.ts): descoberta cross-tenant
 * de organizações (bypass) + análise por organização dentro do tenant real, e a persistência do
 * resumo gerado por IA como `Report` (`source: 'DAILY_AUTO'`) — antes desta correção o resumo era
 * gerado de verdade mas só ia pro log, nunca aparecia em nenhuma tela (ver ReportsHub.tsx e
 * GET /report/daily-summaries).
 */

vi.mock('../../../../src/lib/queue/redis.js', () => ({ connection: {} }));

const organizationFindMany = vi.fn();
const leadFindMany = vi.fn();
const reportCreate = vi.fn();
vi.mock('../../../../src/lib/prisma.js', () => ({
  prisma: {
    organization: { findMany: (...args: unknown[]) => organizationFindMany(...args) },
    lead: { findMany: (...args: unknown[]) => leadFindMany(...args) },
    report: { create: (...args: unknown[]) => reportCreate(...args) },
  },
}));

const invokeMock = vi.fn();
const getAiModelMock = vi.fn();
vi.mock('../../../../src/lib/ai/gateway.js', () => ({
  getAiModel: (...args: unknown[]) => getAiModelMock(...args),
}));

import { requestContext } from '../../../../src/lib/async-context';
import { runDailyExecutiveSummaryJob } from '../../../../src/features/crm/jobs/dailyExecutiveSummary.worker';

beforeEach(() => {
  vi.clearAllMocks();
  getAiModelMock.mockReturnValue({ invoke: invokeMock });
  invokeMock.mockResolvedValue({ content: 'Resumo executivo gerado por IA.' });
  reportCreate.mockResolvedValue({ id: 'report-1' });
});

describe('runDailyExecutiveSummaryJob', () => {
  it('sem organizações: devolve lista vazia sem chamar IA nem persistir nada', async () => {
    organizationFindMany.mockResolvedValue([]);

    const results = await runDailyExecutiveSummaryJob();

    expect(results).toEqual([]);
    expect(invokeMock).not.toHaveBeenCalled();
    expect(reportCreate).not.toHaveBeenCalled();
  });

  it('a descoberta de organizações roda com bypass, e a busca de leads roda com o tenant real (nunca bypass)', async () => {
    organizationFindMany.mockImplementation(async () => {
      expect(requestContext.getStore()?.bypassRls).toBe(true);
      return [{ id: 'org-a' }];
    });
    leadFindMany.mockImplementation(async () => {
      expect(requestContext.getStore()?.tenantId).toBe('org-a');
      expect(requestContext.getStore()?.bypassRls).toBeUndefined();
      return [];
    });

    await runDailyExecutiveSummaryJob();

    expect(leadFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ organizationId: 'org-a' }) }),
    );
  });

  it('organização sem movimentação hoje: reporta "Sem movimentações." sem chamar IA nem persistir Report', async () => {
    organizationFindMany.mockResolvedValue([{ id: 'org-sem-leads' }]);
    leadFindMany.mockResolvedValue([]);

    const results = await runDailyExecutiveSummaryJob();

    expect(results).toEqual([{ organizationId: 'org-sem-leads', summary: 'Sem movimentações.' }]);
    expect(invokeMock).not.toHaveBeenCalled();
    expect(reportCreate).not.toHaveBeenCalled();
  });

  it('organização com leads: persiste o resumo como Report com source DAILY_AUTO e as métricas reais do dia', async () => {
    organizationFindMany.mockResolvedValue([{ id: 'org-a' }]);
    leadFindMany.mockResolvedValue([
      {
        id: 'l1',
        status: 'Convertido_em_Oportunidade',
        title: 'A',
        score: 90,
        temperature: 'quente',
      },
      { id: 'l2', status: 'Lead_Desqualificado', title: 'B', score: 10, temperature: 'frio' },
      { id: 'l3', status: 'Lead_Recebido', title: 'C', score: 50, temperature: 'morno' },
    ]);
    invokeMock.mockResolvedValue({ content: 'Ótimo dia: 1 conversão, 1 lead novo.' });

    const results = await runDailyExecutiveSummaryJob();

    expect(results).toEqual([
      { organizationId: 'org-a', summary: 'Ótimo dia: 1 conversão, 1 lead novo.' },
    ]);
    expect(reportCreate).toHaveBeenCalledWith({
      data: {
        organizationId: 'org-a',
        brandId: 'atlasgr',
        source: 'DAILY_AUTO',
        content: 'Ótimo dia: 1 conversão, 1 lead novo.',
        metrics: { totalLeadsAtualizados: 3, ganhos: 1, perdidos: 1, novos: 1 },
      },
    });
  });

  it('resposta da IA em formato não-string (ex.: array de blocos) é serializada antes de persistir', async () => {
    organizationFindMany.mockResolvedValue([{ id: 'org-a' }]);
    leadFindMany.mockResolvedValue([
      { id: 'l1', status: 'Lead_Recebido', title: 'A', score: 50, temperature: 'morno' },
    ]);
    invokeMock.mockResolvedValue({ content: [{ type: 'text', text: 'bloco' }] });

    await runDailyExecutiveSummaryJob();

    expect(reportCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          content: JSON.stringify([{ type: 'text', text: 'bloco' }]),
        }),
      }),
    );
  });

  it('falha ao gerar/persistir o resumo de uma organização propaga o erro (nunca finge sucesso)', async () => {
    organizationFindMany.mockResolvedValue([{ id: 'org-a' }]);
    leadFindMany.mockResolvedValue([
      { id: 'l1', status: 'Lead_Recebido', title: 'A', score: 50, temperature: 'morno' },
    ]);
    reportCreate.mockRejectedValue(new Error('Postgres indisponível'));

    await expect(runDailyExecutiveSummaryJob()).rejects.toThrow('Postgres indisponível');
  });

  it('processa múltiplas organizações, cada uma com seu próprio resumo persistido separadamente', async () => {
    organizationFindMany.mockResolvedValue([{ id: 'org-a' }, { id: 'org-b' }]);
    leadFindMany.mockImplementation(async (args: { where: { organizationId: string } }) =>
      args.where.organizationId === 'org-a'
        ? [{ id: 'l1', status: 'Lead_Recebido', title: 'A', score: 50, temperature: 'morno' }]
        : [],
    );

    const results = await runDailyExecutiveSummaryJob();

    const byOrg = Object.fromEntries(results.map((r) => [r.organizationId, r.summary]));
    expect(byOrg['org-b']).toBe('Sem movimentações.');
    expect(byOrg['org-a']).toBe('Resumo executivo gerado por IA.');
    expect(reportCreate).toHaveBeenCalledTimes(1);
    expect(reportCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ organizationId: 'org-a' }) }),
    );
  });
});
