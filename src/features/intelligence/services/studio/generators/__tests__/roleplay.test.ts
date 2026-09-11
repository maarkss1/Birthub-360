import { describe, expect, it, vi, beforeEach } from 'vitest';

const invokeStructuredMock = vi.fn();
vi.mock('../../shared.js', () => ({
  SYSTEM_RULES: 'REGRAS DO SISTEMA',
  invokeStructured: (...args: unknown[]) => invokeStructuredMock(...args),
  jsonOnlyInstruction: (schema: string) => `RETORNE JSON: ${schema}`,
}));

import { generateRoleplay, generateRoleplayEvaluation } from '../roleplay.js';
import { roleplayResultSchema, roleplayEvaluationResultSchema } from '../../schema.js';

const request = {
  kind: 'roleplay' as const,
  brand: { name: 'Birth Hub 360', description: 'Revenue OS de logística' },
  inputs: {
    persona: 'skeptical_cfo' as const,
    message: 'Nosso ROI se paga em 3 meses.',
    transcript: [{ sender: 'sdr' as const, text: 'Oi, tudo bem?' }],
    playbookContext: 'Foco em ROI',
  },
};

const evaluationRequest = {
  kind: 'roleplay_evaluation' as const,
  brand: { name: 'Birth Hub 360', description: 'Revenue OS de logística' },
  inputs: {
    persona: 'skeptical_cfo' as const,
    difficulty: 'dificil' as const,
    transcript: [
      { sender: 'buyer' as const, text: 'Por que deveríamos conversar?' },
      { sender: 'sdr' as const, text: 'Nosso ROI se paga em 3 meses.' },
    ],
  },
};

describe('studio/generators/roleplay', () => {
  beforeEach(() => vi.clearAllMocks());

  it('chama invokeStructured com o schema/contexto/temperatura corretos e inclui persona/transcript/mensagem no prompt', async () => {
    invokeStructuredMock.mockResolvedValueOnce({
      reply: 'r',
      feedback: 'f',
      clarity: 80,
      objectionHandling: 70,
    });

    await generateRoleplay(request);

    const [prompt, context, schema, , temperature] = invokeStructuredMock.mock.calls[0];
    expect(context).toBe('studio:roleplay');
    expect(schema).toBe(roleplayResultSchema);
    expect(temperature).toBe(0.6);
    expect(prompt).toContain('CFO cético');
    expect(prompt).toContain('Nosso ROI se paga em 3 meses.');
  });

  it('mantém as notas como estão quando o modelo já devolve na escala 0-100', async () => {
    invokeStructuredMock.mockResolvedValueOnce({
      reply: 'r',
      feedback: 'f',
      clarity: 80,
      objectionHandling: 60,
    });

    const result = await generateRoleplay(request);

    expect(result.clarity).toBe(80);
    expect(result.objectionHandling).toBe(60);
    expect(result.total).toBe(70); // round((80+60)/2)
  });

  it('multiplica por 10 quando o modelo devolve na escala 0-10 (achado real: modelo às vezes ignora a instrução de escala)', async () => {
    invokeStructuredMock.mockResolvedValueOnce({
      reply: 'r',
      feedback: 'f',
      clarity: 8,
      objectionHandling: 6,
    });

    const result = await generateRoleplay(request);

    expect(result.clarity).toBe(80);
    expect(result.objectionHandling).toBe(60);
    expect(result.total).toBe(70);
  });

  it('trata clarity e objectionHandling de forma independente — uma pode estar na escala 0-10 e a outra já em 0-100', async () => {
    invokeStructuredMock.mockResolvedValueOnce({
      reply: 'r',
      feedback: 'f',
      clarity: 9,
      objectionHandling: 85,
    });

    const result = await generateRoleplay(request);

    expect(result.clarity).toBe(90);
    expect(result.objectionHandling).toBe(85);
    expect(result.total).toBe(88); // round((90+85)/2) = round(87.5) = 88
  });

  it('o valor limite 10 ainda é tratado como escala 0-10 (multiplica), não como 0-100 (regra é <=10)', async () => {
    invokeStructuredMock.mockResolvedValueOnce({
      reply: 'r',
      feedback: 'f',
      clarity: 10,
      objectionHandling: 50,
    });

    const result = await generateRoleplay(request);

    expect(result.clarity).toBe(100);
  });
});

describe('studio/generators/roleplay — generateRoleplayEvaluation (parecer técnico de sessão)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('chama invokeStructured com o schema/contexto/temperatura corretos e inclui persona, dificuldade e transcrição completa no prompt', async () => {
    invokeStructuredMock.mockResolvedValueOnce({
      overallScore: 72,
      clarityScore: 75,
      objectionHandlingScore: 68,
      closingScore: 60,
      strengths: ['Ouviu a dor antes de apresentar produto'],
      improvements: ['Não perguntou sobre o próximo passo'],
      summary: 'Parecer técnico de exemplo.',
    });

    await generateRoleplayEvaluation(evaluationRequest);

    const [prompt, context, schema, , temperature] = invokeStructuredMock.mock.calls[0];
    expect(context).toBe('studio:roleplay_evaluation');
    expect(schema).toBe(roleplayEvaluationResultSchema);
    expect(temperature).toBe(0.3);
    expect(prompt).toContain('CFO cético');
    expect(prompt).toContain('difícil');
    expect(prompt).toContain('Por que deveríamos conversar?');
    expect(prompt).toContain('Nosso ROI se paga em 3 meses.');
    // Avalia a ligação inteira, não só a última resposta (diferença chave vs. generateRoleplay).
    expect(prompt).toMatch(/ligação inteira/);
  });

  it('devolve o parecer técnico validado (score geral + sub-notas + strengths/improvements/summary) sem recalcular nada localmente', async () => {
    const evaluation = {
      overallScore: 82,
      clarityScore: 90,
      objectionHandlingScore: 78,
      closingScore: 70,
      strengths: ['Boa investigação SPIN'],
      improvements: ['Faltou fechamento firme'],
      summary: 'Diagnóstico e plano de ação.',
    };
    invokeStructuredMock.mockResolvedValueOnce(evaluation);

    const result = await generateRoleplayEvaluation(evaluationRequest);

    expect(result).toEqual(evaluation);
  });

  it('propaga o erro do provedor de IA sem fabricar um parecer técnico (roleplay/AGENTS.md: falhas de IA são explícitas)', async () => {
    invokeStructuredMock.mockRejectedValueOnce(new Error('Groq indisponível'));

    await expect(generateRoleplayEvaluation(evaluationRequest)).rejects.toThrow(
      'Groq indisponível',
    );
  });
});
