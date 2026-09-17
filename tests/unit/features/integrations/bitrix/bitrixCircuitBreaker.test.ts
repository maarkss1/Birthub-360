import { describe, expect, it, vi } from 'vitest';
import { BitrixCircuitBreaker } from '../../../../../src/features/integrations/bitrix/service/bitrixCircuitBreaker.js';

describe('BitrixCircuitBreaker (Agente 06)', () => {
  it('executa chamadas normalmente quando o circuito está FECHADO', async () => {
    const breaker = new BitrixCircuitBreaker();
    const fn = vi.fn().mockResolvedValue({ status: 'ok', deals: [] });

    const result = await breaker.execute(fn);
    expect(result).toEqual({ status: 'ok', deals: [] });
    expect(breaker.getState()).toBe('CLOSED');
  });

  it('abre o circuito após atingir o limite de falhas consecutivas', async () => {
    const breaker = new BitrixCircuitBreaker({ failureThreshold: 3 });
    const failingFn = vi.fn().mockRejectedValue(new Error('Bitrix API Rate Limit 429'));

    // 3 falhas seguidas
    for (let i = 0; i < 3; i++) {
      await expect(breaker.execute(failingFn)).rejects.toThrow('Bitrix API Rate Limit 429');
    }

    expect(breaker.getState()).toBe('OPEN');

    // 4ª chamada deve ser rejeitada imediatamente pelo Circuit Breaker sem chamar a função
    await expect(breaker.execute(failingFn)).rejects.toThrow('Circuit breaker da API Bitrix24 está ABERTO');
    expect(failingFn).toHaveBeenCalledTimes(3);
  });
});
