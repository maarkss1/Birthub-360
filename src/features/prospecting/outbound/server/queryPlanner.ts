// Wave 3 (CPI) — Query Planner: decide qual provider atende cada requisito do
// Requirement Engine (Wave 2), em qual ordem e com qual custo estimado.
//
// Pergunta principal do pacote CPI: "Qual fonte consegue provar este requisito?"
// Regra central desta wave: se nenhum provider integrado hoje consegue provar
// um critério, isso precisa ser marcado explicitamente como `unsupported` ou
// `requires_enrichment` — nunca fingir silenciosamente que o filtro foi aplicado
// (é exatamente esse silêncio que fazia segment/employee_count/annual_revenue
// parecerem "confirmados" antes da Wave 2).
//
// Wave 4 (CPI) — Provider Registry: a decisão "existe algum provider capaz
// disto?" agora consulta o catálogo real (server/providerRegistry.ts) por
// capacidade, em vez de uma lista de critérios hardcoded aqui. Objetivo do
// próprio pacote: "Nenhuma regra de negócio deve depender diretamente de
// 'Apollo'. A aplicação depende de capacidades."

import type { Requirement } from './requirementEngine';
import type { ProviderCapability } from './search/providers/types';
import { getProvidersByCapability } from './providerRegistry';

export type ProviderId = 'google_places' | 'cnpj_receita_federal' | 'apollo' | 'hunter';

export type EstimatedCost = 'free' | 'low' | 'medium' | 'high';

export interface PlanStep {
  id: string;
  provider: ProviderId;
  operation: string;
  inputs: string[];
  outputs: string[];
  estimatedCost: EstimatedCost;
  priority: number;
  dependsOn: string[];
  retryPolicy: { maxRetries: number };
  fallbackProviders: ProviderId[];
  stopCondition: string;
}

export type UnsupportedReasonStatus = 'unsupported' | 'requires_enrichment';

export interface UnsupportedCriterion {
  criterion: string;
  status: UnsupportedReasonStatus;
  reason: string;
}

export interface SearchPlan {
  steps: PlanStep[];
  unsupportedCriteria: UnsupportedCriterion[];
}

interface PlannerContext {
  googlePlacesConfigured: boolean;
  apolloConfigured: boolean;
}

// Mapa critério → capacidade que o confirmaria (não → provider específico).
// Um critério sem entrada aqui simplesmente não tem nenhum caminho de
// confirmação modelado ainda.
const CRITERION_CAPABILITY: Partial<Record<string, ProviderCapability>> = {
  segment: 'company_cnae_lookup',
  region: 'company_location_lookup',
  city: 'company_location_lookup',
  companyType: 'company_type_enrich',
  employeeCount: 'company_size_enrich',
  annualRevenue: 'company_revenue_enrich',
  decisionMakerRole: 'people_search'
};

/**
 * Monta o plano de busca para os requisitos do SearchIntent (via Requirement
 * Engine). Cada critério vira: um PlanStep (há um provider capaz e configurado
 * nesta execução), um UnsupportedCriterion com status "unsupported" (nenhum
 * provider no registry declara a capacidade que provaria isto) ou
 * "requires_enrichment" (um provider capaz existe no registry, mas não está
 * configurado/disponível nesta requisição específica).
 */
