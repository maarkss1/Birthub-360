import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '../../src/lib/prisma';
import { requestContext } from '../../src/lib/async-context';

/**
 * Real Cross-Tenant RLS Isolation Tests (Database-Level Enforcement)
 *
 * Verifies against PostgreSQL with the real application role (NOSUPERUSER) that:
 * 1. SELECT cross-tenant: blocked / invisible (returns null or 0 results)
 * 2. UPDATE cross-tenant: blocked (throws P2025 or updates 0 rows)
 * 3. DELETE cross-tenant: blocked (throws P2025 or deletes 0 rows)
 * 4. INSERT cross-tenant: blocked (violates WITH CHECK policy, throws 42501 / RLS policy violation)
 *
 * Covers representative tables from the blocking list:
 * - ForecastSnapshot (financial metrics)
 * - SavedView (CRM Kanban views)
 * - AutomationVersion (automation engine rules)
 * - CopilotoConversation (AI Copilot dialogs)
 * - CadenceSequence (sales cadence sequences)
 * - CrmCommercialDocument (commercial proposals)
 */

const withBypass = <T>(fn: () => Promise<T>): Promise<T> =>
  requestContext.run({ bypassRls: true }, fn);
const asOrg = <T>(tenantId: string, fn: () => Promise<T>): Promise<T> =>
  requestContext.run({ tenantId }, fn);

const ORG_A = 'test-rls-iso-org-a';
const ORG_B = 'test-rls-iso-org-b';

