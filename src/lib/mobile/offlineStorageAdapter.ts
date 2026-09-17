export interface OfflineQueueItem {
  id: string;
  action: string;
  payload: Record<string, unknown>;
  queuedAt: string;
}

export class OfflineStorageAdapter {
  private inMemoryQueue: OfflineQueueItem[] = [];

  async enqueueOfflineAction(action: string, payload: Record<string, unknown>): Promise<OfflineQueueItem> {
    const item: OfflineQueueItem = {
      id: `offline-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      action,
      payload,
      queuedAt: new Date().toISOString(),
    };

    this.inMemoryQueue.push(item);
    return item;
  }

  async getPendingOfflineActions(): Promise<OfflineQueueItem[]> {
    return [...this.inMemoryQueue];
  }

  async removeOfflineAction(id: string): Promise<void> {
    this.inMemoryQueue = this.inMemoryQueue.filter((item) => item.id !== id);
  }

  async clearQueue(): Promise<void> {
    this.inMemoryQueue = [];
  }
}

export const offlineStorageAdapter = new OfflineStorageAdapter();
