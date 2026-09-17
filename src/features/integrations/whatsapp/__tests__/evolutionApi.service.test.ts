import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  checkEvolutionInstanceStatus,
  isEvolutionConfigured,
  sendEvolutionTextMessage,
} from '../evolutionApi.service.js';

describe('EvolutionApiService', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it('deve indicar que não está configurada quando as variáveis estão ausentes', () => {
    delete process.env.EVOLUTION_API_URL;
    delete process.env.EVOLUTION_API_KEY;
    expect(isEvolutionConfigured()).toBe(false);
  });

  it('deve retornar erro gracioso ao tentar enviar sem configuração', async () => {
    delete process.env.EVOLUTION_API_URL;
    delete process.env.EVOLUTION_API_KEY;

    const result = await sendEvolutionTextMessage({
      to: '11999998888',
      text: 'Olá!',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Evolution API não configurada');
  });

  it('deve enviar mensagem com sucesso quando a Evolution API retorna 200', async () => {
    process.env.EVOLUTION_API_URL = 'https://evolution.teste.local';
    process.env.EVOLUTION_API_KEY = 'secret-token-123';
    process.env.EVOLUTION_INSTANCE_NAME = 'instancia-teste';

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        key: { id: 'evo-msg-999' },
        message: { conversation: 'Olá!' },
      }),
    } as unknown as Response);

    const result = await sendEvolutionTextMessage({
      to: '11999998888',
      text: 'Olá!',
    });

    expect(result.success).toBe(true);
    expect(result.messageId).toBe('evo-msg-999');
  });

  it('deve verificar o status da instância', async () => {
    process.env.EVOLUTION_API_URL = 'https://evolution.teste.local';
    process.env.EVOLUTION_API_KEY = 'secret-token-123';

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ instance: { state: 'open' } }),
    } as unknown as Response);

    const status = await checkEvolutionInstanceStatus('instancia-teste');
    expect(status.state).toBe('open');
  });
});
