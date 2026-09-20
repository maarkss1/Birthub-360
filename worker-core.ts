import { initTracing } from './src/lib/tracing.js';
initTracing();

import { registerProcessGuards } from './src/lib/process-guards.js';
registerProcessGuards();

import { startWorkerServer } from './src/bootstrap/workerServer.js';
import { logger } from './src/lib/logger.js';
import { setWorkerProcessUp } from './src/lib/queue/metrics.js';
import { env } from './src/config/env.js';

import { createSearchWorker } from './src/lib/queue/search.queue.js';
import { initMeiliIndexes } from './src/lib/search/index.js';

async function start() {
  const searchWorker = env.ENABLE_SEARCH ? createSearchWorker() : null;
  if (env.ENABLE_SEARCH) {
    initMeiliIndexes().catch((err) => logger.warn({ err }, 'Meilisearch offline'));
  }

  const workers = [
    { name: 'search-indexing', worker: searchWorker },
  ];

  await startWorkerServer(
    workers,
    async () => {},
    'core'
  );
}

start().catch((err) => {
  setWorkerProcessUp(false);
  logger.fatal({ err }, 'worker-core.ts: fatal bootstrap failure');
  process.exit(1);
});
