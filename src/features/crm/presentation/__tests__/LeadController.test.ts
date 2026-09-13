import type { NextFunction, Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * `LeadController` nunca tinha teste unitário próprio. Cobre o contrato HTTP (200/201/204/404,
 * `next(error)` no catch) e duas decisões de roteamento com regra de negócio real embutida:
 *
 * 1) `getLeads` só aceita `funnel=Lead`/`funnel=Negocio` — qualquer outro valor (incluindo um
 *    array de query string tamperado) vira `undefined`, nunca é repassado cru ao use case;
 * 2) `updateLead` escolhe entre `updateLeadStatus` (mudança rápida de etapa, ex.: drag-and-drop no
 *    Kanban) e `updateLead` (edição completa) com base em o corpo ter **só** a chave `status` —
 *    esta é a diferença entre dois use cases com validação e side effects diferentes, então a
 *    condição exata (`Object.keys(req.body).length === 1`) precisa ficar travada.
 *
 * `automationEngine.handle` é mockado: o disparo de automações já tem sua própria suíte, aqui
 * importa só que `fireAutomations` é chamado (ou não) com o evento certo.
 */
const handleAutomation = vi.fn().mockResolvedValue(0);
vi.mock('../../../automations/automation.engine', () => ({
  automationEngine: { handle: (...args: unknown[]) => handleAutomation(...args) },
}));

const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
vi.mock('../../../../lib/logger', () => ({ logger }));

const { LeadController } = await import('../LeadController');

function buildResponse() {
  const res = {} as Response;
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  res.send = vi.fn().mockReturnValue(res);
  res.setHeader = vi.fn().mockReturnValue(res);
  return res;
}

function buildRequest(overrides: Record<string, unknown> = {}): Request {
  return {
    user: { organizationId: 'org-1', id: 'user-1', role: 'CLOSER' },
    params: {},
    query: {},
    body: {},
    ...overrides,
  } as unknown as Request;
}

// flush da automação fire-and-forget (fireAutomations não é aguardada de propósito)
const flushMicrotasks = () => new Promise((resolve) => setImmediate(resolve));

