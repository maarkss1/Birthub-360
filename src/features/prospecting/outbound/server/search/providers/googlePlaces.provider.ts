// Wave 4 (CPI) — Provider Adapter: Google Places (descoberta de empresas).
// Extraído de server/routes.ts (findLeads) para isolar a integração externa
// e normalizar timeout/erro/latência/proveniência num formato comum.

import type { ProviderCapability, ProviderHealth, ProviderResult, SearchProvider } from './types.js';
// Wave 7 (CPI) — Progressive Search: o overfetch (quantos candidatos pedir para
// um targetCount de leads finais) deixa de ser um número mágico embutido aqui e
// passa a ser uma função nomeada/testável, com o teto real do provider (Places
// Text Search (New): 20 por chamada, sem pageToken neste adapter).
import { computeOverfetchTarget } from '../../progressiveSearch.js';

export interface RawPlace {
  name: string;
  address: string;
  phone: string;
  website: string;
  rating?: number;
  totalRatings?: number;
}

const CAPABILITIES: ProviderCapability[] = ['company_discovery'];

function isConfigured(apiKey?: string): boolean {
  return Boolean(apiKey && apiKey.trim().length > 10);
}

/**
 * Busca por texto livre na API do Google Places. Nunca lança para erros de
 * rede/HTTP - sempre devolve um ProviderResult com status explícito, e
 * `data` só é preenchido quando `status === 'ok'`.
 */
export async function searchPlaces(query: string, limit: number, apiKey?: string, timeoutMs = 8000): Promise<ProviderResult<RawPlace[]>> {
  const startedAt = Date.now();

  if (!isConfigured(apiKey)) {
    return { status: 'not_configured', source: 'google_places', latencyMs: 0 };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey!.trim(),
        'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.websiteUri,places.rating,places.userRatingCount'
      },
      body: JSON.stringify({
        textQuery: query,
        // Over-fetch: leads já prospectados serão descartados pelo chamador, então
        // pedimos mais do que o necessário (ver server/progressiveSearch.ts).
        pageSize: computeOverfetchTarget(limit),
        languageCode: 'pt-BR'
      })
    });
    clearTimeout(timeoutId);

    const latencyMs = Date.now() - startedAt;

    if (response.status === 429) {
      return { status: 'rate_limited', source: 'google_places', latencyMs, httpStatus: 429 };
    }
    if (!response.ok) {
      return { status: 'error', source: 'google_places', latencyMs, httpStatus: response.status, errorMessage: `Google Places respondeu ${response.status}` };
    }

    const raw = await response.json() as any;
    const places = Array.isArray(raw.places) ? raw.places : [];

    if (places.length === 0) {
      return { status: 'not_found', source: 'google_places', latencyMs };
    }

    const mapped: RawPlace[] = places.map((p: any) => ({
      name: p.displayName?.text || '',
      address: p.formattedAddress || '',
      phone: p.nationalPhoneNumber || '',
      website: p.websiteUri || '',
      rating: p.rating,
      totalRatings: p.userRatingCount
    }));

    return { status: 'ok', data: mapped, source: 'google_places', latencyMs, httpStatus: response.status };
  } catch (err: any) {
    const latencyMs = Date.now() - startedAt;
    if (err?.name === 'AbortError') {
      return { status: 'timeout', source: 'google_places', latencyMs, errorMessage: 'Timeout ao consultar o Google Places.' };
    }
    return { status: 'error', source: 'google_places', latencyMs, errorMessage: err?.message || String(err) };
  }
}

export const googlePlacesProvider: SearchProvider = {
  name: 'google_places',
  capabilities: CAPABILITIES,
  configured(): boolean {
    return isConfigured(process.env.GOOGLE_PLACES_API_KEY);
  },
  async health(): Promise<ProviderHealth> {
    if (!this.configured()) {
      return { status: 'not_configured', checkedAt: new Date().toISOString(), message: 'GOOGLE_PLACES_API_KEY não configurada.' };
    }
    return { status: 'online', checkedAt: new Date().toISOString() };
  }
};
