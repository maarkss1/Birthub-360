/**
 * @file CacheFactory.ts
 * @description Reusable factory for creating Cache instances.
 */

import type { Cache } from './Cache.js';
import { MemoryCache } from './MemoryCache.js';

export type CacheProvider<TValue = unknown> = () => Cache<TValue>;

let provider: CacheProvider = () => new MemoryCache();

export const CacheFactory = {
  configure(nextProvider: CacheProvider): void {
    provider = nextProvider;
  },

  create<TValue = unknown>(): Cache<TValue> {
    return provider() as Cache<TValue>;
  },
};