describe('LeadController', () => {
  let useCases: {
    findLeads: ReturnType<typeof vi.fn>;
    findLeadById: ReturnType<typeof vi.fn>;
    createLead: ReturnType<typeof vi.fn>;
    updateLead: ReturnType<typeof vi.fn>;
    updateLeadStatus: ReturnType<typeof vi.fn>;
    deleteLead: ReturnType<typeof vi.fn>;
    batchUpdateLeads: ReturnType<typeof vi.fn>;
  };
  let controller: InstanceType<typeof LeadController>;
  let next: NextFunction;

  beforeEach(() => {
    vi.clearAllMocks();
    useCases = {
      findLeads: vi.fn(),
      findLeadById: vi.fn(),
      createLead: vi.fn(),
      updateLead: vi.fn(),
      updateLeadStatus: vi.fn(),
      deleteLead: vi.fn(),
      batchUpdateLeads: vi.fn(),
    };
    controller = new LeadController(useCases as never);
    next = vi.fn();
  });

  describe('getLeads', () => {
    it.each([
      ['Lead', 'Lead'],
      ['Negocio', 'Negocio'],
    ])('aceita funnel=%s e repassa como %s ao use case', async (input, expected) => {
      useCases.findLeads.mockResolvedValue({ data: [], meta: {} });
      const res = buildResponse();

      await controller.getLeads(buildRequest({ query: { funnel: input } }), res, next);

      expect(useCases.findLeads).toHaveBeenCalledWith(
        'org-1',
        undefined,
        1,
        50,
        expected,
        undefined,
      );
    });

    it('descarta um valor de funnel fora do enum (nunca repassa cru ao use case)', async () => {
      useCases.findLeads.mockResolvedValue({ data: [], meta: {} });
      const res = buildResponse();

      await controller.getLeads(buildRequest({ query: { funnel: 'DROP TABLE' } }), res, next);

      expect(useCases.findLeads).toHaveBeenCalledWith(
        'org-1',
        undefined,
        1,
        50,
        undefined,
        undefined,
      );
    });

    it('descarta funnel tamperado como array de query string em vez de propagar', async () => {
      useCases.findLeads.mockResolvedValue({ data: [], meta: {} });
      const res = buildResponse();

      await controller.getLeads(
        buildRequest({ query: { funnel: ['Lead', 'Negocio'] } }),
        res,
        next,
      );

      expect(useCases.findLeads).toHaveBeenCalledWith(
        'org-1',
        undefined,
        1,
        50,
        undefined,
        undefined,
      );
    });

    it('ignora q/status tamperados como array/objeto, tratando como ausentes', async () => {
      useCases.findLeads.mockResolvedValue({ data: [], meta: {} });
      const res = buildResponse();

      await controller.getLeads(
        buildRequest({ query: { q: ['a', 'b'], status: { $ne: null } } }),
        res,
        next,
      );

      expect(useCases.findLeads).toHaveBeenCalledWith(
        'org-1',
        undefined,
        1,
        50,
        undefined,
        undefined,
      );
    });

    it('usa página/limite default quando query não traz valores numéricos válidos', async () => {
      useCases.findLeads.mockResolvedValue({ data: [], meta: {} });
      const res = buildResponse();

      await controller.getLeads(buildRequest({ query: { page: 'abc', limit: 'xyz' } }), res, next);

      expect(useCases.findLeads).toHaveBeenCalledWith(
        'org-1',
        undefined,
        1,
        50,
        undefined,
        undefined,
      );
    });

    it('encaminha erro do use case para next()', async () => {
      const error = new Error('db down');
      useCases.findLeads.mockRejectedValue(error);
      const res = buildResponse();

      await controller.getLeads(buildRequest(), res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('getLeadById', () => {
    it('responde 404 quando o lead não existe', async () => {
      useCases.findLeadById.mockResolvedValue(null);
      const res = buildResponse();

      await controller.getLeadById(buildRequest({ params: { id: 'lead-x' } }), res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
    });

    it('responde 200 com o lead encontrado', async () => {
      useCases.findLeadById.mockResolvedValue({ id: 'lead-1' });
      const res = buildResponse();

      await controller.getLeadById(buildRequest({ params: { id: 'lead-1' } }), res, next);

      expect(res.json).toHaveBeenCalledWith({ success: true, data: { id: 'lead-1' } });
    });
  });

  describe('createLead', () => {
    it('responde 201 e dispara a automação "Lead criado" com os dados do lead', async () => {
      useCases.createLead.mockResolvedValue({ id: 'lead-1', status: 'Lead Recebido' });
      const res = buildResponse();

      await controller.createLead(buildRequest({ body: { companyId: 'company-1' } }), res, next);
      await flushMicrotasks();

      expect(useCases.createLead).toHaveBeenCalledWith(
        'org-1',
        { companyId: 'company-1' },
        { userId: 'user-1', role: 'CLOSER' },
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(handleAutomation).toHaveBeenCalledWith(
        expect.objectContaining({ trigger: 'Lead criado', entity: 'Lead', entityId: 'lead-1' }),
      );
    });

    it('encaminha erro do use case para next() sem responder 201', async () => {
      const error = Object.assign(new Error('duplicado'), { statusCode: 409 });
      useCases.createLead.mockRejectedValue(error);
      const res = buildResponse();

      await controller.createLead(buildRequest(), res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('updateLead — roteamento entre updateLeadStatus e updateLead', () => {
    it('body só com "status": usa updateLeadStatus e dispara automação de mudança de status', async () => {
      useCases.updateLeadStatus.mockResolvedValue({ id: 'lead-1', status: 'Reunião Agendada' });
      const res = buildResponse();

      await controller.updateLead(
        buildRequest({ params: { id: 'lead-1' }, body: { status: 'Reunião Agendada' } }),
        res,
        next,
      );
      await flushMicrotasks();

      expect(useCases.updateLeadStatus).toHaveBeenCalledWith(
        'org-1',
        'lead-1',
        'Reunião Agendada',
        'user-1',
      );
      expect(useCases.updateLead).not.toHaveBeenCalled();
      expect(handleAutomation).toHaveBeenCalledWith(
        expect.objectContaining({ trigger: 'Lead mudou de status' }),
      );
    });

    it('body com status + outro campo: usa updateLead (edição completa), não updateLeadStatus', async () => {
      useCases.updateLead.mockResolvedValue({ id: 'lead-1', status: 'Reunião Agendada' });
      const res = buildResponse();

      await controller.updateLead(
        buildRequest({
          params: { id: 'lead-1' },
          body: { status: 'Reunião Agendada', temperature: 'Quente' },
        }),
        res,
        next,
      );

      expect(useCases.updateLead).toHaveBeenCalledWith(
        'org-1',
        'lead-1',
        { status: 'Reunião Agendada', temperature: 'Quente' },
        'user-1',
      );
      expect(useCases.updateLeadStatus).not.toHaveBeenCalled();
    });

    it('body sem status: usa updateLead e não dispara automação de mudança de status', async () => {
      useCases.updateLead.mockResolvedValue({ id: 'lead-1', temperature: 'Frio' });
      const res = buildResponse();

      await controller.updateLead(
        buildRequest({ params: { id: 'lead-1' }, body: { temperature: 'Frio' } }),
        res,
        next,
      );
      await flushMicrotasks();

      expect(useCases.updateLead).toHaveBeenCalledWith(
        'org-1',
        'lead-1',
        { temperature: 'Frio' },
        'user-1',
      );
      expect(handleAutomation).not.toHaveBeenCalled();
    });

    it('encaminha erro (ex.: gate de fechamento rejeitando) para next()', async () => {
      const error = Object.assign(new Error('untrusted-trigger'), { statusCode: 403 });
      useCases.updateLeadStatus.mockRejectedValue(error);
      const res = buildResponse();

      await controller.updateLead(
        buildRequest({ params: { id: 'lead-1' }, body: { status: 'Negócios Ganhos' } }),
        res,
        next,
      );

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('deleteLead', () => {
    it('responde 204 sem corpo', async () => {
      useCases.deleteLead.mockResolvedValue(undefined);
      const res = buildResponse();

      await controller.deleteLead(buildRequest({ params: { id: 'lead-1' } }), res, next);

      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.send).toHaveBeenCalled();
    });
  });

  describe('batchUpdate', () => {
    it('responde 400 quando leadIds está ausente/vazio', async () => {
      const res = buildResponse();

      await controller.batchUpdate(buildRequest({ body: { updates: { status: 'x' } } }), res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(useCases.batchUpdateLeads).not.toHaveBeenCalled();
    });

    it('responde 400 quando updates está ausente/não é objeto', async () => {
      const res = buildResponse();

      await controller.batchUpdate(
        buildRequest({ body: { leadIds: ['lead-1'], updates: 'not-an-object' } }),
        res,
        next,
      );

      expect(res.status).toHaveBeenCalledWith(400);
      expect(useCases.batchUpdateLeads).not.toHaveBeenCalled();
    });

    it('com payload válido, chama o use case com o actor autenticado', async () => {
      useCases.batchUpdateLeads.mockResolvedValue({ updatedCount: 2, total: 2, failedCount: 0 });
      const res = buildResponse();

      await controller.batchUpdate(
        buildRequest({ body: { leadIds: ['lead-1', 'lead-2'], updates: { status: 'x' } } }),
        res,
        next,
      );

      expect(useCases.batchUpdateLeads).toHaveBeenCalledWith(
        'org-1',
        ['lead-1', 'lead-2'],
        { status: 'x' },
        'user-1',
      );
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: { updatedCount: 2, total: 2, failedCount: 0 },
      });
    });
  });
});
