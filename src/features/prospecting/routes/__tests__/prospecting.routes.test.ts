/**
 * ACH-05-01 (auditoria de segurança): cobre o contrato de autorização (RBAC) das rotas de
 * prospecção que acionam chamadas reais e faturáveis (Apollo/Hunter/IA/Google Places) —
 * /discover, /ocr, /decision-makers, /icebreaker, /companies/:id/enrich-cascade e
 * /saved-searches/:id/run agora exigem requireRole(['ADMIN','GESTOR','CLOSER','SDR']), o mesmo
 * conjunto já usado por /promote e /cold-email. Antes desta correção, qualquer usuário do tenant
 * — incluindo VISUALIZADOR, o papel somente-leitura padrão de um novo usuário — conseguia acionar
 * essas chamadas repetidamente, consumindo o orçamento mensal da organização.
 *
 * Segue o mesmo padrão de prospecting-tools.routes.test.ts: mocka as camadas de serviço e foca só
 * no contrato do router (aqui, especificamente, o gate de RBAC). `authenticateToken`/
 * `requireTenant` não fazem parte deste router (aplicados em bootstrap/routes.ts ao montar
 * `/api/prospecting`) — o `req.user` é injetado diretamente, como nos demais testes de rota.
 */

import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { errorHandler } from '../../../../shared/middlewares/errorHandler.js';

const discoverCandidatesMock = vi.fn();
const promoteToCrmMock = vi.fn();
const discoverDecisionMakersMock = vi.fn();
const rejectCandidateMock = vi.fn();
const checkApolloConnectionMock = vi.fn();
const fetchCnpjDataMock = vi.fn();
const rntrcRiskByUfMock = vi.fn();
const extractTextFromImageMock = vi.fn();
const structureOcrCandidateMock = vi.fn();
const generateIcebreakerMock = vi.fn();
const findSearchExecutionMock = vi.fn();
const sendColdEmailMock = vi.fn();
const runEnrichmentCascadeMock = vi.fn();
const savedSearchFindManyMock = vi.fn();
const savedSearchCreateMock = vi.fn();
const savedSearchFindFirstMock = vi.fn();
const savedSearchUpdateMock = vi.fn();
const savedSearchDeleteManyMock = vi.fn();

vi.mock('../../services/prospecting.service.js', () => ({
  discoverCandidates: (...args: unknown[]) => discoverCandidatesMock(...args),
  promoteToCrm: (...args: unknown[]) => promoteToCrmMock(...args),
  discoverDecisionMakers: (...args: unknown[]) => discoverDecisionMakersMock(...args),
  rejectCandidate: (...args: unknown[]) => rejectCandidateMock(...args),
}));

vi.mock('../../services/apollo.service.js', () => ({
  checkApolloConnection: (...args: unknown[]) => checkApolloConnectionMock(...args),
}));

vi.mock('../../services/enrichment.service.js', () => ({
  fetchCnpjData: (...args: unknown[]) => fetchCnpjDataMock(...args),
}));

vi.mock('../../../../shared/services/rntrcTerritorialRisk.service.js', () => ({
  rntrcRiskByUf: (...args: unknown[]) => rntrcRiskByUfMock(...args),
}));

vi.mock('../../services/ocr.service.js', () => ({
  extractTextFromImage: (...args: unknown[]) => extractTextFromImageMock(...args),
  structureOcrCandidate: (...args: unknown[]) => structureOcrCandidateMock(...args),
  OcrValidationError: class OcrValidationError extends Error {},
}));

vi.mock('../../../intelligence/services/IcebreakerService.js', () => ({
  IcebreakerService: class {
    generateIcebreaker(...args: unknown[]) {
      return generateIcebreakerMock(...args);
    }
  },
}));

vi.mock('../../services/searchExecution.service.js', () => ({
  findSearchExecution: (...args: unknown[]) => findSearchExecutionMock(...args),
}));

vi.mock('../../services/cold-email.service.js', () => ({
  sendColdEmail: (...args: unknown[]) => sendColdEmailMock(...args),
}));

vi.mock('../../services/enrichmentCascade.service.js', () => ({
  runEnrichmentCascade: (...args: unknown[]) => runEnrichmentCascadeMock(...args),
}));

vi.mock('../../../../lib/queue/enrichmentCascade.worker.js', () => ({
  enrichmentCascadeQueue: null,
}));

