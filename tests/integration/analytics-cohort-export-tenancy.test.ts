import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express, { type Express } from 'express';
import rateLimit from 'express-rate-limit';

import { prisma } from '../../src/lib/prisma';
import { authenticateToken } from '../../src/shared/middlewares/authenticateToken';
import { requireTenant } from '../../src/shared/middlewares/authorization';
import { analyticsRoutes } from '../../src/features/analytics/routes/analytics.routes';
import { errorHandler } from '../../src/shared/middlewares/errorHandler';
import { setupDI } from '../../src/shared/di/setup';
import { LeadFactory } from '../helpers/factories';
import { withRlsBypass, withTenant, signUpRealUser, type RealSessionUser } from '../helpers/rbac-e2e-helpers';

// Fecha o "Teste esperado" de ACH-04-02 (ver relatório de auditoria) / do handoff original
// (.agents/handoffs/roadmap-v2-transversais-2/18-para-04-analytics-cohort-dados-ficticios.md):
// a correção de dado fictício de GET /api/analytics/cohort e /api/analytics/export/csv já tinha
// sido feita (cohort real via AnalyticsUseCases.cohortAnalysis, export como CSV real via
// buildCohortCsv — ver AnalyticsController), mas nunca ganhou teste de integração com banco real
// provando isolamento de tenant. Mesmo padrão de sessão real + RLS real de
// rbac-e2e-crm-write-routes.test.ts, sem duplicar aquele spec (este cobre só analytics).

function buildApp(): Express {
  const app = express();
  app.use(express.json());
  app.use(
    '/api/analytics',
    // Espelha o apiLimiter genérico que server.ts/rateLimiters.ts já aplica em toda rota
    // /api em produção (`app.use('/api', apiLimiter)`, antes de mountFeatureRoutes) — sem
    // isso, este app de teste isolado (supertest, nunca exposto a tráfego real) fica sem
    // nenhum rate limiter no caminho de authenticateToken/requireTenant, o que o CodeQL
    // (js/missing-rate-limiting) sinaliza como achado real. Limite generoso de propósito:
    // não deve nunca disparar durante os testes deste arquivo.
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 10_000,
      standardHeaders: true,
      legacyHeaders: false,
    }),
    authenticateToken,
    requireTenant,
    analyticsRoutes,
  );
  app.use(errorHandler);
  return app;
}

/** Mesma lógica de bucket de mês (UTC) de AnalyticsUseCases — usada só para montar a asserção. */
function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

async function createLeadWithTimes(
  organizationId: string,
  overrides: Record<string, unknown>,
): Promise<{ id: string }> {
  return withTenant(organizationId, () =>
    prisma.lead.create({
      data: LeadFactory.build({ organizationId, ...overrides }),
    }) as unknown as Promise<{ id: string }>,
  );
}

describe('GET /api/analytics/cohort e /api/analytics/export/csv — banco real, tenancy', () => {
  let app: Express;

  let orgA: RealSessionUser;
  let orgB: RealSessionUser;

  const createdUserIds: string[] = [];
  const createdOrgIds: string[] = [];

  const now = new Date();
  const currentMonth = monthKey(now);

  beforeAll(async () => {
    setupDI();
    app = buildApp();

    orgA = await signUpRealUser('analytics-cohort-a', 'ADMIN');
    orgB = await signUpRealUser('analytics-cohort-b', 'ADMIN');

    for (const u of [orgA, orgB]) {
      createdUserIds.push(u.userId);
      createdOrgIds.push(u.organizationId);
    }
  }, 30_000);

  afterAll(async () => {
    await withRlsBypass(async () => {
      await prisma.lead.deleteMany({ where: { organizationId: { in: createdOrgIds } } });
      await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
      await prisma.organization.deleteMany({ where: { id: { in: createdOrgIds } } });
    });
  });

  it('organização sem Lead: cohort vazio (não fictício, não 3 meses fixos hardcoded)', async () => {
    const res = await request(app).get('/api/analytics/cohort').set('Cookie', orgB.cookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.cohorts).toEqual([]);
  });

  // As 3 verificações abaixo (números reais, isolamento de tenant, export CSV) precisam
  // compartilhar os MESMOS 3 leads de orgA — por isso vivem num único `it()`, não em três
  // separados. O harness global de integração (tests/helpers/integration-setup.ts) roda
  // `cleanDatabase()` num `afterEach` que apaga TODOS os leads de TODAS as organizações depois de
  // cada `it()` — leads criados num teste nunca sobrevivem para o próximo.
  it('organização com Leads reais: números batem com o banco, isolamento entre tenants e export CSV', async () => {
    // 3 leads criados "este mês" para orgA: 1 ganho em <30d, 1 ganho em <60d (mas não <30d), 1
    // ainda aberto (não fechado). Números esperados são construídos por design e depois
    // reconferidos com uma contagem independente direta no banco (não recalculados pelo mesmo
    // código do endpoint) — provando que o endpoint não está devolvendo dado fabricado.
    await createLeadWithTimes(orgA.organizationId, {
      status: 'Negocios_Ganhos',
      createdAt: now,
      closedAt: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000), // +10 dias: dentro de 30 e 60
    });
    await createLeadWithTimes(orgA.organizationId, {
      status: 'Negocios_Ganhos',
      createdAt: now,
      closedAt: new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000), // +45 dias: dentro de 60, fora de 30
    });
    await createLeadWithTimes(orgA.organizationId, {
      status: 'Lead_Recebido',
      createdAt: now,
      closedAt: null, // ainda aberto
    });

    // ---- 1. números reais, batendo com contagem independente direta no banco ----
    const res = await request(app).get('/api/analytics/cohort').set('Cookie', orgA.cookie);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const cohorts: Array<{ month: string; total: number; won30d: number; won60d: number }> =
      res.body.data.cohorts;
    const bucket = cohorts.find((row) => row.month === currentMonth);
    expect(bucket).toBeDefined();
    expect(bucket).toEqual({ month: currentMonth, total: 3, won30d: 1, won60d: 2 });

    const directCount = await withTenant(orgA.organizationId, () =>
      prisma.lead.count({
        where: {
          organizationId: orgA.organizationId,
          deletedAt: null,
          createdAt: {
            gte: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)),
          },
        },
      }),
    );
    expect(directCount).toBe(bucket?.total);

    // ---- 2. isolamento entre tenants: orgB nunca vê os leads de orgA ----
    const resB = await request(app).get('/api/analytics/cohort').set('Cookie', orgB.cookie);
    expect(resB.status).toBe(200);
    expect(resB.body.data.cohorts).toEqual([]);

    const crossTenantCount = await withTenant(orgB.organizationId, () =>
      prisma.lead.count({ where: { organizationId: orgA.organizationId } }),
    );
    expect(crossTenantCount).toBe(0);

    // ---- 3. export CSV bate linha a linha com o mesmo cohort ----
    const exportRes = await request(app)
      .get('/api/analytics/export/csv')
      .set('Cookie', orgA.cookie);

    expect(exportRes.status).toBe(200);
    expect(exportRes.headers['content-type']).toMatch(/text\/csv/);

    const csvBody: string = exportRes.text;
    const lines = csvBody.trim().split('\n');
    expect(lines[0]).toBe('Mes,Total de Leads,Ganhos em 30 dias,Ganhos em 60 dias');
    expect(lines.length - 1).toBe(cohorts.length);

    const currentLine = lines.find((line) => line.startsWith(`${currentMonth},`));
    expect(currentLine).toBe(`${bucket?.month},${bucket?.total},${bucket?.won30d},${bucket?.won60d}`);
  });
});
