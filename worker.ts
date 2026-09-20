import { initTracing } from './src/lib/tracing.js';
initTracing();

import { registerProcessGuards } from './src/lib/process-guards.js';
registerProcessGuards();

import { startWorkerServer } from './src/lib/worker-server.js';
import { logger } from './src/lib/logger.js';
import { setWorkerProcessUp } from './src/lib/queue/metrics.js';
import { env } from './src/config/env.js';

import { createLeadsWorker } from './src/lib/queue/index.js';
import { createAgentWorker } from './src/lib/queue/agent.worker.js';
import { createEnrichmentWorker } from './src/lib/queue/enrichment.queue.js';
import { createEnrichmentCascadeWorker } from './src/lib/queue/enrichmentCascade.worker.js';
import { createSearchWorker } from './src/lib/queue/search.queue.js';
import { initMeiliIndexes } from './src/lib/search/index.js';
import {
  createColdCallWorker,
  scheduleColdCallCampaigns,
} from './src/lib/queue/coldCall.worker.js';
import { createWhatsAppSignalWorker } from './src/lib/queue/whatsappSignal.worker.js';
import { createWhatsAppCommandWorker } from './src/lib/queue/whatsappCommand.worker.js';
import { enabledOrganizations } from './src/features/integrations/birth-voice/coldCall.service.js';
import {
  createSwarmSchedulerWorker,
  scheduleSwarmScheduler,
} from './src/lib/queue/swarmScheduler.worker.js';
import { enabledOrganizations as swarmSchedulerEnabledOrganizations } from './src/features/intelligence/services/swarmScheduler.service.js';
import { createBitrixSyncWorker, scheduleBitrixSync } from './src/lib/queue/bitrixSync.worker.js';
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
  createWinLossAnalysisWorker,
  scheduleWinLossAnalysisJob,
} from './src/features/intelligence/services/winLossAnalysis.worker.js';
import {
  createWeeklyPdfReportWorker,
  scheduleWeeklyPdfReportJob,
} from './src/features/crm/jobs/weeklyPdfReport.worker.js';
import {
  createAutoAnonymizeWorker,
  scheduleAutoAnonymizeJob,
} from './src/features/crm/jobs/autoAnonymizeDisqualified.worker.js';
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
import {
  createAgentMemoryCleanupWorker,
  scheduleAgentMemoryCleanupJob,
} from './src/features/intelligence/jobs/agentMemoryCleanup.worker.js';
import {
  createBitrixExtractionPurgeWorker,
  scheduleBitrixExtractionPurgeJob,
} from './src/features/integrations/bitrix/jobs/bitrixExtractionPurge.worker.js';
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
import { createCopilotoTranscriptionWorker } from './src/features/copiloto-ia/jobs/transcribeConversation.worker.js';
import { MeetingSynthesisService } from './src/features/chatbook/services/meeting-synthesis.service.js';

