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
  const dependencies: Record<string, string> = {};
  let isReady = true;

  try {
    await prisma.$queryRaw`SELECT 1`;
    dependencies.database = 'connected';
  } catch (err) {
    logger.error({ err }, 'Readiness: Database probe failed');
    dependencies.database = 'unavailable';
    isReady = false;
  }

  if (queuesEnabled) {
    try {
      await connection.ping();
      dependencies.redis = 'connected';
    } catch (err) {
      logger.error({ err }, 'Readiness: Redis probe failed');
      dependencies.redis = 'unavailable';
      isReady = false;
    }
  } else {
    dependencies.redis = 'disabled';
  }

  const storageEndpoint = process.env.STORAGE_ENDPOINT || process.env.MINIO_ENDPOINT;
  if (storageEndpoint) {
    dependencies.storage = 'configured';
  } else {
    dependencies.storage = 'unconfigured';
  }

  if (isReady) {
    res.status(200).json({
      status: 'ok',
      dependencies,
      version: env.BUILD_VERSION,
      commit: env.COMMIT_SHA,
      timestamp: new Date().toISOString(),
    });
  } else {
    res.status(503).json({
      status: 'error',
      message: 'One or more critical dependencies unavailable',
      dependencies,
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
