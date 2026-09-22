import { initTracing } from './src/lib/tracing.js';
initTracing();

import { registerProcessGuards } from './src/lib/process-guards.js';
registerProcessGuards();

import { startWorkerServer } from './src/bootstrap/workerServer.js';
import { logger } from './src/lib/logger.js';
import { setWorkerProcessUp } from './src/lib/queue/metrics.js';

import {
  createNewsMonitorWorker,
  scheduleGlobalNewsScan,
} from './src/lib/queue/newsMonitor.worker.js';
import {
  createAccountIntelligenceInsightsWorker,
  scheduleAccountIntelligenceInsightsJob,
} from './src/features/market-intelligence/jobs/accountIntelligenceInsights.worker.js';
import {
  createAccountIntelligenceSchedulerWorker,
  accountIntelligenceSchedulerQueue,
} from './src/features/market-intelligence/jobs/accountIntelligenceScheduler.worker.js';
import {
  createForecastSnapshotWorker,
  scheduleForecastSnapshotJob,
} from './src/features/commercial-intelligence/jobs/forecastSnapshotWeekly.worker.js';

async function start() {
  const newsMonitorWorker = createNewsMonitorWorker();
  const accountIntelligenceInsightsWorker = createAccountIntelligenceInsightsWorker();
  const accountIntelligenceSchedulerWorker = createAccountIntelligenceSchedulerWorker();
  const forecastSnapshotWorker = createForecastSnapshotWorker();

  const workers = [
    { name: 'news-monitor', worker: newsMonitorWorker },
    { name: 'account-intelligence-insights', worker: accountIntelligenceInsightsWorker },
    { name: 'account-intelligence-scheduler', worker: accountIntelligenceSchedulerWorker },
    { name: 'forecast-snapshot-weekly-queue', worker: forecastSnapshotWorker },
  ];

  await startWorkerServer(
    workers,
    async () => {
      await scheduleGlobalNewsScan();
      await scheduleAccountIntelligenceInsightsJob();
      await scheduleForecastSnapshotJob();
      
      await accountIntelligenceSchedulerQueue.upsertJobScheduler(
        'daily-ldr-scheduler',
        { pattern: '0 2 * * *' },
        { name: 'accountIntelligenceScheduler', data: {} }
      );
    },
    'mercado'
  );
}

start().catch((err) => {
  setWorkerProcessUp(false);
  logger.fatal({ err }, 'worker-mercado.ts: fatal bootstrap failure');
  process.exit(1);
});
