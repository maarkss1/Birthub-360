import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * `LeadDeduplicationService.deduplicateByEmail` mescla leads duplicados do mesmo contato mantendo
 * o de MAIOR valor comercial (`orderBy: { amount: 'desc' }`) e apagando os demais de verdade
 * (`deleteMany`) — comportamento destrutivo real, por isso vale travar com teste mesmo sem nenhum
 * caller ainda wireado no app hoje (busca por uso confirma que a classe não é referenciada em
 * nenhuma rota/controller/worker além deste arquivo — não é escopo desta rodada religar isso,
 * só garantir que a lógica que existe está correta).
 */
const groupBy = vi.fn();
const findMany = vi.fn();
const deleteMany = vi.fn();

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn().mockImplementation(function PrismaClientMock(this: unknown) {
    Object.assign(this as object, { lead: { groupBy, findMany, deleteMany } });
  }),
}));
vi.mock('../../../../lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const { LeadDeduplicationService } = await import('../LeadDeduplicationService');

afterEach(() => {
  vi.clearAllMocks();
});

describe('LeadDeduplicationService.deduplicateByEmail', () => {
  it('retorna merged=0 e não toca no banco quando não há grupos duplicados', async () => {
    groupBy.mockResolvedValue([]);

    const service = new LeadDeduplicationService();
    const result = await service.deduplicateByEmail('org-1');

    expect(result).toEqual({ merged: 0 });
    expect(findMany).not.toHaveBeenCalled();
    expect(deleteMany).not.toHaveBeenCalled();
  });

  it('mantém o lead de maior valor (primeiro da lista ordenada por amount desc) e apaga os outros', async () => {
    groupBy.mockResolvedValue([{ contactId: 'contact-1' }]);
    findMany.mockResolvedValue([
      { id: 'lead-high-value', amount: 5000 },
      { id: 'lead-mid-value', amount: 2000 },
      { id: 'lead-low-value', amount: 100 },
    ]);
    deleteMany.mockResolvedValue({ count: 2 });

    const service = new LeadDeduplicationService();
    const result = await service.deduplicateByEmail('org-1');

    expect(findMany).toHaveBeenCalledWith({
      where: { organizationId: 'org-1', contactId: 'contact-1' },
      orderBy: { amount: 'desc' },
    });
    expect(deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ['lead-mid-value', 'lead-low-value'] }, organizationId: 'org-1' },
    });
    expect(result).toEqual({ merged: 2 });
  });

  it('soma o mergedCount de vários grupos de contato duplicados', async () => {
    groupBy.mockResolvedValue([{ contactId: 'contact-1' }, { contactId: 'contact-2' }]);
    findMany
      .mockResolvedValueOnce([{ id: 'a1', amount: 10 }, { id: 'a2', amount: 5 }])
      .mockResolvedValueOnce([
        { id: 'b1', amount: 30 },
        { id: 'b2', amount: 20 },
        { id: 'b3', amount: 10 },
      ]);
    deleteMany.mockResolvedValue({ count: 1 });

    const service = new LeadDeduplicationService();
    const result = await service.deduplicateByEmail('org-1');

    expect(result).toEqual({ merged: 1 + 2 });
  });

  it('pula defensivamente um grupo sem contactId em vez de quebrar', async () => {
    groupBy.mockResolvedValue([{ contactId: null }]);

    const service = new LeadDeduplicationService();
    const result = await service.deduplicateByEmail('org-1');

    expect(findMany).not.toHaveBeenCalled();
    expect(result).toEqual({ merged: 0 });
  });

  it('não apaga nada se, ao buscar de novo, sobrar só 1 lead para o contato (condição de corrida)', async () => {
    groupBy.mockResolvedValue([{ contactId: 'contact-1' }]);
    findMany.mockResolvedValue([{ id: 'lead-only', amount: 10 }]);

    const service = new LeadDeduplicationService();
    const result = await service.deduplicateByEmail('org-1');

    expect(deleteMany).not.toHaveBeenCalled();
    expect(result).toEqual({ merged: 0 });
  });

  it('propaga o erro quando a consulta ao banco falha (não mascara a falha como sucesso parcial)', async () => {
    groupBy.mockRejectedValue(new Error('conexão perdida'));

    const service = new LeadDeduplicationService();

    await expect(service.deduplicateByEmail('org-1')).rejects.toThrow('conexão perdida');
  });
});