export function planSearch(requirements: Requirement[], ctx: PlannerContext): SearchPlan {
  const steps: PlanStep[] = [];
  const unsupportedCriteria: UnsupportedCriterion[] = [];
  const criteria = new Set(requirements.map(r => r.criterion));

  // 1. Descoberta da empresa (sempre necessária, independente dos requisitos
  // específicos pedidos - é a entrada de todo o pipeline).
  const discoveryProviders = getProvidersByCapability('company_discovery');
  if (discoveryProviders.length > 0 && ctx.googlePlacesConfigured) {
    steps.push({
      id: 'discover-places',
      provider: 'google_places',
      operation: 'text_search',
      inputs: ['freeTextQuery'],
      outputs: ['name', 'address', 'phone', 'website', 'rating'],
      estimatedCost: 'low',
      priority: 1,
      dependsOn: [],
      retryPolicy: { maxRetries: 0 },
      fallbackProviders: [],
      stopCondition: 'zero resultados novos após excluir leads já prospectados'
    });
  } else {
    unsupportedCriteria.push({
      criterion: 'discovery',
      status: discoveryProviders.length > 0 ? 'requires_enrichment' : 'unsupported',
      reason: discoveryProviders.length > 0
        ? 'Google Places (único provider de descoberta no registry) não está configurado nesta execução.'
        : 'Nenhum provider no registry declara a capacidade "company_discovery".'
    });
  }

  // 2. segment / region / city → confirmados via CNPJ oficial (CNAE/UF/município).
  for (const criterion of ['segment', 'region', 'city']) {
    if (!criteria.has(criterion)) continue;
    const capability = CRITERION_CAPABILITY[criterion]!;
    const capableProviders = getProvidersByCapability(capability);
    if (capableProviders.length === 0) {
      unsupportedCriteria.push({
        criterion,
        status: 'unsupported',
        reason: `Nenhum provider no registry declara a capacidade "${capability}".`
      });
      continue;
    }
    steps.push({
      id: `confirm-${criterion}-cnpj`,
      provider: 'cnpj_receita_federal',
      operation: 'lookup_cnpj',
      inputs: ['cnpj_or_known_carrier_name'],
      outputs: criterion === 'segment' ? ['cnae_fiscal_descricao'] : criterion === 'region' ? ['uf'] : ['municipio'],
      estimatedCost: 'free',
      priority: 2,
      dependsOn: ctx.googlePlacesConfigured ? ['discover-places'] : [],
      retryPolicy: { maxRetries: 1 },
      fallbackProviders: [],
      stopCondition: 'CNPJ desconhecido ou nenhuma fonte pública (BrasilAPI/Minha Receita) responde'
    });
  }

  // 3. companyType / employeeCount / annualRevenue → nenhum provider no
  // registry declara essas capacidades hoje (são faixas que nenhuma
  // integração atual confirma por empresa específica).
  for (const criterion of ['companyType', 'employeeCount', 'annualRevenue']) {
    if (!criteria.has(criterion)) continue;
    const capability = CRITERION_CAPABILITY[criterion]!;
    const capableProviders = getProvidersByCapability(capability);
    unsupportedCriteria.push({
      criterion,
      status: capableProviders.length > 0 ? 'requires_enrichment' : 'unsupported',
      reason: capableProviders.length > 0
        ? `Um provider capaz de "${capability}" existe no registry, mas não está configurado nesta execução.`
        : `Nenhum provider no registry declara a capacidade "${capability}".`
    });
  }

  // 4. decisionMakerRole → Apollo (principal), Hunter como complemento de e-mail
  // (exatamente o exemplo do pacote CPI: Apollo busca a pessoa, Hunter só
  // verifica/descobre e-mail, não descobre o decisor com a mesma precisão).
  // Wave 4 (CPI, follow-up) - Hunter agora tem adapter formal com capacidade
  // "email_verify" declarada no registry: o passo hunter-email-verify só é
  // sugerido quando algum provider realmente declara essa capacidade, em vez
  // de assumir "hunter" hardcoded (mesmo objetivo do próprio pacote CPI:
  // depender de capacidade, não do nome do provider).
  if (criteria.has('decisionMakerRole')) {
    const peopleSearchProviders = getProvidersByCapability('people_search');
    const emailVerifyProviders = getProvidersByCapability('email_verify');
    if (peopleSearchProviders.length > 0 && ctx.apolloConfigured) {
      steps.push({
        id: 'apollo-people-search',
        provider: 'apollo',
        operation: 'people_search',
        inputs: ['domain', 'decisionMakerRole'],
        outputs: ['decision_maker_name', 'decision_maker_title', 'decision_maker_email', 'decision_maker_linkedin'],
        estimatedCost: 'medium',
        priority: 3,
        dependsOn: ctx.googlePlacesConfigured ? ['discover-places'] : [],
        retryPolicy: { maxRetries: 0 },
        fallbackProviders: emailVerifyProviders.map(p => p.name as ProviderId),
        stopCondition: 'nenhuma pessoa retornada pela busca'
      });
      if (emailVerifyProviders.length > 0) {
        steps.push({
          id: 'hunter-email-verify',
          provider: 'hunter',
          operation: 'email_verify',
          inputs: ['decision_maker_email'],
          outputs: ['email_verification_status'],
          estimatedCost: 'low',
          priority: 4,
          dependsOn: ['apollo-people-search'],
          retryPolicy: { maxRetries: 0 },
          fallbackProviders: [],
          stopCondition: 'nenhum e-mail encontrado pela Apollo para verificar'
        });
      }
    } else {
      unsupportedCriteria.push({
        criterion: 'decisionMakerRole',
        status: peopleSearchProviders.length > 0 ? 'requires_enrichment' : 'unsupported',
        reason: peopleSearchProviders.length > 0
          ? 'Apollo (único provider de "people_search" no registry) não está configurado nesta execução.'
          : 'Nenhum provider no registry declara a capacidade "people_search".'
      });
    }
  }

  return { steps: steps.sort((a, b) => a.priority - b.priority), unsupportedCriteria };
}
