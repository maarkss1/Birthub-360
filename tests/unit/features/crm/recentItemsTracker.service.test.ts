import { beforeEach, describe, expect, it } from 'vitest';
import { RecentItemsTrackerService } from '../../../../src/features/crm/services/recentItemsTracker.service.js';

describe('RecentItemsTrackerService (Agente 02)', () => {
  let tracker: RecentItemsTrackerService;

  beforeEach(() => {
    tracker = new RecentItemsTrackerService();
  });

  it('registra acessos a itens mantendo ordem cronológica inversa e limite de 10 itens', () => {
    for (let i = 1; i <= 12; i++) {
      tracker.recordAccess('user-1', {
        id: `item-${i}`,
        type: 'LEAD',
        title: `Lead ${i}`,
        url: `/crm/leads/${i}`,
      });
    }

    const recent = tracker.getRecentItems('user-1');
    expect(recent).toHaveLength(10);
    expect(recent[0].id).toBe('item-12');
    expect(recent[9].id).toBe('item-3');
  });

  it('remove duplicidades ao acessar um item já existente trazendo-o para o topo', () => {
    tracker.recordAccess('user-1', { id: 'lead-a', type: 'LEAD', title: 'Lead A', url: '/a' });
    tracker.recordAccess('user-1', { id: 'lead-b', type: 'LEAD', title: 'Lead B', url: '/b' });

    // Acessa Lead A novamente
    tracker.recordAccess('user-1', { id: 'lead-a', type: 'LEAD', title: 'Lead A', url: '/a' });

    const recent = tracker.getRecentItems('user-1');
    expect(recent).toHaveLength(2);
    expect(recent[0].id).toBe('lead-a');
    expect(recent[1].id).toBe('lead-b');
  });
});
