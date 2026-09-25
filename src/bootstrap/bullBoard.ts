import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import type { Express } from 'express';
import { agentQueue } from '../lib/queue/agent.worker';
import { leadsQueue } from '../lib/queue/index';
import { queuesEnabled } from '../lib/queue/redis';
import { searchQueue } from '../lib/queue/search.queue';
import { requirePlatformOperator } from '../shared/middlewares/requirePlatformOperator';

export function mountBullBoard(app: Express): void {
  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath('/admin/queues');

  if (queuesEnabled && leadsQueue && searchQueue && agentQueue) {
    createBullBoard({
      queues: [
        new BullMQAdapter(leadsQueue),
        new BullMQAdapter(searchQueue),
        new BullMQAdapter(agentQueue),
      ],
      serverAdapter,
    });
  }

  app.use('/admin/queues', requirePlatformOperator, serverAdapter.getRouter());
}
