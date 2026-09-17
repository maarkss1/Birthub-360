import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchSiteIntelligence } from '../siteIntelligence.service.js';

describe('SiteIntelligenceService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('deve retornar null para domínios ou URLs vazias/inválidas', async () => {
    const result = await fetchSiteIntelligence('');
    expect(result).toBeNull();
  });

  it('deve extrair inteligência com fallback nativo quando Firecrawl/Crawl4AI não estão configurados', async () => {
    const mockHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>LogTech Soluções Inteligentes - Gestão de Frotas</title>
          <meta name="description" content="A melhor plataforma de rastreamento e auditoria logística do Brasil." />
        </head>
        <body>
          <h1>LogTech - Otimize seus fretes</h1>
          <p>Oferecemos redução de custos e controle em tempo real para médias e grandes transportadoras com inteligência artificial.</p>
          <ul>
            <li>Rastreamento IoT avançado</li>
            <li>Auditoria de faturas de frete</li>
            <li>Torre de controle operacional</li>
          </ul>
        </body>
      </html>
    `;

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      text: async () => mockHtml,
    } as unknown as Response);

    const intel = await fetchSiteIntelligence('logtech-exemplo.com.br');

    expect(intel).not.toBeNull();
    expect(intel?.domain).toBe('logtech-exemplo.com.br');
    expect(intel?.title).toContain('LogTech Soluções');
    expect(intel?.description).toContain('rastreamento e auditoria');
    expect(intel?.valueProposition).toBeDefined();
    expect(intel?.productsAndServices).toContain('Rastreamento IoT avançado');
    expect(intel?.source).toBe('scraper');
  });
});
