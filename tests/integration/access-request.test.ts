import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { CAPABILITY_CODES } from '../../src/config/capability-catalog';
import { requestContext } from '../../src/lib/async-context';
import { prisma } from '../../src/lib/prisma';
import normalizedBirthHubCatalog from '../../src/features/job-roles/catalog/agents.normalized.json';
import { setupDI } from '../../src/shared/di/setup';
import { runAgentCatalogImport } from '../../scripts/import-agent-catalog';
import { runCapabilityEngineSeed } from '../../scripts/seed-capability-engine';
import { runMultiCargoSeed } from '../../scripts/seed-multi-cargo';
import { assignJobRole, getJobRoleByCode } from '../../src/features/job-roles/services/jobRole.service';
import {
  AccessRequestServiceError,
  cancelAccessRequest,
  createAccessRequest,
  decideAccessRequest,
  listMyAccessRequests,
  listPendingApprovalsForApprover,
  revokeTemporaryCapabilityGrant,
} from '../../src/features/job-roles/services/accessRequest.service';
import { authorizeCapability } from '../../src/features/job-roles/services/capabilityAuthorization.service';

const ORG_ID = 'test-org-id';
const OTHER_ORG_ID = 'test-org-id-2';

let userCounter = 0;
async function makeUserWithJobRole(jobRoleCode: string, userRole = 'ADMIN', organizationId = ORG_ID) {
  userCounter++;
  const user = await prisma.user.create({
    data: {
      name: `AccessRequest Test User ${userCounter}`,
      email: `access-request.test.${Date.now()}.${userCounter}@test.com`,
      organizationId,
      role: userRole,
    },
  });
  const jobRole = await getJobRoleByCode(jobRoleCode);
  await assignJobRole({
    organizationId,
    userId: user.id,
    jobRoleId: jobRole!.id,
    assignedBy: 'admin-access-request-test',
  });
  return { user, jobRole: jobRole! };
}

