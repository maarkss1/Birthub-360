import { afterEach, describe, expect, it, vi } from 'vitest';

const mockEnv: Record<string, unknown> = { AI_PII_EXTERNAL_CONSENT_ORGANIZATIONS: undefined };
vi.mock('../../../../config/env.js', () => ({ env: mockEnv }));

const aiGuardrailEventCreate = vi.fn().mockResolvedValue({});
vi.mock('../../../../lib/prisma.js', () => ({
  prisma: { aIGuardrailEvent: { create: (...args: unknown[]) => aiGuardrailEventCreate(...args) } },
}));

const getTenantIdMock = vi.fn();
vi.mock('../../../../lib/async-context.js', () => ({
  getTenantId: () => getTenantIdMock(),
}));

vi.mock('../../../../lib/logger.js', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

const {
  minimizePii,
  rehydratePii,
  redactSensitiveData,
  redactAndTrackPiiLeak,
  createStreamingRedactor,
  hasPiiExternalConsent,
  assertPiiExternalConsent,
  PiiConsentRequiredError,
  MAX_PII_PATTERN_LENGTH,
} = await import('../guardrails.service');

describe('minimizePii / rehydratePii', () => {
  it('substitui o valor de PII pelo token antes de sair para o provedor de IA', () => {
    const { text, applied } = minimizePii(
      'Contato/decisor: Maria Silva, cargo: Diretora de Operações',
      [{ token: '[NOME_DO_CONTATO]', value: 'Maria Silva' }],
    );

    expect(text).toBe('Contato/decisor: [NOME_DO_CONTATO], cargo: Diretora de Operações');
    expect(applied).toEqual([{ token: '[NOME_DO_CONTATO]', value: 'Maria Silva' }]);
  });

  it('substitui todas as ocorrências do valor, não só a primeira', () => {
    const { text } = minimizePii('Maria Silva confirmou a reunião. Avise Maria Silva por e-mail.', [
      { token: '[NOME_DO_CONTATO]', value: 'Maria Silva' },
    ]);

    expect(text).toBe('[NOME_DO_CONTATO] confirmou a reunião. Avise [NOME_DO_CONTATO] por e-mail.');
  });

  it('rehydratePii restaura o valor real no texto gerado pela IA', () => {
    const applied = [{ token: '[NOME_DO_CONTATO]', value: 'Maria Silva' }];
    const aiOutput = 'Olá [NOME_DO_CONTATO], tudo bem? Podemos marcar uma call?';

    expect(rehydratePii(aiOutput, applied)).toBe(
      'Olá Maria Silva, tudo bem? Podemos marcar uma call?',
    );
  });

  it('faz o ciclo completo minimizar -> (simulação de IA) -> reidratar sem vazar o valor original ao "provedor"', () => {
    const original = 'Contato/decisor: João Pereira, cargo: Gerente de Compras';
    const { text: sentToProvider, applied } = minimizePii(original, [
      { token: '[NOME_DO_CONTATO]', value: 'João Pereira' },
    ]);

    // O texto que "sairia" para o provedor externo nunca contém o nome real.
    expect(sentToProvider).not.toContain('João Pereira');

    // Simula uma resposta da IA que reaproveitou o token no corpo do e-mail gerado.
    const simulatedAiResponse = `Prezado ${applied[0].token},\n\nSegue nossa proposta...`;
    const finalText = rehydratePii(simulatedAiResponse, applied);

    expect(finalText).toBe('Prezado João Pereira,\n\nSegue nossa proposta...');
  });

  it('ignora valores ausentes ou vazios', () => {
    const { text, applied } = minimizePii('Sem contato definido.', [
      { token: '[NOME_DO_CONTATO]', value: undefined },
      { token: '[NOME_DO_CONTATO]', value: null },
      { token: '[NOME_DO_CONTATO]', value: '' },
    ]);

    expect(text).toBe('Sem contato definido.');
    expect(applied).toEqual([]);
  });

  it('ignora valores curtos demais (< 3 caracteres) para evitar substituições indevidas', () => {
    const { text, applied } = minimizePii('Ok, combinado.', [{ token: '[X]', value: 'Ok' }]);

    expect(text).toBe('Ok, combinado.');
    expect(applied).toEqual([]);
  });

  it('não aplica o token se o valor não aparece no texto', () => {
    const { text, applied } = minimizePii('Nenhuma menção ao contato aqui.', [
      { token: '[NOME_DO_CONTATO]', value: 'Alguém Que Não Está No Texto' },
    ]);

    expect(text).toBe('Nenhuma menção ao contato aqui.');
    expect(applied).toEqual([]);
  });
});

describe('redactSensitiveData (comportamento existente, não deve regredir)', () => {
  it('continua mascarando CPF na saída', () => {
    const { text, redacted } = redactSensitiveData('CPF do titular: 123.456.789-00');
    expect(redacted).toBe(true);
    expect(text).toBe('CPF do titular: [CPF OCULTADO]');
  });
});

describe('redactSensitiveData (AIAGENT-006: cobertura expandida além de CPF formatado)', () => {
  it('mascara CNPJ formatado', () => {
    const { text, redacted } = redactSensitiveData('CNPJ do fornecedor: 12.345.678/0001-90');
    expect(redacted).toBe(true);
    expect(text).toBe('CNPJ do fornecedor: [CNPJ OCULTADO]');
  });

  it('mascara e-mail', () => {
    const { text, redacted } = redactSensitiveData('Contato: maria.silva@exemplo.com.br');
    expect(redacted).toBe(true);
    expect(text).toBe('Contato: [E-MAIL OCULTADO]');
  });

  it('mascara telefone com DDD entre parênteses', () => {
    const { text, redacted } = redactSensitiveData('Ligue para (11) 91234-5678 amanhã.');
    expect(redacted).toBe(true);
    expect(text).toBe('Ligue para [TELEFONE OCULTADO] amanhã.');
  });

  it('mascara telefone com DDI e sem parênteses', () => {
    const { text, redacted } = redactSensitiveData('WhatsApp: +55 11 91234-5678');
    expect(redacted).toBe(true);
    expect(text).toBe('WhatsApp: [TELEFONE OCULTADO]');
  });

  it('mascara CPF sem pontuação (11 dígitos soltos)', () => {
    const { text, redacted } = redactSensitiveData('CPF: 12345678900 confirmado.');
    expect(redacted).toBe(true);
    expect(text).toBe('CPF: [CPF OCULTADO] confirmado.');
  });

  it('mascara múltiplos tipos de PII no mesmo texto', () => {
    const { text, redacted } = redactSensitiveData(
      'Contato João, CPF 123.456.789-00, e-mail joao@exemplo.com, tel (11) 91234-5678.',
    );
    expect(redacted).toBe(true);
    expect(text).toBe(
      'Contato João, CPF [CPF OCULTADO], e-mail [E-MAIL OCULTADO], tel [TELEFONE OCULTADO].',
    );
  });

  it('não mascara texto comum sem nenhum padrão de PII', () => {
    const { text, redacted } = redactSensitiveData('Reunião marcada para terça-feira às 10h.');
    expect(redacted).toBe(false);
    expect(text).toBe('Reunião marcada para terça-feira às 10h.');
  });

  it('não mascara (nem deixa dígitos residuais em) um número de pedido/nota com mais de 11 dígitos', () => {
    // Regressão: uma versão anterior do PHONE_REGEX "deslizava" dentro de sequências numéricas
    // longas sem relação com telefone e mascarava só um pedaço, deixando dígitos soltos no texto.
    const { text, redacted } = redactSensitiveData('Pedido nº 1234567890123 confirmado.');
    expect(redacted).toBe(false);
    expect(text).toBe('Pedido nº 1234567890123 confirmado.');
  });
});

describe('redactAndTrackPiiLeak (AI-006, onda 35: sinal real de PII leakage rate)', () => {
  afterEach(() => {
    aiGuardrailEventCreate.mockClear();
    getTenantIdMock.mockReset();
  });

  it('sem PII no texto, não grava nenhum evento de guardrail', async () => {
    getTenantIdMock.mockReturnValue('org-1');

    const result = await redactAndTrackPiiLeak('Texto qualquer sem dado sensível.', 'ai.service');

    expect(result).toBe('Texto qualquer sem dado sensível.');
    expect(aiGuardrailEventCreate).not.toHaveBeenCalled();
  });

  it('com CPF no texto, mascara E grava o evento com o organizationId do contexto e a fonte informada', async () => {
    getTenantIdMock.mockReturnValue('org-1');

    const result = await redactAndTrackPiiLeak('CPF do titular: 123.456.789-00', 'studio');

    expect(result).toBe('CPF do titular: [CPF OCULTADO]');
    expect(aiGuardrailEventCreate).toHaveBeenCalledWith({
      data: { type: 'pii_redacted', source: 'studio', organizationId: 'org-1' },
    });
  });

  it('PII detectada fora de um contexto de tenant conhecido: mascara mas não grava (sem dono para atribuir)', async () => {
    getTenantIdMock.mockReturnValue(null);

    const result = await redactAndTrackPiiLeak('CPF do titular: 123.456.789-00', 'agent.chat');

    expect(result).toBe('CPF do titular: [CPF OCULTADO]');
    expect(aiGuardrailEventCreate).not.toHaveBeenCalled();
  });

  it('a redação já aconteceu mesmo se a gravação do evento falhar (best-effort, não derruba a resposta)', async () => {
    getTenantIdMock.mockReturnValue('org-1');
    aiGuardrailEventCreate.mockRejectedValueOnce(new Error('DB indisponível'));

    const result = await redactAndTrackPiiLeak(
      'CPF do titular: 123.456.789-00',
      'commercial-intelligence',
    );

    expect(result).toBe('CPF do titular: [CPF OCULTADO]');
  });
});

describe('createStreamingRedactor (Fase 2: guardrail de PII sob streaming, sem esperar a resposta inteira)', () => {
  afterEach(() => {
    aiGuardrailEventCreate.mockClear();
    getTenantIdMock.mockReset();
  });

  it('mascara um CPF mesmo quando seus dígitos chegam espalhados um chunk por vez', async () => {
    getTenantIdMock.mockReturnValue('org-1');
    const redactor = createStreamingRedactor('studio:assistant-stream');
    const full = 'O CPF informado foi 123.456.789-00, obrigado.';

    let released = '';
    for (const char of full) {
      released += redactor.push(char);
    }
    released += await redactor.flush();

    expect(released).toBe('O CPF informado foi [CPF OCULTADO], obrigado.');
    // Em nenhum momento intermediário um trecho liberado pode conter o CPF em texto puro —
    // testado acima via concatenação, mas reforça a garantia central do buffer.
    expect(released).not.toContain('123.456.789-00');
  });

  it('mascara um e-mail mesmo quando seus caracteres chegam espalhados um chunk por vez', async () => {
    getTenantIdMock.mockReturnValue('org-1');
    const redactor = createStreamingRedactor('studio:assistant-stream');
    const full = 'Envie para maria.silva@exemplo.com.br, por favor.';

    let released = '';
    for (const char of full) {
      released += redactor.push(char);
    }
    released += await redactor.flush();

    expect(released).toBe('Envie para [E-MAIL OCULTADO], por favor.');
    expect(released).not.toContain('maria.silva@exemplo.com.br');
  });

  it('não libera nada enquanto o buffer não passar do maior padrão de PII (e-mail, 254 caracteres)', () => {
    const redactor = createStreamingRedactor('studio:assistant-stream');
    let released = '';
    for (const char of 'Texto totalmente comum, sem nenhum dado sensível aqui dentro.') {
      released += redactor.push(char);
    }
    // String bem mais curta que MAX_PII_PATTERN_LENGTH: nada é liberado antes do flush, porque
    // qualquer sufixo do buffer ainda poderia vir a completar um e-mail em andamento.
    expect(released).toBe('');
  });

  it('libera texto sem PII conforme os chunks chegam assim que o buffer excede o maior padrão, retendo só a cauda', () => {
    const redactor = createStreamingRedactor('studio:assistant-stream');
    const sentence = 'Texto totalmente comum, sem nenhum dado sensível aqui dentro. ';
    const full = sentence.repeat(Math.ceil((MAX_PII_PATTERN_LENGTH + 20) / sentence.length));

    let released = '';
    for (const char of full) {
      released += redactor.push(char);
    }

    expect(released).toBe(full.slice(0, full.length - MAX_PII_PATTERN_LENGTH));
    expect(full.slice(released.length)).toHaveLength(MAX_PII_PATTERN_LENGTH);
  });

  it('flush() libera e mascara o que sobrou retido no buffer ao final do stream', async () => {
    const redactor = createStreamingRedactor('studio:assistant-stream');
    let released = redactor.push('sem PII: 123.456.789-00');
    released += await redactor.flush();
    expect(released).toBe('sem PII: [CPF OCULTADO]');
  });

  it('grava o evento de guardrail (best-effort) só quando algo foi de fato mascarado no stream', async () => {
    getTenantIdMock.mockReturnValue('org-1');
    const redactor = createStreamingRedactor('roleplay-stream');
    redactor.push('nenhuma pii aqui');
    await redactor.flush();
    expect(aiGuardrailEventCreate).not.toHaveBeenCalled();

    const redactorWithPii = createStreamingRedactor('roleplay-stream');
    redactorWithPii.push('CPF: 123.456.789-00');
    await redactorWithPii.flush();
    expect(aiGuardrailEventCreate).toHaveBeenCalledWith({
      data: { type: 'pii_redacted', source: 'roleplay-stream', organizationId: 'org-1' },
    });
  });
});

describe('hasPiiExternalConsent / assertPiiExternalConsent (base legal LGPD antes de enviar PII a provedor externo)', () => {
  afterEach(() => {
    mockEnv.AI_PII_EXTERNAL_CONSENT_ORGANIZATIONS = undefined;
  });

  it('fail-closed: nenhuma organização tem consentimento por padrão (variável não configurada)', () => {
    expect(hasPiiExternalConsent('org-1')).toBe(false);
  });

  it('fail-closed: lista vazia não libera ninguém', () => {
    mockEnv.AI_PII_EXTERNAL_CONSENT_ORGANIZATIONS = '';
    expect(hasPiiExternalConsent('org-1')).toBe(false);
  });

  it('sem organizationId nunca tem consentimento, mesmo com "*"', () => {
    mockEnv.AI_PII_EXTERNAL_CONSENT_ORGANIZATIONS = '*';
    expect(hasPiiExternalConsent(null)).toBe(false);
    expect(hasPiiExternalConsent(undefined)).toBe(false);
  });

  it('libera apenas as organizações explicitamente listadas', () => {
    mockEnv.AI_PII_EXTERNAL_CONSENT_ORGANIZATIONS = 'org-1, org-2 ,, org-3';
    expect(hasPiiExternalConsent('org-1')).toBe(true);
    expect(hasPiiExternalConsent('org-2')).toBe(true);
    expect(hasPiiExternalConsent('org-4')).toBe(false);
  });

  it('"*" e "all" liberam qualquer organização', () => {
    mockEnv.AI_PII_EXTERNAL_CONSENT_ORGANIZATIONS = '*';
    expect(hasPiiExternalConsent('qualquer-org')).toBe(true);
    mockEnv.AI_PII_EXTERNAL_CONSENT_ORGANIZATIONS = 'all';
    expect(hasPiiExternalConsent('outra-org')).toBe(true);
  });

  it('assertPiiExternalConsent lança PiiConsentRequiredError quando não há base legal', () => {
    expect(() => assertPiiExternalConsent('org-sem-consentimento')).toThrow(
      PiiConsentRequiredError,
    );
  });

  it('assertPiiExternalConsent não lança quando a organização está autorizada', () => {
    mockEnv.AI_PII_EXTERNAL_CONSENT_ORGANIZATIONS = 'org-1';
    expect(() => assertPiiExternalConsent('org-1')).not.toThrow();
  });
});
