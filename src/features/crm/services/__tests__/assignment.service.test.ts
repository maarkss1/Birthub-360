import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * `assignLeadRoundRobin` distribui leads sem dono entre os CLOSERs da organização usando um
 * contador no Redis (INCR) como índice rotativo. A regra que importa aqui é a matemática do
 * round-robin (`Math.abs(counter - 1) % users.length`), não o Redis/Prisma em si — por isso
 * ambos são mockados e o teste foca no índice resultante.
 */
const prismaMock = {
  user: { findMany: vi.fn() },
  lead: { update: vi.fn() },
};
vi.mock('../../../../lib/prisma.js', () => ({ prisma: prismaMock }));

const connectionMock = { incr: vi.fn() };
vi.mock('../../../../lib/queue/redis.js', () => ({ connection: connectionMock }));

const recordLeadFieldChanges = vi.fn().mockResolvedValue(undefined);
vi.mock('../../../../shared/services/leadFieldChangeHistory.service.js', () => ({
  recordLeadFieldChanges: (...args: unknown[]) => recordLeadFieldChanges(...args),
}));

const { assignLeadRoundRobin } = await import('../assignment.service');

const closers = [
  { id: 'closer-a', createdAt: new Date('2026-01-01') },
  { id: 'closer-b', createdAt: new Date('2026-01-02') },
  { id: 'closer-c', createdAt: new Date('2026-01-03') },
];

afterEach(() => {
  vi.clearAllMocks();
});

describe('assignLeadRoundRobin', () => {
  it('retorna null e não atualiza nada quando não há CLOSER na organização', async () => {
    prismaMock.user.findMany.mockResolvedValue([]);

    const result = await assignLeadRoundRobin('org-1', 'lead-1');

    expect(result).toBeNull();
    expect(connectionMock.incr).not.toHaveBeenCalled();
    expect(prismaMock.lead.update).not.toHaveBeenCalled();
  });

  it('INCR=1 atribui ao primeiro CLOSER (índice 0)', async () => {
    prismaMock.user.findMany.mockResolvedValue(closers);
    connectionMock.incr.mockResolvedValue(1);

    const result = await assignLeadRoundRobin('org-1', 'lead-1');

    expect(result).toBe('closer-a');
    expect(prismaMock.lead.update).toHaveBeenCalledWith({
      where: { id: 'lead-1' },
      data: { owner: 'closer-a' },
    });
  });

  it('INCR=2 avança para o segundo CLOSER (índice 1)', async () => {
    prismaMock.user.findMany.mockResolvedValue(closers);
    connectionMock.incr.mockResolvedValue(2);

    const result = await assignLeadRoundRobin('org-1', 'lead-2');

    expect(result).toBe('closer-b');
  });

  it('dá a volta na lista quando o contador ultrapassa o total de CLOSERs', async () => {
    prismaMock.user.findMany.mockResolvedValue(closers);
    connectionMock.incr.mockResolvedValue(4); // (4-1) % 3 = 0 -> primeiro closer de novo

    const result = await assignLeadRoundRobin('org-1', 'lead-4');

    expect(result).toBe('closer-a');
  });

  it('registra a atribuição no histórico com source "round_robin" e owner anterior nulo', async () => {
    prismaMock.user.findMany.mockResolvedValue(closers);
    connectionMock.incr.mockResolvedValue(3);

    await assignLeadRoundRobin('org-1', 'lead-3');

    expect(recordLeadFieldChanges).toHaveBeenCalledWith(
      'org-1',
      'lead-3',
      { owner: null },
      { owner: 'closer-c' },
      { source: 'round_robin' },
    );
  });

  it('usa a chave de Redis escopada por organização', async () => {
    prismaMock.user.findMany.mockResolvedValue(closers);
    connectionMock.incr.mockResolvedValue(1);

    await assignLeadRoundRobin('org-42', 'lead-1');

    expect(connectionMock.incr).toHaveBeenCalledWith('roundrobin:org-42:last_assigned_index');
  });
});
