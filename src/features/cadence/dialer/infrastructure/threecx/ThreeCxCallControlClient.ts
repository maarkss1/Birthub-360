import type { ThreeCxAuthClient } from "./ThreeCxAuthClient.js";
import { CircuitBreaker } from "../http/CircuitBreaker.js";
import { isNetworkError, withRetry } from "../http/retry.js";

/**
 * Formato de "participante" devolvido pela Call Control API.
 * Espelha o schema documentado em
 * https://www.3cx.com/docs/call-control-api-endpoints/ — os campos abaixo
 * são os únicos usados por este projeto; a resposta real traz mais campos.
 *
 * IMPORTANTE: a documentação pública não fixa os valores possíveis de
 * `status` (ex: "Dialing", "Ringing", "Connected"...). Antes de ir para
 * produção, capture algumas respostas reais do seu PBX (log em modo debug)
 * e ajuste `ThreeCxDialerProvider.mapParticipantStatus` de acordo.
 */
export interface ThreeCxParticipant {
  id: number;
  status: string;
  dn: string;
  party_dn: string;
  party_caller_id: string;
  callid: number;
  legid: number;
}

export interface ThreeCxMakeCallResponse {
  finalstatus: string;
  reason: string;
  reasontext: string;
  result: ThreeCxParticipant;
}

export class ThreeCxApiError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly path: string,
    public readonly responseBody: string,
  ) {
    super(`Chamada à Call Control API falhou (${path} -> HTTP ${statusCode}): ${responseBody}`);
    this.name = "ThreeCxApiError";
  }
}

function isRetryableHttpStatus(status: number): boolean {
  return status === 429 || (status >= 500 && status <= 599);
}

function isRetryableCallControlError(error: unknown): boolean {
  if (isNetworkError(error)) {
    return true;
  }
  return error instanceof ThreeCxApiError && isRetryableHttpStatus(error.statusCode);
}

export interface ThreeCxCallControlClientOptions {
  requestTimeoutMs?: number;
  /** Número total de tentativas em falhas transitórias — rede, 429, 5xx (padrão: 3). */
  retryMaxAttempts?: number;
  /** Falhas consecutivas até abrir o circuito e parar de bater na 3CX (padrão: 5). */
  circuitBreakerFailureThreshold?: number;
  /** Tempo de espera com o circuito aberto antes de tentar de novo (padrão: 30000ms). */
  circuitBreakerCooldownMs?: number;
}

export class ThreeCxCallControlClient {
  private readonly requestTimeoutMs: number;
  private readonly retryMaxAttempts: number;
  private readonly circuitBreaker: CircuitBreaker;

  constructor(
    private readonly domain: string,
    private readonly authClient: ThreeCxAuthClient,
    options?: ThreeCxCallControlClientOptions,
  ) {
    this.requestTimeoutMs = options?.requestTimeoutMs ?? 10_000;
    this.retryMaxAttempts = options?.retryMaxAttempts ?? 3;
    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: options?.circuitBreakerFailureThreshold ?? 5,
      cooldownMs: options?.circuitBreakerCooldownMs ?? 30_000,
    });
  }

  async makeCall(input: {
    dn: string;
    destination: string;
    timeoutSeconds: number;
    attachedData: Record<string, string>;
  }): Promise<{ httpStatus: number; body: ThreeCxMakeCallResponse | null }> {
    const response = await this.request(`/callcontrol/${encodeURIComponent(input.dn)}/makecall`, {
      method: "POST",
      body: JSON.stringify({
        destination: input.destination,
        timeout: input.timeoutSeconds,
        attacheddata: input.attachedData,
      }),
    });

    if (response.status === 200 || response.status === 202) {
      const body = (await response.json()) as ThreeCxMakeCallResponse;
      return { httpStatus: response.status, body };
    }

    if (response.status === 401 || response.status === 403) {
      const text = await response.text();
      throw new ThreeCxApiError(response.status, "makecall", text);
    }

    // 422/424: PBX entendeu o pedido mas não pôde processá-lo agora
    // (ex: ramal ocupado/indisponível) — tratado como rejeição, não exceção.
    return { httpStatus: response.status, body: null };
  }

  async getParticipants(dn: string): Promise<ThreeCxParticipant[]> {
    const response = await this.request(`/callcontrol/${encodeURIComponent(dn)}/participants`, {
      method: "GET",
    });

    if (response.status === 404) {
      return [];
    }

    if (!response.ok) {
      const text = await response.text();
      throw new ThreeCxApiError(response.status, "participants", text);
    }

    return (await response.json()) as ThreeCxParticipant[];
  }

  private async request(path: string, init: RequestInit): Promise<Response> {
    const token = await this.authClient.getAccessToken();
    const response = await this.fetchResilient(path, init, token);

    if (response.status === 401) {
      // Token pode ter expirado entre o cache e o uso; tenta uma vez com token novo.
      this.authClient.invalidateCache();
      const freshToken = await this.authClient.getAccessToken();
      return this.fetchResilient(path, init, freshToken);
    }

    return response;
  }

  /**
   * Executa um fetch com retry (backoff exponencial + jitter) para falhas de
   * rede e respostas 429/5xx, protegido por um circuit breaker que evita
   * bombardear um PBX indisponível a cada ciclo do discador (padrão: a cada
   * 5s). Respostas com status não-retryable (incluindo 401/403/422/424) são
   * devolvidas normalmente para os métodos públicos decidirem o que fazer.
   *
   * IMPORTANTE: quando as tentativas se esgotam num status retryable, esta
   * chamada lança `ThreeCxApiError` em vez de devolver uma resposta — ou
   * seja, uma falha persistente de `makeCall` agora propaga como exceção em
   * vez de ser silenciosamente tratada como rejeição (o que antes consumia
   * uma tentativa do lead por um problema de infraestrutura, não da chamada
   * em si). O chamador (`RunDialerCycle`, via o loop do agendador) já trata
   * exceções não capturadas pulando o ciclo e tentando de novo no próximo tick.
   */
  private async fetchResilient(path: string, init: RequestInit, token: string): Promise<Response> {
    return this.circuitBreaker.execute(() =>
      withRetry(() => this.fetchOnce(path, init, token), {
        maxAttempts: this.retryMaxAttempts,
        baseDelayMs: 300,
        maxDelayMs: 5_000,
        isRetryable: isRetryableCallControlError,
      }),
    );
  }

  private async fetchOnce(path: string, init: RequestInit, token: string): Promise<Response> {
    const response = await fetch(`https://${this.domain}${path}`, {
      ...init,
      headers: {
        ...init.headers,
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      signal: init.signal ?? AbortSignal.timeout(this.requestTimeoutMs),
    });

    if (isRetryableHttpStatus(response.status)) {
      const text = await response.text();
      throw new ThreeCxApiError(response.status, path, text);
    }

    return response;
  }
}
