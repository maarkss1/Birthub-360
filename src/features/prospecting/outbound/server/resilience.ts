// Wave 9 (CPI) — Cost, Cache e Resiliência.
//
// Objetivo do próprio pacote CPI: controlar custo, estabilidade e consumo de
// APIs, sem NUNCA deixar cache/retry/circuit breaker/budget virar um caminho
// de fabricação de dado. A regra central desta wave (e do projeto inteiro,
// desde a Wave 0) é:
//
//   Provider A falhou → Provider B (fallback real).
//   NUNCA Provider A falhou → inventar dado.
//
// Tudo aqui é infraestrutura em memória (por processo) — não depende de
// schema novo no Postgres (que não é versionado neste repositório, ver
// docs/CPI_BACKLOG.md). server/routes.ts é quem compõe estas peças com a
// lógica de negócio (chaves de cache por CNPJ/domínio, orçamento por
// execução de /prospect, fallback Apollo → Hunter).

import type { ProviderResult, ProviderResultStatus } from './search/providers/types.js';

// ---------------------------------------------------------------------------
// 1. Cache TTL em memória
// ---------------------------------------------------------------------------
// Cache de RESPOSTA DE REDE (evitar rechamar um provider) — conceito distinto
// do TTL de EVIDÊNCIA/NEGÓCIO em server/evidence.ts (que decide até quando um
// valor já persistido é considerado válido para exibição/scoring). Aqui só
// evitamos uma segunda chamada idêntica a um provider dentro da janela.

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const cacheStore = new Map<string, CacheEntry<unknown>>();

// TTL diferenciado por tipo de dado, seguindo o padrão do próprio pacote CPI
// ("CNPJ/razão social → longo", "cargo executivo/e-mail → médio",
// "notícia/signal → curto"). Hoje só CNPJ (LONG_CADASTRAL) e Apollo
// (MEDIUM_CONTACT) têm um provider real integrado; SHORT_SIGNAL já existe
// para o caso "sem resposta útil ainda" (não bloquear novas tentativas por
// muito tempo) e para quando uma wave futura (ex: Wave 13 — sinais/notícias)
// precisar de um TTL curto.
export const CACHE_TTL_MS = {
  LONG_CADASTRAL: 7 * 24 * 60 * 60 * 1000, // 7 dias — CNPJ/razão social/CNAE oficiais
  MEDIUM_CONTACT: 6 * 60 * 60 * 1000, // 6 horas — cargo executivo / e-mail (Apollo)
  SHORT_SIGNAL: 15 * 60 * 1000 // 15 minutos — notícia/sinal, ou lookup sem resposta útil ainda
} as const;

/** Existe uma entrada de cache válida (não expirada) para esta chave agora? */
export function hasFreshCacheEntry(key: string): boolean {
  const hit = cacheStore.get(key);
  return Boolean(hit && hit.expiresAt > Date.now());
}

export function clearResilienceCache(): void {
  cacheStore.clear();
}

export function resilienceCacheSize(): number {
  return cacheStore.size;
}

/**
 * Executa `fn()` só se não houver um valor em cache ainda válido para `key`.
 * `ttl` pode ser um número fixo (ms) ou uma função do próprio resultado — útil
 * quando o TTL depende de o resultado ter vindo completo ou não (ex: CNPJ
 * localizado vs. não localizado ainda). `shouldCache` decide se o resultado
 * chega a ser guardado (por padrão, sempre); um resultado que não deve ser
 * cacheado (ex: um erro transitório que já foi tratado por retry/circuit
 * breaker antes de chegar aqui) simplesmente não é persistido no Map.
 */
export async function withCache<T>(
  key: string,
  ttl: number | ((value: T) => number),
  fn: () => Promise<T>,
  shouldCache: (value: T) => boolean = () => true
): Promise<T> {
  const now = Date.now();
  const hit = cacheStore.get(key);
  if (hit && hit.expiresAt > now) {
    return hit.value as T;
  }

  const value = await fn();

  if (shouldCache(value)) {
    const ttlMs = typeof ttl === 'function' ? ttl(value) : ttl;
    cacheStore.set(key, { value, expiresAt: now + ttlMs });
  } else {
    cacheStore.delete(key);
  }

  return value;
}

// ---------------------------------------------------------------------------
// 2. Retry com exponential backoff + jitter
// ---------------------------------------------------------------------------
// REGRA ANTI-FABRICAÇÃO aplicada ao retry: só reexecuta a chamada real ao
// provider (nunca substitui por um valor inventado). 'not_found' e
// 'not_configured' são estados DEFINITIVOS (o provider respondeu com
// clareza, ou nem está configurado) — tentar de novo não muda o resultado e
// só desperdiça tempo/créditos. Só 'timeout'/'rate_limited'/'error' são
// tratados como transitórios.

const RETRYABLE_PROVIDER_STATUSES: ReadonlySet<ProviderResultStatus> = new Set([
  'timeout',
  'rate_limited',
  'error'
]);

