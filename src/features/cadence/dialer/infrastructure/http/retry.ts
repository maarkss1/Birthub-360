export interface RetryOptions {
  /** Número total de tentativas (incluindo a primeira). */
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  isRetryable: (error: unknown) => boolean;
  /** Injetável nos testes para não depender de tempo real. */
  sleep?: (ms: number) => Promise<void>;
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Executa `operation`, tentando novamente com backoff exponencial + jitter
 * quando `isRetryable(error)` for true. Repassa o erro sem esperar quando
 * a última tentativa falhar ou o erro não for considerado transitório.
 */
export async function withRetry<T>(operation: () => Promise<T>, options: RetryOptions): Promise<T> {
  const sleep = options.sleep ?? defaultSleep;
  let attempt = 0;

  for (;;) {
    try {
      return await operation();
    } catch (error: any) {
      attempt += 1;
      if (attempt >= options.maxAttempts || !options.isRetryable(error)) {
        throw error;
      }

      const exponential = options.baseDelayMs * 2 ** (attempt - 1);
      const cappedDelay = Math.min(options.maxDelayMs, exponential);
      const withJitter = cappedDelay * (0.5 + Math.random() * 0.5);
      await sleep(withJitter);
    }
  }
}

/** `fetch` lança `TypeError` para falhas de rede (DNS, conexão recusada, etc). */
export function isNetworkError(error: unknown): boolean {
  return error instanceof TypeError;
}