describe('Cross-Role Authorization + Aprovações (PROMPT 7)', () => {
  const sourceAgentCodes = (normalizedBirthHubCatalog.agents as { code: string }[]).map(
    (a) => a.code,
  );

  beforeAll(async () => {
    setupDI();
    await runMultiCargoSeed();
    await runAgentCatalogImport();
    await runCapabilityEngineSeed();
  });

  afterAll(async () => {
    // `AccessRequest`/`TemporaryCapabilityGrant`/`ApprovalDecision` têm RLS real (tenant isolation
    // é a própria feature testada aqui) — um `prisma.X.deleteMany` cru, fora de
    // `requestContext.run`, roda com `basePrisma` sem `app.tenant_id` setado (ver
    // `executeWithRls` em `src/lib/prisma.ts`); a policy de RLS então nunca torna nenhuma linha
    // destas tabelas visível para o DELETE, que "sucede" silenciosamente sem apagar nada (0 linhas
    // afetadas, sem erro) — só vira erro visível bem mais tarde, no `capabilityDefinition.
    // deleteMany` abaixo, bloqueado pela FK Restrict numa linha de `AccessRequest` que achávamos
    // já apagada. `bypassRls: true` é o mesmo escape-hatch de setup/limpeza direta já usado em
    // dezenas de outros arquivos deste diretório (ex.: `agent-memory.test.ts`, `ai-budget.test.ts`)
    // — nunca em código de produção.
    await requestContext.run({ bypassRls: true }, async () => {
      await prisma.temporaryCapabilityGrant.deleteMany({ where: { organizationId: ORG_ID } });
      await prisma.approvalDecision.deleteMany({ where: { organizationId: ORG_ID } });
      await prisma.accessRequest.deleteMany({ where: { organizationId: ORG_ID } });
      await prisma.auditLog.deleteMany({ where: { entity: 'AccessRequest' } });
      await prisma.auditLog.deleteMany({ where: { entity: 'TemporaryCapabilityGrant' } });
      await prisma.userJobRole.deleteMany({
        where: { organizationId: { in: [ORG_ID, OTHER_ORG_ID] } },
      });
      await prisma.user.deleteMany({
        where: { email: { contains: 'access-request.test' } },
      });
      await prisma.agentCapabilityGrant.deleteMany({
        where: { capabilityDefinition: { code: { in: CAPABILITY_CODES } } },
      });
      await prisma.roleCapabilityGrant.deleteMany({
        where: { capabilityDefinition: { code: { in: CAPABILITY_CODES } } },
      });
      await prisma.capabilityDefinition.deleteMany({ where: { code: { in: CAPABILITY_CODES } } });
      await prisma.roleAgentGrant.deleteMany({
        where: { agentDefinition: { code: { in: sourceAgentCodes } } },
      });
      await prisma.agentVersion.deleteMany({
        where: { agentDefinition: { code: { in: sourceAgentCodes } } },
      });
      await prisma.agentDefinition.deleteMany({ where: { code: { in: sourceAgentCodes } } });
    });
  });

  describe('auto-aprovação — READ_CONSULTA de baixo risco', () => {
    it('SDR pedindo contract.read (REQUEST level) é auto-aprovado pelo SYSTEM e o grant já libera authorizeCapability', async () => {
      const { user } = await makeUserWithJobRole('SDR');
      const resource = { type: 'CONTRACT', id: 'contract-auto-1' };

      const accessRequest = await createAccessRequest({
        actor: { userId: user.id, organizationId: ORG_ID, userRole: 'SDR' },
        capabilityCode: 'contract.read',
        resource,
        reason: 'Preciso conferir o contrato do cliente antes da call.',
      });

      expect(accessRequest.category).toBe('READ_CONSULTA');
      expect(accessRequest.status).toBe('APPROVED');
      expect(accessRequest.effectiveStatus).toBe('APPROVED');
      expect(accessRequest.grant).not.toBeNull();
      expect(accessRequest.decisions).toHaveLength(1);
      expect(accessRequest.decisions[0]!.approverId).toBe('SYSTEM');
      expect(accessRequest.decisions[0]!.reasonCode).toBe('AUTO_APPROVED_READ_ONLY');

      const agentGrant = await prisma.roleAgentGrant.findFirst({
        where: {
          jobRole: { code: 'SDR' },
          agentDefinition: {
            capabilityGrants: {
              some: { capabilityDefinition: { code: 'contract.read' }, isActive: true },
            },
          },
          isActive: true,
        },
        select: { agentDefinition: { select: { code: true } } },
      });
      expect(agentGrant, 'nenhum agente do SDR tem contract.read para testar authorizeCapability').not.toBeNull();

      const decision = await authorizeCapability({
        actor: { userId: user.id, organizationId: ORG_ID, userRole: 'SDR' },
        agentCode: agentGrant!.agentDefinition.code,
        capabilityCode: 'contract.read',
        resource,
      });
      expect(decision.allowed).toBe(true);
      expect(decision.temporaryGrantId).toBe(accessRequest.grant!.id);
    });
  });

  describe('resource scope — grant nunca cobre um resource diferente do aprovado', () => {
    it('temporaryGrant aprovado para resource A não libera authorizeCapability para resource B', async () => {
      const { user } = await makeUserWithJobRole('SDR');
      const approvedResource = { type: 'CONTRACT', id: 'contract-scope-a' };
      const otherResource = { type: 'CONTRACT', id: 'contract-scope-b' };

      await createAccessRequest({
        actor: { userId: user.id, organizationId: ORG_ID, userRole: 'SDR' },
        capabilityCode: 'contract.read',
        resource: approvedResource,
        reason: 'Conferir contrato A.',
      });

      const agentGrant = await prisma.roleAgentGrant.findFirst({
        where: {
          jobRole: { code: 'SDR' },
          agentDefinition: {
            capabilityGrants: {
              some: { capabilityDefinition: { code: 'contract.read' }, isActive: true },
            },
          },
          isActive: true,
        },
        select: { agentDefinition: { select: { code: true } } },
      });

      const decisionOtherResource = await authorizeCapability({
        actor: { userId: user.id, organizationId: ORG_ID, userRole: 'SDR' },
        agentCode: agentGrant!.agentDefinition.code,
        capabilityCode: 'contract.read',
        resource: otherResource,
      });
      expect(decisionOtherResource.allowed).toBe(false);
      expect(decisionOtherResource.reason).toBe('CROSS_ROLE_REQUEST_REQUIRED');
      expect(decisionOtherResource.temporaryGrantId).toBeNull();
    });
  });

  describe('aprovação humana — CONTRATO (gerente/área autorizada)', () => {
    it('CLOSER pedindo contract.generate fica PENDING, GERENTE_COMERCIAL aprova, grant libera execução', async () => {
      const { user: closer } = await makeUserWithJobRole('CLOSER');
      const { user: gerente } = await makeUserWithJobRole('GERENTE_COMERCIAL', 'GESTOR');
      const resource = { type: 'DEAL', id: 'deal-contract-1' };

      const accessRequest = await createAccessRequest({
        actor: { userId: closer.id, organizationId: ORG_ID, userRole: 'CLOSER' },
        capabilityCode: 'contract.generate',
        resource,
        reason: 'Cliente fechou, preciso gerar o contrato.',
      });
      expect(accessRequest.category).toBe('CONTRATO');
      expect(accessRequest.status).toBe('PENDING');

      const pendingForGerente = await listPendingApprovalsForApprover(
        ORG_ID,
        gerente.id,
        'GESTOR',
      );
      expect(pendingForGerente.map((r) => r.id)).toContain(accessRequest.id);

      const decided = await decideAccessRequest({
        organizationId: ORG_ID,
        accessRequestId: accessRequest.id,
        approverId: gerente.id,
        approverRole: 'GESTOR',
        outcome: 'APPROVED',
      });
      expect(decided.status).toBe('APPROVED');
      expect(decided.decisions).toHaveLength(1);
      expect(decided.decisions[0]!.reasonCode).toBe('APPROVED_ELIGIBLE_APPROVER');

      const stillPending = await listPendingApprovalsForApprover(ORG_ID, gerente.id, 'GESTOR');
      expect(stillPending.map((r) => r.id)).not.toContain(accessRequest.id);
    });
  });

  describe('self-approval denied', () => {
    it('requester não pode decidir o próprio pedido — pedido continua PENDING', async () => {
      const { user: closer } = await makeUserWithJobRole('CLOSER', 'GESTOR');
      const accessRequest = await createAccessRequest({
        actor: { userId: closer.id, organizationId: ORG_ID, userRole: 'GESTOR' },
        capabilityCode: 'contract.generate',
        resource: { type: 'DEAL', id: 'deal-self-approve' },
        reason: 'Teste de autoaprovação.',
      });

      await expect(
        decideAccessRequest({
          organizationId: ORG_ID,
          accessRequestId: accessRequest.id,
          approverId: closer.id,
          approverRole: 'GESTOR',
          outcome: 'APPROVED',
        }),
      ).rejects.toMatchObject({ code: 'SELF_APPROVAL_DENIED' });

      const row = await prisma.accessRequest.findUnique({ where: { id: accessRequest.id } });
      expect(row!.status).toBe('PENDING');
    });
  });

  describe('invalid approver', () => {
    it('aprovador sem UserRole mínimo é rejeitado — pedido continua PENDING', async () => {
      const { user: closer } = await makeUserWithJobRole('CLOSER');
      const { user: otherCloser } = await makeUserWithJobRole('CLOSER');
      const accessRequest = await createAccessRequest({
        actor: { userId: closer.id, organizationId: ORG_ID, userRole: 'CLOSER' },
        capabilityCode: 'contract.generate',
        resource: { type: 'DEAL', id: 'deal-invalid-approver-role' },
        reason: 'Teste de aprovador inválido (UserRole).',
      });

      await expect(
        decideAccessRequest({
          organizationId: ORG_ID,
          accessRequestId: accessRequest.id,
          approverId: otherCloser.id,
          approverRole: 'CLOSER',
          outcome: 'APPROVED',
        }),
      ).rejects.toMatchObject({ code: 'APPROVER_NOT_ELIGIBLE' });

      const row = await prisma.accessRequest.findUnique({ where: { id: accessRequest.id } });
      expect(row!.status).toBe('PENDING');
    });

    it('aprovador com UserRole suficiente mas JobRole fora da política é rejeitado', async () => {
      const { user: closer } = await makeUserWithJobRole('CLOSER');
      // BITRIX_GUARDIAN com UserRole GESTOR satisfaz o piso da categoria CONTRATO, mas não é um
      // dos JobRoles elegíveis (GERENTE_COMERCIAL/DIRETOR_COMERCIAL/CONTRATOS_ASSINATURA).
      const { user: bitrixGuardian } = await makeUserWithJobRole('BITRIX_GUARDIAN', 'GESTOR');
      const accessRequest = await createAccessRequest({
        actor: { userId: closer.id, organizationId: ORG_ID, userRole: 'CLOSER' },
        capabilityCode: 'contract.generate',
        resource: { type: 'DEAL', id: 'deal-invalid-approver-jobrole' },
        reason: 'Teste de aprovador inválido (JobRole).',
      });

      await expect(
        decideAccessRequest({
          organizationId: ORG_ID,
          accessRequestId: accessRequest.id,
          approverId: bitrixGuardian.id,
          approverRole: 'GESTOR',
          outcome: 'APPROVED',
        }),
      ).rejects.toMatchObject({ code: 'APPROVER_NOT_ELIGIBLE' });

      const row = await prisma.accessRequest.findUnique({ where: { id: accessRequest.id } });
      expect(row!.status).toBe('PENDING');
    });
  });

  describe('expiration', () => {
    it('grant com expiresAt no passado nunca é considerado por authorizeCapability', async () => {
      const { user: closer } = await makeUserWithJobRole('CLOSER');
      const { user: gerente } = await makeUserWithJobRole('GERENTE_COMERCIAL', 'GESTOR');
      const resource = { type: 'DEAL', id: 'deal-expired' };

      const accessRequest = await createAccessRequest({
        actor: { userId: closer.id, organizationId: ORG_ID, userRole: 'CLOSER' },
        capabilityCode: 'contract.generate',
        resource,
        reason: 'Teste de expiração.',
      });
      const decided = await decideAccessRequest({
        organizationId: ORG_ID,
        accessRequestId: accessRequest.id,
        approverId: gerente.id,
        approverRole: 'GESTOR',
        outcome: 'APPROVED',
      });

      await prisma.temporaryCapabilityGrant.update({
        where: { id: decided.grant!.id },
        data: { expiresAt: new Date(Date.now() - 60_000) },
      });

      const agentGrant = await prisma.roleAgentGrant.findFirst({
        where: {
          jobRole: { code: 'CLOSER' },
          agentDefinition: {
            capabilityGrants: {
              some: { capabilityDefinition: { code: 'contract.generate' }, isActive: true },
            },
          },
          isActive: true,
        },
        select: { agentDefinition: { select: { code: true } } },
      });
      const decision = await authorizeCapability({
        actor: { userId: closer.id, organizationId: ORG_ID, userRole: 'CLOSER' },
        agentCode: agentGrant!.agentDefinition.code,
        capabilityCode: 'contract.generate',
        resource,
      });
      expect(decision.allowed).toBe(false);
      expect(decision.reason).toBe('CROSS_ROLE_REQUEST_REQUIRED');

      const refreshed = await listMyAccessRequests(ORG_ID, closer.id);
      const refreshedRequest = refreshed.find((r) => r.id === accessRequest.id);
      expect(refreshedRequest!.effectiveStatus).toBe('EXPIRED');
    });
  });

  describe('revocation', () => {
    it('grant revogado por ADMIN nunca é mais considerado por authorizeCapability', async () => {
      const { user: closer } = await makeUserWithJobRole('CLOSER');
      const { user: gerente } = await makeUserWithJobRole('GERENTE_COMERCIAL', 'GESTOR');
      const { user: admin } = await makeUserWithJobRole('DIRETOR_COMERCIAL', 'ADMIN');
      const resource = { type: 'DEAL', id: 'deal-revoked' };

      const accessRequest = await createAccessRequest({
        actor: { userId: closer.id, organizationId: ORG_ID, userRole: 'CLOSER' },
        capabilityCode: 'contract.generate',
        resource,
        reason: 'Teste de revogação.',
      });
      const decided = await decideAccessRequest({
        organizationId: ORG_ID,
        accessRequestId: accessRequest.id,
        approverId: gerente.id,
        approverRole: 'GESTOR',
        outcome: 'APPROVED',
      });

      await revokeTemporaryCapabilityGrant({
        organizationId: ORG_ID,
        revokerId: admin.id,
        revokerRole: 'ADMIN',
        grantId: decided.grant!.id,
        reason: 'Cliente desistiu do fechamento.',
      });

      await expect(
        revokeTemporaryCapabilityGrant({
          organizationId: ORG_ID,
          revokerId: admin.id,
          revokerRole: 'ADMIN',
          grantId: decided.grant!.id,
          reason: 'Segunda tentativa.',
        }),
      ).rejects.toMatchObject({ code: 'ALREADY_REVOKED' });

      const agentGrant = await prisma.roleAgentGrant.findFirst({
        where: {
          jobRole: { code: 'CLOSER' },
          agentDefinition: {
            capabilityGrants: {
              some: { capabilityDefinition: { code: 'contract.generate' }, isActive: true },
            },
          },
          isActive: true,
        },
        select: { agentDefinition: { select: { code: true } } },
      });
      const decision = await authorizeCapability({
        actor: { userId: closer.id, organizationId: ORG_ID, userRole: 'CLOSER' },
        agentCode: agentGrant!.agentDefinition.code,
        capabilityCode: 'contract.generate',
        resource,
      });
      expect(decision.allowed).toBe(false);
      expect(decision.reason).toBe('CROSS_ROLE_REQUEST_REQUIRED');
    });

    it('cancelamento do próprio pedido PENDING não gera grant nenhum', async () => {
      const { user: closer } = await makeUserWithJobRole('CLOSER');
      const accessRequest = await createAccessRequest({
        actor: { userId: closer.id, organizationId: ORG_ID, userRole: 'CLOSER' },
        capabilityCode: 'contract.generate',
        resource: { type: 'DEAL', id: 'deal-cancelled' },
        reason: 'Vou cancelar este pedido.',
      });
      const cancelled = await cancelAccessRequest({
        organizationId: ORG_ID,
        requesterId: closer.id,
        requesterRole: 'CLOSER',
        accessRequestId: accessRequest.id,
      });
      expect(cancelled.status).toBe('CANCELLED');
      expect(cancelled.grant).toBeNull();
    });
  });

  describe('FUTURE_TOOL continua bloqueado mesmo com grant temporário aprovado', () => {
    it('signature.request (ASSINATURA) aprovado nunca vira allowed=true — FUTURE_TOOL', async () => {
      const { user: closer } = await makeUserWithJobRole('CLOSER');
      const { user: diretor } = await makeUserWithJobRole('DIRETOR_COMERCIAL', 'GESTOR');
      const resource = { type: 'DEAL', id: 'deal-signature' };

      const accessRequest = await createAccessRequest({
        actor: { userId: closer.id, organizationId: ORG_ID, userRole: 'CLOSER' },
        capabilityCode: 'signature.request',
        resource,
        reason: 'Preciso enviar para assinatura.',
      });
      expect(accessRequest.category).toBe('ASSINATURA');

      const decided = await decideAccessRequest({
        organizationId: ORG_ID,
        accessRequestId: accessRequest.id,
        approverId: diretor.id,
        approverRole: 'GESTOR',
        outcome: 'APPROVED',
      });
      expect(decided.status).toBe('APPROVED');
      expect(decided.grant).not.toBeNull();

      const agentGrant = await prisma.roleAgentGrant.findFirst({
        where: {
          jobRole: { code: 'CLOSER' },
          agentDefinition: {
            capabilityGrants: {
              some: { capabilityDefinition: { code: 'signature.request' }, isActive: true },
            },
          },
          isActive: true,
        },
        select: { agentDefinition: { select: { code: true } } },
      });
      const decision = await authorizeCapability({
        actor: { userId: closer.id, organizationId: ORG_ID, userRole: 'CLOSER' },
        agentCode: agentGrant!.agentDefinition.code,
        capabilityCode: 'signature.request',
        resource,
      });
      expect(decision.allowed).toBe(false);
      expect(decision.reason).toBe('FUTURE_TOOL');
    });
  });

  describe('SOURCE_REQUIRED continua bloqueado mesmo com grant temporário ativo', () => {
    it('billing.read (RECEITA_FATURAMENTO, já EXECUTE) permanece SOURCE_REQUIRED com um grant temporário criado diretamente', async () => {
      const { user: financeiro } = await makeUserWithJobRole('RECEITA_FATURAMENTO');
      const capability = await prisma.capabilityDefinition.findUniqueOrThrow({
        where: { code: 'billing.read' },
      });
      const resource = { type: 'ORGANIZATION', id: ORG_ID };

      const baselineAgentGrant = await prisma.roleAgentGrant.findFirst({
        where: {
          jobRole: { code: 'RECEITA_FATURAMENTO' },
          agentDefinition: {
            capabilityGrants: { some: { capabilityDefinition: { code: 'billing.read' }, isActive: true } },
          },
          isActive: true,
        },
        select: { agentDefinition: { select: { code: true } } },
      });
      const baseline = await authorizeCapability({
        actor: { userId: financeiro.id, organizationId: ORG_ID, userRole: 'ADMIN' },
        agentCode: baselineAgentGrant!.agentDefinition.code,
        capabilityCode: 'billing.read',
        resource,
      });
      expect(baseline.reason).toBe('SOURCE_REQUIRED');

      await prisma.temporaryCapabilityGrant.create({
        data: {
          organizationId: ORG_ID,
          accessRequestId: (
            await prisma.accessRequest.create({
              data: {
                organizationId: ORG_ID,
                requesterId: financeiro.id,
                requesterRole: 'ADMIN',
                requesterJobRoleCode: 'RECEITA_FATURAMENTO',
                capabilityDefinitionId: capability.id,
                category: 'FINANCEIRO',
                resource,
                reason: 'Teste SOURCE_REQUIRED com grant ativo.',
                status: 'APPROVED',
              },
            })
          ).id,
          granteeId: financeiro.id,
          capabilityDefinitionId: capability.id,
          resource,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        },
      });

      const decision = await authorizeCapability({
        actor: { userId: financeiro.id, organizationId: ORG_ID, userRole: 'ADMIN' },
        agentCode: baselineAgentGrant!.agentDefinition.code,
        capabilityCode: 'billing.read',
        resource,
      });
      expect(decision.allowed).toBe(false);
      expect(decision.reason).toBe('SOURCE_REQUIRED');
    });
  });

  describe('tenant isolation', () => {
    it('AccessRequest de um tenant nunca é visto/decidido a partir de outro organizationId', async () => {
      const { user: closer } = await makeUserWithJobRole('CLOSER', 'CLOSER', ORG_ID);
      const accessRequest = await createAccessRequest({
        actor: { userId: closer.id, organizationId: ORG_ID, userRole: 'CLOSER' },
        capabilityCode: 'contract.generate',
        resource: { type: 'DEAL', id: 'deal-tenant-isolation' },
        reason: 'Teste de isolamento de tenant.',
      });

      await expect(
        decideAccessRequest({
          organizationId: OTHER_ORG_ID,
          accessRequestId: accessRequest.id,
          approverId: closer.id,
          approverRole: 'ADMIN',
          outcome: 'APPROVED',
        }),
      ).rejects.toMatchObject({ code: 'NOT_FOUND' });

      const crossTenantList = await requestContext.run({ tenantId: OTHER_ORG_ID }, () =>
        listMyAccessRequests(ORG_ID, closer.id),
      );
      expect(crossTenantList).toHaveLength(0);
    });
  });

  describe('audit', () => {
    it('criação e decisão de um AccessRequest geram entradas reais em AuditLog', async () => {
      const { user: closer } = await makeUserWithJobRole('CLOSER');
      const { user: gerente } = await makeUserWithJobRole('GERENTE_COMERCIAL', 'GESTOR');
      const accessRequest = await createAccessRequest({
        actor: { userId: closer.id, organizationId: ORG_ID, userRole: 'CLOSER' },
        capabilityCode: 'contract.generate',
        resource: { type: 'DEAL', id: 'deal-audit' },
        reason: 'Teste de auditoria.',
      });
      await decideAccessRequest({
        organizationId: ORG_ID,
        accessRequestId: accessRequest.id,
        approverId: gerente.id,
        approverRole: 'GESTOR',
        outcome: 'APPROVED',
      });

      const logs = await prisma.auditLog.findMany({
        where: { entity: 'AccessRequest', entityId: accessRequest.id },
        orderBy: { timestamp: 'asc' },
      });
      expect(logs.length).toBeGreaterThanOrEqual(2);
      expect(logs[0]!.actorId).toBe(closer.id);
      expect(logs.some((l) => l.actorId === gerente.id)).toBe(true);
    });

    it('tentativa de autoaprovação também fica registrada em AuditLog', async () => {
      const { user: closer } = await makeUserWithJobRole('CLOSER', 'GESTOR');
      const accessRequest = await createAccessRequest({
        actor: { userId: closer.id, organizationId: ORG_ID, userRole: 'GESTOR' },
        capabilityCode: 'contract.generate',
        resource: { type: 'DEAL', id: 'deal-audit-self-approval' },
        reason: 'Teste de auditoria de autoaprovação.',
      });
      await expect(
        decideAccessRequest({
          organizationId: ORG_ID,
          accessRequestId: accessRequest.id,
          approverId: closer.id,
          approverRole: 'GESTOR',
          outcome: 'APPROVED',
        }),
      ).rejects.toBeInstanceOf(AccessRequestServiceError);

      const logs = await prisma.auditLog.findMany({
        where: { entity: 'AccessRequest', entityId: accessRequest.id },
      });
      expect(logs.some((l) => l.details?.includes('SELF_APPROVAL_DENIED'))).toBe(true);
    });
  });
});
