import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Item 5 de "IA Agêntica de Vendas": detecção de deal em risco (silêncio/tom negativo/concorrente
 * mencionado) e alerta aos gestores reais — nunca um broadcast silencioso quando existe
 * destinatário certo, nunca repete o mesmo alerta dentro do cooldown, nunca chama IA sem
 * conversa recente pra analisar.
 */
const leadFindManyMock = vi.fn();
const whatsAppFindManyMock = vi.fn();
const notificationFindFirstMock = vi.fn();
const userFindManyMock = vi.fn();
const notificationCreateMock = vi.fn();
const invokeMock = vi.fn();
const getAiModelMock = vi.fn((..._args: unknown[]) => ({ invoke: invokeMock }));
const cleanAndParseJsonMock = vi.fn();

vi.mock('../../../../lib/prisma.js', () => ({
  prisma: {
    lead: { findMany: (...args: unknown[]) => leadFindManyMock(...args) },
    whatsAppMessage: { findMany: (...args: unknown[]) => whatsAppFindManyMock(...args) },
    notification: { findFirst: (...args: unknown[]) => notificationFindFirstMock(...args) },
    user: { findMany: (...args: unknown[]) => userFindManyMock(...args) },
  },
}));

vi.mock('../../../../lib/ai/gateway.js', () => ({
  getAiModel: (...args: unknown[]) => getAiModelMock(...args),
  cleanAndParseJson: (...args: unknown[]) => cleanAndParseJsonMock(...args),
  logAiUsage: vi.fn(),
}));

vi.mock('../../../../lib/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('../../../notifications/notification.service.js', () => ({
  notificationService: { create: (...args: unknown[]) => notificationCreateMock(...args) },
}));

const { detectDealRisks } = await import('../dealRiskDetection.service');

beforeEach(() => {
  vi.clearAllMocks();
  leadFindManyMock.mockResolvedValue([]);
  whatsAppFindManyMock.mockResolvedValue([]);
  notificationFindFirstMock.mockResolvedValue(null);
  userFindManyMock.mockResolvedValue([]);
  notificationCreateMock.mockResolvedValue({ id: 'notif-1' });
});

describe('detectDealRisks', () => {
  it('detecta lead silencioso e alerta os gestores reais da organização, um por pessoa', async () => {
    leadFindManyMock.mockResolvedValue([
      {
        id: 'lead-1',
        lastInteraction: new Date('2026-09-01T00:00:00Z'),
        createdAt: new Date('2026-08-01T00:00:00Z'),
        company: { tradeName: 'Empresa X' },
      },
    ]);
    userFindManyMock.mockResolvedValue([{ id: 'gestor-1' }, { id: 'gestor-2' }]);

    const result = await detectDealRisks('org-1', new Date('2026-09-10T00:00:00Z'));

    expect(result.alertsCreated).toBe(1);
    expect(notificationCreateMock).toHaveBeenCalledTimes(2);
    expect(notificationCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'gestor-1',
        kind: 'Alerta',
        entity: 'Lead',
        entityId: 'lead-1',
      }),
    );
    expect(notificationCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'gestor-2' }),
    );
  });

  it('sem nenhum ADMIN/GESTOR cadastrado, faz broadcast pra organização em vez de perder o alerta', async () => {
    leadFindManyMock.mockResolvedValue([
      {
        id: 'lead-1',
        lastInteraction: new Date('2026-09-01T00:00:00Z'),
        createdAt: new Date('2026-08-01T00:00:00Z'),
        company: null,
      },
    ]);
    userFindManyMock.mockResolvedValue([]);

    await detectDealRisks('org-1', new Date('2026-09-10T00:00:00Z'));

    expect(notificationCreateMock).toHaveBeenCalledTimes(1);
    const [callArgs] = notificationCreateMock.mock.calls[0];
    expect(callArgs.entityId).toBe('lead-1');
    expect(callArgs.userId).toBeUndefined();
  });

  it('não repete o mesmo alerta dentro do cooldown', async () => {
    leadFindManyMock.mockResolvedValue([
      {
        id: 'lead-1',
        lastInteraction: new Date('2026-09-01T00:00:00Z'),
        createdAt: new Date('2026-08-01T00:00:00Z'),
        company: null,
      },
    ]);
    notificationFindFirstMock.mockResolvedValue({ id: 'existing-notif' });

    const result = await detectDealRisks('org-1', new Date('2026-09-10T00:00:00Z'));

    expect(result.skippedCooldown).toBe(1);
    expect(result.alertsCreated).toBe(0);
    expect(notificationCreateMock).not.toHaveBeenCalled();
  });

  it('não chama a IA quando não há mensagem inbound recente pra analisar', async () => {
    leadFindManyMock.mockResolvedValue([]);
    whatsAppFindManyMock.mockResolvedValue([]);

    await detectDealRisks('org-1');

    expect(getAiModelMock).not.toHaveBeenCalled();
  });

  it('detecta tom negativo e concorrente mencionado a partir da análise real da conversa', async () => {
    leadFindManyMock.mockResolvedValue([]);
    whatsAppFindManyMock
      .mockResolvedValueOnce([{ leadId: 'lead-2' }]) // findLeadsWithRecentInbound
      .mockResolvedValueOnce([
        { direction: 'inbound', body: 'Vocês estão cobrando muito mais que a Empresa Rival.' },
      ]); // loadRecentConversation
    invokeMock.mockResolvedValue({
      content: 'x',
      response_metadata: { model: 'm', tokenUsage: {} },
    });
    cleanAndParseJsonMock.mockReturnValue([
      { toneNegative: true, competitorMentioned: 'Empresa Rival' },
    ]);
    userFindManyMock.mockResolvedValue([{ id: 'gestor-1' }]);

    const result = await detectDealRisks('org-1');

    expect(result.alertsCreated).toBe(2); // tom_negativo + concorrente_mencionado
    expect(notificationCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: expect.stringContaining('mudança de tom'),
        entityId: 'lead-2',
      }),
    );
    expect(notificationCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: expect.stringContaining('concorrente mencionado'),
        body: expect.stringContaining('Empresa Rival'),
      }),
    );
  });

  it('descarta a rodada de análise de conversa quando a IA devolve formato inesperado — nunca casa dado errado', async () => {
    leadFindManyMock.mockResolvedValue([]);
    whatsAppFindManyMock
      .mockResolvedValueOnce([{ leadId: 'lead-2' }])
      .mockResolvedValueOnce([{ direction: 'inbound', body: 'Oi' }]);
    invokeMock.mockResolvedValue({
      content: 'x',
      response_metadata: { model: 'm', tokenUsage: {} },
    });
    cleanAndParseJsonMock.mockReturnValue([]); // 0 resultados para 1 conversa enviada

    const result = await detectDealRisks('org-1');

    expect(result.alertsCreated).toBe(0);
    expect(notificationCreateMock).not.toHaveBeenCalled();
  });
});
