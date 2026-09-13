import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * `LeadDeduplicationService.deduplicateByEmail` mescla leads duplicados do mesmo contato mantendo
 * o de MAIOR valor comercial (`orderBy: { amount: 'desc' }`) e removendo os demais — comportamento
 * destrutivo real, por isso vale travar com teste mesmo sem nenhum caller ainda wireado no app
 * hoje (busca por uso confirma que a classe não é referenciada em nenhuma rota/controller/worker
 * além deste arquivo — não é escopo desta rodada religar isso).
 *
 * CRM-002 (auditoria de débito técnico): esta suíte foi reescrita porque o serviço deixou de usar
 * um `new PrismaClient()` cru e passou a usar o singleton compartilhado (`src/lib/prisma.ts`)
 * dentro de `requestContext.run({ tenantId })` — o mesmo padrão de mock já usado por
 * `stagnation-scanner.service.test.ts` (mocka `lib/prisma.js`, usa o `requestContext` REAL para
 * poder inspecionar `getStore()` durante as chamadas). Os testes abaixo cobrem especificamente o
 * que o bug antigo quebrava: (a) toda query roda com o tenantId certo no contexto (prova que a
 * RLS real seria respeitada, não contornada por um client cru), e (b) o "delete" dos duplicados
 * não é mais um hard-delete que destrói dado dependente — Note/Activity/TimelineEvent são
 * reatribuídos para o lead sobrevivente ANTES do soft-delete dos duplicados, nunca descartados.
 */
const leadGroupBy = vi.fn();
const leadFindMany = vi.fn();
const leadDeleteMany = vi.fn();
const noteUpdateMany = vi.fn();
const timelineEventUpdateMany = vi.fn();
const activityUpdateMany = vi.fn();

// CRM-002/003 (merge completo, Onda CRM/RevOps): as ~19 relações restantes reatribuídas antes do
// soft-delete — um objeto por model, todas resolvendo `{count: 0}` por padrão (o teste principal
// abaixo confere algumas por nome; as demais só precisam existir pra não quebrar a chamada real).
const REMAINING_LEAD_RELATION_MODELS = [
  'attachment',
  'leadStageHistory',
  'leadFieldChange',
  'crmDealItem',
  'crmCommercialDocument',
  'callSuppression',
  'whatsAppMessage',
  'conversationSignal',
  'copilotoConversation',
  'copilotoDealHealthSnapshot',
  'bitrixSyncLog',
  'voiceCallLog',
  'optOutRecord',
  'prospect',
  'mesaTratamentoTreatment',
  'cadenceRun',
  'emailMessage',
  'cadenceCalendarEvent',
  'dealClosureEvent',
] as const;
type UpdateManyMock = ReturnType<typeof vi.fn<(...args: unknown[]) => unknown>>;
const remainingUpdateManyMocks = Object.fromEntries(
  REMAINING_LEAD_RELATION_MODELS.map((model) => [model, vi.fn<(...args: unknown[]) => unknown>()]),
) as Record<(typeof REMAINING_LEAD_RELATION_MODELS)[number], UpdateManyMock>;

