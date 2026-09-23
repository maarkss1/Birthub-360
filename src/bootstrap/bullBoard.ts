import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import type { Express } from 'express';
import { agentQueue } from '../lib/queue/agent.worker.js';
import { leadsQueue } from '../lib/queue/index.js';
import { queuesEnabled } from '../lib/queue/redis.js';
import { searchQueue } from '../lib/queue/search.queue.js';
import { requirePlatformOperator } from '../shared/middlewares/requirePlatformOperator.js';

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
