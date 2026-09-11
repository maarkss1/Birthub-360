/**
 * ACH-05-05: cobre POST /companies/:id/enrich-cascade (prospecting.routes.ts) — especificamente o
 * caminho `async: true` que enfileira via BullMQ (`enrichmentCascadeQueue`).
 *
 * Bug original: `queuesEnabled` (src/lib/queue/redis.ts) só confere se REDIS_URL está *presente*,
 * nunca se o Redis está de fato *acessível* em runtime. Se a env aponta para um Redis inatingível,
 * `enrichmentCascadeQueue.add()` pode nunca resolver nem rejeitar (enableOfflineQueue mantém o
 * comando pendurado esperando uma conexão que nunca chega), travando a requisição HTTP até o
 * timeout do proxy reverso. A correção faz um `Promise.race` entre `pingRedis` (redis.ts) e um
 * timeout curto antes de chamar `.add()`; se o Redis não responder a tempo, a rota cai para o
 * caminho síncrono (`runEnrichmentCascade`) em vez de pendurar a requisição.
 *
 * Todos os serviços importados por prospecting.routes.ts (que puxam prisma/APIs externas/binários
 * nativos como sharp e tesseract.js) são mockados — só o contrato desta rota está sob teste, como
 * em src/features/prospecting/routes/__tests__/prospecting-tools.routes.test.ts.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { errorHandler } from '../../../../shared/middlewares/errorHandler.js';

const runEnrichmentCascadeMock = vi.fn();
const enrichmentCascadeQueueAddMock = vi.fn();
const pingRedisMock = vi.fn();

vi.mock('../../services/prospecting.service.js', () => ({
  discoverCandidates: vi.fn(),
  promoteToCrm: vi.fn(),
  discoverDecisionMakers: vi.fn(),
  rejectCandidate: vi.fn(),
}));

vi.mock('../../services/apollo.service.js', () => ({
  checkApolloConnection: vi.fn(),
}));

vi.mock('../../services/enrichment.service.js', () => ({
  fetchCnpjData: vi.fn(),
}));

vi.mock('../../../../shared/services/rntrcTerritorialRisk.service.js', () => ({
  rntrcRiskByUf: vi.fn(),
}));

vi.mock('../../services/ocr.service.js', () => ({
  extractTextFromImage: vi.fn(),
  structureOcrCandidate: vi.fn(),
  OcrValidationError: class OcrValidationError extends Error {},
}));

vi.mock('../../../intelligence/services/IcebreakerService.js', () => ({
  IcebreakerService: class IcebreakerService {
    generateIcebreaker = vi.fn();
  },
}));

vi.mock('../../services/searchExecution.service.js', () => ({
  findSearchExecution: vi.fn(),
}));

vi.mock('../../services/cold-email.service.js', () => ({
  sendColdEmail: vi.fn(),
}));

vi.mock('../../services/enrichmentCascade.service.js', () => ({
  runEnrichmentCascade: (...args: unknown[]) => runEnrichmentCascadeMock(...args),
}));

vi.mock('../../../../lib/queue/enrichmentCascade.worker.js', () => ({
  enrichmentCascadeQueue: {
    add: (...args: unknown[]) => enrichmentCascadeQueueAddMock(...args),
  },
}));

vi.mock('../../../../lib/queue/redis.js', () => ({
  pingRedis: (...args: unknown[]) => pingRedisMock(...args),
  connection: {},
}));

vi.mock('../../../../lib/prisma.js', () => ({
  prisma: {},
}));

import { prospectingRoutes } from '../prospecting.routes.js';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as unknown as { user: { id: string; organizationId: string; role: string } }).user = {
      id: 'test-user',
      organizationId: 'org-1',
      role: 'ADMIN',
    };
    next();
  });
  app.use('/api/prospecting', prospectingRoutes);
  app.use(errorHandler);
  return app;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/prospecting/companies/:id/enrich-cascade (async)', () => {
  it('enfileira o job quando o Redis do BullMQ responde ao ping dentro do timeout', async () => {
    pingRedisMock.mockResolvedValue(undefined);
    enrichmentCascadeQueueAddMock.mockResolvedValue({ id: 'job-123' });
    const app = buildApp();

    const res = await request(app)
      .post('/api/prospecting/companies/company-1/enrich-cascade')
      .send({ async: true });

    expect(res.status).toBe(202);
    expect(res.body).toEqual({
      success: true,
      message: 'Enriquecimento em cascata enfileirado',
      jobId: 'job-123',
    });
    expect(enrichmentCascadeQueueAddMock).toHaveBeenCalledWith('enrich-cascade-job', {
      companyId: 'company-1',
      organizationId: 'org-1',
      options: {},
    });
    expect(runEnrichmentCascadeMock).not.toHaveBeenCalled();
  });

  it(
    'cai para o caminho síncrono, sem travar a requisição, quando REDIS_URL está configurado mas o Redis está inatingível (ping nunca resolve)',
    async () => {
      // Simula exatamente o cenário do bug: REDIS_URL presente (queuesEnabled/redisConfigured
      // true, por isso enrichmentCascadeQueue existe), mas a conexão nunca resolve nem rejeita —
      // o mesmo comportamento que .add() teria contra um Redis inatingível antes da correção.
      // Timers reais de propósito: fake timers travam a pilha real de I/O do supertest/Node aqui,
      // então o teste mede o tempo de parede real (a rota deve responder pouco depois dos ~3s do
      // timeout do health-check, nunca ficar pendurada até o timeout do teste).
      pingRedisMock.mockReturnValue(new Promise(() => {}));
      runEnrichmentCascadeMock.mockResolvedValue({
        apolloEnriched: false,
        hunterEnriched: false,
        googlePlacesEnriched: false,
        contactsAdded: 0,
      });
      const app = buildApp();

      const startedAt = Date.now();
      const res = await request(app)
        .post('/api/prospecting/companies/company-1/enrich-cascade')
        .send({ async: true });
      const elapsedMs = Date.now() - startedAt;

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(enrichmentCascadeQueueAddMock).not.toHaveBeenCalled();
      expect(runEnrichmentCascadeMock).toHaveBeenCalledWith('org-1', 'company-1', {});
      // Não trava indefinidamente: resolve pouco depois do timeout de ~3s do health-check, não só
      // quando o teste inteiro estourar.
      expect(elapsedMs).toBeGreaterThanOrEqual(2_900);
      expect(elapsedMs).toBeLessThan(4_500);
    },
    10_000,
  );

  it('cai para o caminho síncrono quando o ping ao Redis rejeita (ex.: conexão recusada)', async () => {
    pingRedisMock.mockRejectedValue(new Error('connect ECONNREFUSED'));
    runEnrichmentCascadeMock.mockResolvedValue({
      apolloEnriched: true,
      hunterEnriched: false,
      googlePlacesEnriched: false,
      contactsAdded: 1,
    });
    const app = buildApp();

    const res = await request(app)
      .post('/api/prospecting/companies/company-1/enrich-cascade')
      .send({ async: true });

    expect(res.status).toBe(200);
    expect(enrichmentCascadeQueueAddMock).not.toHaveBeenCalled();
    expect(runEnrichmentCascadeMock).toHaveBeenCalledWith('org-1', 'company-1', {});
  });
});

describe('POST /api/prospecting/companies/:id/enrich-cascade (sync)', () => {
  it('roda o caminho síncrono direto quando async não é solicitado', async () => {
    runEnrichmentCascadeMock.mockResolvedValue({
      apolloEnriched: true,
      hunterEnriched: true,
      googlePlacesEnriched: false,
      contactsAdded: 2,
    });
    const app = buildApp();

    const res = await request(app)
      .post('/api/prospecting/companies/company-1/enrich-cascade')
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.data.contactsAdded).toBe(2);
    expect(pingRedisMock).not.toHaveBeenCalled();
    expect(enrichmentCascadeQueueAddMock).not.toHaveBeenCalled();
  });
});
