import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Server } from 'http';
import { createGracefulShutdown, type ShutdownDeps } from '../../../src/bootstrap/shutdown.js';
import type { EmbeddedWorkersHandle } from '../../../src/bootstrap/workers.js';

function fakeWorker(name: string, calls: string[]) {
  return {
    close: vi.fn(async () => {
      calls.push(`worker:${name}`);
    }),
  } as unknown as NonNullable<EmbeddedWorkersHandle['leadsWorker']>;
}

function buildDeps(calls: string[], overrides: Partial<ShutdownDeps> = {}): ShutdownDeps {
  const workers: EmbeddedWorkersHandle = {
    leadsWorker: fakeWorker('leads', calls),
    agentWorker: fakeWorker('agent', calls),
    enrichmentWorker: null,
    whatsappSignalWorker: null,
    bitrixSyncWorker: null,
    followUpWorker: null,
    execSummaryWorker: null,
    deduplicationWorker: null,
    winLossWorker: null,
    pdfWorker: null,
    autoAnonymizeWorker: null,
    coldLeadsScannerWorker: null,
    stagnationScannerWorker: null,
    accountIntelligenceSchedulerWorker: null,
    forecastSnapshotWorker: null,
    copilotoTranscriptionWorker: null,
    searchWorker: null,
    coldCallWorker: fakeWorker('coldCall', calls),
    swarmSchedulerWorker: null,
  };

  const httpServer = {
    close: vi.fn((cb?: (err?: Error) => void) => {
      calls.push('httpServer.close');
      cb?.(undefined);
    }),
  } as unknown as Server;

  return {
    httpServer,
    workers,
    sseService: {
      closeAll: vi.fn(async () => {
        calls.push('sseService.closeAll');
      }),
    },
    prisma: {
      $disconnect: vi.fn(async () => {
        calls.push('prisma.$disconnect');
      }),
    },
    shutdownLangfuse: vi.fn(async () => {
      calls.push('shutdownLangfuse');
    }),
    connection: {
      quit: vi.fn(async () => {
        calls.push('connection.quit');
      }),
      disconnect: vi.fn(() => {
        calls.push('connection.disconnect');
      }),
    },
    rateLimiterConnection: {
      quit: vi.fn(async () => {
        calls.push('rateLimiterConnection.quit');
      }),
      disconnect: vi.fn(() => {
        calls.push('rateLimiterConnection.disconnect');
      }),
    },
    cacheConnection: {
      quit: vi.fn(async () => {
        calls.push('cacheConnection.quit');
      }),
      disconnect: vi.fn(() => {
        calls.push('cacheConnection.disconnect');
      }),
    },
    logger: { info: vi.fn(), error: vi.fn() },
    exit: vi.fn((code: number) => {
      calls.push(`exit(${code})`);
    }),
    ...overrides,
  };
}

