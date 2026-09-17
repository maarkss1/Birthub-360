import { beforeEach, describe, expect, it } from 'vitest';
import { OfflineStorageAdapter } from '../../../../src/lib/mobile/offlineStorageAdapter.js';

describe('OfflineStorageAdapter (Agente 09)', () => {
  let adapter: OfflineStorageAdapter;

  beforeEach(() => {
    adapter = new OfflineStorageAdapter();
  });

  it('enfileira ações offline com sucesso', async () => {
    const item = await adapter.enqueueOfflineAction('CREATE_NOTE', {
      leadId: 'lead-1',
      content: 'Nota offline',
    });

    expect(item.id).toMatch(/^offline-/);
    expect(item.action).toBe('CREATE_NOTE');

    const pending = await adapter.getPendingOfflineActions();
    expect(pending).toHaveLength(1);
    expect(pending[0].payload.content).toBe('Nota offline');
  });

  it('remove ação processada da fila', async () => {
    const item = await adapter.enqueueOfflineAction('UPDATE_LEAD', { leadId: 'lead-2' });
    await adapter.removeOfflineAction(item.id);

    const pending = await adapter.getPendingOfflineActions();
    expect(pending).toHaveLength(0);
  });
});
