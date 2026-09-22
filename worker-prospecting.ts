import { initTracing } from './src/lib/tracing.js';
initTracing();

import { registerProcessGuards } from './src/lib/process-guards.js';
registerProcessGuards();

import { startWorkerServer } from './src/bootstrap/workerServer.js';
import { logger } from './src/lib/logger.js';
import { setWorkerProcessUp } from './src/lib/queue/metrics.js';

import { createLeadsWorker } from './src/lib/queue/index.js';
import { createEnrichmentWorker } from './src/lib/queue/enrichment.queue.js';
import { createEnrichmentCascadeWorker } from './src/lib/queue/enrichmentCascade.worker.js';
import {
  createColdCallWorker,
  scheduleColdCallCampaigns,
} from './src/lib/queue/coldCall.worker.js';
import { enabledOrganizations } from './src/features/integrations/birth-voice/coldCall.service.js';
import {
  createColdLeadsScannerWorker,
  scheduleColdLeadsScannerJob,
} from './src/features/automations/application/cold-leads-scanner.service.js';
import {
  createStagnationScannerWorker,
  scheduleStagnationScannerJob,
} from './src/features/automations/application/stagnation-scanner.service.js';
import {
  createCadenceRunWorker,
  scheduleCadenceRunJob,
} from './src/features/cadence/jobs/cadenceRun.worker.js';

async function start() {
  const leadsWorker = createLeadsWorker();
  const enrichmentWorker = createEnrichmentWorker();
  const enrichmentCascadeWorker = createEnrichmentCascadeWorker();
  const coldLeadsScannerWorker = createColdLeadsScannerWorker();
  const stagnationScannerWorker = createStagnationScannerWorker();
  const cadenceRunWorker = createCadenceRunWorker();

  let coldCallWorker = null;
  const coldCallOrgs = await enabledOrganizations();
  if (coldCallOrgs.length > 0) {
    coldCallWorker = createColdCallWorker();
  }

  const workers = [
    { name: 'leads-enrichment', worker: leadsWorker },
    { name: 'enrichment-queue', worker: enrichmentWorker },
    { name: 'enrichment-cascade-queue', worker: enrichmentCascadeWorker },
    { name: 'sdr-cold-call', worker: coldCallWorker },
    { name: 'cold-leads-scanner-queue', worker: coldLeadsScannerWorker },
    { name: 'stagnation-scanner-queue', worker: stagnationScannerWorker },
    { name: 'cadence-run-scanner', worker: cadenceRunWorker },
  ];

  await startWorkerServer(
    workers,
    async () => {
      if (coldCallWorker) await scheduleColdCallCampaigns();
      await scheduleColdLeadsScannerJob();
      await scheduleStagnationScannerJob();
      await scheduleCadenceRunJob();
    },
    'prospecting'
  );
}

start().catch((err) => {
  setWorkerProcessUp(false);
  logger.fatal({ err }, 'worker-prospecting.ts: fatal bootstrap failure');
  process.exit(1);
});
