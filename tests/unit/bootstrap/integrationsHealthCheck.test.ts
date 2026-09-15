import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mesmo padrão de teste de bootstrap não-fail-fast já usado em tests/unit/bootstrap/security.test.ts
// (loadSecurityModule): a função exportada lê `process.env` diretamente no momento em que é
// chamada (não no import do módulo), então basta controlar `process.env` antes de invocá-la.
vi.mock('../../../src/lib/logger.js', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    fatal: vi.fn(),
  },
}));

const ORIGINAL_ENV = { ...process.env };

const SECONDARY_INTEGRATION_KEYS = [
  'GROQ_API_KEY',
  'OPENAI_API_KEY',
  'TAVILY_API_KEY',
  'SERPER_API_KEY',
  'STORAGE_ACCESS_KEY_ID',
  'STORAGE_SECRET_ACCESS_KEY',
  'MINIO_ACCESS_KEY',
  'MINIO_SECRET_KEY',
];

function setEnv(overrides: Record<string, string | undefined>) {
  process.env = { ...ORIGINAL_ENV };
  for (const key of SECONDARY_INTEGRATION_KEYS) delete process.env[key];
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

describe('bootstrap/integrationsHealthCheck — warnUnconfiguredSecondaryIntegrations', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    vi.resetModules();
  });

  it('nunca encerra o processo — não é fail-fast', async () => {
    setEnv({});
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never);

    const { warnUnconfiguredSecondaryIntegrations } = await import(
      '../../../src/bootstrap/integrationsHealthCheck.js'
    );
    warnUnconfiguredSecondaryIntegrations();

    expect(exitSpy).not.toHaveBeenCalled();
  });

  it('loga aviso listando todas as integrações secundárias quando nenhuma credencial está configurada', async () => {
    setEnv({});
    const { logger } = await import('../../../src/lib/logger.js');
    const { warnUnconfiguredSecondaryIntegrations } = await import(
      '../../../src/bootstrap/integrationsHealthCheck.js'
    );

    warnUnconfiguredSecondaryIntegrations();

    expect(logger.warn).toHaveBeenCalledTimes(1);
    const [meta, message] = vi.mocked(logger.warn).mock.calls[0] as [unknown, string];
    expect(meta).toEqual({
      unconfigured: [
        'Motor de IA (chat/qualificação de leads)',
        'Pesquisa de mercado (marketResearchTool)',
        'Storage de objetos (upload/download de anexos)',
      ],
    });
    expect(message).toContain('Motor de IA');
  });

  it('não loga nada quando todas as integrações secundárias têm ao menos uma credencial configurada', async () => {
    setEnv({
      GROQ_API_KEY: 'gsk_test',
      TAVILY_API_KEY: 'tvly_test',
      STORAGE_ACCESS_KEY_ID: 'key',
      STORAGE_SECRET_ACCESS_KEY: 'secret',
    });
    const { logger } = await import('../../../src/lib/logger.js');
    const { warnUnconfiguredSecondaryIntegrations } = await import(
      '../../../src/bootstrap/integrationsHealthCheck.js'
    );

    warnUnconfiguredSecondaryIntegrations();

    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('loga só o grupo de storage quando apenas ele está sem credencial', async () => {
    setEnv({
      GROQ_API_KEY: 'gsk_test',
      SERPER_API_KEY: 'serper_test',
    });
    const { logger } = await import('../../../src/lib/logger.js');
    const { warnUnconfiguredSecondaryIntegrations } = await import(
      '../../../src/bootstrap/integrationsHealthCheck.js'
    );

    warnUnconfiguredSecondaryIntegrations();

    expect(logger.warn).toHaveBeenCalledWith(
      { unconfigured: ['Storage de objetos (upload/download de anexos)'] },
      expect.stringContaining('Storage de objetos'),
    );
  });

  it('considera configurado com string em branco tratada como ausente', async () => {
    setEnv({
      GROQ_API_KEY: '   ',
      TAVILY_API_KEY: 'tvly_test',
      STORAGE_ACCESS_KEY_ID: 'key',
      STORAGE_SECRET_ACCESS_KEY: 'secret',
    });
    const { logger } = await import('../../../src/lib/logger.js');
    const { warnUnconfiguredSecondaryIntegrations } = await import(
      '../../../src/bootstrap/integrationsHealthCheck.js'
    );

    warnUnconfiguredSecondaryIntegrations();

    expect(logger.warn).toHaveBeenCalledWith(
      { unconfigured: ['Motor de IA (chat/qualificação de leads)'] },
      expect.any(String),
    );
  });
});