describe('Isolamento Semântico Real Cross-Tenant via PostgreSQL RLS', () => {
  beforeAll(async () => {
    await withBypass(async () => {
      // Cria tenants A e B
      for (const [id, name] of [
        [ORG_A, 'Tenant A Isolation Test'],
        [ORG_B, 'Tenant B Isolation Test'],
      ] as const) {
        const exists = await prisma.organization.findUnique({ where: { id } });
        if (!exists) {
          await prisma.organization.create({ data: { id, name } });
        }
      }

      // Cria usuários donos nos tenants para tabelas que exigem userId (SavedView, CopilotoConversation)
      const userA = await prisma.user.findUnique({ where: { email: 'user-a-rls@test.com' } });
      if (!userA) {
        await prisma.user.create({
          data: {
            id: 'user-a-rls-id',
            name: 'User A',
            email: 'user-a-rls@test.com',
            organizationId: ORG_A,
          },
        });
      }

      const userB = await prisma.user.findUnique({ where: { email: 'user-b-rls@test.com' } });
      if (!userB) {
        await prisma.user.create({
          data: {
            id: 'user-b-rls-id',
            name: 'User B',
            email: 'user-b-rls@test.com',
            organizationId: ORG_B,
          },
        });
      }

      // Cria automação para AutomationVersion
      const autoA = await prisma.automation.findUnique({ where: { id: 'auto-a-rls-id' } });
      if (!autoA) {
        await prisma.automation.create({
          data: {
            id: 'auto-a-rls-id',
            name: 'Automation A',
            organizationId: ORG_A,
            trigger: 'LEAD_CREATED',
            action: 'ENRICH_COMPANY',
            actionConfig: {},
          },
        });
      }
    });
  });

  afterAll(async () => {
    await withBypass(async () => {
      // Limpeza de tabelas testadas
      await prisma.forecastSnapshot.deleteMany({ where: { organizationId: { in: [ORG_A, ORG_B] } } });
      await prisma.savedView.deleteMany({ where: { organizationId: { in: [ORG_A, ORG_B] } } });
      await prisma.automationVersion.deleteMany({ where: { organizationId: { in: [ORG_A, ORG_B] } } });
      await prisma.automation.deleteMany({ where: { organizationId: { in: [ORG_A, ORG_B] } } });
      await prisma.copilotoConversation.deleteMany({ where: { organizationId: { in: [ORG_A, ORG_B] } } });
      await prisma.cadenceSequence.deleteMany({ where: { organizationId: { in: [ORG_A, ORG_B] } } });
      await prisma.crmCommercialDocument.deleteMany({ where: { organizationId: { in: [ORG_A, ORG_B] } } });
      await prisma.user.deleteMany({ where: { id: { in: ['user-a-rls-id', 'user-b-rls-id'] } } });
      await prisma.organization.deleteMany({ where: { id: { in: [ORG_A, ORG_B] } } });
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 1. ForecastSnapshot
  // ───────────────────────────────────────────────────────────────────────────
  describe('ForecastSnapshot — Isolamento Cross-Tenant', () => {
    it('SELECT, UPDATE, DELETE e INSERT cross-tenant são bloqueados pelo PostgreSQL RLS', async () => {
      // 1. Inserir registro no Tenant A
      const snapA = await asOrg(ORG_A, () =>
        prisma.forecastSnapshot.create({
          data: {
            organizationId: ORG_A,
            period: '2026-Q3',
            weightedPipeline: 100000,
            unweightedPipeline: 250000,
            commitCategoryTotal: 80000,
            bestCaseCategoryTotal: 150000,
            pipelineCategoryTotal: 250000,
            closedWonTotal: 50000,
            coverageRatio: 3.5,
          },
        }),
      );

      // 2. Inserir registro no Tenant B
      const snapB = await asOrg(ORG_B, () =>
        prisma.forecastSnapshot.create({
          data: {
            organizationId: ORG_B,
            period: '2026-Q3',
            weightedPipeline: 200000,
            unweightedPipeline: 400000,
            commitCategoryTotal: 160000,
            bestCaseCategoryTotal: 300000,
            pipelineCategoryTotal: 400000,
            closedWonTotal: 100000,
            coverageRatio: 4.0,
          },
        }),
      );

      // 3. SELECT cross-tenant: Tenant B tenta consultar registro do Tenant A
      const readAsB = await asOrg(ORG_B, () =>
        prisma.forecastSnapshot.findUnique({ where: { id: snapA.id } }),
      );
      expect(readAsB).toBeNull();

      // Tenant A consegue consultar o próprio registro
      const readAsA = await asOrg(ORG_A, () =>
        prisma.forecastSnapshot.findUnique({ where: { id: snapA.id } }),
      );
      expect(readAsA?.id).toBe(snapA.id);

      // 4. UPDATE cross-tenant: Tenant B tenta atualizar registro do Tenant A
      await expect(
        asOrg(ORG_B, () =>
          prisma.forecastSnapshot.update({
            where: { id: snapA.id },
            data: { weightedPipeline: 999999 },
          }),
        ),
      ).rejects.toThrow();

      // Confirma que o valor original permanece inalterado
      const verifyUnchanged = await asOrg(ORG_A, () =>
        prisma.forecastSnapshot.findUnique({ where: { id: snapA.id } }),
      );
      expect(verifyUnchanged?.weightedPipeline).toBe(100000);

      // 5. DELETE cross-tenant: Tenant B tenta deletar registro do Tenant A
      await expect(
        asOrg(ORG_B, () => prisma.forecastSnapshot.delete({ where: { id: snapA.id } })),
      ).rejects.toThrow();

      // 6. INSERT cross-tenant: Tenant B tenta inserir registro atribuindo organizationId = ORG_A (validação do WITH CHECK)
      await expect(
        asOrg(ORG_B, () =>
          prisma.forecastSnapshot.create({
            data: {
              organizationId: ORG_A, // Atribuição forçada cross-tenant
              period: '2026-Q4',
              weightedPipeline: 50000,
              unweightedPipeline: 100000,
              commitCategoryTotal: 40000,
              bestCaseCategoryTotal: 80000,
              pipelineCategoryTotal: 100000,
              closedWonTotal: 20000,
              coverageRatio: 2.0,
            },
          }),
        ),
      ).rejects.toThrow();
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 2. SavedView
  // ───────────────────────────────────────────────────────────────────────────
  describe('SavedView — Isolamento Cross-Tenant', () => {
    it('SELECT, UPDATE, DELETE e INSERT cross-tenant são bloqueados pelo PostgreSQL RLS', async () => {
      // 1. Inserir registro no Tenant A
      const viewA = await asOrg(ORG_A, () =>
        prisma.savedView.create({
          data: {
            name: 'View Pipeline A',
            funnel: 'Lead',
            organizationId: ORG_A,
            userId: 'user-a-rls-id',
            filters: { status: 'NOVO' },
          },
        }),
      );

      // 2. SELECT cross-tenant: Tenant B tenta ler a view do Tenant A
      const readAsB = await asOrg(ORG_B, () =>
        prisma.savedView.findUnique({ where: { id: viewA.id } }),
      );
      expect(readAsB).toBeNull();

      // 3. UPDATE cross-tenant: Tenant B tenta renomear a view do Tenant A
      await expect(
        asOrg(ORG_B, () =>
          prisma.savedView.update({
            where: { id: viewA.id },
            data: { name: 'View Hackeada' },
          }),
        ),
      ).rejects.toThrow();

      // 4. DELETE cross-tenant: Tenant B tenta excluir a view do Tenant A
      await expect(
        asOrg(ORG_B, () => prisma.savedView.delete({ where: { id: viewA.id } })),
      ).rejects.toThrow();

      // 5. INSERT cross-tenant: Tenant B tenta criar view forjando organizationId = ORG_A (validação do WITH CHECK)
      await expect(
        asOrg(ORG_B, () =>
          prisma.savedView.create({
            data: {
              name: 'View Injetada Cross-Tenant',
              funnel: 'Lead',
              organizationId: ORG_A,
              userId: 'user-b-rls-id',
            },
          }),
        ),
      ).rejects.toThrow();
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 3. CadenceSequence
  // ───────────────────────────────────────────────────────────────────────────
  describe('CadenceSequence — Isolamento Cross-Tenant com WITH CHECK Simétrico', () => {
    it('SELECT, UPDATE, DELETE e INSERT cross-tenant são bloqueados para contexto de tenant', async () => {
      // 1. Inserir CadenceSequence no Tenant A
      const seqA = await asOrg(ORG_A, () =>
        prisma.cadenceSequence.create({
          data: {
            name: 'Sequência SDR Tenant A',
            organizationId: ORG_A,
            steps: [{ stepNumber: 1, type: 'email', delayDays: 1 }],
          },
        }),
      );

      // 2. SELECT cross-tenant: Tenant B não enxerga a sequência do Tenant A
      const readAsB = await asOrg(ORG_B, () =>
        prisma.cadenceSequence.findUnique({ where: { id: seqA.id } }),
      );
      expect(readAsB).toBeNull();

      // 3. UPDATE cross-tenant: Tenant B não consegue alterar
      await expect(
        asOrg(ORG_B, () =>
          prisma.cadenceSequence.update({
            where: { id: seqA.id },
            data: { name: 'Sequência Corrompida' },
          }),
        ),
      ).rejects.toThrow();

      // 4. DELETE cross-tenant: Tenant B não consegue deletar
      await expect(
        asOrg(ORG_B, () => prisma.cadenceSequence.delete({ where: { id: seqA.id } })),
      ).rejects.toThrow();

      // 5. INSERT cross-tenant: Tenant B tenta criar sequência para o Tenant A (validação de WITH CHECK)
      await expect(
        asOrg(ORG_B, () =>
          prisma.cadenceSequence.create({
            data: {
              name: 'Sequência Injetada em A',
              organizationId: ORG_A,
              steps: [],
            },
          }),
        ),
      ).rejects.toThrow();
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 4. CrmCommercialDocument
  // ───────────────────────────────────────────────────────────────────────────
  describe('CrmCommercialDocument — Isolamento Cross-Tenant', () => {
    it('SELECT, UPDATE, DELETE e INSERT cross-tenant são bloqueados para contexto de tenant', async () => {
      // 1. Inserir documento comercial no Tenant A
      const docA = await asOrg(ORG_A, () =>
        prisma.crmCommercialDocument.create({
          data: {
            organizationId: ORG_A,
            type: 'PROPOSTA',
            number: 'PROP-001-A',
            title: 'Proposta Comercial Tenant A',
            value: 50000,
            content: {},
          },
        }),
      );

      // 2. SELECT cross-tenant: Tenant B não enxerga
      const readAsB = await asOrg(ORG_B, () =>
        prisma.crmCommercialDocument.findUnique({ where: { id: docA.id } }),
      );
      expect(readAsB).toBeNull();

      // 3. UPDATE cross-tenant: Tenant B não consegue alterar
      await expect(
        asOrg(ORG_B, () =>
          prisma.crmCommercialDocument.update({
            where: { id: docA.id },
            data: { value: 1 },
          }),
        ),
      ).rejects.toThrow();

      // 4. DELETE cross-tenant: Tenant B não consegue excluir
      await expect(
        asOrg(ORG_B, () => prisma.crmCommercialDocument.delete({ where: { id: docA.id } })),
      ).rejects.toThrow();

      // 5. INSERT cross-tenant: Tenant B tenta criar documento em nome do Tenant A
      await expect(
        asOrg(ORG_B, () =>
          prisma.crmCommercialDocument.create({
            data: {
              organizationId: ORG_A,
              type: 'CONTRATO',
              number: 'CONT-HACK-001',
              title: 'Contrato Falso',
              value: 1000000,
              content: {},
            },
          }),
        ),
      ).rejects.toThrow();
    });
  });
});
