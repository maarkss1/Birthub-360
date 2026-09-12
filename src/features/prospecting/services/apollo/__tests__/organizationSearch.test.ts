import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ProspectCriteria } from '@/features/prospecting/domain/prospectTypes';

// ACH-05-04 (auditoria 2026-09-11, agente 05): fetchApolloCandidates (Apollo Organization Search)
// nunca teve teste dedicado. `enrichCandidatesWithDecisionMakers` (busca de decisores/fallback
// Hunter, apollo/people.ts) é mockada aqui como no-op — é uma unidade própria, fora do escopo
// deste item — para isolar o comportamento real testado: mapeamento de candidatos e reação da
// função à resposta final (sucesso/429/5xx/4xx definitivo) de `fetchWithProviderRetry`.

const getPaidProspectingKeyMock = vi.fn();
vi.mock('@/config/prospecting-integrations.js', () => ({
  getPaidProspectingKey: (...args: unknown[]) => getPaidProspectingKeyMock(...args),
}));

const fetchWithProviderRetryMock = vi.fn();
vi.mock('@/lib/enrichment/providerFetch.js', () => ({
  fetchWithProviderRetry: (...args: unknown[]) => fetchWithProviderRetryMock(...args),
}));

const enrichCandidatesWithDecisionMakersMock = vi.fn();
vi.mock('@/features/prospecting/services/apollo/people.js', () => ({
  enrichCandidatesWithDecisionMakers: (...args: unknown[]) =>
    enrichCandidatesWithDecisionMakersMock(...args),
}));

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { fetchApolloCandidates } from '@/features/prospecting/services/apollo/organizationSearch';
import { resetProviderRateLimitersForTests } from '@/features/prospecting/services/providerRateLimit';

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

const baseCriteria: ProspectCriteria = {
  segmento: 'Transportadora',
  localizacao: 'São Paulo e Grande SP',
  quantidade: 10,
};

describe('fetchApolloCandidates (Apollo Organization Search)', () => {
  beforeEach(() => {
    getPaidProspectingKeyMock.mockReturnValue('fake-apollo-key');
    fetchWithProviderRetryMock.mockReset();
    enrichCandidatesWithDecisionMakersMock.mockReset().mockResolvedValue(undefined);
    resetProviderRateLimitersForTests();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sem API key configurada, não chama a rede e devolve lista vazia', async () => {
    getPaidProspectingKeyMock.mockReturnValue(undefined);

    const result = await fetchApolloCandidates(baseCriteria, 10);

    expect(result).toEqual({ candidates: [] });
    expect(fetchWithProviderRetryMock).not.toHaveBeenCalled();
  });

  it('sucesso (200): mapeia organizações da Apollo para ProspectCandidate', async () => {
    fetchWithProviderRetryMock.mockResolvedValue(
      jsonResponse(200, {
        organizations: [
          {
            name: 'Transportadora Exemplo',
            industry: 'trucking',
            estimated_num_employees: 120,
            city: 'São Paulo',
            state: 'SP',
            primary_domain: 'exemplo.com.br',
            founded_year: 2010,
          },
        ],
      }),
    );

    const result = await fetchApolloCandidates(baseCriteria, 10);

    expect(result.error).toBeUndefined();
    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0]).toMatchObject({
      tradeName: 'Transportadora Exemplo',
      source: 'apollo',
      segment: 'trucking',
      segmentObserved: true,
      website: 'https://exemplo.com.br',
      foundedYear: 2010,
    });
  });

  it('resultado vazio da Apollo não é erro', async () => {
    fetchWithProviderRetryMock.mockResolvedValue(jsonResponse(200, { organizations: [] }));

    const result = await fetchApolloCandidates(baseCriteria, 10);

    expect(result).toEqual({ candidates: [] });
  });

  it('429 final (depois do retry interno esgotar) vira erro descritivo, candidates vazio', async () => {
    fetchWithProviderRetryMock.mockResolvedValue(jsonResponse(429, 'Too Many Requests'));

    const result = await fetchApolloCandidates(baseCriteria, 10);

    expect(result.candidates).toEqual([]);
    expect(result.error).toContain('429');
  });

  it('5xx (upstream indisponível) vira erro descritivo, candidates vazio', async () => {
    fetchWithProviderRetryMock.mockResolvedValue(jsonResponse(500, 'Internal Server Error'));

    const result = await fetchApolloCandidates(baseCriteria, 10);

    expect(result.candidates).toEqual([]);
    expect(result.error).toContain('500');
  });

  it('4xx definitivo (ex: 422 filtro inválido) vira erro descritivo, candidates vazio', async () => {
    fetchWithProviderRetryMock.mockResolvedValue(jsonResponse(422, 'Per page not supported'));

    const result = await fetchApolloCandidates(baseCriteria, 10);

    expect(result.candidates).toEqual([]);
    expect(result.error).toContain('422');
  });

  it('erro de rede/timeout é capturado e vira erro, nunca propaga', async () => {
    fetchWithProviderRetryMock.mockRejectedValue(new Error('Timeout de rede'));

    const result = await fetchApolloCandidates(baseCriteria, 10);

    expect(result.candidates).toEqual([]);
    expect(result.error).toBe('Timeout de rede');
  });

  it('mesmo quando a pré-busca de decisores (fallback Hunter) falha, os candidatos já obtidos continuam válidos', async () => {
    fetchWithProviderRetryMock.mockResolvedValue(
      jsonResponse(200, {
        organizations: [{ name: 'Transportadora Exemplo', primary_domain: 'exemplo.com.br' }],
      }),
    );
    enrichCandidatesWithDecisionMakersMock.mockRejectedValue(new Error('Hunter e Apollo indisponíveis'));

    const result = await fetchApolloCandidates(baseCriteria, 10);

    expect(result.error).toBeUndefined();
    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0].tradeName).toBe('Transportadora Exemplo');
  });
});
