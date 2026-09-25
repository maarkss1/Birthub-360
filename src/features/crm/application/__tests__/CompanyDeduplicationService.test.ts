import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * `CompanyDeduplicationService` — ver o comentário grande em `CompanyDeduplicationService.ts` para
 * o raciocínio completo (por que a cadeia de Account Intelligence é apagada, não re-chaveada, e
 * por que precisa ser limpa ANTES de mover `Contact.companyId`). Estes testes cobrem
 * especificamente: (a) as duas fontes de agrupamento (CNPJ igual; nome fantasia igual quando CNPJ
 * é nulo), (b) critério de sobrevivente (enriquecido > mais antigo), (c) ordem de operações
 * (Account Intelligence limpa antes de mover Contact; tudo antes do soft-delete da empresa), e
 * (d) que o merge nunca mexe em `Prospect` (documentado como model sem write path real).
 */
const companyFindMany = vi.fn();
const companyDeleteMany = vi.fn();
const contactUpdateMany = vi.fn();
const leadUpdateMany = vi.fn();
const noteUpdateMany = vi.fn();
const enrichmentLogUpdateMany = vi.fn();
const attachmentUpdateMany = vi.fn();
const crmCommercialDocumentUpdateMany = vi.fn();
const copilotoConversationUpdateMany = vi.fn();
const accountRecommendationDeleteMany = vi.fn();
const accountScoreDeleteMany = vi.fn();
const intelligenceEvidenceDeleteMany = vi.fn();
const accountSignalDeleteMany = vi.fn();
const decisionMakerDeleteMany = vi.fn();
const economicRelationshipDeleteMany = vi.fn();
const accountIntelligenceSnapshotDeleteMany = vi.fn();
const prospectUpdateMany = vi.fn();

vi.mock('../../../../lib/prisma.js', () => ({
  prisma: {
    company: {
      findMany: (...args: unknown[]) => companyFindMany(...args),
      deleteMany: (...args: unknown[]) => companyDeleteMany(...args),
    },
    contact: { updateMany: (...args: unknown[]) => contactUpdateMany(...args) },
    lead: { updateMany: (...args: unknown[]) => leadUpdateMany(...args) },
    note: { updateMany: (...args: unknown[]) => noteUpdateMany(...args) },
    enrichmentLog: { updateMany: (...args: unknown[]) => enrichmentLogUpdateMany(...args) },
    attachment: { updateMany: (...args: unknown[]) => attachmentUpdateMany(...args) },
    crmCommercialDocument: {
      updateMany: (...args: unknown[]) => crmCommercialDocumentUpdateMany(...args),
    },
    copilotoConversation: {
      updateMany: (...args: unknown[]) => copilotoConversationUpdateMany(...args),
    },
    accountRecommendation: {
      deleteMany: (...args: unknown[]) => accountRecommendationDeleteMany(...args),
    },
    accountScore: { deleteMany: (...args: unknown[]) => accountScoreDeleteMany(...args) },
    intelligenceEvidence: {
      deleteMany: (...args: unknown[]) => intelligenceEvidenceDeleteMany(...args),
    },
    accountSignal: { deleteMany: (...args: unknown[]) => accountSignalDeleteMany(...args) },
    decisionMaker: { deleteMany: (...args: unknown[]) => decisionMakerDeleteMany(...args) },
    economicRelationship: {
      deleteMany: (...args: unknown[]) => economicRelationshipDeleteMany(...args),
    },
    accountIntelligenceSnapshot: {
      deleteMany: (...args: unknown[]) => accountIntelligenceSnapshotDeleteMany(...args),
    },
    prospect: { updateMany: (...args: unknown[]) => prospectUpdateMany(...args) },
  },
}));
vi.mock('../../../../lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const allDeleteManyMocks = [
  companyDeleteMany,
  accountRecommendationDeleteMany,
  accountScoreDeleteMany,
  intelligenceEvidenceDeleteMany,
  accountSignalDeleteMany,
  decisionMakerDeleteMany,
  economicRelationshipDeleteMany,
  accountIntelligenceSnapshotDeleteMany,
];
for (const mock of allDeleteManyMocks) {
  mock.mockResolvedValue({ count: 0 });
}

const { requestContext } = await import('../../../../lib/async-context.js');
const { CompanyDeduplicationService } = await import('../CompanyDeduplicationService.js');

afterEach(() => {
  vi.clearAllMocks();
  for (const mock of allDeleteManyMocks) {
    mock.mockResolvedValue({ count: 0 });
  }
});

