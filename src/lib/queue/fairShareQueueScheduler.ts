export interface QueueJobTask {
  id: string;
  organizationId: string;
  priority: 'HIGH' | 'NORMAL' | 'LOW';
  type: string;
  payload: Record<string, unknown>;
}

export class FairShareQueueScheduler {
  private tenantQueues = new Map<string, QueueJobTask[]>();
  private lastIndex = 0;

  enqueueJob(job: QueueJobTask) {
    const queue = this.tenantQueues.get(job.organizationId) || [];
    if (job.priority === 'HIGH') {
      queue.unshift(job);
    } else {
      queue.push(job);
    }
    this.tenantQueues.set(job.organizationId, queue);
  }

  dequeueNextFairShare(): QueueJobTask | null {
    const tenantIds = Array.from(this.tenantQueues.keys());
    if (tenantIds.length === 0) return null;

    const targetIndex = this.lastIndex % tenantIds.length;
    const tenantId = tenantIds[targetIndex];
    const queue = this.tenantQueues.get(tenantId);

    this.lastIndex = (targetIndex + 1) % Math.max(1, tenantIds.length);

    if (queue && queue.length > 0) {
      const job = queue.shift();
      if (!job) return null;
      if (queue.length === 0) {
        this.tenantQueues.delete(tenantId);
      }
      return job;
    }

    return null;
  }

  getPendingJobCount(): number {
    let total = 0;
    for (const queue of this.tenantQueues.values()) {
      total += queue.length;
    }
    return total;
  }
}

export const fairShareQueueScheduler = new FairShareQueueScheduler();
