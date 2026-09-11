import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * Views salvas são pessoais: toda leitura/escrita é escopada por `userId` além de
 * `organizationId` (reforço na camada de aplicação, não só no RLS — ver comentário do próprio
 * savedView.service.ts). Estes testes travam a validação de entrada e o isolamento por dono.
 */
const prismaMock = {
  savedView: { findMany: vi.fn(), create: vi.fn(), deleteMany: vi.fn() },
};
vi.mock('../../../../lib/prisma.js', () => ({ prisma: prismaMock }));

const { listSavedViews, createSavedView, deleteSavedView } = await import('../savedView.service');

afterEach(() => {
  vi.clearAllMocks();
});

describe('listSavedViews', () => {
  it('busca só as views do próprio usuário na organização, mais recentes primeiro', async () => {
    prismaMock.savedView.findMany.mockResolvedValue([{ id: 'view-1' }]);

    const result = await listSavedViews('org-1', 'user-1');

    expect(prismaMock.savedView.findMany).toHaveBeenCalledWith({
      where: { organizationId: 'org-1', userId: 'user-1' },
      orderBy: { createdAt: 'desc' },
    });
    expect(result).toEqual([{ id: 'view-1' }]);
  });
});

describe('createSavedView', () => {
  // `createSavedView` valida e lança de forma síncrona antes de tocar o Prisma (só o `return`
  // final é uma Promise) — por isso o throw é verificado com uma função wrapper, não com
  // `.rejects` (que exige que a chamada em si devolva uma Promise rejeitada).
  it('rejeita nome vazio', () => {
    expect(() => createSavedView('org-1', 'user-1', { name: '', funnel: 'Lead' })).toThrowError(
      expect.objectContaining({ statusCode: 400 }),
    );
    expect(prismaMock.savedView.create).not.toHaveBeenCalled();
  });

  it('rejeita nome só com espaços', () => {
    expect(() =>
      createSavedView('org-1', 'user-1', { name: '   ', funnel: 'Lead' }),
    ).toThrowError(expect.objectContaining({ statusCode: 400 }));
  });

  it('rejeita funil ausente', () => {
    expect(() =>
      createSavedView('org-1', 'user-1', { name: 'Minha view' }),
    ).toThrowError(expect.objectContaining({ statusCode: 400 }));
  });

  it('rejeita funil fora de "Lead"/"Negocio"', () => {
    expect(() =>
      createSavedView('org-1', 'user-1', { name: 'Minha view', funnel: 'Contato' }),
    ).toThrowError(expect.objectContaining({ statusCode: 400 }));
  });

  it('aceita funil "Negocio" e usa {} como filtro padrão quando nenhum é informado', async () => {
    prismaMock.savedView.create.mockResolvedValue({ id: 'view-1' });

    await createSavedView('org-1', 'user-1', { name: '  Pipeline quente  ', funnel: 'Negocio' });

    expect(prismaMock.savedView.create).toHaveBeenCalledWith({
      data: {
        organizationId: 'org-1',
        userId: 'user-1',
        name: 'Pipeline quente', // nome deve vir com trim aplicado
        funnel: 'Negocio',
        filters: {},
      },
    });
  });

  it('repassa os filtros informados sem alterá-los', async () => {
    prismaMock.savedView.create.mockResolvedValue({ id: 'view-2' });
    const filters = { owner: 'user-9', q: 'transportadora' };

    await createSavedView('org-1', 'user-1', { name: 'Filtro custom', funnel: 'Lead', filters });

    expect(prismaMock.savedView.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ filters }),
    });
  });
});

describe('deleteSavedView', () => {
  it('lança 404 quando nenhuma linha é apagada (não existe ou não é do usuário)', async () => {
    prismaMock.savedView.deleteMany.mockResolvedValue({ count: 0 });

    await expect(deleteSavedView('org-1', 'user-1', 'view-x')).rejects.toMatchObject({
      statusCode: 404,
    });
    expect(prismaMock.savedView.deleteMany).toHaveBeenCalledWith({
      where: { id: 'view-x', organizationId: 'org-1', userId: 'user-1' },
    });
  });

  it('resolve sem erro quando a view do próprio usuário é apagada', async () => {
    prismaMock.savedView.deleteMany.mockResolvedValue({ count: 1 });

    await expect(deleteSavedView('org-1', 'user-1', 'view-1')).resolves.toBeUndefined();
  });
});
