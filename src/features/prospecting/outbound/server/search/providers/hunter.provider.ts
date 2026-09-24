// Wave 4 (CPI) — Provider Adapter: Hunter.io (verificação de e-mail e busca de
// e-mail corporativo por domínio). Extraído de server/routes.ts — as rotas
// /integrations/hunter/verify e /integrations/hunter/domain-search (usadas
// manualmente pelo frontend desde a Wave 0) e o fallback real Apollo -> Hunter
// da Wave 9 (hunterDomainSearch / complementDecisionMakerEmailWithHunter) —
// para isolar a integração externa e normalizar timeout/429/5xx/latência/
// proveniência no formato comum (ver docs CPI 07_AGENTE_PROVIDER_REGISTRY /
// 08_AGENTE_PROVIDER_ADAPTERS). Este follow-up do CPI formaliza o adapter que
// a Wave 4 original deixou pendente para Hunter.

import type { ProviderCapability, ProviderHealth, ProviderResult, SearchProvider } from './types';

export interface HunterEmailMatch {
  email: string;
  confidence: number;
  firstName?: string;
  lastName?: string;
  position?: string;
  type?: string; // 'personal' | 'generic' — como a Hunter classifica, sem tradução
}

export interface HunterDomainSearchResult {
  organization?: string;
  emails: HunterEmailMatch[];
}

export interface HunterEmailVerification {
  email: string;
  status: string; // vocabulário da própria Hunter: valid, invalid, accept_all, disposable, unknown, ...
  score: number;
  domain: string;
  sourcesCount: number;
  result: string;
}

const CAPABILITIES: ProviderCapability[] = ['email_verify'];

function isConfigured(apiKey?: string): boolean {
  return Boolean(apiKey && apiKey.trim().length > 0);
}

