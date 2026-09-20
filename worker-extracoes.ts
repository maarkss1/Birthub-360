import { initTracing } from './src/lib/tracing.js';
initTracing();

import { registerProcessGuards } from './src/lib/process-guards.js';
registerProcessGuards();

import { startWorkerServer } from './src/lib/worker-server.js';
import { logger } from './src/lib/logger.js';
import { setWorkerProcessUp } from './src/lib/queue/metrics.js';

import { createWhatsAppSignalWorker } from './src/lib/queue/whatsappSignal.worker.js';
import { createWhatsAppCommandWorker } from './src/lib/queue/whatsappCommand.worker.js';
import { createBitrixSyncWorker, scheduleBitrixSync } from './src/lib/queue/bitrixSync.worker.js';
import {
  createBitrixExtractionPurgeWorker,
  scheduleBitrixExtractionPurgeJob,
} from './src/features/integrations/bitrix/jobs/bitrixExtractionPurge.worker.js';

async function start() {
  const whatsappSignalWorker = createWhatsAppSignalWorker();
  const whatsappCommandWorker = createWhatsAppCommandWorker();
  const bitrixSyncWorker = createBitrixSyncWorker();
  const bitrixExtractionPurgeWorker = createBitrixExtractionPurgeWorker();

  const workers = [
    { name: 'whatsapp-conversation-signal', worker: whatsappSignalWorker },
    { name: 'whatsapp-command', worker: whatsappCommandWorker },
    { name: 'bitrix-sync', worker: bitrixSyncWorker },
    { name: 'bitrix-extraction-purge', worker: bitrixExtractionPurgeWorker },
  ];

  await startWorkerServer(
    workers,
    async () => {
      await scheduleBitrixSync();
      await scheduleBitrixExtractionPurgeJob();
    },
    'extracoes'
  );
}

start().catch((err) => {
  setWorkerProcessUp(false);
  logger.fatal({ err }, 'worker-extracoes.ts: fatal bootstrap failure');
  process.exit(1);
});
