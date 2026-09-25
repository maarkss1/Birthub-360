import { env } from '../../../config/env';
import { logger } from '../../../lib/logger';
import { prisma } from '../../../lib/prisma';
import { PgCampaignRepository } from "./infrastructure/db/repositories/PgCampaignRepository.js";
import { PgLeadRepository } from "./infrastructure/db/repositories/PgLeadRepository.js";
import { PgCallAttemptRepository } from "./infrastructure/db/repositories/PgCallAttemptRepository.js";
import { PgDncRepository } from "./infrastructure/db/repositories/PgDncRepository.js";
import { ThreeCxAuthClient } from "./infrastructure/threecx/ThreeCxAuthClient.js";
import { ThreeCxCallControlClient } from "./infrastructure/threecx/ThreeCxCallControlClient.js";
import { ThreeCxDialerProvider } from "./infrastructure/threecx/ThreeCxDialerProvider.js";
import { CallingHoursPolicy } from "./domain/policies/CallingHoursPolicy.js";
import { ImportLeads } from "./application/use-cases/ImportLeads.js";
import { ManageCampaign } from "./application/use-cases/ManageCampaign.js";
import { SyncCallStatuses } from "./application/use-cases/SyncCallStatuses.js";
import { DialNextBatch } from "./application/use-cases/DialNextBatch.js";
import { RunDialerCycle } from "./application/use-cases/RunDialerCycle.js";
import { createServer } from "./interface/http/server.js";
import { startDialerLoop } from "./interface/scheduler/dialerLoop.js";

async function main(): Promise<void> {
  const env = loadEnv();
  const logger = createLogger(env.logLevel);

  const pool = createPool(env.databaseUrl);

  // --- Infraestrutura ---
  const campaignRepository = new PgCampaignRepository(prisma);
  const leadRepository = new PgLeadRepository(prisma);
  const callAttemptRepository = new PgCallAttemptRepository(prisma);
  const dncRepository = new PgDncRepository(prisma);

  const authClient = new ThreeCxAuthClient({
    domain: env.threeCx.domain,
    clientId: env.threeCx.clientId,
    apiKey: env.threeCx.apiKey,
    retryMaxAttempts: env.threeCx.httpRetryMaxAttempts,
    circuitBreakerFailureThreshold: env.threeCx.circuitBreakerFailureThreshold,
    circuitBreakerCooldownMs: env.threeCx.circuitBreakerCooldownMs,
  });
  const callControlClient = new ThreeCxCallControlClient(env.threeCx.domain, authClient, {
    retryMaxAttempts: env.threeCx.httpRetryMaxAttempts,
    circuitBreakerFailureThreshold: env.threeCx.circuitBreakerFailureThreshold,
    circuitBreakerCooldownMs: env.threeCx.circuitBreakerCooldownMs,
  });
  const dialerProvider = new ThreeCxDialerProvider(callControlClient, logger);

  const callingHoursPolicy = new CallingHoursPolicy({
    start: env.dialer.callingHoursStart,
    end: env.dialer.callingHoursEnd,
    allowedWeekdays: env.dialer.callingDays,
    timezone: env.dialer.timezone,
  });

  // --- Casos de uso ---
  const importLeads = new ImportLeads(leadRepository, dncRepository);
  const manageCampaign = new ManageCampaign(campaignRepository, leadRepository);
  const syncCallStatuses = new SyncCallStatuses(callAttemptRepository, leadRepository, {
    maxAttempts: env.dialer.maxAttempts,
    retryBackoffMinutes: env.dialer.retryBackoffMinutes,
  });
  const dialNextBatch = new DialNextBatch(leadRepository, callAttemptRepository, dialerProvider, {
    callTimeoutSeconds: env.threeCx.callTimeoutSeconds,
    maxAttempts: env.dialer.maxAttempts,
    retryBackoffMinutes: env.dialer.retryBackoffMinutes,
  });
  const runDialerCycle = new RunDialerCycle(
    campaignRepository,
    callAttemptRepository,
    dialerProvider,
    callingHoursPolicy,
    syncCallStatuses,
    dialNextBatch,
    {
      agentDns: env.threeCx.agentDns,
      callTimeoutSeconds: env.threeCx.callTimeoutSeconds,
      maxAttempts: env.dialer.maxAttempts,
      retryBackoffMinutes: env.dialer.retryBackoffMinutes,
    },
  );

  // --- HTTP + agendador ---
  const app = createServer({
    logger,
    manageCampaign,
    importLeads,
    campaignRepository,
    dncRepository,
  });

  const server = app.listen(env.port, () => {
    logger.info({ port: env.port }, "Discador 3CX ouvindo");
  });

  const dialerLoop = startDialerLoop(runDialerCycle, env.dialer.tickIntervalMs, logger);

  const shutdown = async (signal: string): Promise<void> => {
    logger.info({ signal }, "Encerrando aplicação");
    await dialerLoop.stop();
    server.close(() => {
      Promise.resolve().then(() => process.exit(0))
        .catch(() => process.exit(1));
    });
  };

  process.on("SIGINT", () => {
    void shutdown("SIGINT");
  });
  process.on("SIGTERM", () => {
    void shutdown("SIGTERM");
  });
}

main().catch((error: unknown) => {
  // eslint-disable-next-line no-console
  console.error("Falha fatal ao iniciar a aplicação:", error);
  process.exitCode = 1;
});
