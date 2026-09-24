// Wave 4 (CPI) — Provider Adapter: CNPJ oficial (BrasilAPI / Minha Receita).
// A lógica de consulta já vive em server/cnpj.ts (com seu próprio timeout e
// fallback entre as duas fontes públicas, sem fabricar dado - ver Wave 0).
// Este adapter só normaliza o resultado no formato ProviderResult comum,
// para que o Provider Registry e o Query Planner tratem esta fonte como
// qualquer outra, por capacidade.

import { fetchCnpjPublicData, type CnpjData } from '../../cnpj';
import type { ProviderCapability, ProviderHealth, ProviderResult, SearchProvider } from './types';

const CAPABILITIES: ProviderCapability[] = ['company_cnae_lookup', 'company_location_lookup'];

/** CNPJ oficial não exige API key - é sempre "configurado" (fontes públicas gratuitas). */
export async function lookupCnpj(cnpj: string): Promise<ProviderResult<CnpjData>> {
  const startedAt = Date.now();
  const result = await fetchCnpjPublicData(cnpj);
  const latencyMs = Date.now() - startedAt;

  if (!result) {
    return { status: 'not_found', source: result === null ? 'cnpj_receita_federal' : 'unknown', latencyMs };
  }
  return { status: 'ok', data: result, source: result.source || 'cnpj_receita_federal', latencyMs };
}

export const cnpjOficialProvider: SearchProvider = {
  name: 'cnpj_receita_federal',
  capabilities: CAPABILITIES,
  configured(): boolean {
    return true; // BrasilAPI/Minha Receita são públicas e gratuitas, sem API key.
  },
  async health(): Promise<ProviderHealth> {
    return { status: 'online', checkedAt: new Date().toISOString() };
  }
};