vi.mock('../../../../lib/prisma.js', () => ({
  prisma: {
    savedSearch: {
      findMany: (...args: unknown[]) => savedSearchFindManyMock(...args),
      create: (...args: unknown[]) => savedSearchCreateMock(...args),
      findFirst: (...args: unknown[]) => savedSearchFindFirstMock(...args),
      update: (...args: unknown[]) => savedSearchUpdateMock(...args),
      deleteMany: (...args: unknown[]) => savedSearchDeleteManyMock(...args),
    },
  },
}));

import { prospectingRoutes } from '../prospecting.routes.js';

function buildApp(role: string) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as unknown as { user: { id: string; organizationId: string; role: string } }).user = {
      id: 'test-user',
      organizationId: 'org-1',
      role,
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

const discoverBody = { segmento: 'Transportadora', localizacao: 'São Paulo', quantidade: 5 };

describe('POST /api/prospecting/discover — RBAC (ACH-05-01)', () => {
  it('nega com 403 para VISUALIZADOR (papel somente-leitura) sem acionar a busca faturável', async () => {
    const app = buildApp('VISUALIZADOR');

    const res = await request(app).post('/api/prospecting/discover').send(discoverBody);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(discoverCandidatesMock).not.toHaveBeenCalled();
  });

  it('permite para SDR (papel mínimo autorizado)', async () => {
    discoverCandidatesMock.mockResolvedValue({ candidates: [], searchId: 'search-1' });
    const app = buildApp('SDR');

    const res = await request(app).post('/api/prospecting/discover').send(discoverBody);

    expect(res.status).toBe(200);
    expect(discoverCandidatesMock).toHaveBeenCalledTimes(1);
  });
});

describe('POST /api/prospecting/ocr — RBAC (ACH-05-01)', () => {
  it('nega com 403 para VISUALIZADOR', async () => {
    const app = buildApp('VISUALIZADOR');

    const res = await request(app)
      .post('/api/prospecting/ocr')
      .attach('image', Buffer.from('fake-image'), 'foto.png');

    expect(res.status).toBe(403);
    expect(extractTextFromImageMock).not.toHaveBeenCalled();
  });
});

describe('POST /api/prospecting/decision-makers — RBAC (ACH-05-01)', () => {
  it('nega com 403 para VISUALIZADOR', async () => {
    const app = buildApp('VISUALIZADOR');

    const res = await request(app)
      .post('/api/prospecting/decision-makers')
      .send({ domain: 'empresa.com.br' });

    expect(res.status).toBe(403);
    expect(discoverDecisionMakersMock).not.toHaveBeenCalled();
  });
});

describe('POST /api/prospecting/icebreaker — RBAC (ACH-05-01)', () => {
  it('nega com 403 para VISUALIZADOR', async () => {
    const app = buildApp('VISUALIZADOR');

    const res = await request(app)
      .post('/api/prospecting/icebreaker')
      .send({ companyName: 'Empresa X' });

    expect(res.status).toBe(403);
    expect(generateIcebreakerMock).not.toHaveBeenCalled();
  });
});

describe('POST /api/prospecting/companies/:id/enrich-cascade — RBAC (ACH-05-01)', () => {
  it('nega com 403 para VISUALIZADOR', async () => {
    const app = buildApp('VISUALIZADOR');

    const res = await request(app)
      .post('/api/prospecting/companies/company-1/enrich-cascade')
      .send({});

    expect(res.status).toBe(403);
    expect(runEnrichmentCascadeMock).not.toHaveBeenCalled();
  });
});

describe('POST /api/prospecting/saved-searches/:id/run — RBAC (ACH-05-01)', () => {
  it('nega com 403 para VISUALIZADOR sem consultar a busca salva', async () => {
    const app = buildApp('VISUALIZADOR');

    const res = await request(app).post('/api/prospecting/saved-searches/search-1/run').send({});

    expect(res.status).toBe(403);
    expect(savedSearchFindFirstMock).not.toHaveBeenCalled();
    expect(discoverCandidatesMock).not.toHaveBeenCalled();
  });
});

describe('POST /api/prospecting/enrich-cnpj — não afetado (avaliado e mantido sem gate)', () => {
  it('continua acessível para VISUALIZADOR — consulta gratuita (BrasilAPI), não faturável', async () => {
    fetchCnpjDataMock.mockResolvedValue({ found: false });
    const app = buildApp('VISUALIZADOR');

    const res = await request(app)
      .post('/api/prospecting/enrich-cnpj')
      .send({ cnpj: '00000000000000' });

    expect(res.status).toBe(200);
    expect(fetchCnpjDataMock).toHaveBeenCalledTimes(1);
  });
});
