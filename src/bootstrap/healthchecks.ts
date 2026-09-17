import type { Express, Request, Response } from 'express';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';
import { prisma } from '../lib/prisma.js';
import { connection, queuesEnabled } from '../lib/queue/redis.js';

export function handleLiveness(_req: Request, res: Response): void {
  res.status(200).json({
    status: 'ok',
    version: env.BUILD_VERSION,
    commit: env.COMMIT_SHA,
    timestamp: new Date().toISOString(),
  });
}

export async function handleReadiness(_req: Request, res: Response): Promise<void> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    if (queuesEnabled) {
      await connection.ping();
    }
    res.status(200).json({
      status: 'ok',
      version: env.BUILD_VERSION,
      commit: env.COMMIT_SHA,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error({ err: error }, 'Readiness probe failed');
    res.status(503).json({
      status: 'error',
      message: 'Database or Redis unavailable',
      version: env.BUILD_VERSION,
      commit: env.COMMIT_SHA,
      timestamp: new Date().toISOString(),
    });
  }
}

export function handleVersion(_req: Request, res: Response): void {
  res.status(200).json({
    status: 'ok',
    version: env.BUILD_VERSION,
    commit: env.COMMIT_SHA,
    deployedAt: env.DEPLOY_TIMESTAMP,
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Health checks e correlação de versão consumidos pelo orquestrador de deploy/SRE
 * (liveness = processo está de pé; readiness = processo atende tráfego; version = metadata de release).
 */
export function mountHealthChecks(app: Express): void {
  app.get('/health/live', handleLiveness);
  app.get('/healthz', handleLiveness);
  app.get('/health/ready', handleReadiness);
  app.get('/readyz', handleReadiness);
  app.get('/health/version', handleVersion);
  app.get('/version', handleVersion);
}
