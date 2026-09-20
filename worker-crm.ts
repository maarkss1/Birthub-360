import { initTracing } from './src/lib/tracing.js';
initTracing();

import { registerProcessGuards } from './src/lib/process-guards.js';
registerProcessGuards();

import { startWorkerServer } from './src/lib/worker-server.js';
import { logger } from './src/lib/logger.js';
import { setWorkerProcessUp } from './src/lib/queue/metrics.js';

import {
  createFollowUpWorker,
  scheduleFollowUpJobs,
} from './src/features/crm/jobs/followUp.worker.js';
import {
  createExecutiveSummaryWorker,
  scheduleExecutiveSummaryJob,
} from './src/features/crm/jobs/dailyExecutiveSummary.worker.js';
import {
  createDeduplicationWorker,
  scheduleDeduplicationJob,
} from './src/features/crm/jobs/deduplication.worker.js';
import {
  createWeeklyPdfReportWorker,
  scheduleWeeklyPdfReportJob,
} from './src/features/crm/jobs/weeklyPdfReport.worker.js';
import {
  createAutoAnonymizeWorker,
  scheduleAutoAnonymizeJob,
} from './src/features/crm/jobs/autoAnonymizeDisqualified.worker.js';

async function start() {
  const followUpWorker = createFollowUpWorker();
  const execSummaryWorker = createExecutiveSummaryWorker();
  const deduplicationWorker = createDeduplicationWorker();
  const pdfWorker = createWeeklyPdfReportWorker();
  const autoAnonymizeWorker = createAutoAnonymizeWorker();

  const workers = [
    { name: 'whatsapp-followup-queue', worker: followUpWorker },
    { name: 'daily-executive-summary-queue', worker: execSummaryWorker },
    { name: 'deduplication-queue', worker: deduplicationWorker },
    { name: 'weekly-pdf-report-queue', worker: pdfWorker },
    { name: 'auto-anonymize-disqualified-queue', worker: autoAnonymizeWorker },
  ];

  await startWorkerServer(
    workers,
    async () => {
      await scheduleFollowUpJobs();
      await scheduleExecutiveSummaryJob();
      await scheduleDeduplicationJob();
      await scheduleWeeklyPdfReportJob();
      await scheduleAutoAnonymizeJob();
    },
    'crm'
  );
}

start().catch((err) => {
  setWorkerProcessUp(false);
  logger.fatal({ err }, 'worker-crm.ts: fatal bootstrap failure');
  process.exit(1);
});