const enriched = (overrides: Record<string, unknown> = {}) => ({
  enrichmentStatus: 'Enriquecido',
  createdAt: new Date('2026-01-01'),
  ...overrides,
});

describe('CompanyDeduplicationService.deduplicate', () => {
  it('retorna merged=0 e não toca no banco quando não há duplicidade', async () => {
    companyFindMany.mockResolvedValue([
      { id: 'c1', legalName: 'A', tradeName: 'A', cnpj: '11111111000111', ...enriched() },
      { id: 'c2', legalName: 'B', tradeName: 'B', cnpj: '22222222000122', ...enriched() },
    ]);

    const service = new CompanyDeduplicationService();
    const result = await service.deduplicate('org-1');

    expect(result).toEqual({ merged: 0, groups: 0 });
    expect(companyDeleteMany).not.toHaveBeenCalled();
    expect(contactUpdateMany).not.toHaveBeenCalled();
  });

  it('roda a busca de empresas com o tenantId no requestContext', async () => {
    let tenantIdDuranteBusca: string | undefined;
    companyFindMany.mockImplementation(async () => {
      tenantIdDuranteBusca = requestContext.getStore()?.tenantId;
      return [];
    });

    const service = new CompanyDeduplicationService();
    await service.deduplicate('org-1');

    expect(tenantIdDuranteBusca).toBe('org-1');
  });

  it('agrupa por CNPJ igual e mantém a empresa Enriquecida como sobrevivente', async () => {
    companyFindMany.mockResolvedValue([
      {
        id: 'c-old-not-enriched',
        legalName: 'Acme LTDA',
        tradeName: 'Acme',
        cnpj: '11222333000181',
        enrichmentStatus: 'Pendente',
        createdAt: new Date('2026-01-01'),
      },
      {
        id: 'c-enriched',
        legalName: 'Acme LTDA',
        tradeName: 'Acme',
        cnpj: '11222333000181',
        enrichmentStatus: 'Enriquecido',
        createdAt: new Date('2026-02-01'),
      },
    ]);

    const service = new CompanyDeduplicationService();
    const result = await service.deduplicate('org-1');

    expect(contactUpdateMany).toHaveBeenCalledWith({
      where: { companyId: { in: ['c-old-not-enriched'] }, organizationId: 'org-1' },
      data: { companyId: 'c-enriched' },
    });
    expect(companyDeleteMany).toHaveBeenCalledWith({
      where: { id: { in: ['c-old-not-enriched'] }, organizationId: 'org-1' },
    });
    expect(result).toEqual({ merged: 1, groups: 1 });
  });

  it('agrupa por nome fantasia igual só quando CNPJ é nulo nas duas', async () => {
    companyFindMany.mockResolvedValue([
      {
        id: 'c-manual',
        legalName: 'Beta Comércio',
        tradeName: 'Beta',
        cnpj: null,
        ...enriched({ createdAt: new Date('2026-01-01') }),
      },
      {
        id: 'c-bitrix-import',
        legalName: 'Beta Comércio Ltda',
        tradeName: 'beta', // mesma string normalizada (trim + lowercase)
        cnpj: null,
        enrichmentStatus: 'Pendente',
        createdAt: new Date('2026-03-01'),
      },
      {
        id: 'c-unrelated',
        legalName: 'Gamma',
        tradeName: 'Gamma',
        cnpj: null,
        ...enriched(),
      },
    ]);

    const service = new CompanyDeduplicationService();
    const result = await service.deduplicate('org-1');

    // c-manual já está Enriquecido -> sobrevivente, mesmo sendo mais antigo.
    expect(companyDeleteMany).toHaveBeenCalledWith({
      where: { id: { in: ['c-bitrix-import'] }, organizationId: 'org-1' },
    });
    expect(result).toEqual({ merged: 1, groups: 1 });
  });

  it('limpa toda a cadeia de Account Intelligence da duplicada ANTES de mover Contact/Lead, e tudo antes do soft-delete', async () => {
    companyFindMany.mockResolvedValue([
      { id: 'survivor', tradeName: 'X', cnpj: '11222333000181', ...enriched() },
      {
        id: 'dup',
        tradeName: 'X',
        cnpj: '11222333000181',
        enrichmentStatus: 'Pendente',
        createdAt: new Date('2026-03-01'),
      },
    ]);

    const service = new CompanyDeduplicationService();
    await service.deduplicate('org-1');

    for (const mock of [
      accountRecommendationDeleteMany,
      accountScoreDeleteMany,
      intelligenceEvidenceDeleteMany,
      accountSignalDeleteMany,
      decisionMakerDeleteMany,
    ]) {
      expect(mock).toHaveBeenCalledWith({
        where: { organizationId: 'org-1', companyId: { in: ['dup'] } },
      });
    }
    expect(economicRelationshipDeleteMany).toHaveBeenCalledWith({
      where: {
        organizationId: 'org-1',
        OR: [{ sourceCompanyId: { in: ['dup'] } }, { targetCompanyId: { in: ['dup'] } }],
      },
    });
    expect(accountIntelligenceSnapshotDeleteMany).toHaveBeenCalledWith({
      where: { organizationId: 'org-1', companyId: { in: ['dup'] } },
    });

    // DecisionMaker precisa sumir ANTES do Contact ser movido (ver doc da classe — FK composta).
    const decisionMakerOrder = decisionMakerDeleteMany.mock.invocationCallOrder[0];
    const contactOrder = contactUpdateMany.mock.invocationCallOrder[0];
    expect(decisionMakerOrder).toBeLessThan(contactOrder);

    // Toda reatribuição/limpeza acontece antes do soft-delete da empresa duplicada.
    const companyDeleteOrder = companyDeleteMany.mock.invocationCallOrder[0];
    expect(contactOrder).toBeLessThan(companyDeleteOrder);
    expect(leadUpdateMany.mock.invocationCallOrder[0]).toBeLessThan(companyDeleteOrder);
  });

  it('reatribui Note e EnrichmentLog sem filtrar por organizationId (não têm essa coluna)', async () => {
    companyFindMany.mockResolvedValue([
      { id: 'survivor', tradeName: 'X', cnpj: '11222333000181', ...enriched() },
      {
        id: 'dup',
        tradeName: 'X',
        cnpj: '11222333000181',
        enrichmentStatus: 'Pendente',
        createdAt: new Date('2026-03-01'),
      },
    ]);

    const service = new CompanyDeduplicationService();
    await service.deduplicate('org-1');

    expect(noteUpdateMany).toHaveBeenCalledWith({
      where: { companyId: { in: ['dup'] } },
      data: { companyId: 'survivor' },
    });
    expect(enrichmentLogUpdateMany).toHaveBeenCalledWith({
      where: { companyId: { in: ['dup'] } },
      data: { companyId: 'survivor' },
    });
  });

  it('nunca mexe em Prospect (sem write path real hoje, ver comentário no schema)', async () => {
    companyFindMany.mockResolvedValue([
      { id: 'survivor', tradeName: 'X', cnpj: '11222333000181', ...enriched() },
      {
        id: 'dup',
        tradeName: 'X',
        cnpj: '11222333000181',
        enrichmentStatus: 'Pendente',
        createdAt: new Date('2026-03-01'),
      },
    ]);

    const service = new CompanyDeduplicationService();
    await service.deduplicate('org-1');

    expect(prospectUpdateMany).not.toHaveBeenCalled();
  });

  it('propaga o erro quando a consulta ao banco falha', async () => {
    companyFindMany.mockRejectedValue(new Error('conexão perdida'));

    const service = new CompanyDeduplicationService();

    await expect(service.deduplicate('org-1')).rejects.toThrow('conexão perdida');
  });
});

describe('CompanyDeduplicationService.previewDuplicates', () => {
  it('é somente leitura — nunca chama updateMany/deleteMany', async () => {
    companyFindMany.mockResolvedValue([
      { id: 'survivor', tradeName: 'X', cnpj: '11222333000181', ...enriched() },
      {
        id: 'dup',
        tradeName: 'X',
        cnpj: '11222333000181',
        enrichmentStatus: 'Pendente',
        createdAt: new Date('2026-03-01'),
      },
    ]);

    const service = new CompanyDeduplicationService();
    const result = await service.previewDuplicates('org-1');

    expect(result.groups).toHaveLength(1);
    expect(result.groups[0]).toMatchObject({
      matchedBy: 'cnpj',
      survivorId: 'survivor',
      duplicateIds: ['dup'],
    });
    expect(companyDeleteMany).not.toHaveBeenCalled();
    expect(contactUpdateMany).not.toHaveBeenCalled();
    expect(decisionMakerDeleteMany).not.toHaveBeenCalled();
  });
});
