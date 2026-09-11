import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * `updateLead`/`updateLeadStatus` orquestram três coisas que não podem regredir silenciosamente:
 * 1) o gate de fechamento manual (CYC-007) é obrigatório antes de qualquer persistência quando o
 *    novo status é "Negócios Ganhos" — inclusive a exigência de `actorUserId`;
 * 2) o evento certo (`DEAL_WON`/`DEAL_LOST`) é emitido para quem está ouvindo `crmEventBus`
 *    (dashboards em tempo real, automações);
 * 3) uma mudança de status re-sincroniza o Bitrix de forma fire-and-forget (nunca deve atrasar
 *    nem derrubar a resposta ao chamador, mesmo se a sincronização falhar).
 * `ensureManualDealClosureAllowed` já tem sua própria suíte em dealClosureGate.test.ts — aqui ele
 * é mockado, testamos só a orquestração do use case.
 */
const ensureManualDealClosureAllowed = vi.fn();
vi.mock('../dealClosureGate.js', () => ({
  ensureManualDealClosureAllowed: (...args: unknown[]) => ensureManualDealClosureAllowed(...args),
}));
vi.mock('../../infra/PrismaDealClosureGate.js', () => ({
  prismaDealClosureGate: { marker: 'prisma-deal-closure-gate' },
}));

const broadcastEvent = vi.fn();
vi.mock('../../../../lib/eventsBus.js', () => ({
  broadcastEvent: (...args: unknown[]) => broadcastEvent(...args),
}));

const pushLeadToBitrix = vi.fn().mockResolvedValue(undefined);
vi.mock('../../../integrations/bitrix/bitrix.service.js', () => ({
  pushLeadToBitrix: (...args: unknown[]) => pushLeadToBitrix(...args),
}));

const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
vi.mock('../../../../lib/logger.js', () => ({ logger }));

const { LeadUseCases } = await import('../LeadUseCases');

function makeUseCases(overrides: Record<string, unknown> = {}) {
  const repository = {
    update: vi.fn().mockResolvedValue({ id: 'lead-1', bitrixLeadId: null }),
    updateStatus: vi.fn().mockResolvedValue({ id: 'lead-1', bitrixLeadId: null }),
    ...overrides,
  };
  return { useCases: new LeadUseCases(repository as never), repository };
}

// Espera a promise fire-and-forget do sync com Bitrix "assentar" antes de checar os mocks —
// syncStatusChangeToBitrix não é aguardado pelo use case de propósito (ver comentário no código).
const flushMicrotasks = () => new Promise((resolve) => setImmediate(resolve));

afterEach(() => {
  vi.clearAllMocks();
});

