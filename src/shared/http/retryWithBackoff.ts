import { logger } from '../../lib/logger.js';

/**
 * Falha classificada como recuperável numa tentativa de chamada externa — `retryWithBackoff`
 * reintenta automaticamente até `maxAttempts`. Qualquer outro erro lançado pela função de tentativa
 * é tratado como definitivo e propaga imediatamente, sem consumir tentativas à toa (mesmo contrato
 * de `TransientBitrixError`/`BitrixDefinitiveError` em `bitrix/service/client.ts`, de onde esta
 * lógica foi extraída para reuso — INTEGRATION-002).
 */
export class TransientHttpError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly retryAfterMsHint?: number,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'TransientHttpError';
  }
}

const DEFAULT_MAX_ATTEMPTS = 4;
const DEFAULT_BASE_BACKOFF_MS = 500;
const DEFAULT_MAX_BACKOFF_MS = 8_000;

/** Backoff exponencial com até 25% de jitter — evita que chamadas concorrentes reintentem no mesmo instante e gerem um pico coordenado contra o mesmo provedor. Mesma fórmula usada por callBitrix. */
export function computeBackoffDelayMs(
  attempt: number,
  baseMs: number = DEFAULT_BASE_BACKOFF_MS,
  maxMs: number = DEFAULT_MAX_BACKOFF_MS,
): number {
  const exp = Math.min(baseMs * 2 ** (attempt - 1), maxMs);
  return exp + Math.random() * exp * 0.25;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Extrai o Retry-After (segundos) de uma resposta 429, quando o provedor o envia. */
export function parseRetryAfterMs(response: Response): number | null {
  const header = response.headers.get('retry-after');
  if (!header) return null;
  const seconds = Number(header);
  return Number.isFinite(seconds) && seconds >= 0 ? seconds * 1000 : null;
}

export interface RetryOptions {
  /** Rótulo curto pros logs (ex.: 'stripe', 'omie', 'slack') — identifica a origem sem precisar de um logger dedicado por integração. */
  label: string;
  maxAttempts?: number;
  baseBackoffMs?: number;
  maxBackoffMs?: number;
  correlationId?: string;
}

/**
 * Orquestra retry com backoff exponencial + jitter para uma chamada externa — extraído de
 * `callBitrix` (bitrix/service/client.ts) para reuso em Stripe/Omie/Slack (INTEGRATION-002).
 *
 * `attemptFn` faz UMA tentativa e classifica o resultado lançando `TransientHttpError` para falha
 * recuperável (rede, timeout, 429, 5xx) — reintentada com backoff — ou qualquer outro erro (ou
 * retornando normalmente) para o caso definitivo/sucesso, que propaga/retorna imediatamente sem
 * consumir tentativas à toa.
 */
export async function retryWithBackoff<T>(
  attemptFn: (attempt: number) => Promise<T>,
  options: RetryOptions,
): Promise<T> {
  const maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  const baseMs = options.baseBackoffMs ?? DEFAULT_BASE_BACKOFF_MS;
  const maxMs = options.maxBackoffMs ?? DEFAULT_MAX_BACKOFF_MS;

  let lastError: TransientHttpError | null = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await attemptFn(attempt);
    } catch (err: any) {
      if (!(err instanceof TransientHttpError)) throw err;
      lastError = err;
      logger.warn(
        {
          label: options.label,
          correlationId: options.correlationId,
          attempt,
          maxAttempts,
          statusCode: err.statusCode,
        },
        `[${options.label}] Falha recuperável — ` +
          (attempt < maxAttempts ? 'retentando' : 'tentativas esgotadas'),
      );
      if (attempt < maxAttempts) {
        await sleep(err.retryAfterMsHint ?? computeBackoffDelayMs(attempt, baseMs, maxMs));
      }
    }
  }
  // maxAttempts sempre >= 1, então lastError nunca é null aqui (o loop só termina sem `return`
  // depois de passar por pelo menos uma iteração do `catch`).
  throw lastError as TransientHttpError;
}
