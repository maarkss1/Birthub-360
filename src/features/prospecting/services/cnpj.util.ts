// Validação de CNPJ com o algoritmo oficial de dígitos verificadores (Receita Federal).
//
// A implementação real mora em src/lib/cnpj.ts (Onda 43) — promovida pra lá porque
// `src/features/companies/` e `src/lib/zod.ts` também precisam normalizar CNPJ, e importar deste
// arquivo (dentro de `prospecting/`) violaria `no-cross-feature-imports`
// (.dependency-cruiser.cjs). Reexportado aqui para não quebrar os imports já existentes que
// apontam para `prospecting/services/cnpj.util`.
export { formatCnpj, isValidCnpj, sanitizeCnpj, toDeterministicCnpj } from '../../../lib/cnpj.js';

import { isValidCnpj } from '../../../lib/cnpj.js';
import { fetchWithTimeout } from '../../../lib/http.js';
import { logger } from '../../../lib/logger.js';

const DUCKDUCKGO_HTML_HOST = 'html.duckduckgo.com';
const DUCKDUCKGO_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0';

/**
 * Busca um CNPJ na web pelo nome da empresa (útil quando o usuário só digitou o nome) — via
 * scraping do HTML de busca do DuckDuckGo (sem chave/API oficial). Chamada para praticamente todo
 * candidato de Google Places/Nominatim em toda busca de descoberta (ver
 * `prospecting/qualityEnrichment.ts`), então uma falha sistemática aqui (DuckDuckGo bloqueando o
 * scraper, mudança de markup) afeta volume alto — por isso agora loga a falha real em vez de só
 * devolver `null` (mesmo tratamento silencioso de "não encontrado" que uma falha de rede/parse
 * real). O contrato de retorno (nunca lança, `null` em qualquer cenário de falha) não muda — os
 * dois chamadores (`qualityEnrichment.ts`, `enrichment.service.ts`) só checam `if (discovered)`.
 * `fetchWithTimeout` (em vez do `fetch` cru anterior) mantém o mesmo timeout de 6s e passa a
 * validar o host de destino, mesmo padrão já usado pelos demais providers deste domínio.
 */
export async function discoverCnpjByName(companyName: string): Promise<string | null> {
  if (!companyName) return null;
  try {
    const q = encodeURIComponent(`${companyName} cnpj`);
    const url = `https://${DUCKDUCKGO_HTML_HOST}/html/?q=${q}`;
    const res = await fetchWithTimeout(
      url,
      { headers: { 'User-Agent': DUCKDUCKGO_USER_AGENT } },
      6000,
      [DUCKDUCKGO_HTML_HOST],
    );
    if (!res.ok) {
      logger.warn(
        { status: res.status, companyName },
        'discoverCnpjByName: DuckDuckGo respondeu erro ao buscar CNPJ por nome',
      );
      return null;
    }
    const html = await res.text();
    const match = html.match(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/);
    if (match && isValidCnpj(match[0])) return match[0];
    return null;
  } catch (error) {
    logger.warn(
      { err: error, companyName },
      'discoverCnpjByName: falha ao buscar CNPJ por nome via DuckDuckGo — tratando como não encontrado',
    );
    return null;
  }
}
