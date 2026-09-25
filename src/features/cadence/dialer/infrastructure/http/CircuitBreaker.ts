export type CircuitState = "closed" | "open" | "half_open";

export interface CircuitBreakerOptions {
  /** Falhas consecutivas para abrir o circuito. */
  failureThreshold: number;
  /** Tempo que o circuito fica aberto antes de permitir uma tentativa de teste (half-open). */
  cooldownMs: number;
  onStateChange?: (state: CircuitState) => void;
  now?: () => number;
}

export class CircuitBreakerOpenError extends Error {
  constructor() {
    super("Circuito aberto: chamadas à 3CX bloqueadas preventivamente após falhas consecutivas");
    this.name = "CircuitBreakerOpenError";
  }
}

/**
 * Circuit breaker simples (closed -> open -> half_open -> closed) para
 * evitar bombardear um PBX indisponível a cada ciclo do discador (padrão:
 * a cada 5s). Enquanto aberto, chamadas falham imediatamente sem tocar a
 * rede; após `cooldownMs`, uma única chamada de teste é permitida (half-open)
 * para decidir se o circuito fecha de novo ou reabre.
 */
export class CircuitBreaker {
  private state: CircuitState = "closed";
  private consecutiveFailures = 0;
  private openedAt = 0;
  private readonly now: () => number;

  constructor(private readonly options: CircuitBreakerOptions) {
    this.now = options.now ?? Date.now;
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === "open") {
      if (this.now() - this.openedAt < this.options.cooldownMs) {
        throw new CircuitBreakerOpenError();
      }
      this.transitionTo("half_open");
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error: any) {
      this.onFailure();
      throw error;
    }
  }

  getState(): CircuitState {
    return this.state;
  }

  private onSuccess(): void {
    this.consecutiveFailures = 0;
    this.transitionTo("closed");
  }

  private onFailure(): void {
    this.consecutiveFailures += 1;
    if (this.state === "half_open" || this.consecutiveFailures >= this.options.failureThreshold) {
      this.openedAt = this.now();
      this.transitionTo("open");
    }
  }

  private transitionTo(state: CircuitState): void {
    if (this.state === state) {
      return;
    }
    this.state = state;
    this.options.onStateChange?.(state);
  }
}
