import { initTracing } from './src/lib/tracing.js';
initTracing();

import { registerProcessGuards } from './src/lib/process-guards.js';
registerProcessGuards();

import { startWorkerServer } from './src/lib/worker-server.js';
import { logger } from './src/lib/logger.js';
import { setWorkerProcessUp } from './src/lib/queue/metrics.js';

import { createAgentWorker } from './src/lib/queue/agent.worker.js';
import {
  createSwarmSchedulerWorker,
  scheduleSwarmScheduler,
} from './src/lib/queue/swarmScheduler.worker.js';
import { enabledOrganizations as swarmSchedulerEnabledOrganizations } from './src/features/intelligence/services/swarmScheduler.service.js';
import {
  createWinLossAnalysisWorker,
  scheduleWinLossAnalysisJob,
} from './src/features/intelligence/services/winLossAnalysis.worker.js';
import {
  createAgentMemoryCleanupWorker,
  scheduleAgentMemoryCleanupJob,
} from './src/features/intelligence/jobs/agentMemoryCleanup.worker.js';
import { createCopilotoTranscriptionWorker } from './src/features/copiloto-ia/jobs/transcribeConversation.worker.js';
import { MeetingSynthesisService } from './src/features/chatbook/services/meeting-synthesis.service.js';

async function start() {
  const agentWorker = createAgentWorker();
  const winLossWorker = createWinLossAnalysisWorker();
  const agentMemoryCleanupWorker = createAgentMemoryCleanupWorker();
  const copilotoTranscriptionWorker = createCopilotoTranscriptionWorker({
    meetingSynthesisPort: new MeetingSynthesisService(),
  });

  let swarmSchedulerWorker = null;
  const swarmOrgs = await swarmSchedulerEnabledOrganizations();
  if (swarmOrgs.length > 0) {
    swarmSchedulerWorker = createSwarmSchedulerWorker();
  }

  const workers = [
    { name: 'intelligence-agents', worker: agentWorker },
    { name: 'win-loss-analysis-queue', worker: winLossWorker },
    { name: 'agent-memory-cleanup', worker: agentMemoryCleanupWorker },
    { name: 'swarm-scheduler', worker: swarmSchedulerWorker },
    { name: 'copiloto-ia-transcription-queue', worker: copilotoTranscriptionWorker },
  ];

  await startWorkerServer(
    workers,
    async () => {
      await scheduleWinLossAnalysisJob();
      await scheduleAgentMemoryCleanupJob();
      if (swarmSchedulerWorker) await scheduleSwarmScheduler();
    },
    'ia'
  );
}

start().catch((err) => {
  setWorkerProcessUp(false);
  logger.fatal({ err }, 'worker-ia.ts: fatal bootstrap failure');
  process.exit(1);
});