describe('LeadUseCases.updateLead', () => {
  it('rejeita fechar negócio (Negócios Ganhos) sem actorUserId, sem chamar o gate nem persistir', async () => {
    const { useCases, repository } = makeUseCases();

    await expect(
      useCases.updateLead('org-1', 'lead-1', { status: 'Negócios Ganhos' }),
    ).rejects.toMatchObject({ statusCode: 401 });

    expect(ensureManualDealClosureAllowed).not.toHaveBeenCalled();
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('com actorUserId, passa pelo gate antes de persistir e emite DEAL_WON', async () => {
    const { useCases, repository } = makeUseCases({
      update: vi.fn().mockResolvedValue({ id: 'lead-1', bitrixLeadId: null }),
    });

    await useCases.updateLead('org-1', 'lead-1', { status: 'Negócios Ganhos' }, 'user-42');

    expect(ensureManualDealClosureAllowed).toHaveBeenCalledWith(
      { marker: 'prisma-deal-closure-gate' },
      { organizationId: 'org-1', leadId: 'lead-1', actorUserId: 'user-42' },
    );
    expect(repository.update).toHaveBeenCalledWith('org-1', 'lead-1', {
      status: 'Negócios Ganhos',
    });
    expect(broadcastEvent).toHaveBeenCalledWith({
      type: 'DEAL_WON',
      organizationId: 'org-1',
      payload: { leadId: 'lead-1' },
    });
  });

  it('se o gate rejeitar, não persiste a mudança de status', async () => {
    ensureManualDealClosureAllowed.mockRejectedValueOnce(
      Object.assign(new Error('untrusted-trigger'), { statusCode: 403 }),
    );
    const { useCases, repository } = makeUseCases();

    await expect(
      useCases.updateLead('org-1', 'lead-1', { status: 'Negócios Ganhos' }, 'ai-agente'),
    ).rejects.toMatchObject({ statusCode: 403 });

    expect(repository.update).not.toHaveBeenCalled();
    expect(broadcastEvent).not.toHaveBeenCalled();
  });

  it.each(['Negócios Perdidos', 'Lead Desqualificado'])(
    'emite DEAL_LOST para status "%s" (perdido/desqualificado, case-insensitive por substring)',
    async (status) => {
      const { useCases } = makeUseCases();

      await useCases.updateLead('org-1', 'lead-1', { status });

      expect(broadcastEvent).toHaveBeenCalledWith({
        type: 'DEAL_LOST',
        organizationId: 'org-1',
        payload: { leadId: 'lead-1' },
      });
    },
  );

  it('não emite nenhum evento quando o update não muda o status', async () => {
    const { useCases } = makeUseCases();

    await useCases.updateLead('org-1', 'lead-1', { temperature: 'Quente' });

    expect(broadcastEvent).not.toHaveBeenCalled();
  });

  it('dispara re-sincronização com o Bitrix quando o status muda e o lead já tem bitrixLeadId', async () => {
    const { useCases } = makeUseCases({
      update: vi.fn().mockResolvedValue({ id: 'lead-1', bitrixLeadId: 'bx-99' }),
    });

    await useCases.updateLead('org-1', 'lead-1', { status: 'Reunião Agendada' });
    await flushMicrotasks();

    expect(pushLeadToBitrix).toHaveBeenCalledWith('org-1', 'lead-1');
  });

  it('não tenta sincronizar com o Bitrix quando o lead nunca foi exportado (bitrixLeadId nulo)', async () => {
    const { useCases } = makeUseCases({
      update: vi.fn().mockResolvedValue({ id: 'lead-1', bitrixLeadId: null }),
    });

    await useCases.updateLead('org-1', 'lead-1', { status: 'Reunião Agendada' });
    await flushMicrotasks();

    expect(pushLeadToBitrix).not.toHaveBeenCalled();
  });

  it('uma falha na re-sincronização com o Bitrix é logada, nunca propagada ao chamador', async () => {
    pushLeadToBitrix.mockRejectedValueOnce(new Error('Bitrix indisponível'));
    const { useCases } = makeUseCases({
      update: vi.fn().mockResolvedValue({ id: 'lead-1', bitrixLeadId: 'bx-99' }),
    });

    await expect(
      useCases.updateLead('org-1', 'lead-1', { status: 'Reunião Agendada' }),
    ).resolves.toMatchObject({ id: 'lead-1' });
    await flushMicrotasks();

    expect(logger.warn).toHaveBeenCalled();
  });
});

describe('LeadUseCases.updateLeadStatus', () => {
  it('rejeita fechar negócio sem actorUserId, sem chamar updateStatus', async () => {
    const { useCases, repository } = makeUseCases();

    await expect(
      useCases.updateLeadStatus('org-1', 'lead-1', 'Negócios Ganhos'),
    ).rejects.toMatchObject({ statusCode: 401 });

    expect(repository.updateStatus).not.toHaveBeenCalled();
  });

  it('com actorUserId válido, passa pelo gate, persiste via updateStatus e emite DEAL_WON', async () => {
    const { useCases, repository } = makeUseCases({
      updateStatus: vi.fn().mockResolvedValue({ id: 'lead-1', bitrixLeadId: null }),
    });

    await useCases.updateLeadStatus('org-1', 'lead-1', 'Negócios Ganhos', 'user-42');

    expect(ensureManualDealClosureAllowed).toHaveBeenCalledWith(
      { marker: 'prisma-deal-closure-gate' },
      { organizationId: 'org-1', leadId: 'lead-1', actorUserId: 'user-42' },
    );
    expect(repository.updateStatus).toHaveBeenCalledWith('org-1', 'lead-1', 'Negócios Ganhos');
    expect(broadcastEvent).toHaveBeenCalledWith({
      type: 'DEAL_WON',
      organizationId: 'org-1',
      payload: { leadId: 'lead-1' },
    });
  });

  it('emite DEAL_LOST quando o novo status indica perda/desqualificação', async () => {
    const { useCases } = makeUseCases();

    await useCases.updateLeadStatus('org-1', 'lead-1', 'Negócios Perdidos');

    expect(broadcastEvent).toHaveBeenCalledWith({
      type: 'DEAL_LOST',
      organizationId: 'org-1',
      payload: { leadId: 'lead-1' },
    });
  });

  it('sempre tenta re-sincronizar com o Bitrix após mudança de etapa (independente do tipo de status)', async () => {
    const { useCases } = makeUseCases({
      updateStatus: vi.fn().mockResolvedValue({ id: 'lead-1', bitrixLeadId: 'bx-1' }),
    });

    await useCases.updateLeadStatus('org-1', 'lead-1', 'Cadência Iniciada');
    await flushMicrotasks();

    expect(pushLeadToBitrix).toHaveBeenCalledWith('org-1', 'lead-1');
  });
});
