import { CircuitBreaker } from "../http/CircuitBreaker.js";
import { isNetworkError, withRetry } from "../http/retry.js";

export interface ThreeCxAuthConfig {
  domain: string;
  clientId: string;
  /** Chamada de "API Key" no Admin Console; é o `client_secret` do fluxo OAuth2. */
  apiKey: string;
  /** Timeout em milissegundos para requisições de autenticação (padrão: 10000ms). */
  timeoutMs?: number;
  /** Número total de tentativas em falhas transitórias (padrão: 3). */
  retryMaxAttempts?: number;
  /** Falhas consecutivas até abrir o circuito (padrão: 5). */
  circuitBreakerFailureThreshold?: number;
  /** Tempo de espera com o circuito aberto antes de tentar de novo (padrão: 30000ms). */
  circuitBreakerCooldownMs?: number;
}

function isRetryableHttpStatus(status: number): boolean {
  return status === 429 || (status >= 500 && status <= 599);
}

function isRetryableAuthError(error: unknown): boolean {
  if (isNetworkError(error)) {
    return true;
  }
  return error instanceof ThreeCxAuthError && isRetryableHttpStatus(error.statusCode);
}

interface TokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

/**
 * Troca client_id/client_secret por um Bearer token via
 * `POST https://{domain}/connect/token` (grant_type=client_credentials).
 *
 * Esse endpoint está documentado apenas de forma informal (fóruns oficiais
 * da 3CX e parceiros), não no manual público principal — a própria 3CX
 * afirma não dar suporte formal a integrações via essa API. Teste contra o
 * seu PBX antes de confiar cegamente neste cliente em produção.
 *
 * O token é cacheado em memória e renovado um pouco antes de expirar.
 */
export class ThreeCxAuthClient {
  private cachedToken: { value: string; expiresAt: number } | null = null;
  private readonly timeoutMs: number;
  private readonly retryMaxAttempts: number;
  private readonly circuitBreaker: CircuitBreaker;

  constructor(private readonly config: ThreeCxAuthConfig) {
    this.timeoutMs = config.timeoutMs ?? 10_000;
    this.retryMaxAttempts = config.retryMaxAttempts ?? 3;
    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: config.circuitBreakerFailureThreshold ?? 5,
      cooldownMs: config.circuitBreakerCooldownMs ?? 30_000,
    });
  }

  async getAccessToken(): Promise<string> {
    const now = Date.now();
    if (this.cachedToken !== null && this.cachedToken.expiresAt > now) {
      return this.cachedToken.value;
    }

    const data = await this.circuitBreaker.execute(() =>
      withRetry(() => this.requestToken(), {
        maxAttempts: this.retryMaxAttempts,
        baseDelayMs: 300,
        maxDelayMs: 5_000,
        isRetryable: isRetryableAuthError,
      }),
    );

    // Renova 60s antes do vencimento real para evitar corrida com requisições em voo.
    const safetyMarginMs = 60_000;
    this.cachedToken = {
      value: data.access_token,
      expiresAt: now + data.expires_in * 1000 - safetyMarginMs,
    };

    return data.access_token;
  }

  private async requestToken(): Promise<TokenResponse> {
    const response = await fetch(`https://${this.config.domain}/connect/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: this.config.clientId,
        client_secret: this.config.apiKey,
        grant_type: "client_credentials",
      }),
      signal: AbortSignal.timeout(this.timeoutMs),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new ThreeCxAuthError(response.status, body);
    }

    return (await response.json()) as TokenResponse;
  }

  /** Descarta o token em cache — útil se uma chamada autenticada voltar 401. */
  invalidateCache(): void {
    this.cachedToken = null;
  }
}

export class ThreeCxAuthError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly responseBody: string,
  ) {
    super(`Falha ao autenticar na 3CX (HTTP ${statusCode}): ${responseBody}`);
    this.name = "ThreeCxAuthError";
  }
}
