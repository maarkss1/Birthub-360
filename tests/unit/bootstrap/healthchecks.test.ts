import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

vi.mock('../../../src/lib/prisma.js', () => ({
  prisma: {
    $queryRaw: vi.fn(),
  },
}));

vi.mock('../../../src/lib/queue/redis.js', () => ({
  queuesEnabled: true,
  connection: {
    ping: vi.fn(),
  },
}));

vi.mock('../../../src/lib/logger.js', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    fatal: vi.fn(),
  },
}));

import { prisma } from '../../../src/lib/prisma.js';
import { connection } from '../../../src/lib/queue/redis.js';
import { mountHealthChecks } from '../../../src/bootstrap/healthchecks.js';
import { env } from '../../../src/config/env.js';

function buildApp() {
  const app = express();
  mountHealthChecks(app);
  return app;
}

describe('bootstrap/healthchecks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('liveness (/health/live e /healthz) responde 200 com metadata de versão/commit sem depender de banco/redis', async () => {
    const app = buildApp();

    const live1 = await request(app).get('/health/live');
    const live2 = await request(app).get('/healthz');

    expect(live1.status).toBe(200);
    expect(live1.body.status).toBe('ok');
    expect(live1.body.version).toBe(env.BUILD_VERSION);
    expect(live1.body.commit).toBe(env.COMMIT_SHA);
    expect(live1.body.timestamp).toBeDefined();

    expect(live2.status).toBe(200);
    expect(live2.body.status).toBe('ok');
    expect(live2.body.version).toBe(env.BUILD_VERSION);
    expect(live2.body.commit).toBe(env.COMMIT_SHA);
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });

  it('version (/health/version e /version) responde 200 com release metadata completa (version, commit, deployedAt, environment)', async () => {
    const app = buildApp();

    const res1 = await request(app).get('/health/version');
    const res2 = await request(app).get('/version');

    expect(res1.status).toBe(200);
    expect(res1.body.status).toBe('ok');
    expect(res1.body.version).toBe(env.BUILD_VERSION);
    expect(res1.body.commit).toBe(env.COMMIT_SHA);
    expect(res1.body.deployedAt).toBe(env.DEPLOY_TIMESTAMP);
    expect(res1.body.environment).toBe(env.NODE_ENV);
    expect(res1.body.timestamp).toBeDefined();

    expect(res2.status).toBe(200);
    expect(res2.body.status).toBe('ok');
    expect(res2.body.version).toBe(env.BUILD_VERSION);
    expect(res2.body.commit).toBe(env.COMMIT_SHA);
  });

  it('readiness (/health/ready e /readyz) responde 200 com metadata quando banco e Redis estão saudáveis', async () => {
    (prisma.$queryRaw as ReturnType<typeof vi.fn>).mockResolvedValue([{ '?column?': 1 }]);
    (connection.ping as ReturnType<typeof vi.fn>).mockResolvedValue('PONG');

    const app = buildApp();
    const res = await request(app).get('/health/ready');
    const res2 = await request(app).get('/readyz');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.version).toBe(env.BUILD_VERSION);
    expect(res.body.commit).toBe(env.COMMIT_SHA);
    expect(res2.status).toBe(200);
    expect(connection.ping).toHaveBeenCalled();
  });

  it('readiness responde 503 quando o banco está indisponível', async () => {
    (prisma.$queryRaw as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('connection refused'),
    );

    const app = buildApp();
    const res = await request(app).get('/health/ready');

    expect(res.status).toBe(503);
    expect(res.body.status).toBe('error');
    expect(res.body.message).toBe('Database or Redis unavailable');
    expect(res.body.version).toBe(env.BUILD_VERSION);
    expect(res.body.commit).toBe(env.COMMIT_SHA);
  });

  it('readiness responde 503 quando Redis está indisponível e queues estão ativas', async () => {
    (prisma.$queryRaw as ReturnType<typeof vi.fn>).mockResolvedValue([{ '?column?': 1 }]);
    (connection.ping as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('Redis connection lost'),
    );

    const app = buildApp();
    const res = await request(app).get('/health/ready');

    expect(res.status).toBe(503);
    expect(res.body.status).toBe('error');
    expect(res.body.message).toBe('Database or Redis unavailable');
    expect(res.body.version).toBe(env.BUILD_VERSION);
    expect(res.body.commit).toBe(env.COMMIT_SHA);
  });
});
