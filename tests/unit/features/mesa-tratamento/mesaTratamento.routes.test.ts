import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

// vi.mock(...) é hoisted acima de TODO import/const do módulo (inclusive acima da própria
// declaração destas constantes, já que imports estáticos também são hoisted pela spec de módulos
// ES) — vi.hoisted() é o jeito suportado de ter um valor pronto ANTES desse hoist, evitando o
// "Cannot access before initialization" que um `const` comum causaria aqui.
const { prismaMock, bitrixServiceMock } = vi.hoisted(() => ({
  prismaMock: {
    bitrixConnection: { findFirst: vi.fn() },
    lead: { findFirst: vi.fn(), findMany: vi.fn(), update: vi.fn() },
    user: { findMany: vi.fn(), findUnique: vi.fn() },
    mesaTratamentoTreatment: { create: vi.fn(), findMany: vi.fn() },
    pomodoroSession: { create: vi.fn(), findMany: vi.fn() },
    activity: { create: vi.fn() },
  },
  bitrixServiceMock: {
    findUnimportedBitrixLeadIds: vi.fn(),
    importSelectedBitrixLeads: vi.fn(),
    getLeadStatuses: vi.fn(),
    getBitrixUsers: vi.fn(),
    resolveOwnBitrixUserId: vi.fn(),
    resolveAtlasUserIdByEmail: vi.fn(),
    postCommentToBitrix: vi.fn(),
    exportLeadToBitrixNow: vi.fn(),
  },
}));

vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }));
vi.mock('@/features/integrations/bitrix/bitrix.service', () => bitrixServiceMock);

import { mesaTratamentoRoutes } from '@/features/mesa-tratamento/routes/mesaTratamento.routes';
import { errorHandler } from '@/shared/middlewares/errorHandler';

function buildApp(role: string, userId = 'user-1', email = 'user1@atlasgr.com.br') {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (
      req as unknown as {
        user: { id: string; organizationId: string; role: string; email: string };
      }
    ).user = { id: userId, organizationId: 'org-1', role, email };
    next();
  });
  app.use('/api/mesa-tratamento', mesaTratamentoRoutes);
  app.use(errorHandler);
  return app;
}

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.mesaTratamentoTreatment.create.mockResolvedValue({});
  prismaMock.activity.create.mockResolvedValue({});
  prismaMock.lead.update.mockResolvedValue({});
  prismaMock.user.findMany.mockResolvedValue([]);
  bitrixServiceMock.postCommentToBitrix.mockResolvedValue({
    entityType: 'lead',
    bitrixRecordId: '123',
  });
  bitrixServiceMock.exportLeadToBitrixNow.mockResolvedValue({ bitrixLeadId: '123' });
  bitrixServiceMock.getLeadStatuses.mockResolvedValue([]);
  bitrixServiceMock.findUnimportedBitrixLeadIds.mockResolvedValue({ ids: [] });
});

describe('GET /api/mesa-tratamento/queue — escopo de dono (bug owner-vs-nome)', () => {
  it('CLOSER: filtra a fila pelo próprio User.id, não por um nome buscado à parte', async () => {
    prismaMock.bitrixConnection.findFirst.mockResolvedValue({ id: 'conn-1' });
    bitrixServiceMock.getBitrixUsers.mockResolvedValue([
      { id: 'bx-1', name: 'Ana Closer', email: 'user1@atlasgr.com.br' },
    ]);
    bitrixServiceMock.resolveOwnBitrixUserId.mockReturnValue('bx-1');
    prismaMock.lead.findMany.mockResolvedValue([]);

    const response = await request(buildApp('CLOSER', 'user-closer-1')).get(
      '/api/mesa-tratamento/queue',
    );

    expect(response.status).toBe(200);
    expect(prismaMock.lead.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ owner: 'user-closer-1' }),
      }),
    );
  });

  it('CLOSER sem correspondência no Bitrix (e-mail não encontrado) recebe fila vazia com aviso, sem consultar leads', async () => {
    prismaMock.bitrixConnection.findFirst.mockResolvedValue({ id: 'conn-1' });
    bitrixServiceMock.getBitrixUsers.mockResolvedValue([]);
    bitrixServiceMock.resolveOwnBitrixUserId.mockReturnValue(null);

    const response = await request(buildApp('CLOSER', 'user-closer-1')).get(
      '/api/mesa-tratamento/queue',
    );

    expect(response.status).toBe(200);
    expect(response.body.data.queue).toEqual([]);
    expect(response.body.meta?.warning).toBeTruthy();
    expect(prismaMock.lead.findMany).not.toHaveBeenCalled();
  });

  it('ADMIN vê a fila do time todo, sem filtro de owner, e o nome do responsável é resolvido a partir do User.id', async () => {
    prismaMock.bitrixConnection.findFirst.mockResolvedValue({ id: 'conn-1' });
    prismaMock.lead.findMany.mockResolvedValue([
      {
        id: 'lead-1',
        status: 'Lead_Recebido',
        temperature: null,
        score: null,
        owner: 'user-closer-1',
        lastInteraction: null,
        nextAction: null,
        qualification: null,
        bitrixLeadId: '999',
        bitrixStageLabel: null,
        company: null,
        contact: null,
      },
    ]);
    prismaMock.user.findMany.mockResolvedValue([{ id: 'user-closer-1', name: 'Ana Closer' }]);

    const response = await request(buildApp('ADMIN', 'user-admin-1')).get(
      '/api/mesa-tratamento/queue',
    );

    expect(response.status).toBe(200);
    expect(prismaMock.lead.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.not.objectContaining({ owner: expect.anything() }) }),
    );
    expect(response.body.data.queue[0].owner).toBe('Ana Closer');
  });
});

