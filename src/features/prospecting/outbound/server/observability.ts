// Wave 10 (CPI) — Observabilidade: tornar toda busca auditável.
//
// Pergunta que esta wave precisa responder (pacote CPI): "Por que esta
// empresa apareceu?" — mas no nível da BUSCA inteira, não só de um campo de
// um lead (isso já é a Wave 6 — Evidence, via GET /leads/:id/evidence).
//
// O que este módulo faz:
// - Gera um Search-ID por execução de /prospect (crypto.randomUUID(), já
//   disponível no Node — nenhuma dependência nova).
// - Registra, por Search-ID: o pedido original, o SearchIntent e o
//   SearchPlan já montados pelo pipeline (Waves 1 e 3), os passos do
//   pipeline (SearchStep), cada chamada real a um provider (ProviderCallLog
//   — reaproveitando o ProviderResult que os adapters da Wave 4 já
//   devolvem com status/latencyMs/source) e, por candidato encontrado, se
//   foi incluído no resultado final ou descartado e por qual motivo
//   (CandidateDecisionLog).
// - Agrega tudo isso num resumo honesto (GET /api/observability/summary):
//   só calcula o que de fato foi registrado. Nenhuma métrica é estimada
//   quando não há dado real para calculá-la (ex: custo por busca — depende
//   da Wave 9, Cost/Cache, que pode não estar mesclada ainda; o campo fica
//   `null` em vez de um número inventado).
//
// Decisão de armazenamento: em memória (Map por searchId), sem persistência
// no Postgres nesta wave. Isso é uma decisão deliberada, não uma lacuna
// esquecida — ver "Riscos residuais" no docs/CPI_BACKLOG.md (Wave 10):
// o schema do Postgres não é versionado neste repositório (mesma cautela
// desde a Wave 0), e um log de auditoria operacional (por execução de
// processo) é um caso legítimo de armazenamento efêmero — diferente do
// dado de negócio persistido em `field_evidence` (Wave 6). Isso também
// significa: os dados de observabilidade não sobrevivem a um restart do
// processo, e não são compartilhados entre múltiplas instâncias do servidor
// rodando atrás de um load balancer. Documentado, não escondido.

import { randomUUID } from 'crypto';
import type { SearchIntent } from './searchIntent.js';
import type { SearchPlan } from './queryPlanner.js';
import type { ProviderResultStatus } from './search/providers/types.js';

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

// Nomes de fase do pipeline (nível de execução inteira, não por candidato -
// isso já é o CandidateDecisionLog). Só os nomes de fato emitidos por
// /prospect estão listados aqui - ver server/routes.ts.
export type SearchStepName =
  | 'search_intent_validated'
  | 'discovery'
  | 'query_planned'
  | 'enrichment_loop'
  | 'persistence';

export type SearchStepStatus = 'ok' | 'error' | 'in_progress';

export interface SearchStep {
  name: SearchStepName;
  startedAt: string;
  finishedAt?: string;
  status: SearchStepStatus;
  detail?: string;
}

// Reaproveita o vocabulário de status que os adapters da Wave 4 já produzem
// (ProviderResult) — mais 'skipped', para uma chamada que nem chegou a
// acontecer (ex: CNPJ desconhecido, nenhuma consulta feita). Nunca se
// registra um ProviderCallLog para uma chamada que não ocorreu de verdade;
// 'skipped' só existe para os poucos casos em que vale registrar
// explicitamente "isto foi propositalmente pulado", não para preencher
// lacuna de dado que não existe.
export type ProviderCallStatus = ProviderResultStatus | 'skipped';

export interface ProviderCallLog {
  provider: string;
  operation: string;
  status: ProviderCallStatus;
  latencyMs?: number;
  httpStatus?: number;
  source?: string;
  errorMessage?: string;
  timestamp: string;
  leadName?: string;
}

export type CandidateDecision = 'included' | 'discarded';

// Motivos honestos: só os que o pipeline hoje de fato produz. Nenhum motivo
// é gerado "por completude" se o pipeline não passa por aquele caminho.
export type CandidateDecisionReasonCode =
  | 'included'
  | 'duplicate_pre_cnpj_domain_or_name'
  | 'duplicate_cnpj'
  | 'exceeds_requested_limit'
  | 'hard_filter_unmatched';

export interface CandidateDecisionLog {
  name: string;
  domain?: string;
  cnpj?: string;
  decision: CandidateDecision;
  reasonCode: CandidateDecisionReasonCode;
  reason: string;
  leadId?: string;
  matchedExistingLeadId?: string;
  // Requisitos HARD_FILTER que não corresponderam ao observado, mesmo quando
  // o lead foi incluído (o pipeline hoje não exclui automaticamente por
  // isso — ver Wave 2/CPI_BACKLOG.md — mas a discrepância fica visível aqui,
  // em vez de escondida atrás de um "included" sem contexto).
  unmatchedHardFilters?: string[];
  timestamp: string;
}