async function start() {
  const leadsWorker = createLeadsWorker();
  const agentWorker = createAgentWorker();
  const enrichmentWorker = createEnrichmentWorker();
  const enrichmentCascadeWorker = createEnrichmentCascadeWorker();
  const whatsappSignalWorker = createWhatsAppSignalWorker();
  const whatsappCommandWorker = createWhatsAppCommandWorker();
  const bitrixSyncWorker = createBitrixSyncWorker();
  const followUpWorker = createFollowUpWorker();
  const execSummaryWorker = createExecutiveSummaryWorker();
  const deduplicationWorker = createDeduplicationWorker();
  const winLossWorker = createWinLossAnalysisWorker();
  const pdfWorker = createWeeklyPdfReportWorker();
  const autoAnonymizeWorker = createAutoAnonymizeWorker();
  const coldLeadsScannerWorker = createColdLeadsScannerWorker();
  const stagnationScannerWorker = createStagnationScannerWorker();
  const cadenceRunWorker = createCadenceRunWorker();
  const agentMemoryCleanupWorker = createAgentMemoryCleanupWorker();
  const bitrixExtractionPurgeWorker = createBitrixExtractionPurgeWorker();
  const newsMonitorWorker = createNewsMonitorWorker();
  const accountIntelligenceInsightsWorker = createAccountIntelligenceInsightsWorker();
  const accountIntelligenceSchedulerWorker = createAccountIntelligenceSchedulerWorker();
  const forecastSnapshotWorker = createForecastSnapshotWorker();
  const copilotoTranscriptionWorker = createCopilotoTranscriptionWorker({
    meetingSynthesisPort: new MeetingSynthesisService(),
  });

  const searchWorker = env.ENABLE_SEARCH ? createSearchWorker() : null;
  if (env.ENABLE_SEARCH) {
    initMeiliIndexes().catch((err) => logger.warn({ err }, 'Meilisearch offline'));
  }

  let coldCallWorker = null;
  const coldCallOrgs = await enabledOrganizations();
  if (coldCallOrgs.length > 0) {
    coldCallWorker = createColdCallWorker();
  }

  let swarmSchedulerWorker = null;
  const swarmOrgs = await swarmSchedulerEnabledOrganizations();
  if (swarmOrgs.length > 0) {
    swarmSchedulerWorker = createSwarmSchedulerWorker();
  }

  const workers = [
    { name: 'leads-enrichment', worker: leadsWorker },
    { name: 'intelligence-agents', worker: agentWorker },
    { name: 'enrichment-queue', worker: enrichmentWorker },
    { name: 'enrichment-cascade-queue', worker: enrichmentCascadeWorker },
    { name: 'search-indexing', worker: searchWorker },
    { name: 'whatsapp-conversation-signal', worker: whatsappSignalWorker },
    { name: 'whatsapp-command', worker: whatsappCommandWorker },
    { name: 'bitrix-sync', worker: bitrixSyncWorker },
    { name: 'whatsapp-followup-queue', worker: followUpWorker },
    { name: 'daily-executive-summary-queue', worker: execSummaryWorker },
    { name: 'deduplication-queue', worker: deduplicationWorker },
    { name: 'win-loss-analysis-queue', worker: winLossWorker },
    { name: 'weekly-pdf-report-queue', worker: pdfWorker },
    { name: 'auto-anonymize-disqualified-queue', worker: autoAnonymizeWorker },
    { name: 'sdr-cold-call', worker: coldCallWorker },
    { name: 'swarm-scheduler', worker: swarmSchedulerWorker },
    { name: 'cold-leads-scanner-queue', worker: coldLeadsScannerWorker },
    { name: 'stagnation-scanner-queue', worker: stagnationScannerWorker },
    { name: 'cadence-run-scanner', worker: cadenceRunWorker },
    { name: 'agent-memory-cleanup', worker: agentMemoryCleanupWorker },
    { name: 'bitrix-extraction-purge', worker: bitrixExtractionPurgeWorker },
    { name: 'news-monitor', worker: newsMonitorWorker },
    { name: 'account-intelligence-insights', worker: accountIntelligenceInsightsWorker },
    { name: 'account-intelligence-scheduler', worker: accountIntelligenceSchedulerWorker },
    { name: 'forecast-snapshot-weekly-queue', worker: forecastSnapshotWorker },
    { name: 'copiloto-ia-transcription-queue', worker: copilotoTranscriptionWorker },
  ];

  await startWorkerServer(
    workers,
    async () => {
      await scheduleBitrixSync();
      await scheduleFollowUpJobs();
      await scheduleExecutiveSummaryJob();
      await scheduleDeduplicationJob();
      await scheduleWinLossAnalysisJob();
      await scheduleWeeklyPdfReportJob();
      await scheduleAutoAnonymizeJob();
      await scheduleColdLeadsScannerJob();
      await scheduleStagnationScannerJob();
      await scheduleCadenceRunJob();
      await scheduleAgentMemoryCleanupJob();
      await scheduleBitrixExtractionPurgeJob();
      await scheduleGlobalNewsScan();
      await scheduleAccountIntelligenceInsightsJob();
      await scheduleForecastSnapshotJob();
      await accountIntelligenceSchedulerQueue.upsertJobScheduler(
        'daily-ldr-scheduler',
        { pattern: '0 2 * * *' },
        { name: 'accountIntelligenceScheduler', data: {} }
      );
      if (coldCallWorker) await scheduleColdCallCampaigns();
      if (swarmSchedulerWorker) await scheduleSwarmScheduler();
    },
    'all'
  );
}

start().catch((err) => {
  setWorkerProcessUp(false);
  logger.fatal({ err }, 'worker.ts: fatal bootstrap failure');
  process.exit(1);
});