describe('POST /api/mesa-tratamento/lead/:id/register — posse do lead', () => {
  const registerBody = { outcome: 'contato', note: 'Falei com o decisor.' };

  it('CLOSER registrando em lead que É seu (owner === userId): sucesso', async () => {
    prismaMock.lead.findFirst.mockResolvedValue({
      id: 'lead-1',
      owner: 'user-closer-1',
      bitrixLeadId: '999',
    });
    prismaMock.bitrixConnection.findFirst.mockResolvedValue({ id: 'conn-1' });

    const response = await request(buildApp('CLOSER', 'user-closer-1'))
      .post('/api/mesa-tratamento/lead/lead-1/register')
      .send(registerBody);

    expect(response.status).toBe(200);
    expect(prismaMock.lead.update).toHaveBeenCalled();
  });

  it('CLOSER registrando em lead que NÃO é seu: 403, sem tocar no Bitrix nem no Prisma', async () => {
    prismaMock.lead.findFirst.mockResolvedValue({
      id: 'lead-1',
      owner: 'outro-user-id',
      bitrixLeadId: '999',
    });

    const response = await request(buildApp('CLOSER', 'user-closer-1'))
      .post('/api/mesa-tratamento/lead/lead-1/register')
      .send(registerBody);

    expect(response.status).toBe(403);
    expect(bitrixServiceMock.postCommentToBitrix).not.toHaveBeenCalled();
    expect(prismaMock.lead.update).not.toHaveBeenCalled();
  });

  it('ADMIN pode registrar em lead de qualquer owner', async () => {
    prismaMock.lead.findFirst.mockResolvedValue({
      id: 'lead-1',
      owner: 'outro-user-id',
      bitrixLeadId: '999',
    });
    prismaMock.bitrixConnection.findFirst.mockResolvedValue({ id: 'conn-1' });

    const response = await request(buildApp('ADMIN', 'user-admin-1'))
      .post('/api/mesa-tratamento/lead/lead-1/register')
      .send(registerBody);

    expect(response.status).toBe(200);
  });
});

