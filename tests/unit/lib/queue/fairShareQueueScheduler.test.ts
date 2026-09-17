import { describe, expect, it } from 'vitest';
import { FairShareQueueScheduler } from '../../../../src/lib/queue/fairShareQueueScheduler.js';

describe('FairShareQueueScheduler (Agente 16)', () => {
  it('intercala tarefas equitativamente entre múltiplos tenants evitando monopólio', () => {
    const scheduler = new FairShareQueueScheduler();

    // Tenant A enfileira 3 jobs
    scheduler.enqueueJob({ id: 'a1', organizationId: 'org-A', priority: 'NORMAL', type: 'SYNC', payload: {} });
    scheduler.enqueueJob({ id: 'a2', organizationId: 'org-A', priority: 'NORMAL', type: 'SYNC', payload: {} });
    scheduler.enqueueJob({ id: 'a3', organizationId: 'org-A', priority: 'NORMAL', type: 'SYNC', payload: {} });

    // Tenant B enfileira 1 job
    scheduler.enqueueJob({ id: 'b1', organizationId: 'org-B', priority: 'NORMAL', type: 'SYNC', payload: {} });

    expect(scheduler.getPendingJobCount()).toBe(4);

    // 1º dequeued = A1
    const job1 = scheduler.dequeueNextFairShare();
    expect(job1?.id).toBe('a1');

    // 2º dequeued = B1 (Fair-share: vez do Tenant B)
    const job2 = scheduler.dequeueNextFairShare();
    expect(job2?.id).toBe('b1');

    // 3º dequeued = A2
    const job3 = scheduler.dequeueNextFairShare();
    expect(job3?.id).toBe('a2');
  });

  it('respeita alta prioridade dentro do mesmo tenant', () => {
    const scheduler = new FairShareQueueScheduler();

    scheduler.enqueueJob({ id: 'a1', organizationId: 'org-A', priority: 'NORMAL', type: 'SYNC', payload: {} });
    scheduler.enqueueJob({ id: 'a-urgent', organizationId: 'org-A', priority: 'HIGH', type: 'WHATSAPP_URGENT', payload: {} });

    const job = scheduler.dequeueNextFairShare();
    expect(job?.id).toBe('a-urgent');
  });
});
