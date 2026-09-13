import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ACH-05-04 (auditoria 2026-09-11, agente 05): hunter.service.ts (fallback real de e-mail/decisor
// quando a Apollo não tem escopo ou não encontra o dado) nunca teve teste dedicado. Mesmo padrão
// dos testes de apollo/organizationEnrich.ts e organizationSearch.ts: `fetchWithProviderRetry` é
// mockada diretamente, cobrindo sucesso e cada família de erro definitivo (429/5xx/4xx) que sobra
// depois do retry interno. `resetProviderCacheForTests` é chamado a cada teste — sem isso, um
// resultado cacheado por um caso "vaza" como cache hit indevido para o próximo (achado documentado
// no próprio providerCache.ts, motivado por uma falha real de CI com Redis configurado).

const getPaidProspectingKeyMock = vi.fn();
vi.mock('@/config/prospecting-integrations.js', () => ({
  getPaidProspectingKey: (...args: unknown[]) => getPaidProspectingKeyMock(...args),
}));

const fetchWithProviderRetryMock = vi.fn();
vi.mock('@/lib/enrichment/providerFetch.js', () => ({
  fetchWithProviderRetry: (...args: unknown[]) => fetchWithProviderRetryMock(...args),
}));

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import {
  findEmailViaHunter,
  findPeopleViaDomainSearch,
} from '@/features/prospecting/services/hunter.service';
import { resetProviderCacheForTests } from '@/features/prospecting/services/providerCache';
import { resetProviderRateLimitersForTests } from '@/features/prospecting/services/providerRateLimit';

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

describe('hunter.service', () => {
  beforeEach(async () => {
    getPaidProspectingKeyMock.mockReturnValue('fake-hunter-key');
    fetchWithProviderRetryMock.mockReset();
    resetProviderRateLimitersForTests();
    await resetProviderCacheForTests();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('findEmailViaHunter', () => {
    it('sem API key configurada, não chama a rede e devolve email null', async () => {
      getPaidProspectingKeyMock.mockReturnValue(undefined);

      const result = await findEmailViaHunter('empresa.com.br', 'João Silva');

      expect(result).toEqual({ email: null });
      expect(fetchWithProviderRetryMock).not.toHaveBeenCalled();
    });

    it('sem nome completo (só um nome, sem sobrenome), não chama a rede', async () => {
      const result = await findEmailViaHunter('empresa.com.br', 'João');

      expect(result).toEqual({ email: null });
      expect(fetchWithProviderRetryMock).not.toHaveBeenCalled();
    });

    it('sucesso (200): devolve o e-mail e o score encontrados', async () => {
      fetchWithProviderRetryMock.mockResolvedValue(
        jsonResponse(200, { data: { email: 'joao.silva@empresa.com.br', score: 92 } }),
      );

      const result = await findEmailViaHunter('empresa.com.br', 'João Silva');

      expect(result).toEqual({ email: 'joao.silva@empresa.com.br', score: 92 });
    });

    it('sucesso sem e-mail encontrado devolve email null (sem erro)', async () => {
      fetchWithProviderRetryMock.mockResolvedValue(jsonResponse(200, { data: {} }));

      const result = await findEmailViaHunter('empresa.com.br', 'João Silva');

      expect(result).toEqual({ email: null, score: undefined });
    });

    it('429 final vira erro descritivo, não exceção', async () => {
      fetchWithProviderRetryMock.mockResolvedValue(jsonResponse(429, 'Too Many Requests'));

      const result = await findEmailViaHunter('empresa.com.br', 'João Silva');

      expect(result.email).toBeNull();
      expect(result.error).toContain('429');
    });

    it('5xx vira erro descritivo, não exceção', async () => {
      fetchWithProviderRetryMock.mockResolvedValue(jsonResponse(503, 'Service Unavailable'));

      const result = await findEmailViaHunter('empresa.com.br', 'João Silva');

      expect(result.email).toBeNull();
      expect(result.error).toContain('503');
    });

    it('4xx definitivo (401 chave inválida) vira erro descritivo, não exceção', async () => {
      fetchWithProviderRetryMock.mockResolvedValue(jsonResponse(401, 'Unauthorized'));

      const result = await findEmailViaHunter('empresa.com.br', 'João Silva');

      expect(result.email).toBeNull();
      expect(result.error).toContain('401');
    });

    it('erro de rede/timeout é capturado e vira erro, nunca propaga', async () => {
      fetchWithProviderRetryMock.mockRejectedValue(new Error('Timeout de rede'));

      const result = await findEmailViaHunter('empresa.com.br', 'João Silva');

      expect(result.email).toBeNull();
      expect(result.error).toBe('Timeout de rede');
    });

    it('resultados de erro nunca são cacheados — uma nova tentativa refaz a chamada real', async () => {
      fetchWithProviderRetryMock.mockResolvedValueOnce(jsonResponse(500, 'Internal Server Error'));
      const first = await findEmailViaHunter('empresa.com.br', 'João Silva');
      expect(first.error).toContain('500');

      fetchWithProviderRetryMock.mockResolvedValueOnce(
        jsonResponse(200, { data: { email: 'joao.silva@empresa.com.br' } }),
      );
      const second = await findEmailViaHunter('empresa.com.br', 'João Silva');

      expect(second).toEqual({ email: 'joao.silva@empresa.com.br', score: undefined });
      expect(fetchWithProviderRetryMock).toHaveBeenCalledTimes(2);
    });

    it('resultados de sucesso são cacheados — uma segunda chamada idêntica não bate a rede de novo', async () => {
      fetchWithProviderRetryMock.mockResolvedValue(
        jsonResponse(200, { data: { email: 'joao.silva@empresa.com.br' } }),
      );

      await findEmailViaHunter('empresa.com.br', 'João Silva');
      await findEmailViaHunter('empresa.com.br', 'João Silva');

      expect(fetchWithProviderRetryMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('findPeopleViaDomainSearch', () => {
    it('sem API key configurada, não chama a rede e devolve lista vazia', async () => {
      getPaidProspectingKeyMock.mockReturnValue(undefined);

      const result = await findPeopleViaDomainSearch('empresa.com.br');

      expect(result).toEqual({ contacts: [] });
      expect(fetchWithProviderRetryMock).not.toHaveBeenCalled();
    });

    it('sucesso (200): mapeia e-mails nomeados, ignorando os genéricos sem nome', async () => {
      fetchWithProviderRetryMock.mockResolvedValue(
        jsonResponse(200, {
          data: {
            emails: [
              {
                first_name: 'João',
                last_name: 'Silva',
                position: 'Diretor de Logística',
                value: 'joao.silva@empresa.com.br',
                phone_number: null,
                linkedin: null,
              },
              { value: 'contato@empresa.com.br' }, // sem first_name/last_name — genérico, deve ser descartado
            ],
          },
        }),
      );

      const result = await findPeopleViaDomainSearch('empresa.com.br');

      expect(result.error).toBeUndefined();
      expect(result.contacts).toEqual([
        {
          name: 'João Silva',
          title: 'Diretor de Logística',
          email: 'joao.silva@empresa.com.br',
          phone: null,
          linkedin_url: null,
        },
      ]);
    });

    it('429 final vira erro descritivo, contacts vazio', async () => {
      fetchWithProviderRetryMock.mockResolvedValue(jsonResponse(429, 'Too Many Requests'));

      const result = await findPeopleViaDomainSearch('empresa.com.br');

      expect(result.contacts).toEqual([]);
      expect(result.error).toContain('429');
    });

    it('5xx vira erro descritivo, contacts vazio', async () => {
      fetchWithProviderRetryMock.mockResolvedValue(jsonResponse(500, 'Internal Server Error'));

      const result = await findPeopleViaDomainSearch('empresa.com.br');

      expect(result.contacts).toEqual([]);
      expect(result.error).toContain('500');
    });

    it('4xx definitivo (403 sem escopo) vira erro descritivo, contacts vazio', async () => {
      fetchWithProviderRetryMock.mockResolvedValue(jsonResponse(403, 'Forbidden'));

      const result = await findPeopleViaDomainSearch('empresa.com.br');

      expect(result.contacts).toEqual([]);
      expect(result.error).toContain('403');
    });

    it('erro de rede/timeout é capturado e vira erro, nunca propaga', async () => {
      fetchWithProviderRetryMock.mockRejectedValue(new Error('Timeout de rede'));

      const result = await findPeopleViaDomainSearch('empresa.com.br');

      expect(result.contacts).toEqual([]);
      expect(result.error).toBe('Timeout de rede');
    });
  });
});