export type SearchRunStatus = 'running' | 'completed' | 'failed';

export interface SearchRunRequest {
  query?: string;
  segment?: string;
  region?: string;
  city?: string;
  companyType?: string;
  employeeCount?: string;
  annualRevenue?: string;
  decisionMakerRole?: string;
  company?: 'atlas' | 'totaltrac';
  limit?: number;
}

export interface SearchRunResultSummary {
  candidatesFound: number;
  included: number;
  discarded: number;
}

export interface SearchRun {
  searchId: string;
  startedAt: string;
  finishedAt?: string;
  status: SearchRunStatus;
  request: SearchRunRequest;
  searchIntent?: SearchIntent;
  searchPlan?: SearchPlan;
  steps: SearchStep[];
  providerCalls: ProviderCallLog[];
  candidateDecisions: CandidateDecisionLog[];
  resultSummary?: SearchRunResultSummary;
  // Custo real por busca depende de a Wave 9 (Cost/Cache/Resiliência) estar
  // mesclada e alimentar este campo. Enquanto isso não existir, `null` é a
  // resposta honesta — nunca um número estimado sem uma fonte real por trás.
  costSummary: null;
  error?: string;
}

// ---------------------------------------------------------------------------
// Armazenamento em memória (Map por searchId, retenção das últimas N buscas)
// ---------------------------------------------------------------------------

const MAX_RETAINED_SEARCH_RUNS = 200;

// Map preserva ordem de inserção — usado para descartar a busca mais antiga
// quando o limite de retenção é excedido (FIFO), sem depender de timestamp.
const searchRuns = new Map<string, SearchRun>();

function evictOldestIfNeeded(): void {
  while (searchRuns.size > MAX_RETAINED_SEARCH_RUNS) {
    const oldestKey = searchRuns.keys().next().value;
    if (oldestKey === undefined) break;
    searchRuns.delete(oldestKey);
  }
}

/** Gera um Search-ID único por execução de busca. */
export function createSearchId(): string {
  return randomUUID();
}

/**
 * Cria e registra um novo SearchRun no armazenamento em memória. Deve ser
 * chamado no início do handler de /prospect, antes de qualquer chamada a
 * provider — para que toda a execução, do início ao fim, fique auditável
 * sob o mesmo Search-ID.
 */
export function startSearchRun(params: {
  searchId?: string;
  request: SearchRunRequest;
  searchIntent?: SearchIntent;
}): SearchRun {
  const searchId = params.searchId || createSearchId();
  const run: SearchRun = {
    searchId,
    startedAt: new Date().toISOString(),
    status: 'running',
    request: params.request,
    searchIntent: params.searchIntent,
    steps: [],
    providerCalls: [],
    candidateDecisions: [],
    costSummary: null
  };
  searchRuns.set(searchId, run);
  evictOldestIfNeeded();
  return run;
}

/** Anexa o SearchPlan (Wave 3) assim que ele for montado. */
export function attachSearchPlan(searchId: string, plan: SearchPlan): void {
  const run = searchRuns.get(searchId);
  if (!run) return;
  run.searchPlan = plan;
}

/** Inicia um passo do pipeline e devolve uma função para concluí-lo. */
export function recordStep(searchId: string, name: SearchStepName, detail?: string): (result: { status: SearchStepStatus; detail?: string }) => void {
  const run = searchRuns.get(searchId);
  const step: SearchStep = {
    name,
    startedAt: new Date().toISOString(),
    status: 'in_progress',
    detail
  };
  if (run) run.steps.push(step);

  return (result: { status: SearchStepStatus; detail?: string }) => {
    step.finishedAt = new Date().toISOString();
    step.status = result.status;
    if (result.detail) step.detail = result.detail;
  };
}

/** Registra uma chamada real a um provider (nunca uma chamada hipotética/pulada silenciosamente). */
export function recordProviderCall(searchId: string, log: Omit<ProviderCallLog, 'timestamp'>): void {
  const run = searchRuns.get(searchId);
  if (!run) return;
  run.providerCalls.push({ ...log, timestamp: new Date().toISOString() });
}

/** Registra a decisão (incluído/descartado) para um candidato a lead. */
export function recordCandidateDecision(searchId: string, log: Omit<CandidateDecisionLog, 'timestamp'>): void {
  const run = searchRuns.get(searchId);
  if (!run) return;
  run.candidateDecisions.push({ ...log, timestamp: new Date().toISOString() });
}

/** Marca o SearchRun como concluído (sucesso ou falha) e calcula o resumo a partir do que foi de fato registrado. */
export function finishSearchRun(searchId: string, status: Exclude<SearchRunStatus, 'running'>, error?: string): void {
  const run = searchRuns.get(searchId);
  if (!run) return;
  run.status = status;
  run.finishedAt = new Date().toISOString();
  if (error) run.error = error;
  run.resultSummary = {
    candidatesFound: run.candidateDecisions.length,
    included: run.candidateDecisions.filter(d => d.decision === 'included').length,
    discarded: run.candidateDecisions.filter(d => d.decision === 'discarded').length
  };
}

