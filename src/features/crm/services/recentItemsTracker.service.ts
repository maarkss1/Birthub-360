export interface RecentItem {
  id: string;
  type: 'LEAD' | 'COMPANY' | 'DEAL' | 'CADENCE';
  title: string;
  subtitle?: string;
  url: string;
  accessedAt: string;
}

export class RecentItemsTrackerService {
  private recentStore = new Map<string, RecentItem[]>();

  recordAccess(userId: string, item: Omit<RecentItem, 'accessedAt'>): RecentItem[] {
    const key = `user:${userId}`;
    const existing = this.recentStore.get(key) || [];

    const newItem: RecentItem = {
      ...item,
      accessedAt: new Date().toISOString(),
    };

    // Remove duplicados se já existia
    const filtered = existing.filter((i) => i.id !== item.id);
    const updated = [newItem, ...filtered].slice(0, 10); // Máximo 10 itens recentes

    this.recentStore.set(key, updated);
    return updated;
  }

  getRecentItems(userId: string): RecentItem[] {
    return this.recentStore.get(`user:${userId}`) || [];
  }

  clearRecentItems(userId: string) {
    this.recentStore.delete(`user:${userId}`);
  }
}

export const recentItemsTrackerService = new RecentItemsTrackerService();
