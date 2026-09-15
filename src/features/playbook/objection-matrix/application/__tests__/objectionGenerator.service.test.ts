import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * Item 7 de "IA Agêntica de Vendas": sugestões de objeção geradas a partir de negócios
 * REALMENTE perdidos — nunca de um único caso anedótico, nunca de um formato de IA que não bata
 * com os grupos enviados, nunca de um fallback genérico fingindo ser grounded em dado real.
 */
const findManyMock = vi.fn();
const invokeMock = vi.fn();
const getAiModelMock = vi.fn((..._args: unknown[]) => ({ invoke: invokeMock }));
const cleanAndParseJsonMock = vi.fn();
const logAiUsageMock = vi.fn();

vi.mock('../../../../../lib/prisma.js', () => ({
  prisma: { lead: { findMany: (...args: unknown[]) => findManyMock(...args) } },
}));

vi.mock('../../../../../lib/ai/gateway.js', () => ({
  getAiModel: (...args: unknown[]) => getAiModelMock(...args),
  cleanAndParseJson: (...args: unknown[]) => cleanAndParseJsonMock(...args),
  logAiUsage: (...args: unknown[]) => logAiUsageMock(...args),
}));

vi.mock('../../../../../lib/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const { generateObjectionSuggestions } = await import('../objectionGenerator.service');

afterEach(() => {
  vi.clearAllMocks();
});

function lead(segment: string, persona: string, lossReason: string) {
  return { lossReason, company: { segment }, contact: { role: persona } };
}

describe('generateObjectionSuggestions', () => {
  it('retorna vazio com motivo explícito quando não há negócios perdidos com motivo registrado — nunca chama a IA', async () => {
    findManyMock.mockResolvedValue([]);

    const result = await generateObjectionSuggestions('org-1');

    expect(result.suggestions).toEqual([]);
    expect(result.emptyReason).toBeTruthy();
    expect(getAiModelMock).not.toHaveBeenCalled();
  });

  it('descarta grupo com um único caso — mínimo de 2 negócios reais por segmento/persona', async () => {
    findManyMock.mockResolvedValue([lead('Varejo', 'Diretor Comercial', 'Preço muito alto')]);

    const result = await generateObjectionSuggestions('org-1');

    expect(result.suggestions).toEqual([]);
    expect(getAiModelMock).not.toHaveBeenCalled();
  });

  it('gera sugestão para um grupo com 2+ casos reais, preservando evidenceCount e sourceLossReasons reais (não confia no texto da IA para isso)', async () => {
    findManyMock.mockResolvedValue([
      lead('Varejo', 'Diretor Comercial', 'Preço muito alto pro orçamento deste ano'),
      lead('Varejo', 'Diretor Comercial', 'Achou caro comparado ao concorrente'),
    ]);
    invokeMock.mockResolvedValue({
      content: 'ignorado, cleanAndParseJson é mockado abaixo',
      response_metadata: { model: 'test-model', tokenUsage: {} },
    });
    cleanAndParseJsonMock.mockReturnValue([
      {
        objectionTitle: 'Preço acima do orçamento',
        objectionText: 'Está caro pro nosso orçamento este ano.',
        responseScript: 'Entendo — vamos comparar o custo total de propriedade...',
        keyDifferentiator: 'TCO 20% menor em 24 meses.',
      },
    ]);

    const result = await generateObjectionSuggestions('org-1');

    expect(result.suggestions).toHaveLength(1);
    expect(result.suggestions[0]).toMatchObject({
      segment: 'Varejo',
      persona: 'Diretor Comercial',
      objectionTitle: 'Preço acima do orçamento',
      evidenceCount: 2,
      sourceLossReasons: [
        'Preço muito alto pro orçamento deste ano',
        'Achou caro comparado ao concorrente',
      ],
    });
    expect(logAiUsageMock).toHaveBeenCalledWith(
      expect.objectContaining({ promptId: 'objection-generator' }),
    );
  });

  it('descarta a rodada inteira quando a IA devolve um array de tamanho diferente do enviado — nunca casa dados errados entre grupos', async () => {
    findManyMock.mockResolvedValue([
      lead('Varejo', 'Diretor Comercial', 'Preço alto'),
      lead('Varejo', 'Diretor Comercial', 'Caro demais'),
    ]);
    invokeMock.mockResolvedValue({
      content: 'x',
      response_metadata: { model: 'test-model', tokenUsage: {} },
    });
    cleanAndParseJsonMock.mockReturnValue([]); // 0 candidatos para 1 grupo esperado

    const result = await generateObjectionSuggestions('org-1');

    expect(result.suggestions).toEqual([]);
    expect(result.emptyReason).toBeTruthy();
  });

  it('retorna vazio com motivo explícito quando a chamada de IA falha — nunca um fallback genérico fingindo ser grounded em dado real', async () => {
    findManyMock.mockResolvedValue([
      lead('Varejo', 'Diretor Comercial', 'Preço alto'),
      lead('Varejo', 'Diretor Comercial', 'Caro demais'),
    ]);
    invokeMock.mockRejectedValue(new Error('orçamento de IA excedido'));

    const result = await generateObjectionSuggestions('org-1');

    expect(result.suggestions).toEqual([]);
    expect(result.emptyReason).toBeTruthy();
  });
});
