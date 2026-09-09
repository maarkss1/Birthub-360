import { beforeEach, describe, expect, it, vi } from 'vitest';

const generateRoleplayEvaluationMock = vi.fn();
vi.mock('@/features/intelligence/services/studio/generators/roleplay', () => ({
  generateRoleplayEvaluation: (...args: unknown[]) => generateRoleplayEvaluationMock(...args),
}));

const roleplaySessionCreateMock = vi.fn();
const roleplaySessionFindManyMock = vi.fn();
vi.mock('@/lib/prisma', () => ({
  prisma: {
    roleplaySession: {
      create: (...args: unknown[]) => roleplaySessionCreateMock(...args),
      findMany: (...args: unknown[]) => roleplaySessionFindManyMock(...args),
    },
  },
}));

const loggerWarnMock = vi.fn();
vi.mock('@/lib/logger', () => ({
  logger: { warn: (...args: unknown[]) => loggerWarnMock(...args), error: vi.fn(), info: vi.fn() },
}));

import { finishRoleplaySession, listRoleplaySessions } from '../roleplay-session.service.js';

const evaluation = {
  overallScore: 72,
  clarityScore: 75,
  objectionHandlingScore: 68,
  closingScore: 60,
  strengths: ['Ouviu a dor antes de apresentar produto'],
  improvements: ['Não perguntou sobre o próximo passo'],
  summary: 'Parecer técnico de exemplo.',
};

const input = {
  organizationId: 'org_1',
  userId: 'user_1',
  brand: 'atlasgr' as const,
  brandName: 'AtlasGR',
  brandDescription: 'Revenue OS de logística',
  personaId: 'gerente_risco',
  personaLabel: 'Gerente de Risco (GR)',
  personaKey: 'strict_buyer' as const,
  difficulty: 'dificil' as const,
  durationSeconds: 180,
  transcript: [
    { sender: 'bot' as const, text: 'Alô? Por que deveríamos conversar?' },
    { sender: 'user' as const, text: 'Nosso ROI se paga em 3 meses.' },
  ],
  turnEvaluations: [{ clarity: 80, objectionHandling: 60, total: 70, feedback: 'Bom início.' }],
};

describe('roleplay-session.service — finishRoleplaySession (parecer técnico de fim de ligação)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('chama generateRoleplayEvaluation com a transcrição convertida (sdr/buyer) e persiste a sessão completa', async () => {
    generateRoleplayEvaluationMock.mockResolvedValueOnce(evaluation);
    roleplaySessionCreateMock.mockResolvedValueOnce({ id: 'session_123' });

    const result = await finishRoleplaySession(input);

    expect(generateRoleplayEvaluationMock).toHaveBeenCalledWith({
      kind: 'roleplay_evaluation',
      brand: { name: 'AtlasGR', description: 'Revenue OS de logística' },
      inputs: {
        persona: 'strict_buyer',
        difficulty: 'dificil',
        transcript: [
          { sender: 'buyer', text: 'Alô? Por que deveríamos conversar?' },
          { sender: 'sdr', text: 'Nosso ROI se paga em 3 meses.' },
        ],
      },
    });

    const createArgs = roleplaySessionCreateMock.mock.calls[0][0];
    expect(createArgs.data).toMatchObject({
      organizationId: 'org_1',
      userId: 'user_1',
      brand: 'atlasgr',
      personaId: 'gerente_risco',
      personaLabel: 'Gerente de Risco (GR)',
      difficulty: 'dificil',
      durationSeconds: 180,
      overallScore: 72,
      clarityScore: 75,
      objectionHandlingScore: 68,
      closingScore: 60,
      summary: 'Parecer técnico de exemplo.',
    });

    expect(result).toEqual({ sessionId: 'session_123', ...evaluation });
  });

  it('propaga o erro de IA sem persistir nada (nunca fabrica parecer técnico quando a IA falha)', async () => {
    generateRoleplayEvaluationMock.mockRejectedValueOnce(new Error('Groq indisponível'));

    await expect(finishRoleplaySession(input)).rejects.toThrow('Groq indisponível');
    expect(roleplaySessionCreateMock).not.toHaveBeenCalled();
  });

  it('é best-effort na persistência: se o banco falhar, ainda devolve o parecer já computado, com sessionId null e um warning logado', async () => {
    generateRoleplayEvaluationMock.mockResolvedValueOnce(evaluation);
    roleplaySessionCreateMock.mockRejectedValueOnce(new Error('conexão com o banco perdida'));

    const result = await finishRoleplaySession(input);

    expect(result).toEqual({ sessionId: null, ...evaluation });
    expect(loggerWarnMock).toHaveBeenCalled();
  });
});

describe('roleplay-session.service — listRoleplaySessions (histórico de ligações)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('busca sessões escopadas por organização, usuário e marca, mais recentes primeiro, limitadas a 20', async () => {
    const createdAt = new Date('2026-09-01T10:00:00Z');
    roleplaySessionFindManyMock.mockResolvedValueOnce([
      {
        id: 'session_1',
        personaId: 'gerente_risco',
        personaLabel: 'Gerente de Risco (GR)',
        difficulty: 'dificil',
        durationSeconds: 180,
        overallScore: 72,
        clarityScore: 75,
        objectionHandlingScore: 68,
        closingScore: 60,
        strengths: ['Ouviu a dor antes de apresentar produto'],
        improvements: ['Não perguntou sobre o próximo passo'],
        summary: 'Parecer técnico de exemplo.',
        createdAt,
      },
    ]);

    const result = await listRoleplaySessions('org_1', 'user_1', 'atlasgr');

    expect(roleplaySessionFindManyMock).toHaveBeenCalledWith({
      where: { organizationId: 'org_1', userId: 'user_1', brand: 'atlasgr' },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    expect(result).toEqual([
      {
        id: 'session_1',
        personaId: 'gerente_risco',
        personaLabel: 'Gerente de Risco (GR)',
        difficulty: 'dificil',
        durationSeconds: 180,
        overallScore: 72,
        clarityScore: 75,
        objectionHandlingScore: 68,
        closingScore: 60,
        strengths: ['Ouviu a dor antes de apresentar produto'],
        improvements: ['Não perguntou sobre o próximo passo'],
        summary: 'Parecer técnico de exemplo.',
        createdAt,
      },
    ]);
  });

  it('devolve lista vazia quando o usuário nunca fez uma ligação nesta marca', async () => {
    roleplaySessionFindManyMock.mockResolvedValueOnce([]);

    const result = await listRoleplaySessions('org_1', 'user_1', 'totaltrac');

    expect(result).toEqual([]);
  });
});
