import { type Job, Queue, Worker } from 'bullmq';
import { ExternalCrmService } from '../../features/integrations/shared/ExternalCrmService.js';
import { requestContext } from '../async-context.js';
import { logger } from '../logger.js';
import { isFinalAttempt, recordDeadLetter } from './deadLetter.js';
import { recordQueueJobCompleted, registerQueueForMetrics } from './metrics.js';
import { connection, queuesEnabled } from './redis.js';

export const EXTERNAL_CRM_OUTBOUND_QUEUE_NAME = 'external-crm-outbound-sync';

/** QUEUE-001: Retries com backoff exponencial. */
export const externalCrmOutboundQueue = queuesEnabled
  ? new Queue(EXTERNAL_CRM_OUTBOUND_QUEUE_NAME, {
      connection,
      defaultJobOptions: {
        attempts: 10,
        backoff: { type: 'exponential', delay: 10_000 },
        removeOnComplete: { age: 24 * 60 * 60 },
        removeOnFail: { age: 7 * 24 * 60 * 60 },
      },
    })
  : null;

registerQueueForMetrics(EXTERNAL_CRM_OUTBOUND_QUEUE_NAME, externalCrmOutboundQueue);

externalCrmOutboundQueue?.on('error', (err) =>
  logger.warn({ message: err.message }, 'externalCrmOutboundQueue offline'),
);

export interface ExternalCrmOutboundJobData {
  organizationId: string;
  leadId: string;
  payload: {
    name: string;
    amount?: number;
    stageLabel?: string;
  };
}

export async function queueLeadPushToExternalCrms(jobData: ExternalCrmOutboundJobData): Promise<void> {
  if (!externalCrmOutboundQueue) {
    void ExternalCrmService.pushLeadToAllConnections(jobData.organizationId, jobData.leadId, jobData.payload);
    return;
  }
  
  await externalCrmOutboundQueue.add(
    'push-lead',
    jobData,
    {
      jobId: `crm-push-${jobData.organizationId}-${jobData.leadId}-${Date.now()}`
    }
  );
  logger.info({ organizationId: jobData.organizationId, leadId: jobData.leadId }, '[crm] Push enfileirado com sucesso');
}

export function createExternalCrmOutboundWorker() {
  const worker = new Worker<ExternalCrmOutboundJobData>(
    EXTERNAL_CRM_OUTBOUND_QUEUE_NAME,
    async (job: Job<ExternalCrmOutboundJobData>) => {
      const { organizationId, leadId, payload } = job.data;
      logger.info({ jobId: job.id, organizationId, leadId }, 'Processing external CRM outbound sync job');

      await requestContext.run({ tenantId: organizationId }, async () => {
        try {
          await ExternalCrmService.pushLeadToAllConnections(organizationId, leadId, payload);
          logger.info({ organizationId, leadId }, 'External CRM outbound job completed successfully');
        } catch (error) {
          logger.error({ err: error, jobId: job.id, leadId }, 'External CRM outbound job failed');
          throw error;
        }
      });
    },
    { connection, concurrency: 5 },
  );

  worker.on('failed', (job, err) => {
    logger.error({ err, jobId: job?.id }, 'External CRM outbound worker job permanently failed');
    if (!job || !isFinalAttempt(job.attemptsMade, job.opts.attempts)) return;
    void recordDeadLetter({
      queue: EXTERNAL_CRM_OUTBOUND_QUEUE_NAME,
      jobId: job.id,
      jobName: job.name,
      organizationId: job.data?.organizationId ?? null,
      attemptsMade: job.attemptsMade,
      error: err,
      data: job.data,
    });
  });

  worker.on('completed', () => recordQueueJobCompleted(EXTERNAL_CRM_OUTBOUND_QUEUE_NAME));

  return worker;
}
