import type { Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const queryRawMock = vi.fn();
const pingMock = vi.fn();

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    $queryRaw: (...args: unknown[]) => queryRawMock(...args),
  },
}));

vi.mock('../../lib/queue/redis.js', () => ({
  connection: {
    ping: (...args: unknown[]) => pingMock(...args),
  },
  queuesEnabled: true,
}));

vi.mock('../../lib/logger.js', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

import { handleLiveness, handleReadiness, handleVersion } from '../healthchecks';

function createMockResponse() {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res as Response & { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn> };
}

describe('Health Checks (src/bootstrap/healthchecks.ts)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('handleLiveness', () => {
    it('retorna 200 OK com status ok, versao e timestamp', () => {
      const req = {} as Request;
      const res = createMockResponse();

      handleLiveness(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'ok',
          version: expect.any(String),
          commit: expect.any(String),
          timestamp: expect.any(String),
        }),
      );
    });
  });

  describe('handleReadiness', () => {
    it('retorna 200 OK quando Database e Redis estao saudaveis', async () => {
      queryRawMock.mockResolvedValue([{ 1: 1 }]);
      pingMock.mockResolvedValue('PONG');
      const req = {} as Request;
      const res = createMockResponse();

      await handleReadiness(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'ok',
          dependencies: expect.objectContaining({
            database: 'connected',
            redis: 'connected',
          }),
        }),
      );
    });

    it('retorna 503 com status error quando Database falha', async () => {
      queryRawMock.mockRejectedValue(new Error('PostgreSQL connection timeout'));
      pingMock.mockResolvedValue('PONG');
      const req = {} as Request;
      const res = createMockResponse();

      await handleReadiness(req, res);

      expect(res.status).toHaveBeenCalledWith(503);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
          dependencies: expect.objectContaining({
            database: 'unavailable',
            redis: 'connected',
          }),
        }),
      );
    });

    it('retorna 503 com status error quando Redis falha', async () => {
      queryRawMock.mockResolvedValue([{ 1: 1 }]);
      pingMock.mockRejectedValue(new Error('Redis connection refused'));
      const req = {} as Request;
      const res = createMockResponse();

      await handleReadiness(req, res);

      expect(res.status).toHaveBeenCalledWith(503);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
          dependencies: expect.objectContaining({
            database: 'connected',
            redis: 'unavailable',
          }),
        }),
      );
    });
  });

  describe('handleVersion', () => {
    it('retorna 200 OK com metadados de deploy e versao', () => {
      const req = {} as Request;
      const res = createMockResponse();

      handleVersion(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'ok',
          version: expect.any(String),
          commit: expect.any(String),
          environment: expect.any(String),
        }),
      );
    });
  });
});
