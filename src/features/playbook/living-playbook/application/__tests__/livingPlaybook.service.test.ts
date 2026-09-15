import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * Item 42 (Playbook Vivo): sugestões de abordagem vencedora geradas a partir de outcomes
 * POSITIVOS reais e confirmados — nunca de um caso isolado, nunca sem owner real, nunca casando
 * dado errado quando a IA devolve formato inesperado.
 */
const pendingActionFindManyMock = vi.fn();
const leadFindManyMock = vi.fn();
const userFindManyMock = vi.fn();
const notificationCreateMock = vi.fn();
const invokeMock = vi.fn();
const getAiModelMock = vi.fn((..._args: unknown[]) => ({ invoke: invokeMock }));
const cleanAndParseJsonMock = vi.fn();

vi.mock('../../../../../lib/prisma.js', () => ({
  prisma: {
    aIPendingAction: { findMany: (...args: unknown[]) => pendingActionFindManyMock(...args) },
    lead: { findMany: (...args: unknown[]) => leadFindManyMock(...args) },
    user: { findMany: (...args: unknown[]) => userFindManyMock(...args) },
  },
}));

vi.mock('../../../../../lib/ai/gateway.js', () => ({
  getAiModel: (...args: unknown[]) => getAiModelMock(...args),
  cleanAndParseJson: (...args: unknown[]) => cleanAndParseJsonMock(...args),
  logAiUsage: vi.fn(),
}));

vi.mock('../../../../../lib/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('../../../../notifications/notification.service.js', () => ({
  notificationService: { create: (...args: unknown[]) => notificationCreateMock(...args) },
}));

const { generateWinningPatterns, broadcastWinningPattern } = await import(
  '../livingPlaybook.service'
);

afterEach(() => {
  vi.clearAllMocks();
  pendingActionFindManyMock.mockResolvedValue([]);
  leadFindManyMock.mockResolvedValue([]);
  userFindManyMock.mockResolvedValue([]);
  notificationCreateMock.mockResolvedValue({ id: 'notif-1' });
});

function positiveAction(leadId: string, body: string) {
  return { payload: { leadId, body } };
}

