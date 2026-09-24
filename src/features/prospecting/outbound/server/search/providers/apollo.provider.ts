// Wave 4 (CPI) — Provider Adapter: Apollo.io (enriquecimento de empresa e
// busca de decisores). Extraído de server/routes.ts (enrichLeadWithApollo)
// para isolar a integração externa e normalizar timeout/erro/latência/
// proveniência num formato comum.

import type { ProviderCapability, ProviderHealth, ProviderResult, SearchProvider } from './types';

export interface ApolloPerson {
  name: string;
  title: string;
  email: string;
  phone: string;
  linkedinUrl: string;
}

const CAPABILITIES: ProviderCapability[] = ['company_linkedin_enrich', 'people_search'];

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

/** Busca a página do LinkedIn da empresa. Nunca fabrica uma URL quando a Apollo não confirma. */
export async function enrichOrganization(domain: string, apiKey?: string): Promise<ProviderResult<{ linkedinUrl: string }>> {
  const startedAt = Date.now();
  if (!isConfigured(apiKey) || !domain) {
    return { status: 'not_configured', source: 'apollo', latencyMs: 0 };
  }

  try {
    const response = await withTimeout(signal =>
      fetch(`https://api.apollo.io/v1/organizations/enrich?domain=${encodeURIComponent(domain)}`, {
        method: 'GET',
        signal,
        headers: { 'Content-Type': 'application/json', 'X-Api-Key': apiKey!.trim() }
      })
    );
    const latencyMs = Date.now() - startedAt;

    if (response.status === 429) return { status: 'rate_limited', source: 'apollo', latencyMs, httpStatus: 429 };
    if (!response.ok) return { status: 'error', source: 'apollo', latencyMs, httpStatus: response.status, errorMessage: `Apollo org enrich respondeu ${response.status}` };

    const data = await response.json() as any;
    const linkedinUrl = data.organization?.linkedin_url || '';
    if (!linkedinUrl) return { status: 'not_found', source: 'apollo', latencyMs, httpStatus: response.status };

    return { status: 'ok', data: { linkedinUrl }, source: 'apollo', latencyMs, httpStatus: response.status };
  } catch (err: any) {
    const latencyMs = Date.now() - startedAt;
    if (err?.name === 'AbortError') return { status: 'timeout', source: 'apollo', latencyMs, errorMessage: 'Timeout ao consultar Apollo (organization/enrich).' };
    return { status: 'error', source: 'apollo', latencyMs, errorMessage: err?.message || String(err) };
  }
}

/**
 * Busca pessoas por domínio/nome da empresa e resolve o perfil individual de
 * cada uma via people/match (LinkedIn pessoal real). Nunca fabrica um nome,
 * e-mail, telefone ou LinkedIn quando a Apollo não os retorna para a pessoa.
 */
export async function searchAndMatchPeople(
  domain: string,
  companyName: string,
  preferredTitles: string[],
  apiKey?: string
): Promise<ProviderResult<ApolloPerson[]>> {
  const startedAt = Date.now();
  if (!isConfigured(apiKey) || (!domain && !companyName)) {
    return { status: 'not_configured', source: 'apollo', latencyMs: 0 };
  }

  try {
    const searchBody: any = { person_titles: preferredTitles, page: 1, per_page: 4 };
    if (domain) searchBody.q_organization_domains = domain;
    else searchBody.q_organization_name = companyName;

    const searchRes = await withTimeout(signal =>
      fetch('https://api.apollo.io/v1/mixed_people/api_search', {
        method: 'POST',
        signal,
        headers: { 'Content-Type': 'application/json', 'X-Api-Key': apiKey!.trim() },
        body: JSON.stringify(searchBody)
      })
    );

    if (searchRes.status === 429) return { status: 'rate_limited', source: 'apollo', latencyMs: Date.now() - startedAt, httpStatus: 429 };
    if (!searchRes.ok) return { status: 'error', source: 'apollo', latencyMs: Date.now() - startedAt, httpStatus: searchRes.status, errorMessage: `Apollo people search respondeu ${searchRes.status}` };

    const searchData = await searchRes.json() as any;
    const candidates: any[] = Array.isArray(searchData.people) ? searchData.people.slice(0, 3) : [];
    if (candidates.length === 0) {
      return { status: 'not_found', source: 'apollo', latencyMs: Date.now() - startedAt, httpStatus: searchRes.status };
    }

    const matched = await Promise.all(candidates.map(async (p: any) => {
      if (!p.id) return p;
      try {
        const mRes = await withTimeout(signal =>
          fetch('https://api.apollo.io/v1/people/match', {
            method: 'POST',
            signal,
            headers: { 'Content-Type': 'application/json', 'X-Api-Key': apiKey!.trim() },
            body: JSON.stringify({ id: p.id })
          })
        );
        if (mRes.ok) {
          const mData = await mRes.json() as any;
          if (mData.person) return mData.person;
        }
      } catch {
        // Falha ao resolver o perfil individual: usa o resumo já vindo da busca,
        // sem fabricar um dado que a Apollo não confirmou.
      }
      return p;
    }));

    const people: ApolloPerson[] = matched
      .filter((p: any) => p.name || p.first_name || p.last_name)
      .map((p: any) => ({
        name: p.name || `${p.first_name || ''} ${p.last_name || ''}`.trim(),
        title: p.title || '',
        email: p.email || '',
        phone: p.phone_numbers?.[0]?.raw_number || '',
        linkedinUrl: p.linkedin_url || ''
      }));

    if (people.length === 0) {
      return { status: 'not_found', source: 'apollo', latencyMs: Date.now() - startedAt, httpStatus: searchRes.status };
    }

    return { status: 'ok', data: people, source: 'apollo', latencyMs: Date.now() - startedAt, httpStatus: searchRes.status };
  } catch (err: any) {
    const latencyMs = Date.now() - startedAt;
    if (err?.name === 'AbortError') return { status: 'timeout', source: 'apollo', latencyMs, errorMessage: 'Timeout ao consultar Apollo (people search/match).' };
    return { status: 'error', source: 'apollo', latencyMs, errorMessage: err?.message || String(err) };
  }
}

export const apolloProvider: SearchProvider = {
  name: 'apollo',
  capabilities: CAPABILITIES,
  configured(): boolean {
    return isConfigured(process.env.APOLLO_API_KEY);
  },
  async health(): Promise<ProviderHealth> {
    if (!this.configured()) {
      return { status: 'not_configured', checkedAt: new Date().toISOString(), message: 'APOLLO_API_KEY não configurada.' };
    }
    return { status: 'online', checkedAt: new Date().toISOString() };
  }
};
