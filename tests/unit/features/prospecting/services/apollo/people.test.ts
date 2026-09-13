/**
 * ACH-05-03 (Agente 05, Fase 2): `enrichPersonByName` (Apollo People Match) enviava
 * `reveal_personal_emails: true` no body — pedia e-mail PESSOAL do decisor, algo que uma
 * prospecção B2B nunca deveria requisitar (landmine de LGPD, mesmo sem call site ativo hoje).
 * Este teste trava o contrato: a chave nunca deve voltar ao body enviado à Apollo.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../../../../../src/lib/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { enrichPersonByName } from '../../../../../../src/features/prospecting/services/apollo/people.js';
import { resetProviderRateLimitersForTests } from '../../../../../../src/features/prospecting/services/providerRateLimit.js';
import { resetProviderCacheForTests } from '../../../../../../src/features/prospecting/services/providerCache.js';

function jsonResponse(status: number, body: unknown = {}): Response {
  return new Response(JSON.stringify(body), { status });
}

const originalEnv = { ...process.env };

beforeEach(async () => {
  process.env.PROSPECTING_PROVIDER_MODE = 'hybrid';
  process.env.APOLLO_API_KEY = 'test-apollo-key';
  resetProviderRateLimitersForTests();
  await resetProviderCacheForTests();
});

afterEach(() => {
  vi.unstubAllGlobals();
  process.env = { ...originalEnv };
});

describe('enrichPersonByName — Apollo People Match request body', () => {
  it('nunca envia reveal_personal_emails para a Apollo (ACH-05-03)', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(200, {
        person: { first_name: 'Ana', last_name: 'Souza', title: 'CFO', email: 'ana@empresa.com.br' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await enrichPersonByName('Ana Souza', 'empresa.com.br', 'Empresa Exemplo');

    expect(result.error).toBeUndefined();
    expect(result.contact?.email).toBe('ana@empresa.com.br');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0];
    const sentBody = JSON.parse((init as RequestInit).body as string);

    expect(sentBody).not.toHaveProperty('reveal_personal_emails');
    expect(sentBody).toEqual({
      first_name: 'Ana',
      last_name: 'Souza',
      domain: 'empresa.com.br',
      organization_name: 'Empresa Exemplo',
    });
  });
});