describe('POST /api/mesa-tratamento/lead/:id/reassign — painel de gestão', () => {
  it('CLOSER recebe 403 (só ADMIN/GESTOR reatribuem)', async () => {
    const response = await request(buildApp('CLOSER', 'user-closer-1'))
      .post('/api/mesa-tratamento/lead/lead-1/reassign')
      .send({ bitrixUserId: 'bx-2' });

    expect(response.status).toBe(403);
  });

  it('GESTOR reatribui: escreve no Bitrix (assignedById) e resolve Lead.owner pro User.id correspondente', async () => {
    prismaMock.lead.findFirst.mockResolvedValue({ id: 'lead-1', bitrixLeadId: '999' });
    prismaMock.bitrixConnection.findFirst.mockResolvedValue({ id: 'conn-1' });
    bitrixServiceMock.getBitrixUsers.mockResolvedValue([
      { id: 'bx-2', name: 'Marcelo Gestor', email: 'marcelo@atlasgr.com.br' },
    ]);
    bitrixServiceMock.resolveAtlasUserIdByEmail.mockResolvedValue('user-marcelo-1');

    const response = await request(buildApp('GESTOR', 'user-gestor-1'))
      .post('/api/mesa-tratamento/lead/lead-1/reassign')
      .send({ bitrixUserId: 'bx-2' });

    expect(response.status).toBe(200);
    expect(bitrixServiceMock.exportLeadToBitrixNow).toHaveBeenCalledWith(
      'org-1',
      'lead-1',
      'conn-1',
      { assignedById: 'bx-2' },
    );
    expect(prismaMock.lead.update).toHaveBeenCalledWith({
      where: { id: 'lead-1' },
      data: { owner: 'user-marcelo-1' },
    });
    expect(response.body.data.ownerName).toBe('Marcelo Gestor');
  });

  it('sem bitrixUserId no corpo: 400, nada é escrito', async () => {
    const response = await request(buildApp('GESTOR', 'user-gestor-1'))
      .post('/api/mesa-tratamento/lead/lead-1/reassign')
      .send({});

    expect(response.status).toBe(400);
    expect(bitrixServiceMock.exportLeadToBitrixNow).not.toHaveBeenCalled();
  });
});

describe('POST /api/mesa-tratamento/lead/:id/comment — painel de gestão', () => {
  it('SDR recebe 403', async () => {
    const response = await request(buildApp('SDR', 'user-sdr-1'))
      .post('/api/mesa-tratamento/lead/lead-1/comment')
      .send({ comment: 'Acompanhar de perto.' });

    expect(response.status).toBe(403);
  });

  it('GESTOR comenta: chama postCommentToBitrix com o texto informado', async () => {
    prismaMock.lead.findFirst.mockResolvedValue({ id: 'lead-1', bitrixLeadId: '999' });

    const response = await request(buildApp('GESTOR', 'user-gestor-1'))
      .post('/api/mesa-tratamento/lead/lead-1/comment')
      .send({ comment: 'Acompanhar de perto.' });

    expect(response.status).toBe(200);
    expect(bitrixServiceMock.postCommentToBitrix).toHaveBeenCalledWith(
      'org-1',
      'lead-1',
      expect.stringContaining('Acompanhar de perto.'),
    );
  });

  it('comentário vazio: 400', async () => {
    const response = await request(buildApp('GESTOR', 'user-gestor-1'))
      .post('/api/mesa-tratamento/lead/lead-1/comment')
      .send({ comment: '   ' });

    expect(response.status).toBe(400);
    expect(bitrixServiceMock.postCommentToBitrix).not.toHaveBeenCalled();
  });
});

describe('POST /api/mesa-tratamento/lead/:id/decide — painel de gestão', () => {
  it('CLOSER recebe 403', async () => {
    const response = await request(buildApp('CLOSER', 'user-closer-1'))
      .post('/api/mesa-tratamento/lead/lead-1/decide')
      .send({});

    expect(response.status).toBe(403);
  });

  it('ADMIN marca como decidido: registra MesaTratamentoTreatment e comenta no Bitrix quando vinculado', async () => {
    prismaMock.lead.findFirst.mockResolvedValue({ id: 'lead-1', bitrixLeadId: '999' });

    const response = await request(buildApp('ADMIN', 'user-admin-1'))
      .post('/api/mesa-tratamento/lead/lead-1/decide')
      .send({ note: 'Sem fit para este trimestre.' });

    expect(response.status).toBe(200);
    expect(prismaMock.mesaTratamentoTreatment.create).toHaveBeenCalledWith({
      data: {
        organizationId: 'org-1',
        userId: 'user-admin-1',
        leadId: 'lead-1',
        outcome: 'decidido_pela_gestao',
      },
    });
    expect(bitrixServiceMock.postCommentToBitrix).toHaveBeenCalled();
  });

  it('ADMIN marca como decidido em lead ainda sem vínculo Bitrix: registra histórico local, sem comentar no Bitrix', async () => {
    prismaMock.lead.findFirst.mockResolvedValue({ id: 'lead-1', bitrixLeadId: null });

    const response = await request(buildApp('ADMIN', 'user-admin-1'))
      .post('/api/mesa-tratamento/lead/lead-1/decide')
      .send({});

    expect(response.status).toBe(200);
    expect(prismaMock.mesaTratamentoTreatment.create).toHaveBeenCalled();
    expect(bitrixServiceMock.postCommentToBitrix).not.toHaveBeenCalled();
  });
});
