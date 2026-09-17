export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerOptions {
  failureThreshold?: number;
  resetTimeoutMs?: number;
}

export class BitrixCircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failureCount = 0;
  private lastStateChange: number = Date.now();
  private readonly failureThreshold: number;
  private readonly resetTimeoutMs: number;

  constructor(options: CircuitBreakerOptions = {}) {
    this.failureThreshold = options.failureThreshold ?? 5;
    this.resetTimeoutMs = options.resetTimeoutMs ?? 30000; // 30 segundos
  }

  getState(): CircuitState {
    if (this.state === 'OPEN' && Date.now() - this.lastStateChange > this.resetTimeoutMs) {
      this.state = 'HALF_OPEN';
    }
    return this.state;
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    const currentState = this.getState();

    if (currentState === 'OPEN') {
      throw new Error(
        'Circuit breaker da API Bitrix24 está ABERTO devido a falhas frequentes ou rate-limiting. Tente novamente em breve.',
      );
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure();
      throw err;
    }
  }

  private onSuccess() {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }

  private onFailure() {
    this.failureCount += 1;
    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
      this.lastStateChange = Date.now();
    }
  }

  reset() {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.lastStateChange = Date.now();
  }
}

export const bitrixCircuitBreaker = new BitrixCircuitBreaker();
