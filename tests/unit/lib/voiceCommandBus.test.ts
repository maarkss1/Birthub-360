import { afterEach, describe, expect, it, vi } from 'vitest';
import { voiceCommandBus } from '@/lib/voiceCommandBus';

afterEach(() => {
  // Cada teste registra sob um ownerId próprio, mas por segurança (o bus é módulo singleton,
  // estado sobrevive entre testes) garante que nenhum comando de um teste vaze pro próximo.
  voiceCommandBus.unregister('owner-a');
  voiceCommandBus.unregister('owner-b');
});

describe('voiceCommandBus', () => {
  it('dispara o handler do comando cuja keyword aparece no texto', () => {
    const handler = vi.fn();
    voiceCommandBus.registerCommands('owner-a', [
      { keywords: ['iniciar foco'], phrase: 'iniciar foco', confirmationLabel: 'Iniciou o foco', handler },
    ]);

    const result = voiceCommandBus.tryHandle('quero iniciar foco agora');

    expect(handler).toHaveBeenCalledOnce();
    expect(result).toBe('Iniciou o foco');
  });

  it('devolve null quando nenhum comando registrado bate com o texto', () => {
    voiceCommandBus.registerCommands('owner-a', [
      { keywords: ['iniciar foco'], phrase: 'x', confirmationLabel: 'x', handler: vi.fn() },
    ]);

    expect(voiceCommandBus.tryHandle('abrir o crm')).toBeNull();
  });

  it('suporta múltiplos donos registrados ao mesmo tempo, sem um sobrescrever o outro', () => {
    const handlerA = vi.fn();
    const handlerB = vi.fn();
    voiceCommandBus.registerCommands('owner-a', [
      { keywords: ['sincronizar'], phrase: 'sincronizar', confirmationLabel: 'Sincronizou', handler: handlerA },
    ]);
    voiceCommandBus.registerCommands('owner-b', [
      { keywords: ['pausar'], phrase: 'pausar', confirmationLabel: 'Pausou', handler: handlerB },
    ]);

    voiceCommandBus.tryHandle('pausar o timer');

    expect(handlerA).not.toHaveBeenCalled();
    expect(handlerB).toHaveBeenCalledOnce();
  });

  it('registerCommands com [] remove os comandos daquele dono (equivalente a unregister)', () => {
    const handler = vi.fn();
    voiceCommandBus.registerCommands('owner-a', [
      { keywords: ['sincronizar'], phrase: 'x', confirmationLabel: 'x', handler },
    ]);
    voiceCommandBus.registerCommands('owner-a', []);

    expect(voiceCommandBus.tryHandle('sincronizar')).toBeNull();
    expect(handler).not.toHaveBeenCalled();
  });

  it('unregister remove só os comandos do dono indicado', () => {
    const handlerA = vi.fn();
    const handlerB = vi.fn();
    voiceCommandBus.registerCommands('owner-a', [
      { keywords: ['sincronizar'], phrase: 'x', confirmationLabel: 'x', handler: handlerA },
    ]);
    voiceCommandBus.registerCommands('owner-b', [
      { keywords: ['pausar'], phrase: 'y', confirmationLabel: 'y', handler: handlerB },
    ]);

    voiceCommandBus.unregister('owner-a');

    expect(voiceCommandBus.tryHandle('sincronizar')).toBeNull();
    expect(voiceCommandBus.tryHandle('pausar')).toBe('y');
  });

  it('getPhrases agrega as frases de exemplo de todos os donos ativos', () => {
    voiceCommandBus.registerCommands('owner-a', [{ keywords: ['x'], phrase: 'Dica A', confirmationLabel: 'Dica A', handler: vi.fn() }]);
    voiceCommandBus.registerCommands('owner-b', [{ keywords: ['y'], phrase: 'Dica B', confirmationLabel: 'Dica B', handler: vi.fn() }]);

    expect(voiceCommandBus.getPhrases()).toEqual(expect.arrayContaining(['Dica A', 'Dica B']));
  });
});
