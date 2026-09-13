import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ACH-05-04 (auditoria 2026-09-11, agente 05): enrichOrganizationByDomain (Apollo Organization
// Enrich) nunca teve teste dedicado. `fetchWithProviderRetry` já resolve toda a lógica de
// retry/backoff internamente (testada em lib/enrichment/providerFetch.ts) — aqui mockamos ela
// diretamente e cobrimos como enrichOrganizationByDomain reage à RESPOSTA FINAL que ela devolve:
// sucesso, e cada família de erro definitivo (o que sobra depois do retry: 4xx/5xx/429 finais).

const getPaidProspectingKeyMock = vi.fn();
vi.mock('@/config/prospecting-integrations.js', () => ({
  getPaidProspectingKey: (...args: unknown[]) => getPaidProspectingKeyMock(...args),
}));

const fetchWithProviderRetryMock = vi.fn();
vi.mock('@/lib/enrichment/providerFetch.js', () => ({
  fetchWithProviderRetry: (...args: unknown[]) => fetchWithProviderRetryMock(...args),
}));

import { enrichOrganizationByDomain } from '@/features/prospecting/services/apollo/organizationEnrich';
import { resetProviderRateLimitersForTests } from '@/features/prospecting/services/providerRateLimit';

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

describe('enrichOrganizationByDomain (Apollo Organization Enrich)', () => {
  beforeEach(() => {
    getPaidProspectingKeyMock.mockReturnValue('fake-apollo-key');
    fetchWithProviderRetryMock.mockReset();
    resetProviderRateLimitersForTests();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sem API key configurada (modo free ou chave ausente), não chama a rede e devolve organization null', async () => {
    getPaidProspectingKeyMock.mockReturnValue(undefined);

    const result = await enrichOrganizationByDomain('empresa.com.br');

    expect(result).toEqual({ organization: null });
    expect(fetchWithProviderRetryMock).not.toHaveBeenCalled();
  });

  it('sem domínio, não chama a rede', async () => {
    const result = await enrichOrganizationByDomain('');
    expect(result).toEqual({ organization: null });
    expect(fetchWithProviderRetryMock).not.toHaveBeenCalled();
  });

  it('sucesso (200): devolve a organização retornada pela Apollo', async () => {
    const organization = { id: 'apollo-org-1', name: 'Transportadora Exemplo' };
    fetchWithProviderRetryMock.mockResolvedValue(jsonResponse(200, { organization }));

    const result = await enrichOrganizationByDomain('empresa.com.br');

    expect(result).toEqual({ organization });
    expect(fetchWithProviderRetryMock).toHaveBeenCalledWith(
      expect.stringContaining('domain=empresa.com.br'),
      expect.objectContaining({
        headers: expect.objectContaining({ 'X-Api-Key': 'fake-apollo-key' }),
      }),
      expect.objectContaining({ providerName: 'Apollo-OrganizationEnrich', billable: true }),
    );
  });

  it('sucesso sem organização no corpo devolve organization null (sem erro)', async () => {
    fetchWithProviderRetryMock.mockResolvedValue(jsonResponse(200, {}));

    const result = await enrichOrganizationByDomain('empresa.com.br');

    expect(result).toEqual({ organization: null });
  });

  it('429 final (depois do retry interno esgotar) vira erro descritivo, não exceção', async () => {
    fetchWithProviderRetryMock.mockResolvedValue(jsonResponse(429, 'Too Many Requests'));

    const result = await enrichOrganizationByDomain('empresa.com.br');

    expect(result.organization).toBeNull();
    expect(result.error).toContain('429');
  });

  it('5xx (upstream indisponível) vira erro descritivo, não exceção', async () => {
    fetchWithProviderRetryMock.mockResolvedValue(jsonResponse(500, 'Internal Server Error'));

    const result = await enrichOrganizationByDomain('empresa.com.br');

    expect(result.organization).toBeNull();
    expect(result.error).toContain('500');
  });

  it('4xx definitivo (ex: 401 chave inválida) vira erro descritivo, não exceção', async () => {
    fetchWithProviderRetryMock.mockResolvedValue(jsonResponse(401, 'Unauthorized'));

    const result = await enrichOrganizationByDomain('empresa.com.br');

    expect(result.organization).toBeNull();
    expect(result.error).toContain('401');
  });

  it('erro de rede/timeout (fetchWithProviderRetry rejeita) é capturado e vira erro, nunca propaga', async () => {
    fetchWithProviderRetryMock.mockRejectedValue(new Error('Timeout de rede'));

    const result = await enrichOrganizationByDomain('empresa.com.br');

    expect(result.organization).toBeNull();
    expect(result.error).toBe('Timeout de rede');
  });
});
