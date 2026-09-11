import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * `createLead` tem duas regras de negócio que não podem regredir silenciosamente:
 * 1) CLOSER/SDR sempre captura o lead para si — mesmo que envie `owner` de outra pessoa no corpo
 *    da requisição, isso é sobrescrito para o próprio `actor.userId` (só GESTOR/ADMIN podem
 *    atribuir a outra pessoa, via update). Sem isso, `requireLeadOwnership.ts` perde sentido.
 * 2) uma empresa não pode ter dois leads capturados no mesmo funil — bloqueia com 409 e o nome de
 *    quem já capturou.
 * A atribuição por Round-Robin quando não há dono é fire-and-forget-tolerante: uma falha na
 * atribuição não pode impedir a criação do lead (só fica sem dono).
 */
const prismaMock = {
  lead: { findFirst: vi.fn() },
  user: { findUnique: vi.fn() },
};
vi.mock('../../../../lib/prisma.js', () => ({ prisma: prismaMock }));

const assignLeadRoundRobin = vi.fn();
vi.mock('../../services/assignment.service.js', () => ({
  assignLeadRoundRobin: (...args: unknown[]) => assignLeadRoundRobin(...args),
}));

const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
vi.mock('../../../../lib/logger.js', () => ({ logger }));

const { LeadUseCases } = await import('../LeadUseCases');

function makeUseCases(created: Record<string, unknown> = { id: 'lead-new' }) {
  const repository = {
    create: vi.fn().mockResolvedValue(created),
  };
  return { useCases: new LeadUseCases(repository as never), repository };
}

afterEach(() => {
  vi.clearAllMocks();
  prismaMock.lead.findFirst.mockResolvedValue(null);
});

describe('LeadUseCases.createLead — posse do lead (CLOSER/SDR sempre captura para si)', () => {
  it.each(['CLOSER', 'SDR'])(
    'sobrescreve owner informado no payload pelo actor.userId quando role é %s',
    async (role) => {
      const { useCases, repository } = makeUseCases();

      await useCases.createLead(
        'org-1',
        { status: 'Lead Recebido', owner: 'outro-usuario-id' },
        { userId: 'actor-1', role },
      );

      expect(repository.create).toHaveBeenCalledWith(
        'org-1',
        expect.objectContaining({ owner: 'actor-1' }),
      );
    },
  );

  it.each(['GESTOR', 'ADMIN'])(
    'preserva o owner informado no payload quando role é %s (pode atribuir a outra pessoa)',
    async (role) => {
      const { useCases, repository } = makeUseCases();

      await useCases.createLead(
        'org-1',
        { status: 'Lead Recebido', owner: 'outro-usuario-id' },
        { userId: 'actor-1', role },
      );

      expect(repository.create).toHaveBeenCalledWith(
        'org-1',
        expect.objectContaining({ owner: 'outro-usuario-id' }),
      );
    },
  );
});

describe('LeadUseCases.createLead — bloqueio de lead duplicado por empresa+funil', () => {
  it('bloqueia com 409 quando já existe lead ativo para a mesma empresa no mesmo funil', async () => {
    prismaMock.lead.findFirst.mockResolvedValue({ id: 'lead-existente', owner: 'user-99' });
    prismaMock.user.findUnique.mockResolvedValue({ name: 'Fulano de Tal' });
    const { useCases, repository } = makeUseCases();

    await expect(
      useCases.createLead('org-1', { status: 'Lead Recebido', companyId: 'company-1' }),
    ).rejects.toMatchObject({
      statusCode: 409,
      message: expect.stringContaining('Fulano de Tal'),
    });

    expect(repository.create).not.toHaveBeenCalled();
  });

  it('usa "outro usuário" quando o lead duplicado existe mas não tem dono resolvível', async () => {
    prismaMock.lead.findFirst.mockResolvedValue({ id: 'lead-existente', owner: null });
    const { useCases } = makeUseCases();

    await expect(
      useCases.createLead('org-1', { status: 'Lead Recebido', companyId: 'company-1' }),
    ).rejects.toMatchObject({
      statusCode: 409,
      message: expect.stringContaining('outro usuário'),
    });
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
  });

  it('não bloqueia quando não há companyId (nada para checar duplicidade)', async () => {
    const { useCases, repository } = makeUseCases();

    await useCases.createLead('org-1', { status: 'Lead Recebido' });

    expect(prismaMock.lead.findFirst).not.toHaveBeenCalled();
    expect(repository.create).toHaveBeenCalled();
  });

  it('checa duplicidade escopada ao funil informado (Lead x Negócio não competem entre si)', async () => {
    const { useCases } = makeUseCases();

    await useCases.createLead('org-1', {
      status: 'Lead Recebido',
      companyId: 'company-1',
      funnel: 'Negocio',
    });

    expect(prismaMock.lead.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ funnel: 'Negocio', companyId: 'company-1' }),
      }),
    );
  });
});

describe('LeadUseCases.createLead — atribuição automática via Round-Robin', () => {
  it('atribui via Round-Robin quando o lead é criado sem dono', async () => {
    assignLeadRoundRobin.mockResolvedValue('closer-round-robin');
    const { useCases } = makeUseCases({ id: 'lead-new' });

    const result = await useCases.createLead('org-1', { status: 'Lead Recebido' });

    expect(assignLeadRoundRobin).toHaveBeenCalledWith('org-1', 'lead-new');
    expect(result.owner).toBe('closer-round-robin');
  });

  it('não tenta Round-Robin quando o lead já foi criado com dono', async () => {
    const { useCases } = makeUseCases({ id: 'lead-new' });

    await useCases.createLead('org-1', { status: 'Lead Recebido', owner: 'user-1' });

    expect(assignLeadRoundRobin).not.toHaveBeenCalled();
  });

  it('uma falha no Round-Robin é logada e engolida — a criação do lead continua bem-sucedida', async () => {
    assignLeadRoundRobin.mockRejectedValue(new Error('Redis indisponível'));
    const { useCases } = makeUseCases({ id: 'lead-new' });

    const result = await useCases.createLead('org-1', { status: 'Lead Recebido' });

    expect(result).toMatchObject({ id: 'lead-new' });
    expect(logger.error).toHaveBeenCalled();
  });
});