vi.mock('../../../../lib/prisma.js', () => ({
  prisma: {
    lead: {
      groupBy: (...args: unknown[]) => leadGroupBy(...args),
      findMany: (...args: unknown[]) => leadFindMany(...args),
      deleteMany: (...args: unknown[]) => leadDeleteMany(...args),
    },
    note: {
      updateMany: (...args: unknown[]) => noteUpdateMany(...args),
    },
    timelineEvent: {
      updateMany: (...args: unknown[]) => timelineEventUpdateMany(...args),
    },
    activity: {
      updateMany: (...args: unknown[]) => activityUpdateMany(...args),
    },
    ...Object.fromEntries(
      REMAINING_LEAD_RELATION_MODELS.map((model) => [
        model,
        { updateMany: (...args: unknown[]) => remainingUpdateManyMocks[model](...args) },
      ]),
    ),
  },
}));
vi.mock('../../../../lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const { requestContext } = await import('../../../../lib/async-context.js');
const { LeadDeduplicationService } = await import('../LeadDeduplicationService');

afterEach(() => {
  vi.clearAllMocks();
});

describe('LeadDeduplicationService.deduplicateByEmail', () => {
  it('retorna merged=0 e não toca no banco quando não há grupos duplicados', async () => {
    leadGroupBy.mockResolvedValue([]);

    const service = new LeadDeduplicationService();
    const result = await service.deduplicateByEmail('org-1');

    expect(result).toEqual({ merged: 0 });
    expect(leadFindMany).not.toHaveBeenCalled();
    expect(leadDeleteMany).not.toHaveBeenCalled();
  });

  it('roda a query de agrupamento com o tenantId da organização setado no requestContext (RLS real seria respeitada)', async () => {
    let tenantIdDuranteBusca: string | undefined;
    leadGroupBy.mockImplementation(async () => {
      tenantIdDuranteBusca = requestContext.getStore()?.tenantId;
      return [];
    });

    const service = new LeadDeduplicationService();
    await service.deduplicateByEmail('org-1');

    expect(tenantIdDuranteBusca).toBe('org-1');
  });

  it('mantém o lead de maior valor (primeiro da lista ordenada por amount desc), reatribui notes/activities/timeline pro sobrevivente e só então soft-deleta os outros', async () => {
    leadGroupBy.mockResolvedValue([{ contactId: 'contact-1' }]);
    leadFindMany.mockResolvedValue([
      { id: 'lead-high-value', amount: 5000 },
      { id: 'lead-mid-value', amount: 2000 },
      { id: 'lead-low-value', amount: 100 },
    ]);
    leadDeleteMany.mockResolvedValue({ count: 2 });

    const service = new LeadDeduplicationService();
    const result = await service.deduplicateByEmail('org-1');

    expect(leadFindMany).toHaveBeenCalledWith({
      where: { organizationId: 'org-1', contactId: 'contact-1' },
      orderBy: { amount: 'desc' },
    });

    // Dado dependente (notas, atividades, timeline) é reatribuído pro lead sobrevivente, não
    // destruído junto com os leads duplicados (comportamento do bug antigo, via hard cascade
    // delete).
    expect(noteUpdateMany).toHaveBeenCalledWith({
      where: { leadId: { in: ['lead-mid-value', 'lead-low-value'] } },
      data: { leadId: 'lead-high-value' },
    });
    expect(timelineEventUpdateMany).toHaveBeenCalledWith({
      where: { leadId: { in: ['lead-mid-value', 'lead-low-value'] } },
      data: { leadId: 'lead-high-value' },
    });
    expect(activityUpdateMany).toHaveBeenCalledWith({
      where: { leadId: { in: ['lead-mid-value', 'lead-low-value'] }, organizationId: 'org-1' },
      data: { leadId: 'lead-high-value' },
    });

    // Merge completo (CRM-002/003): as ~19 relações restantes também são reatribuídas, não só
    // notes/activities/timeline — confere uma amostra representativa (schema/DB, comunicação,
    // fechamento de negócio) pra não deixar a lista degradar silenciosamente se alguém remover
    // uma chamada por engano.
    for (const model of [
      'leadStageHistory',
      'crmDealItem',
      'cadenceRun',
      'dealClosureEvent',
      'attachment',
    ] as const) {
      expect(remainingUpdateManyMocks[model]).toHaveBeenCalledWith({
        where: { leadId: { in: ['lead-mid-value', 'lead-low-value'] }, organizationId: 'org-1' },
        data: { leadId: 'lead-high-value' },
      });
    }
    // As 19 relações restantes foram todas chamadas (nenhuma esquecida silenciosamente).
    for (const mock of Object.values(remainingUpdateManyMocks)) {
      expect(mock).toHaveBeenCalledTimes(1);
    }

    // A reatribuição do dado dependente acontece ANTES do delete dos leads duplicados — senão a
    // policy de RLS de Note/TimelineEvent (que resolve o tenant via join com Lead) já não
    // enxergaria mais o lead de origem depois do soft-delete.
    const noteOrder = noteUpdateMany.mock.invocationCallOrder[0];
    const lastReassignOrder = Math.max(
      ...Object.values(remainingUpdateManyMocks).map((m) => m.mock.invocationCallOrder[0]),
    );
    const deleteOrder = leadDeleteMany.mock.invocationCallOrder[0];
    expect(noteOrder).toBeLessThan(deleteOrder);
    expect(lastReassignOrder).toBeLessThan(deleteOrder);

    expect(leadDeleteMany).toHaveBeenCalledWith({
      where: { id: { in: ['lead-mid-value', 'lead-low-value'] }, organizationId: 'org-1' },
    });
    expect(result).toEqual({ merged: 2 });
  });

  it('soma o mergedCount de vários grupos de contato duplicados', async () => {
    leadGroupBy.mockResolvedValue([{ contactId: 'contact-1' }, { contactId: 'contact-2' }]);
    leadFindMany
      .mockResolvedValueOnce([
        { id: 'a1', amount: 10 },
        { id: 'a2', amount: 5 },
      ])
      .mockResolvedValueOnce([
        { id: 'b1', amount: 30 },
        { id: 'b2', amount: 20 },
        { id: 'b3', amount: 10 },
      ]);
    leadDeleteMany.mockResolvedValue({ count: 1 });

    const service = new LeadDeduplicationService();
    const result = await service.deduplicateByEmail('org-1');

    expect(result).toEqual({ merged: 1 + 2 });
  });

  it('pula defensivamente um grupo sem contactId em vez de quebrar', async () => {
    leadGroupBy.mockResolvedValue([{ contactId: null }]);

    const service = new LeadDeduplicationService();
    const result = await service.deduplicateByEmail('org-1');

    expect(leadFindMany).not.toHaveBeenCalled();
    expect(result).toEqual({ merged: 0 });
  });

  it('não apaga nada se, ao buscar de novo, sobrar só 1 lead para o contato (condição de corrida)', async () => {
    leadGroupBy.mockResolvedValue([{ contactId: 'contact-1' }]);
    leadFindMany.mockResolvedValue([{ id: 'lead-only', amount: 10 }]);

    const service = new LeadDeduplicationService();
    const result = await service.deduplicateByEmail('org-1');

    expect(leadDeleteMany).not.toHaveBeenCalled();
    expect(noteUpdateMany).not.toHaveBeenCalled();
    expect(result).toEqual({ merged: 0 });
  });

  it('propaga o erro quando a consulta ao banco falha (não mascara a falha como sucesso parcial)', async () => {
    leadGroupBy.mockRejectedValue(new Error('conexão perdida'));

    const service = new LeadDeduplicationService();

    await expect(service.deduplicateByEmail('org-1')).rejects.toThrow('conexão perdida');
  });
});

describe('LeadDeduplicationService.previewDuplicates', () => {
  it('é somente leitura — nunca chama updateMany/deleteMany', async () => {
    leadGroupBy.mockResolvedValue([{ contactId: 'contact-1' }]);
    leadFindMany.mockResolvedValue([
      {
        id: 'lead-high-value',
        title: 'Negócio A',
        amount: 5000,
        currency: 'BRL',
        status: 'Lead_Recebido',
        createdAt: new Date('2026-01-01'),
      },
      {
        id: 'lead-low-value',
        title: 'Negócio A (dup)',
        amount: 100,
        currency: 'BRL',
        status: 'Lead_Recebido',
        createdAt: new Date('2026-01-02'),
      },
    ]);

    const service = new LeadDeduplicationService();
    const result = await service.previewDuplicates('org-1');

    expect(result.groups).toEqual([
      {
        contactId: 'contact-1',
        survivorId: 'lead-high-value',
        duplicateIds: ['lead-low-value'],
        leads: [
          {
            id: 'lead-high-value',
            title: 'Negócio A',
            amount: 5000,
            currency: 'BRL',
            status: 'Lead_Recebido',
            createdAt: new Date('2026-01-01'),
          },
          {
            id: 'lead-low-value',
            title: 'Negócio A (dup)',
            amount: 100,
            currency: 'BRL',
            status: 'Lead_Recebido',
            createdAt: new Date('2026-01-02'),
          },
        ],
      },
    ]);
    expect(leadDeleteMany).not.toHaveBeenCalled();
    expect(noteUpdateMany).not.toHaveBeenCalled();
  });

  it('não inclui grupos onde só sobrou 1 lead ao reconsultar', async () => {
    leadGroupBy.mockResolvedValue([{ contactId: 'contact-1' }]);
    leadFindMany.mockResolvedValue([{ id: 'lead-only', amount: 10 }]);

    const service = new LeadDeduplicationService();
    const result = await service.previewDuplicates('org-1');

    expect(result.groups).toEqual([]);
  });
});
