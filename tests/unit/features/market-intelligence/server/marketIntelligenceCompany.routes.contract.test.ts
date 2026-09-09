import express from 'express';
import rateLimit from 'express-rate-limit';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { authGetSessionMock, getTenantPrismaMock, getAccountIntelligenceMock, listMock, approveMock } =
  vi.hoisted(() => ({
    authGetSessionMock: vi.fn(),
    getTenantPrismaMock: vi.fn((organizationId: string) => ({ organizationId })),
    getAccountIntelligenceMock: vi.fn(),
    listMock: vi.fn(),
    approveMock: vi.fn(),
  }));

vi.mock('@/lib/auth.js', () => ({
  auth: { api: { getSession: (...args: unknown[]) => authGetSessionMock(...args) } },
}));

vi.mock('@/config/access-policy.js', () => ({ isAuthorizedLoginEmail: () => true }));

vi.mock('@/lib/tenant-prisma.js', () => ({
  getTenantPrisma: (organizationId: string) => getTenantPrismaMock(organizationId),
}));

vi.mock('@/features/market-intelligence/server/accountIntelligence.service.js', async (importOriginal) => {
  const actual = await importOriginal<
    typeof import('@/features/market-intelligence/server/accountIntelligence.service.js')
  >();
  return { ...actual, getAccountIntelligence: (...args: [string]) => getAccountIntelligenceMock(...args) };
});

vi.mock('@/features/market-intelligence/server/marketIntelligenceCompany.service.js', async (importOriginal) => {
  const actual = await importOriginal<
    typeof import('@/features/market-intelligence/server/marketIntelligenceCompany.service.js')
  >();
  return {
    ...actual,
    listMarketIntelligenceCompanies: (...args: unknown[]) => listMock(...args),
    approveToPipeline: (...args: unknown[]) => approveMock(...args),
  };
});

import { authenticateToken } from '@/shared/middlewares/authenticateToken.js';
import { requireTenant } from '@/shared/middlewares/authorization.js';
import { errorHandler } from '@/shared/middlewares/errorHandler.js';
import { marketIntelligenceCompanyRoutes } from '@/features/market-intelligence/server/marketIntelligenceCompany.routes.js';

type Role = 'ADMIN' | 'GESTOR' | 'CLOSER' | 'SDR' | 'VISUALIZADOR';

const session = (organizationId: string, role: Role = 'ADMIN') => ({
  user: {
    id: `user-${organizationId}`,
    email: `${organizationId}@atlasgr.test`,
    organizationId,
    role,
  },
});

function buildApp(authenticatedAs: ReturnType<typeof session> | null = session('org-a')) {
  authGetSessionMock.mockResolvedValue(authenticatedAs);

  const app = express();
  app.use(express.json());
  app.use(
    '/api/companies/market-intelligence',
    // Mesmo motivo do contract test irmão (accountIntelligence.routes.contract.test.ts): espelha
    // o apiLimiter genérico que server.ts já aplica em toda rota /api em produção, senão o CodeQL
    // (js/missing-rate-limiting) sinaliza este app de teste isolado como achado real.
    rateLimit({ windowMs: 15 * 60 * 1000, max: 10_000, standardHeaders: true, legacyHeaders: false }),
    authenticateToken,
    requireTenant,
    marketIntelligenceCompanyRoutes,
  );
  app.use(errorHandler);
  return app;
}

const account = {
  version: 'ldr-account-intelligence.v1',
  generatedAt: '2026-09-09T00:00:00.000Z',
  identity: { marketIntelligenceCompanyId: 'mic-1', cnpj: '48762359000122', legalName: 'Empresa Teste' },
};

beforeEach(() => {
  vi.clearAllMocks();
  getTenantPrismaMock.mockImplementation((organizationId: string) => ({ organizationId }));
});

describe('GET /api/companies/market-intelligence/:cnpj/intelligence', () => {
  it('nega sessão ausente antes de consultar o catálogo', async () => {
    const response = await request(buildApp(null)).get(
      '/api/companies/market-intelligence/48762359000122/intelligence',
    );

    expect(response.status).toBe(401);
    expect(getAccountIntelligenceMock).not.toHaveBeenCalled();
  });

  it('devolve 200 com o Account Intelligence quando o CNPJ existe no catálogo', async () => {
    getAccountIntelligenceMock.mockResolvedValue({ account, dataset: { competencia: '2026-08' } });

    const response = await request(buildApp()).get(
      '/api/companies/market-intelligence/48762359000122/intelligence',
    );

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ success: true, data: account });
    expect(getAccountIntelligenceMock).toHaveBeenCalledWith('48762359000122');
  });

  it('devolve 404 com mensagem em português quando o CNPJ não está no catálogo — nunca o "Not found" cru do catch-all de /api/*', async () => {
    getAccountIntelligenceMock.mockResolvedValue({ account: null, dataset: null });

    const response = await request(buildApp()).get(
      '/api/companies/market-intelligence/48762359000122/intelligence',
    );

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toMatch(/catálogo de intelig/i);
    expect(response.body.error).not.toBe('Not found');
  });

  it('devolve 400 quando o CNPJ tem formato inválido', async () => {
    // Instância real de CompanyCatalogValidationError (reaproveitada do módulo mockado só
    // parcialmente via importOriginal) — precisa ser a classe de verdade para o
    // `instanceof CompanyCatalogValidationError` em toAppError() reconhecer o erro.
    const { CompanyCatalogValidationError } = await import(
      '@/features/market-intelligence/server/marketIntelligenceCompany.service.js'
    );
    getAccountIntelligenceMock.mockRejectedValue(
      new CompanyCatalogValidationError('CNPJ inválido para o catálogo empresarial.'),
    );

    const response = await request(buildApp()).get(
      '/api/companies/market-intelligence/abc/intelligence',
    );

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/CNPJ inválido/);
  });
});

describe('GET /api/companies/market-intelligence (lista/matriz-filiais)', () => {
  it('resolve raiz de 8 dígitos como cnpjRoot, não como cnpj completo', async () => {
    listMock.mockResolvedValue({ data: [], meta: { page: 1, pageSize: 50, total: 0, totalPages: 0 }, dataset: null });

    const response = await request(buildApp()).get(
      '/api/companies/market-intelligence?cnpj=48762359&pageSize=50',
    );

    expect(response.status).toBe(200);
    expect(listMock).toHaveBeenCalledWith(
      expect.objectContaining({ cnpjRoot: '48762359', cnpj: undefined }),
    );
  });
});

describe('POST /api/companies/market-intelligence/:cnpj/approve-to-pipeline', () => {
  it('exige papel com permissão de escrita (VISUALIZADOR não pode aprovar)', async () => {
    const response = await request(buildApp(session('org-a', 'VISUALIZADOR'))).post(
      '/api/companies/market-intelligence/48762359000122/approve-to-pipeline',
    );

    expect(response.status).toBe(403);
    expect(approveMock).not.toHaveBeenCalled();
  });

  it('aprova e devolve companyId/leadId quando o CNPJ existe no catálogo', async () => {
    approveMock.mockResolvedValue({
      company: { id: 'company-1' },
      lead: { id: 'lead-1' },
      message: 'Empresa e Lead aprovados com sucesso para o Pipeline CRM!',
    });

    const response = await request(buildApp(session('org-a', 'SDR'))).post(
      '/api/companies/market-intelligence/48762359000122/approve-to-pipeline',
    );

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ success: true, companyId: 'company-1', leadId: 'lead-1' });
    expect(approveMock).toHaveBeenCalledWith('org-a', '48762359000122', 'user-org-a');
  });
});
