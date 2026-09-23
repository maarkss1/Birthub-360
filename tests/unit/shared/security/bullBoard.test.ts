import { mountBullBoard } from '../../../../src/bootstrap/bullBoard.js';
import { describe, it, expect, vi } from 'vitest';

vi.mock('@bull-board/api', () => ({
  createBullBoard: vi.fn(),
}));

vi.mock('@bull-board/api/bullMQAdapter', () => ({
  BullMQAdapter: vi.fn(),
}));

vi.mock('@bull-board/express', () => ({
  ExpressAdapter: vi.fn().mockImplementation(() => ({
    setBasePath: vi.fn(),
    getRouter: vi.fn().mockReturnValue('mockedRouter'),
  })),
}));

vi.mock('../../../../src/lib/queue/agent.worker.js', () => ({ agentQueue: {} }));
vi.mock('../../../../src/lib/queue/index.js', () => ({ leadsQueue: {} }));
vi.mock('../../../../src/lib/queue/redis.js', () => ({ queuesEnabled: true }));
vi.mock('../../../../src/lib/queue/search.queue.js', () => ({ searchQueue: {} }));

describe('mountBullBoard', () => {
  it('mounts bullBoard on the express app with requirePlatformOperator middleware', () => {
    const mockApp = {
      use: vi.fn(),
    };
    
    mountBullBoard(mockApp as any);
    
    expect(mockApp.use).toHaveBeenCalledWith(
      '/admin/queues',
      expect.any(Function),
      'mockedRouter'
    );
  });
});
