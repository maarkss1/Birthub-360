import { describe, expect, it, vi } from 'vitest';
import { CascadeEnrichmentService } from '../../../../src/features/prospecting/services/cascadeEnrichment.service.js';

describe('CascadeEnrichmentService (Agente 05)', () => {
  it('para no primeiro provedor que retornar e-mail verificado', async () => {
    const service = new CascadeEnrichmentService();

    const provider1 = vi.fn().mockResolvedValue({
      providerName: 'Apollo',
      email: null,
      verified: false,
      confidence: 0,
    });

    const provider2 = vi.fn().mockResolvedValue({
      providerName: 'Hunter',
      email: 'joao.reis@atlasgr.com',
      verified: true,
      confidence: 0.92,
    });

    const provider3 = vi.fn().mockResolvedValue({
      providerName: 'SMTP_Verifier',
      email: 'joao@atlasgr.com',
      verified: true,
      confidence: 0.99,
    });

    const result = await service.enrichContactInCascade(
      { companyName: 'Atlas GR', contactName: 'João Reis' },
      [provider1, provider2, provider3]
    );

    expect(result.providerName).toBe('Hunter');
    expect(result.email).toBe('joao.reis@atlasgr.com');
    expect(provider1).toHaveBeenCalled();
    expect(provider2).toHaveBeenCalled();
    expect(provider3).not.toHaveBeenCalled(); // Não deve chamar o 3º pois o 2º já teve sucesso
  });

  it('continua na cascata se um provedor lançar erro de API', async () => {
    const service = new CascadeEnrichmentService();

    const provider1 = vi.fn().mockRejectedValue(new Error('Rate limit da API excedido'));
    const provider2 = vi.fn().mockResolvedValue({
      providerName: 'Hunter',
      email: 'contato@empresa.com.br',
      verified: true,
      confidence: 0.85,
    });

    const result = await service.enrichContactInCascade(
      { companyName: 'Empresa X', contactName: 'Maria Silva' },
      [provider1, provider2]
    );

    expect(result.providerName).toBe('Hunter');
    expect(result.email).toBe('contato@empresa.com.br');
  });
});