async function withTimeout<T>(fn: (signal: AbortSignal) => Promise<T>, ms = 8000): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ms);
  try {
    return await fn(controller.signal);
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Busca e-mails corporativos conhecidos pela Hunter para um domínio. Nunca
 * fabrica um e-mail: `status: 'not_found'` (sem `data`) quando a Hunter
 * responde mas não confirma nenhum e-mail para o domínio.
 */
export async function domainSearch(domain: string, apiKey?: string, timeoutMs = 8000): Promise<ProviderResult<HunterDomainSearchResult>> {
  const startedAt = Date.now();
  if (!isConfigured(apiKey) || !domain) {
    return { status: 'not_configured', source: 'hunter', latencyMs: 0 };
  }

  try {
    const response = await withTimeout(signal =>
      fetch(`https://api.hunter.io/v2/domain-search?domain=${encodeURIComponent(domain)}&api_key=${encodeURIComponent(apiKey!.trim())}&limit=10`, { signal }),
    timeoutMs);
    const latencyMs = Date.now() - startedAt;

    if (response.status === 429) return { status: 'rate_limited', source: 'hunter', latencyMs, httpStatus: 429 };
    if (!response.ok) return { status: 'error', source: 'hunter', latencyMs, httpStatus: response.status, errorMessage: `Hunter domain-search respondeu ${response.status}` };

    const raw = await response.json() as any;
    if (!raw.data) return { status: 'error', source: 'hunter', latencyMs, httpStatus: response.status, errorMessage: 'Hunter domain-search respondeu 200 sem corpo "data".' };

    const emails: HunterEmailMatch[] = (raw.data.emails || [])
      .map((e: any) => ({
        email: e.value,
        confidence: e.confidence || 0,
        firstName: e.first_name,
        lastName: e.last_name,
        position: e.position,
        type: e.type
      }))
      .filter((e: HunterEmailMatch) => Boolean(e.email));

    if (emails.length === 0) return { status: 'not_found', source: 'hunter', latencyMs, httpStatus: response.status };

    return { status: 'ok', data: { organization: raw.data.organization, emails }, source: 'hunter', latencyMs, httpStatus: response.status };
  } catch (err: any) {
    const latencyMs = Date.now() - startedAt;
    if (err?.name === 'AbortError') return { status: 'timeout', source: 'hunter', latencyMs, errorMessage: 'Timeout ao consultar Hunter (domain-search).' };
    return { status: 'error', source: 'hunter', latencyMs, errorMessage: err?.message || String(err) };
  }
}

/**
 * Verifica a entregabilidade de um e-mail específico. Nunca fabrica um score
 * de confiança nem um status de verificação - sem chave configurada ou sem
 * resposta real da Hunter, o status é explicitamente `error`/`not_configured`,
 * nunca "valid" nem qualquer valor plausível.
 */
export async function verifyEmail(email: string, apiKey?: string, timeoutMs = 8000): Promise<ProviderResult<HunterEmailVerification>> {
  const startedAt = Date.now();
  if (!isConfigured(apiKey) || !email) {
    return { status: 'not_configured', source: 'hunter', latencyMs: 0 };
  }

  try {
    const response = await withTimeout(signal =>
      fetch(`https://api.hunter.io/v2/email-verifier?email=${encodeURIComponent(email)}&api_key=${encodeURIComponent(apiKey!.trim())}`, { signal }),
    timeoutMs);
    const latencyMs = Date.now() - startedAt;

    if (response.status === 429) return { status: 'rate_limited', source: 'hunter', latencyMs, httpStatus: 429 };
    if (!response.ok) return { status: 'error', source: 'hunter', latencyMs, httpStatus: response.status, errorMessage: `Hunter email-verifier respondeu ${response.status}` };

    const raw = await response.json() as any;
    if (!raw.data) return { status: 'error', source: 'hunter', latencyMs, httpStatus: response.status, errorMessage: 'Hunter email-verifier respondeu 200 sem corpo "data".' };

    return {
      status: 'ok',
      data: {
        email: raw.data.email,
        status: raw.data.status,
        score: raw.data.score || 0,
        domain: raw.data.domain,
        sourcesCount: Array.isArray(raw.data.sources) ? raw.data.sources.length : 0,
        result: raw.data.result
      },
      source: 'hunter',
      latencyMs,
      httpStatus: response.status
    };
  } catch (err: any) {
    const latencyMs = Date.now() - startedAt;
    if (err?.name === 'AbortError') return { status: 'timeout', source: 'hunter', latencyMs, errorMessage: 'Timeout ao consultar Hunter (email-verifier).' };
    return { status: 'error', source: 'hunter', latencyMs, errorMessage: err?.message || String(err) };
  }
}

// Faixa Unicode das marcas diacríticas combinantes (mesma usada em slugify() em
// server/routes.ts), construída via charCode para nunca depender de caracteres
// literais no arquivo-fonte.
const DIACRITICS_RE = new RegExp(`[${String.fromCharCode(0x0300)}-${String.fromCharCode(0x036f)}]`, 'g');

/** Compara um candidato de e-mail da Hunter contra um nome real conhecido (Apollo ou QSA). */
function matchesName(candidate: HunterEmailMatch, fullName: string): boolean {
  const parts = fullName.toLowerCase().normalize('NFD').replace(DIACRITICS_RE, '').split(/\s+/).filter(Boolean);
  if (parts.length === 0) return false;
  const first = parts[0];
  const last = parts[parts.length - 1];
  const candFirst = (candidate.firstName || '').toLowerCase();
  const candLast = (candidate.lastName || '').toLowerCase();
  if (candFirst && candLast) {
    return candFirst === first && candLast === last;
  }
  // Hunter não devolveu first/last name estruturado: compara pelo local-part do
  // e-mail (ex: "joao.silva@empresa.com" contém "joao") - nunca aceita "o
  // primeiro e-mail encontrado" sem alguma correspondência com o nome real.
  const localPart = candidate.email.split('@')[0]?.toLowerCase() || '';
  return Boolean(first) && localPart.includes(first);
}

/**
 * Wave 9 (CPI) - Fallback real Apollo -> Hunter (exemplo do próprio pacote CPI:
 * Apollo busca a pessoa, Hunter só complementa/verifica o e-mail - nunca o
 * contrário, o Hunter não descobre decisor). Só devolve um e-mail quando a
 * Hunter confirma uma correspondência real de nome no domínio da empresa -
 * nunca escolhe "o primeiro e-mail encontrado" às cegas, e o chamador nunca
 * sobrescreve um e-mail que a Apollo já havia confirmado.
 */
export async function complementDecisionMakerEmail(
  person: { name?: string; email?: string },
  domain: string,
  apiKey?: string
): Promise<string | undefined> {
  if (!person.name || person.email || !domain) return undefined; // já tem e-mail real, ou não há nome para buscar
  const result = await domainSearch(domain, apiKey);
  if (result.status !== 'ok' || !result.data) return undefined;

  const match = result.data.emails.find(e => matchesName(e, person.name!));
  return match?.email;
}

export const hunterProvider: SearchProvider = {
  name: 'hunter',
  capabilities: CAPABILITIES,
  configured(): boolean {
    return isConfigured(process.env.HUNTER_API_KEY);
  },
  async health(): Promise<ProviderHealth> {
    if (!this.configured()) {
      return { status: 'not_configured', checkedAt: new Date().toISOString(), message: 'HUNTER_API_KEY não configurada.' };
    }
    return { status: 'online', checkedAt: new Date().toISOString() };
  }
};
