/**
 * @file LoggerFactory.ts
 * @description Reusable factory for creating Logger instances.
 */

import type { Logger } from './Logger.js';
import { NullLogger } from './NullLogger.js';

export type LoggerProvider = (scope: string) => Logger;

let provider: LoggerProvider = () => new NullLogger();

export const LoggerFactory = {
  configure(nextProvider: LoggerProvider): void {
    provider = nextProvider;
  },

  create(scope: string): Logger {
    return provider(scope);
  },
};