export function isRetryableProviderStatus(status: ProviderResultStatus): boolean {
  return RETRYABLE_PROVIDER_STATUSES.has(status);
}

export interface RetryOptions {
  maxRetries?: number; // tentativas EXTRAS após a primeira (default 2 → até 3 tentativas no total)
  baseDelayMs?: number;
  maxDelayMs?: number;
  sleep?: (ms: number) => Promise<void>; // injetável para testes rápidos (sem esperar de verdade)
}

const realSleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

/**
 * Reexecuta `fn()` enquanto `isRetryable(resultado)` for verdadeiro, até
 * `maxRetries` tentativas extras, com backoff exponencial + jitter entre
 * elas. Genérico o suficiente para qualquer resultado com um `status` —
 * `withProviderRetry` abaixo é o atalho para `ProviderResult` (Wave 4).
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  isRetryable: (result: T) => boolean,
  opts: RetryOptions = {}
): Promise<T> {
  const maxRetries = opts.maxRetries ?? 2;
  const baseDelayMs = opts.baseDelayMs ?? 200;
  const maxDelayMs = opts.maxDelayMs ?? 2000;
  const sleep = opts.sleep ?? realSleep;

  let attempt = 0;
  let result = await fn();

  while (attempt < maxRetries && isRetryable(result)) {
    const backoff = Math.min(maxDelayMs, baseDelayMs * 2 ** attempt);
    // Jitter: entre 50% e 100% do backoff calculado — evita que várias
    // chamadas falhando ao mesmo tempo reentrem em sincronia (thundering herd).
    const delay = backoff * (0.5 + Math.random() * 0.5);
    await sleep(delay);
    attempt++;
    result = await fn();
  }

  return result;
}

/** Atalho de `withRetry` para funções que devolvem `ProviderResult` (Wave 4). */
export async function withProviderRetry<T>(
  fn: () => Promise<ProviderResult<T>>,
  opts: RetryOptions = {}
): Promise<ProviderResult<T>> {
  return withRetry(fn, result => isRetryableProviderStatus(result.status), opts);
}

// ---------------------------------------------------------------------------
// 3. Circuit breaker por provider
// ---------------------------------------------------------------------------
// Depois de N falhas transitórias CONSECUTIVAS (janela lógica: contagem só
// zera com um sucesso ou um estado definitivo), o circuito abre e passa a
// devolver `buildTrippedResult()` sem sequer chamar `fn` — evita gastar
// tempo/créditos tentando um provider que está claramente fora do ar. Depois
// do cooldown, entra em half-open: UMA chamada real de teste (probe); se ela
// também falhar, reabre; se suceder, fecha e zera o contador.
//
// NUNCA fabrica um valor de sucesso quando o circuito está aberto —
// `buildTrippedResult` é responsabilidade do chamador e deve devolver um
// estado "provider indisponível agora" (equivalente a 'error'), nunca um
// dado inventado.

export type CircuitState = 'closed' | 'open' | 'half_open';

interface Circuit {
  state: CircuitState;
  consecutiveFailures: number;
  openedAt?: number;
}

const circuits = new Map<string, Circuit>();

function getOrCreateCircuit(provider: string): Circuit {
  let circuit = circuits.get(provider);
  if (!circuit) {
    circuit = { state: 'closed', consecutiveFailures: 0 };
    circuits.set(provider, circuit);
  }
  return circuit;
}

export function getCircuitState(provider: string): CircuitState {
  return getOrCreateCircuit(provider).state;
}

export function resetCircuit(provider: string): void {
  circuits.set(provider, { state: 'closed', consecutiveFailures: 0 });
}

export function resetAllCircuits(): void {
  circuits.clear();
}

export interface CircuitBreakerOptions {
  failureThreshold?: number; // default: 3 falhas transitórias consecutivas
  cooldownMs?: number; // default: 30s
}

export interface CircuitBreakerOutcome<T> {
  result: T;
  circuitState: CircuitState;
  tripped: boolean; // true = circuito estava aberto; `fn` nem chegou a ser chamada
}

export async function withCircuitBreaker<T>(
  provider: string,
  fn: () => Promise<T>,
  buildTrippedResult: () => T,
  isFailure: (result: T) => boolean,
  opts: CircuitBreakerOptions = {}
): Promise<CircuitBreakerOutcome<T>> {
  const failureThreshold = opts.failureThreshold ?? 3;
  const cooldownMs = opts.cooldownMs ?? 30_000;
  const circuit = getOrCreateCircuit(provider);
  const now = Date.now();

  if (circuit.state === 'open') {
    if (circuit.openedAt !== undefined && now - circuit.openedAt >= cooldownMs) {
      circuit.state = 'half_open';
    } else {
      return { result: buildTrippedResult(), circuitState: 'open', tripped: true };
    }
  }

  const result = await fn();

  if (isFailure(result)) {
    circuit.consecutiveFailures++;
    // Em half-open, uma única falha do probe já reabre o circuito.
    if (circuit.state === 'half_open' || circuit.consecutiveFailures >= failureThreshold) {
      circuit.state = 'open';
      circuit.openedAt = now;
    }
  } else {
    circuit.state = 'closed';
    circuit.consecutiveFailures = 0;
    circuit.openedAt = undefined;
  }

  return { result, circuitState: circuit.state, tripped: false };
}