describe('bootstrap/shutdown', () => {
  let calls: string[];

  beforeEach(() => {
    calls = [];
  });

  it('fecha os recursos na ordem esperada: HTTP -> SSE -> workers -> Langfuse/Prisma -> Redis -> exit(0)', async () => {
    const deps = buildDeps(calls);
    const shutdown = createGracefulShutdown(deps);

    await shutdown('SIGTERM');

    const httpIndex = calls.indexOf('httpServer.close');
    const sseIndex = calls.indexOf('sseService.closeAll');
    const leadsWorkerIndex = calls.indexOf('worker:leads');
    const langfuseIndex = calls.indexOf('shutdownLangfuse');
    const prismaIndex = calls.indexOf('prisma.$disconnect');
    const redisIndex = calls.indexOf('connection.quit');
    const exitIndex = calls.indexOf('exit(0)');

    expect(httpIndex).toBe(0);
    expect(sseIndex).toBeGreaterThan(httpIndex);
    expect(leadsWorkerIndex).toBeGreaterThan(sseIndex);
    expect(langfuseIndex).toBeGreaterThan(leadsWorkerIndex);
    expect(prismaIndex).toBeGreaterThan(langfuseIndex);
    expect(redisIndex).toBeGreaterThan(prismaIndex);
    expect(exitIndex).toBe(calls.length - 1);

    // Workers nulos no handle nunca são fechados (nada a fechar).
    expect(deps.workers.enrichmentWorker).toBeNull();
  });

  it('só fecha workers que existem (não nulos) no handle', async () => {
    const deps = buildDeps(calls);
    const shutdown = createGracefulShutdown(deps);

    await shutdown('SIGINT');

    expect(deps.workers.leadsWorker?.close).toHaveBeenCalledTimes(1);
    expect(deps.workers.agentWorker?.close).toHaveBeenCalledTimes(1);
    expect(deps.workers.coldCallWorker?.close).toHaveBeenCalledTimes(1);
  });

  it('continua o shutdown mesmo se o fechamento do servidor HTTP reportar erro', async () => {
    const deps = buildDeps(calls);
    (deps.httpServer.close as unknown as ReturnType<typeof vi.fn>) = vi.fn(
      (cb?: (err?: Error) => void) => {
        calls.push('httpServer.close');
        cb?.(new Error('boom'));
      },
    );

    const shutdown = createGracefulShutdown(deps);
    await shutdown('SIGTERM');

    expect(deps.logger.error).toHaveBeenCalled();
    expect(calls).toContain('sseService.closeAll');
    expect(calls).toContain('exit(0)');
  });

  it('cai para disconnect() quando quit() de uma conexão Redis rejeita', async () => {
    const calls2: string[] = [];
    const deps = buildDeps(calls2, {
      connection: {
        quit: vi.fn(async () => {
          throw new Error('redis quit failed');
        }),
        disconnect: vi.fn(() => {
          calls2.push('connection.disconnect');
        }),
      },
    });

    const shutdown = createGracefulShutdown(deps);
    await shutdown('SIGTERM');

    expect(deps.connection.disconnect).toHaveBeenCalled();
    expect(calls2).toContain('exit(0)');
  });

  it('fecha TODOS os campos de EmbeddedWorkersHandle — falha se um worker novo for adicionado ao handle e esquecido em workerList()', async () => {
    const calls3: string[] = [];

    // Constrói um handle com um worker mockado em CADA campo (nenhum null), para que qualquer
    // campo esquecido em workerList() apareça como "nunca fechado" abaixo — sem precisar
    // manter uma lista hardcoded de nomes aqui, que ficaria tão desatualizada quanto o bug
    // original (ACH-16-03: 3 dos 19 campos de EmbeddedWorkersHandle não eram fechados).
    const workers: EmbeddedWorkersHandle = {
      leadsWorker: fakeWorker('leadsWorker', calls3),
      agentWorker: fakeWorker('agentWorker', calls3),
      enrichmentWorker: fakeWorker('enrichmentWorker', calls3),
      whatsappSignalWorker: fakeWorker('whatsappSignalWorker', calls3),
      bitrixSyncWorker: fakeWorker('bitrixSyncWorker', calls3),
      followUpWorker: fakeWorker('followUpWorker', calls3),
      execSummaryWorker: fakeWorker('execSummaryWorker', calls3),
      deduplicationWorker: fakeWorker('deduplicationWorker', calls3),
      winLossWorker: fakeWorker('winLossWorker', calls3),
      pdfWorker: fakeWorker('pdfWorker', calls3),
      autoAnonymizeWorker: fakeWorker('autoAnonymizeWorker', calls3),
      coldLeadsScannerWorker: fakeWorker('coldLeadsScannerWorker', calls3),
      stagnationScannerWorker: fakeWorker('stagnationScannerWorker', calls3),
      accountIntelligenceSchedulerWorker: fakeWorker(
        'accountIntelligenceSchedulerWorker',
        calls3,
      ),
      forecastSnapshotWorker: fakeWorker('forecastSnapshotWorker', calls3),
      copilotoTranscriptionWorker: fakeWorker('copilotoTranscriptionWorker', calls3),
      searchWorker: fakeWorker('searchWorker', calls3),
      coldCallWorker: fakeWorker('coldCallWorker', calls3),
      swarmSchedulerWorker: fakeWorker('swarmSchedulerWorker', calls3),
    };

    const deps = buildDeps(calls3, { workers });
    const shutdown = createGracefulShutdown(deps);

    await shutdown('SIGTERM');

    const uncloseFields: string[] = [];
    for (const key of Object.keys(workers) as Array<keyof EmbeddedWorkersHandle>) {
      const worker = workers[key];
      const closeMock = worker?.close as unknown as ReturnType<typeof vi.fn> | undefined;
      if (!closeMock || closeMock.mock.calls.length === 0) {
        uncloseFields.push(key);
      }
    }

    expect(uncloseFields).toEqual([]);
  });
});
