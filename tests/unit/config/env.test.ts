import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// SEC-001: a validação do schema e as travas de fail-closed de src/config/env.ts (incluindo a
// existente para ALLOW_DEV_AUTH_BYPASS e a nova para BETTER_AUTH_SECRET) rodam no TOPO do módulo,
// no momento do import — não numa função exportada chamável isoladamente. Por isso, cada cenário
// aqui precisa resetar o registro de módulos e reimportar src/config/env.ts com `process.env`
// controlado. Mesmo padrão de teste de "boot" já usado para outro módulo de bootstrap em
// tests/unit/bootstrap/security.test.ts (`loadSecurityModule`).
vi.mock('../../../src/lib/logger.js', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    fatal: vi.fn(),
  },
}));

const ORIGINAL_ENV = { ...process.env };

function setEnv(overrides: Record<string, string | undefined>) {
  process.env = { ...ORIGINAL_ENV };
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

/** Base mínima que satisfaz o schema (NODE_ENV/DATABASE_URL são os únicos campos obrigatórios). */
async function loadEnvModule(overrides: Record<string, string | undefined>) {
  vi.resetModules();
  setEnv({
    NODE_ENV: 'production',
    DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
    ...overrides,
  });
  return import('../../../src/config/env.js');
}

describe('config/env — BETTER_AUTH_SECRET fail-closed em produção (SEC-001)', () => {
  let exitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
  });

  afterEach(() => {
    exitSpy.mockRestore();
    process.env = { ...ORIGINAL_ENV };
    vi.resetModules();
  });

  it('encerra o processo (exit 1) em produção quando BETTER_AUTH_SECRET está ausente', async () => {
    await loadEnvModule({ BETTER_AUTH_SECRET: undefined });
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('encerra o processo em produção quando BETTER_AUTH_SECRET é só espaços em branco', async () => {
    await loadEnvModule({ BETTER_AUTH_SECRET: '   ' });
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('encerra o processo em produção quando BETTER_AUTH_SECRET é mais curto que o mínimo exigido (32 caracteres)', async () => {
    await loadEnvModule({ BETTER_AUTH_SECRET: 'short-secret' });
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('encerra o processo em produção quando BETTER_AUTH_SECRET é o valor de exemplo copiado verbatim de .env.example', async () => {
    await loadEnvModule({ BETTER_AUTH_SECRET: 'replace-with-a-long-random-secret' });
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('NÃO encerra o processo em produção quando BETTER_AUTH_SECRET é forte (>= 32 caracteres, não é o placeholder)', async () => {
    await loadEnvModule({ BETTER_AUTH_SECRET: 'a'.repeat(40) });
    expect(exitSpy).not.toHaveBeenCalled();
  });

  it('NÃO encerra o processo fora de produção, mesmo sem BETTER_AUTH_SECRET configurada', async () => {
    vi.resetModules();
    setEnv({
      NODE_ENV: 'development',
      DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
      BETTER_AUTH_SECRET: undefined,
    });
    await import('../../../src/config/env.js');
    expect(exitSpy).not.toHaveBeenCalled();
  });

  // Regressão: a nova trava não pode enfraquecer/duplicar a trava já existente de
  // ALLOW_DEV_AUTH_BYPASS, que precisa continuar disparando independentemente do estado de
  // BETTER_AUTH_SECRET.
  it('a trava de ALLOW_DEV_AUTH_BYPASS continua funcionando (não regrediu com a mudança acima)', async () => {
    await loadEnvModule({
      BETTER_AUTH_SECRET: 'a'.repeat(40),
      ALLOW_DEV_AUTH_BYPASS: 'true',
    });
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