describe('generateWinningPatterns', () => {
  it('retorna vazio com motivo explícito quando não há outcomes positivos — nunca chama a IA', async () => {
    pendingActionFindManyMock.mockResolvedValue([]);

    const result = await generateWinningPatterns('org-1');

    expect(result.suggestions).toEqual([]);
    expect(result.emptyReason).toBeTruthy();
    expect(getAiModelMock).not.toHaveBeenCalled();
  });

  it('descarta lead sem owner real — nunca fabrica autoria', async () => {
    pendingActionFindManyMock.mockResolvedValue([
      positiveAction('lead-1', 'Oi, tudo bem?'),
      positiveAction('lead-2', 'Vi que vocês precisam de X'),
    ]);
    leadFindManyMock.mockResolvedValue([
      { id: 'lead-1', owner: null, company: { segment: 'Varejo' } },
      { id: 'lead-2', owner: null, company: { segment: 'Varejo' } },
    ]);

    const result = await generateWinningPatterns('org-1');

    expect(result.suggestions).toEqual([]);
    expect(getAiModelMock).not.toHaveBeenCalled();
  });

  it('exige pelo menos 2 outcomes positivos do mesmo vendedor+segmento — descarta caso isolado', async () => {
    pendingActionFindManyMock.mockResolvedValue([positiveAction('lead-1', 'Mensagem única')]);
    leadFindManyMock.mockResolvedValue([
      { id: 'lead-1', owner: 'user-1', company: { segment: 'Varejo' } },
    ]);

    const result = await generateWinningPatterns('org-1');

    expect(result.suggestions).toEqual([]);
    expect(getAiModelMock).not.toHaveBeenCalled();
  });

  it('gera sugestão com evidenceCount e sourceExcerpts reais (não confia na IA para isso), creditando o vendedor certo', async () => {
    pendingActionFindManyMock.mockResolvedValue([
      positiveAction('lead-1', 'Abordagem consultiva A'),
      positiveAction('lead-2', 'Abordagem consultiva B'),
    ]);
    leadFindManyMock.mockResolvedValue([
      { id: 'lead-1', owner: 'user-1', company: { segment: 'Varejo' } },
      { id: 'lead-2', owner: 'user-1', company: { segment: 'Varejo' } },
    ]);
    userFindManyMock.mockResolvedValue([{ id: 'user-1', name: 'Maria Souza' }]);
    invokeMock.mockResolvedValue({
      content: 'x',
      response_metadata: { model: 'm', tokenUsage: {} },
    });
    cleanAndParseJsonMock.mockReturnValue([
      {
        patternTitle: 'Abertura consultiva',
        patternDescription: 'Valida a dor antes de apresentar a solução.',
        suggestedScript: 'Oi! Notei que vocês costumam enfrentar X — é algo real pra vocês hoje?',
      },
    ]);

    const result = await generateWinningPatterns('org-1');

    expect(result.suggestions).toHaveLength(1);
    expect(result.suggestions[0]).toMatchObject({
      sellerId: 'user-1',
      sellerName: 'Maria Souza',
      segment: 'Varejo',
      evidenceCount: 2,
      patternTitle: 'Abertura consultiva',
      sourceExcerpts: ['Abordagem consultiva A', 'Abordagem consultiva B'],
    });
  });

  it('descarta a rodada quando a IA devolve array de tamanho diferente do número de grupos — nunca casa dado errado', async () => {
    pendingActionFindManyMock.mockResolvedValue([
      positiveAction('lead-1', 'A'),
      positiveAction('lead-2', 'B'),
    ]);
    leadFindManyMock.mockResolvedValue([
      { id: 'lead-1', owner: 'user-1', company: { segment: 'Varejo' } },
      { id: 'lead-2', owner: 'user-1', company: { segment: 'Varejo' } },
    ]);
    userFindManyMock.mockResolvedValue([{ id: 'user-1', name: 'Maria Souza' }]);
    invokeMock.mockResolvedValue({
      content: 'x',
      response_metadata: { model: 'm', tokenUsage: {} },
    });
    cleanAndParseJsonMock.mockReturnValue([]);

    const result = await generateWinningPatterns('org-1');

    expect(result.suggestions).toEqual([]);
    expect(result.emptyReason).toBeTruthy();
  });

  it('retorna vazio com motivo explícito quando a chamada de IA falha', async () => {
    pendingActionFindManyMock.mockResolvedValue([
      positiveAction('lead-1', 'A'),
      positiveAction('lead-2', 'B'),
    ]);
    leadFindManyMock.mockResolvedValue([
      { id: 'lead-1', owner: 'user-1', company: { segment: 'Varejo' } },
      { id: 'lead-2', owner: 'user-1', company: { segment: 'Varejo' } },
    ]);
    invokeMock.mockRejectedValue(new Error('orçamento de IA excedido'));

    const result = await generateWinningPatterns('org-1');

    expect(result.suggestions).toEqual([]);
    expect(result.emptyReason).toBeTruthy();
  });
});

describe('broadcastWinningPattern', () => {
  it('cria uma notificação de sucesso creditando o vendedor de origem', async () => {
    notificationCreateMock.mockResolvedValue({ id: 'notif-1' });

    const result = await broadcastWinningPattern('org-1', {
      sellerName: 'Maria Souza',
      segment: 'Varejo',
      patternTitle: 'Abertura consultiva',
      suggestedScript: 'Oi! Notei que vocês...',
    });

    expect(result).toEqual({ id: 'notif-1' });
    expect(notificationCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: 'org-1',
        kind: 'Sucesso',
        title: expect.stringContaining('Abertura consultiva'),
        body: expect.stringContaining('Maria Souza'),
      }),
    );
  });
});