/**
 * Atalho de `withCircuitBreaker` para `ProviderResult`: o "resultado" de um
 * circuito aberto é sempre `status: 'error'` com uma mensagem explícita
 * (nunca `status: 'ok'` fabricado) — o restante do pipeline já sabe tratar
 * `error` sem inventar dado (regra desde a Wave 4).
 */
export async function withProviderCircuitBreaker<T>(
  provider: string,
  fn: () => Promise<ProviderResult<T>>,
  opts: CircuitBreakerOptions = {}
): Promise<ProviderResult<T>> {
  const { result } = await withCircuitBreaker<ProviderResult<T>>(
    provider,
    fn,
    () => ({
      status: 'error',
      source: provider,
      latencyMs: 0,
      errorMessage: `Circuito aberto para "${provider}" — falhas consecutivas recentes; chamada evitada durante o cooldown.`
    }),
    result => isRetryableProviderStatus(result.status),
    opts
  );
  return result;
}

// ---------------------------------------------------------------------------
// 4. Budget (request budget / credit budget / enrichment budget)
// ---------------------------------------------------------------------------
// Exemplo do próprio pacote CPI:
//   { "maxApiCalls": 100, "maxPaidCredits": 500, "maxEnrichments": 200 }
//
// Quando o orçamento de enriquecimento acaba, o pipeline PARA de chamar
// providers pagos (Apollo) — os leads restantes ficam sem decisor
// (`decision_makers: []`), que já é um estado válido e testado desde a
// Wave 0. Nunca inventamos um decisor para "aproveitar" um lead que ficou
// sem orçamento.

export interface SearchBudget {
  maxApiCalls: number;
  maxPaidCredits: number;
  maxEnrichments: number;
}

export const DEFAULT_SEARCH_BUDGET: SearchBudget = {
  maxApiCalls: 100,
  maxPaidCredits: 500,
  maxEnrichments: 200
};

export interface BudgetUsage {
  apiCalls: number;
  paidCredits: number;
  enrichments: number;
}

export interface BudgetTracker {
  budget: SearchBudget;
  used: BudgetUsage;
}

export function createBudgetTracker(overrides?: Partial<SearchBudget>): BudgetTracker {
  return {
    budget: { ...DEFAULT_SEARCH_BUDGET, ...(overrides || {}) },
    used: { apiCalls: 0, paidCredits: 0, enrichments: 0 }
  };
}

/** Ainda há orçamento para mais uma chamada de enriquecimento (Apollo)? */
export function hasEnrichmentBudget(tracker: BudgetTracker): boolean {
  return (
    tracker.used.enrichments < tracker.budget.maxEnrichments &&
    tracker.used.apiCalls < tracker.budget.maxApiCalls &&
    tracker.used.paidCredits < tracker.budget.maxPaidCredits
  );
}

export function isBudgetExhausted(tracker: BudgetTracker): boolean {
  return !hasEnrichmentBudget(tracker);
}

/** Registra uma chamada de API "comum" (ex: consulta de CNPJ, gratuita). */
export function recordApiCall(tracker: BudgetTracker, cost: { paidCredits?: number } = {}): void {
  tracker.used.apiCalls += 1;
  tracker.used.paidCredits += cost.paidCredits ?? 0;
}

/** Registra uma operação de enriquecimento (ex: Apollo) — paga por definição. */
export function recordEnrichment(tracker: BudgetTracker, cost: { apiCalls?: number; paidCredits?: number } = {}): void {
  tracker.used.enrichments += 1;
  tracker.used.apiCalls += cost.apiCalls ?? 1;
  tracker.used.paidCredits += cost.paidCredits ?? 0;
}

/**
 * Lê um `budget` opcional do corpo da requisição (`POST /prospect`). Ignora
 * silenciosamente valores ausentes/inválidos (mantém o default daquele
 * campo) em vez de rejeitar a requisição — orçamento é uma proteção de
 * custo, não uma validação de negócio.
 */
export function parseSearchBudget(input: unknown): Partial<SearchBudget> | undefined {
  if (!input || typeof input !== 'object') return undefined;
  const raw = input as Record<string, unknown>;
  const out: Partial<SearchBudget> = {};

  for (const field of ['maxApiCalls', 'maxPaidCredits', 'maxEnrichments'] as const) {
    const value = raw[field];
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
      out[field] = Math.floor(value);
    }
  }

  return Object.keys(out).length > 0 ? out : undefined;
}
