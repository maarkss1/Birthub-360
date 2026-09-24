// Wave 4 (CPI) — Provider Layer: interface comum para qualquer integração
// externa (Google Places, Apollo, CNPJ oficial, Hunter, ...), para que nenhuma
// regra de negócio dependa diretamente de um provider específico - só de
// capacidades. Ver docs CPI 07_AGENTE_PROVIDER_REGISTRY / 08_AGENTE_PROVIDER_ADAPTERS.

// Capacidades granulares o suficiente para o Query Planner (Wave 3) decidir
// dinamicamente "unsupported" vs "requires_enrichment" consultando o registry,
// em vez de uma lista fixa de critérios hardcoded no planner.
export type ProviderCapability =
  | 'company_discovery'
  | 'company_cnae_lookup'
  | 'company_location_lookup'
  | 'company_linkedin_enrich'
  | 'company_size_enrich'
  | 'company_revenue_enrich'
  | 'company_type_enrich'
  | 'people_search'
  | 'email_verify'
  // Wave 13 (CPI, Signals & Intent) — capacidades que um provider de sinais
  // de compra precisaria ter. Nenhum adapter real declara nenhuma delas
  // hoje (ver server/providerRegistry.ts — declaradas com status
  // `not_implemented`, nunca fabricadas). Granulares por fonte citada no
  // pacote CPI (news/search, vagas, base de M&A/investimento, mudança
  // executiva) em vez de uma capacidade genérica "signals", para o dia em
  // que um provider real cobrir só uma dessas fontes.
  | 'news_search'
  | 'job_postings_search'
  | 'executive_change_tracking'
  | 'ma_investment_lookup'
  | 'crm_duplicate_check'
  | 'crm_export';

export type ProviderHealthStatus = 'online' | 'offline' | 'not_configured' | 'not_implemented';

export interface ProviderHealth {
  status: ProviderHealthStatus;
  checkedAt: string;
  message?: string;
}

// Todo resultado de provider é explícito sobre o que aconteceu - nunca um
// valor de sucesso fabricado quando a chamada real falhou. `data` só existe
// quando `status === 'ok'`.
export type ProviderResultStatus = 'ok' | 'not_found' | 'error' | 'timeout' | 'rate_limited' | 'not_configured';

export interface ProviderResult<T> {
  status: ProviderResultStatus;
  data?: T;
  errorMessage?: string;
  // Proveniência e custo - Wave 6 (Evidence) e Wave 9 (Cost/Cache) vão consumir isso.
  source: string;
  latencyMs: number;
  httpStatus?: number;
}

export interface SearchProvider {
  name: string;
  capabilities: ProviderCapability[];
  configured(): boolean;
  health(): Promise<ProviderHealth>;
}
