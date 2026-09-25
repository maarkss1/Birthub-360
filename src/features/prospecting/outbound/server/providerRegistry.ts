// Wave 4 (CPI) — Provider Registry: catálogo de capacidades dos providers.
// Objetivo do próprio pacote CPI: "Nenhuma regra de negócio deve depender
// diretamente de 'Apollo'. A aplicação depende de capacidades." O Query
// Planner (Wave 3) consulta este registry em vez de um mapa hardcoded.

import type { ProviderCapability, SearchProvider } from './search/providers/types.js';
import { googlePlacesProvider } from './search/providers/googlePlaces.provider.js';
import { apolloProvider } from './search/providers/apollo.provider.js';
import { cnpjOficialProvider } from './search/providers/cnpjOficial.provider.js';
import { hunterProvider } from './search/providers/hunter.provider.js';
import { bitrixProvider } from './search/providers/bitrix.provider.js';

// Providers com adapter formal implementado (Wave 4 + follow-up CPI: Hunter e
// Bitrix formalizados depois da Wave 4 original) - ver server/search/providers/.
const IMPLEMENTED_PROVIDERS: SearchProvider[] = [googlePlacesProvider, apolloProvider, cnpjOficialProvider, hunterProvider, bitrixProvider];

// Demais providers já integrados no código hoje (Bland AI, Ollama, Groq,
// Gemini) ou listados como "atuais" pelo pacote CPI (IBGE), mas que ainda
// chamam fetch() direto de dentro de server/routes.ts / server/ai.ts / do
// frontend (IBGE) em vez de um adapter dedicado. Declarados aqui para o
// registry ser um catálogo verdadeiro (nada fica invisível), mas com
// capacidades vazias e status explícito - NUNCA fingindo suportar uma
// capacidade sem um adapter real por trás dela. Ver
// docs/CPI_BACKLOG.md > "Provider Adapters restantes" para o motivo de cada
// um continuar fora do escopo (voz/IA generativa não são search providers de
// fato; IBGE é chamado do browser, não do servidor).
const DECLARED_NOT_MIGRATED: SearchProvider[] = [
  { name: 'bland_ai', capabilities: [], configured: () => Boolean(process.env.BLAND_AI_API_KEY), health: async () => ({ status: 'not_implemented', checkedAt: new Date().toISOString(), message: 'Chamada de voz, não é um search provider - fora do escopo do registry.' }) },
  { name: 'ollama', capabilities: [], configured: () => true, health: async () => ({ status: 'not_implemented', checkedAt: new Date().toISOString(), message: 'Motor de IA para outreach/dossiê, não um search provider - fora do escopo do registry.' }) },
  { name: 'groq', capabilities: [], configured: () => Boolean(process.env.GROQ_API_KEY), health: async () => ({ status: 'not_implemented', checkedAt: new Date().toISOString(), message: 'Motor de IA para outreach/dossiê, não um search provider - fora do escopo do registry.' }) },
  { name: 'gemini', capabilities: [], configured: () => Boolean(env.GEMINI_API_KEY), health: async () => ({ status: 'not_implemented', checkedAt: new Date().toISOString(), message: 'Motor de IA para outreach/dossiê, não um search provider - fora do escopo do registry.' }) },
  { name: 'ibge', capabilities: [], configured: () => true, health: async () => ({ status: 'not_implemented', checkedAt: new Date().toISOString(), message: 'Chamado direto do browser (src/components/ProspectorTab.tsx) para popular a lista de municípios - nunca passa pelo servidor, então não há integração de servidor para formalizar sem antes mover a chamada para o backend.' }) }
];

// Wave 13 (CPI, Signals & Intent — server/signals.ts): fontes que o pacote
// pede para detectar sinais de compra (news/search provider, vagas, base de
// M&A/investimento, mudança executiva) mas que NENHUMA integração deste
// repositório cobre hoje - nem mesmo com fetch() direto como os providers
// acima. Diferente de DECLARED_NOT_MIGRATED (que têm uma variável de
// ambiente e uma integração real, só não um adapter formal), estes não têm
// nenhuma chave de API configurável neste ambiente e nenhuma chamada de rede
// em código nenhum - `configured()` é sempre `false`, honestamente. Só o
// sinal `nova_operacao` (derivado de data_inicio_atividade do CNPJ oficial,
// já um provider IMPLEMENTED acima) é detectado de verdade hoje - ver
// server/signals.ts para a explicação completa do porquê os demais tipos de
// SignalType não são emitidos.
const DECLARED_SIGNAL_PROVIDERS_NOT_IMPLEMENTED: SearchProvider[] = [
  { name: 'news_search_provider', capabilities: ['news_search'], configured: () => false, health: async () => ({ status: 'not_implemented', checkedAt: new Date().toISOString(), message: 'Nenhum provider de busca de notícias configurado neste ambiente - cobriria expansão geográfica, novo contrato, aquisição, investimento, incidente de segurança (ver 13_AGENTE_SIGNALS_INTENT.txt).' }) },
  { name: 'job_board_provider', capabilities: ['job_postings_search'], configured: () => false, health: async () => ({ status: 'not_implemented', checkedAt: new Date().toISOString(), message: 'Nenhum provider de vagas configurado - cobriria vagas de logística e crescimento de headcount.' }) },
  { name: 'executive_change_provider', capabilities: ['executive_change_tracking'], configured: () => false, health: async () => ({ status: 'not_implemented', checkedAt: new Date().toISOString(), message: 'Nenhum tracker de mudança executiva configurado.' }) },
  { name: 'ma_investment_database', capabilities: ['ma_investment_lookup'], configured: () => false, health: async () => ({ status: 'not_implemented', checkedAt: new Date().toISOString(), message: 'Nenhuma base de M&A/investimento configurada - cobriria aquisição, investimento, expansão de CD, aumento de frota, troca de sistema.' }) }
];

export const providerRegistry: SearchProvider[] = [...IMPLEMENTED_PROVIDERS, ...DECLARED_NOT_MIGRATED, ...DECLARED_SIGNAL_PROVIDERS_NOT_IMPLEMENTED];

/** Providers com um adapter real que declara a capacidade pedida. */
export function getProvidersByCapability(capability: ProviderCapability): SearchProvider[] {
  return IMPLEMENTED_PROVIDERS.filter(p => p.capabilities.includes(capability));
}

export function getProvider(name: string): SearchProvider | undefined {
  return providerRegistry.find(p => p.name === name);
}