/** GET /api/search-runs/:searchId — "por que esta empresa apareceu (ou não) nesta busca?" */
export function getSearchRun(searchId: string): SearchRun | undefined {
  return searchRuns.get(searchId);
}

/** Usado só pelo agregador de summary / testes — não exposto como rota própria. */
export function listSearchRuns(): SearchRun[] {
  return Array.from(searchRuns.values());
}

/** Apenas para testes: limpa o armazenamento em memória entre casos. */
export function resetSearchRunsForTests(): void {
  searchRuns.clear();
}

// ---------------------------------------------------------------------------
// Agregação (GET /api/observability/summary)
// ---------------------------------------------------------------------------

export interface ProviderSummary {
  provider: string;
  totalCalls: number;
  errorCalls: number;
  errorRate: number;
  // null quando nenhuma chamada registrada tinha latencyMs (nunca um valor inventado).
  avgLatencyMs: number | null;
  statusBreakdown: Record<string, number>;
}

export interface DiscardReasonSummary {
  reasonCode: CandidateDecisionReasonCode;
  count: number;
}

export interface ObservabilitySummary {
  totalSearches: number;
  completedSearches: number;
  failedSearches: number;
  runningSearches: number;
  // null quando totalSearches === 0 (sem busca nenhuma para calcular taxa).
  successRate: number | null;
  totalProviderCalls: number;
  providers: ProviderSummary[];
  totalCandidatesEvaluated: number;
  totalIncluded: number;
  totalDiscarded: number;
  discardReasons: DiscardReasonSummary[];
  // Ambos dependem de dado que este repositório ainda não produz de forma real
  // nesta wave (cache: Wave 9; custo: Wave 9) — nunca estimados.
  cacheHitRate: null;
  averageCostPerSearch: null;
}

/**
 * Função pura: agrega um `ObservabilitySummary` a partir de uma lista de
 * `SearchRun` (usada tanto pela rota real, com `listSearchRuns()`, quanto
 * pelos testes, com um conjunto sintético — não depende do armazenamento em
 * memória do módulo).
 */
export function computeObservabilitySummary(runs: SearchRun[]): ObservabilitySummary {
  const completedSearches = runs.filter(r => r.status === 'completed').length;
  const failedSearches = runs.filter(r => r.status === 'failed').length;
  const runningSearches = runs.filter(r => r.status === 'running').length;
  const finished = completedSearches + failedSearches;

  const allProviderCalls = runs.flatMap(r => r.providerCalls);
  const byProvider = new Map<string, ProviderCallLog[]>();
  for (const call of allProviderCalls) {
    const list = byProvider.get(call.provider) || [];
    list.push(call);
    byProvider.set(call.provider, list);
  }

  const providers: ProviderSummary[] = Array.from(byProvider.entries())
    .map(([provider, calls]) => {
      const errorCalls = calls.filter(c => c.status === 'error' || c.status === 'timeout' || c.status === 'rate_limited').length;
      const latencies = calls.map(c => c.latencyMs).filter((v): v is number => typeof v === 'number');
      const statusBreakdown: Record<string, number> = {};
      for (const c of calls) {
        statusBreakdown[c.status] = (statusBreakdown[c.status] || 0) + 1;
      }
      return {
        provider,
        totalCalls: calls.length,
        errorCalls,
        errorRate: calls.length > 0 ? errorCalls / calls.length : 0,
        avgLatencyMs: latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : null,
        statusBreakdown
      };
    })
    .sort((a, b) => b.totalCalls - a.totalCalls);

  const allDecisions = runs.flatMap(r => r.candidateDecisions);
  const discarded = allDecisions.filter(d => d.decision === 'discarded');
  const discardCounts = new Map<CandidateDecisionReasonCode, number>();
  for (const d of discarded) {
    discardCounts.set(d.reasonCode, (discardCounts.get(d.reasonCode) || 0) + 1);
  }
  const discardReasons: DiscardReasonSummary[] = Array.from(discardCounts.entries())
    .map(([reasonCode, count]) => ({ reasonCode, count }))
    .sort((a, b) => b.count - a.count);

  return {
    totalSearches: runs.length,
    completedSearches,
    failedSearches,
    runningSearches,
    successRate: finished > 0 ? completedSearches / finished : null,
    totalProviderCalls: allProviderCalls.length,
    providers,
    totalCandidatesEvaluated: allDecisions.length,
    totalIncluded: allDecisions.filter(d => d.decision === 'included').length,
    totalDiscarded: discarded.length,
    discardReasons,
    cacheHitRate: null,
    averageCostPerSearch: null
  };
}

export function getObservabilitySummary(): ObservabilitySummary {
  return computeObservabilitySummary(listSearchRuns());
}
