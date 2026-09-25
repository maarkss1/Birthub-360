import http from 'node:http';
import type { Worker as BullWorker } from 'bullmq';
import { env } from '../config/env';
import { logger } from '../lib/logger';
import { prisma } from '../lib/prisma';
import { shutdownLangfuse } from '../lib/langfuse';
import { withTimeout } from '../lib/http';
import client from 'prom-client';
import {
  connection,
  rateLimiterConnection,
  cacheConnection,
  queuesEnabled,
  pingRedis,
} from '../lib/queue/redis';
import { registerWorkerForRuntimeMetrics, setWorkerProcessUp } from '../lib/queue/metrics';
import { warnUnconfiguredSecondaryIntegrations } from './integrationsHealthCheck';
import {
  isPlatformOperatorTokenConfigured,
  isValidPlatformOperatorToken,
} from '../shared/middlewares/requirePlatformOperator';
import { shutdownWhatsAppSessions } from '../features/integrations/whatsapp/whatsapp.service';

const WORKER_PORT = parseInt(process.env.WORKER_HEALTH_PORT || '3006', 10);
const SHUTDOWN_TIMEOUT_MS = 25_000;
const STARTUP_REDIS_TIMEOUT_MS = 10_000;
type CloseableWorker = BullWorker<unknown, unknown, string> | null;

export async function startWorkerServer(
  registeredWorkers: Array<{ name: string; worker: CloseableWorker }>,
  scheduleJobs: () => Promise<void>,
  domainName: string,
) {
  if (!queuesEnabled) {
    throw new Error('Worker dedicado requer ENABLE_QUEUES=true e REDIS_URL configurada.');
  }

  warnUnconfiguredSecondaryIntegrations();

  await withTimeout(pingRedis(cacheConnection), STARTUP_REDIS_TIMEOUT_MS);
  await prisma.$queryRaw`SELECT 1`;

  await scheduleJobs();

  for (const { name, worker } of registeredWorkers) {
    if (worker) {
      registerWorkerForRuntimeMetrics(name, worker);
    }
  }

  const activeCount = registeredWorkers.filter((entry) => entry.worker !== null).length;
  setWorkerProcessUp(true);
  logger.info(
    {
      domain: domainName,
      activeWorkers: activeCount,
      totalRegistered: registeredWorkers.length,
      registered: registeredWorkers.map((entry) => entry.name),
    },
    'workerServer.ts: processors registrados',
  );

  if (env.EXPOSE_METRICS) client.collectDefaultMetrics();

  const healthServer = http.createServer(async (req, res) => {
    if (req.url === '/health/live' || req.url === '/healthz') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
      return;
    }

    if (req.url === '/health/ready' || req.url === '/readyz') {
      try {
        await pingRedis(cacheConnection);
        await prisma.$queryRaw`SELECT 1`;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            status: 'ok',
            domain: domainName,
            queuesEnabled: true,
            activeWorkers: activeCount,
            totalRegistered: registeredWorkers.length,
            timestamp: new Date().toISOString(),
          }),
        );
      } catch (err) {
        logger.error({ err }, `${domainName} readiness failed`);
        res.writeHead(503, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'error', message: 'Redis or database unavailable' }));
      }
      return;
    }

    const requestPath = (req.url ?? '/').split('?', 1)[0];
    if (requestPath === '/metrics' && env.EXPOSE_METRICS) {
      if (!isPlatformOperatorTokenConfigured()) {
        res.writeHead(503, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            success: false,
            error:
              'Recurso de operador de plataforma não habilitado — configure PLATFORM_OPERATOR_TOKEN.',
          }),
        );
        return;
      }

      const requestUrl = new URL(req.url ?? '/metrics', 'http://internal');
      const headerToken = req.headers['x-platform-operator-token'];
      const queryToken = requestUrl.searchParams.get('operator_token');
      const candidate =
        (typeof headerToken === 'string' && headerToken) ||
        (typeof queryToken === 'string' && queryToken) ||
        null;

      if (!isValidPlatformOperatorToken(candidate)) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Acesso negado.' }));
        return;
      }

      try {
        res.writeHead(200, { 'Content-Type': client.register.contentType });
        res.end(await client.register.metrics());
      } catch (err) {
        logger.error({ err }, `${domainName}: failed to collect metrics`);
        res.writeHead(500);
        res.end('Falha ao coletar métricas.');
      }
      return;
    }

    res.writeHead(404);
    res.end();
  });

  healthServer.listen(WORKER_PORT, '0.0.0.0', () => {
    logger.info(
      { port: WORKER_PORT, domain: domainName },
      'workerServer.ts health server listening',
    );
  });

  let shuttingDown = false;
  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    setWorkerProcessUp(false);
    logger.info({ signal, domain: domainName }, 'workerServer.ts: graceful shutdown started');

    const timeout = new Promise<void>((resolve) => {
      setTimeout(() => {
        logger.error(
          { signal, timeoutMs: SHUTDOWN_TIMEOUT_MS, domain: domainName },
          'workerServer.ts: shutdown timeout reached',
        );
        resolve();
      }, SHUTDOWN_TIMEOUT_MS);
    });

    const drain = (async () => {
      await new Promise<void>((resolve) => healthServer.close(() => resolve()));
      await Promise.allSettled(
        registeredWorkers
          .filter(
            (entry): entry is { name: string; worker: NonNullable<CloseableWorker> } =>
              entry.worker !== null,
          )
          .map(({ worker }) => worker.close()),
      );
      if (domainName === 'extracoes' || domainName === 'all') {
        await shutdownWhatsAppSessions();
      }
      await shutdownLangfuse().catch((err) => logger.error({ err }, 'Erro ao encerrar Langfuse'));
      await prisma
        .$disconnect()
        .catch((err) => logger.error({ err }, 'Erro ao desconectar Prisma'));

      await Promise.allSettled([
        withTimeout(connection.quit(), 2000).catch(() => connection.disconnect()),
        withTimeout(rateLimiterConnection.quit(), 2000).catch(() =>
          rateLimiterConnection.disconnect(),
        ),
        withTimeout(cacheConnection.quit(), 2000).catch(() => cacheConnection.disconnect()),
      ]);
    })();

    await Promise.race([drain, timeout]);
    logger.info({ signal, domain: domainName }, 'workerServer.ts: graceful shutdown completed');
    process.exit(0);
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}
