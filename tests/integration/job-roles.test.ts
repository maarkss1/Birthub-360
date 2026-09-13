import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { prisma } from '../../src/lib/prisma';
import { requestContext } from '../../src/lib/async-context';
import { hasRequiredRole, COMMERCIAL_INTELLIGENCE_ROLES } from '../../src/lib/auth/authorization';
import { JOB_ROLE_CATALOG } from '../../src/config/job-role-catalog';
import {
  seedCanonicalJobRoles,
  listJobRoles,
  getJobRoleByCode,
  assignJobRole,
  deactivateUserJobRole,
  listUserJobRoles,
  JobRoleServiceError,
} from '../../src/features/job-roles/services/jobRole.service';

const ORG_ID = 'test-org-id';
const OTHER_ORG_ID = 'test-org-id-2';

describe('Fundação Multi-Cargo — JobRole/UserJobRole', () => {
  beforeEach(async () => {
    await seedCanonicalJobRoles(JOB_ROLE_CATALOG);
  });

  afterEach(async () => {
    await prisma.userJobRole.deleteMany();
  });

  describe('catálogo de cargos', () => {
    it('expõe exatamente os 12 cargos canônicos', async () => {
      const jobRoles = await listJobRoles({ activeOnly: false });
      expect(jobRoles).toHaveLength(12);
      expect(jobRoles.map((r) => r.code).sort()).toEqual(
        JOB_ROLE_CATALOG.map((r) => r.code).sort(),
      );
    });

    it('reexecutar o seed não duplica nenhum cargo (idempotente)', async () => {
      await seedCanonicalJobRoles(JOB_ROLE_CATALOG);
      await seedCanonicalJobRoles(JOB_ROLE_CATALOG);
      const jobRoles = await listJobRoles({ activeOnly: false });
      expect(jobRoles).toHaveLength(12);
    });

    it('esconde cargo desativado do catálogo ativo, mas mantém a linha', async () => {
      const sdr = await getJobRoleByCode('SDR');
      await prisma.jobRole.update({ where: { id: sdr!.id }, data: { isActive: false } });

      const activeOnly = await listJobRoles({ activeOnly: true });
      expect(activeOnly.find((r) => r.code === 'SDR')).toBeUndefined();

      const all = await listJobRoles({ activeOnly: false });
      expect(all.find((r) => r.code === 'SDR')).toBeDefined();

      // Restaura para não vazar estado entre testes.
      await prisma.jobRole.update({ where: { id: sdr!.id }, data: { isActive: true } });
    });
  });

  describe('atribuição usuário↔cargo', () => {
    it('atribui um cargo principal a um usuário e permite consultá-lo', async () => {
      const user = await prisma.user.create({
        data: { name: 'Ana SDR', email: 'ana.sdr@job-roles.test', organizationId: ORG_ID },
      });
      const sdr = await getJobRoleByCode('SDR');

      const assignment = await assignJobRole({
        organizationId: ORG_ID,
        userId: user.id,
        jobRoleId: sdr!.id,
        assignedBy: 'admin-1',
      });

      expect(assignment.jobRole.code).toBe('SDR');
      expect(assignment.isPrimary).toBe(true);

      const roles = await listUserJobRoles(ORG_ID, user.id);
      expect(roles).toHaveLength(1);
      expect(roles[0].jobRole.code).toBe('SDR');
    });

    it('um usuário sem nenhum JobRole continua existindo e utilizável (fallback seguro)', async () => {
      const user = await prisma.user.create({
        data: {
          name: 'Beto Sem Cargo',
          email: 'beto.semcargo@job-roles.test',
          organizationId: ORG_ID,
        },
      });
      const roles = await listUserJobRoles(ORG_ID, user.id);
      expect(roles).toEqual([]);
      // O usuário em si segue íntegro — nenhuma migração automática de UserRole para JobRole.
      const reloaded = await prisma.user.findUnique({ where: { id: user.id } });
      expect(reloaded?.role).toBe('VISUALIZADOR');
    });

    it('atribuir um novo cargo principal rebaixa o cargo principal anterior do mesmo usuário', async () => {
      const user = await prisma.user.create({
        data: { name: 'Carla Multi', email: 'carla.multi@job-roles.test', organizationId: ORG_ID },
      });
      const sdr = await getJobRoleByCode('SDR');
      const closer = await getJobRoleByCode('CLOSER');

      await assignJobRole({
        organizationId: ORG_ID,
        userId: user.id,
        jobRoleId: sdr!.id,
        assignedBy: 'admin-1',
      });
      await assignJobRole({
        organizationId: ORG_ID,
        userId: user.id,
        jobRoleId: closer!.id,
        assignedBy: 'admin-1',
      });

      const roles = await listUserJobRoles(ORG_ID, user.id);
      const primaries = roles.filter((r) => r.isPrimary);
      expect(primaries).toHaveLength(1);
      expect(primaries[0].jobRole.code).toBe('CLOSER');

      const sdrAssignment = roles.find((r) => r.jobRole.code === 'SDR');
      expect(sdrAssignment?.isPrimary).toBe(false);
      expect(sdrAssignment?.isActive).toBe(true); // continua ativo, só não é mais o principal
    });

    it('desativar um vínculo faz soft-delete (nunca apaga a linha de auditoria)', async () => {
      const user = await prisma.user.create({
        data: {
          name: 'Duda Removida',
          email: 'duda.removida@job-roles.test',
          organizationId: ORG_ID,
        },
      });
      const sdr = await getJobRoleByCode('SDR');
      await assignJobRole({
        organizationId: ORG_ID,
        userId: user.id,
        jobRoleId: sdr!.id,
        assignedBy: 'admin-1',
      });

      await deactivateUserJobRole({
        organizationId: ORG_ID,
        userId: user.id,
        jobRoleId: sdr!.id,
        actorId: 'admin-1',
      });

      const row = await prisma.userJobRole.findFirst({
        where: { userId: user.id, jobRoleId: sdr!.id },
      });
      expect(row).not.toBeNull();
      expect(row?.isActive).toBe(false);

      const activeRoles = await listUserJobRoles(ORG_ID, user.id);
      expect(activeRoles[0].isActive).toBe(false);
    });

    it('rejeita atribuir um cargo inativo', async () => {
      const user = await prisma.user.create({
        data: {
          name: 'Egon Inativo',
          email: 'egon.inativo@job-roles.test',
          organizationId: ORG_ID,
        },
      });
      const bdr = await getJobRoleByCode('BDR');
      await prisma.jobRole.update({ where: { id: bdr!.id }, data: { isActive: false } });

      await expect(
        assignJobRole({
          organizationId: ORG_ID,
          userId: user.id,
          jobRoleId: bdr!.id,
          assignedBy: 'admin-1',
        }),
      ).rejects.toThrow(JobRoleServiceError);

      await prisma.jobRole.update({ where: { id: bdr!.id }, data: { isActive: true } });
    });

    it('rejeita atribuir cargo a um usuário de outra organização (isolamento de tenant)', async () => {
      // Organization está no allowlist de bypass (src/lib/prisma.ts), mas só quando o contexto
      // pede bypass explicitamente — mesmo padrão de tests/helpers/integration-setup.ts
      // (withRlsBypass) para criar um segundo tenant dentro de um teste.
      const outsider = await requestContext.run({ bypassRls: true }, async () => {
        await prisma.organization.upsert({
          where: { id: OTHER_ORG_ID },
          update: {},
          create: { id: OTHER_ORG_ID, name: 'Outra Org' },
        });
        return prisma.user.create({
          data: {
            name: 'Fabio Outro Tenant',
            email: 'fabio.outrotenant@job-roles.test',
            organizationId: OTHER_ORG_ID,
          },
        });
      });
      const sdr = await getJobRoleByCode('SDR');

      await expect(
        assignJobRole({
          organizationId: ORG_ID,
          userId: outsider.id,
          jobRoleId: sdr!.id,
          assignedBy: 'admin-1',
        }),
      ).rejects.toThrow(JobRoleServiceError);

      await requestContext.run({ bypassRls: true }, async () => {
        await prisma.user.delete({ where: { id: outsider.id } });
        await prisma.organization.delete({ where: { id: OTHER_ORG_ID } });
      });
    });
  });

  // Auditoria da fundação — item 17 (cross-tenant): um ADMIN da organização A nunca pode listar
  // nem alterar o vínculo cargo↔usuário de um usuário da organização B, mesmo conhecendo o id.
  describe('segurança — isolamento de tenant em UserJobRole', () => {
    async function createOtherOrgUserWithRole(jobRoleCode: string) {
      const jobRole = await getJobRoleByCode(jobRoleCode);
      const user = await requestContext.run({ bypassRls: true }, async () => {
        await prisma.organization.upsert({
          where: { id: OTHER_ORG_ID },
          update: {},
          create: { id: OTHER_ORG_ID, name: 'Outra Org' },
        });
        return prisma.user.create({
          data: {
            name: 'Isolde Outro Tenant',
            email: `isolde.${Date.now()}@job-roles.test`,
            organizationId: OTHER_ORG_ID,
          },
        });
      });
      // "UserJobRole" tem RLS estrita (sem cláusula de bypass_rls — ver migration
      // 20260908020000_multi_cargo_agent_governance_foundation, mesmo padrão fail-closed de
      // ModuleAccessGrant), então esta linha só pode ser criada dentro do tenant real da
      // organização B — nunca sob bypass. Simula a mesma gravação que assignJobRole faria se
      // chamado por um ADMIN de dentro da própria organização B.
      const userJobRole = await requestContext.run({ tenantId: OTHER_ORG_ID }, () =>
        prisma.userJobRole.create({
          data: {
            organizationId: OTHER_ORG_ID,
            userId: user.id,
            jobRoleId: jobRole!.id,
            isPrimary: true,
            assignedBy: 'admin-org-b',
          },
        }),
      );
      return { user, userJobRole };
    }

    async function cleanupOtherOrg(userId: string) {
      await requestContext.run({ tenantId: OTHER_ORG_ID }, () =>
        prisma.userJobRole.deleteMany({ where: { userId } }),
      );
      await requestContext.run({ bypassRls: true }, async () => {
        await prisma.user.delete({ where: { id: userId } });
        await prisma.organization.delete({ where: { id: OTHER_ORG_ID } });
      });
    }

    it('ADMIN da organização A não consegue listar o vínculo de cargo de um usuário da organização B', async () => {
      const { user } = await createOtherOrgUserWithRole('CLOSER');

      // Um ADMIN de ORG_ID tentando consultar o cargo de um usuário que na verdade é da outra
      // organização — passar o organizationId errado (o dele, ORG_ID) nunca pode "achar" a linha
      // real (que pertence a OTHER_ORG_ID).
      const roles = await listUserJobRoles(ORG_ID, user.id);
      expect(roles).toEqual([]);

      await cleanupOtherOrg(user.id);
    });

    it('ADMIN da organização A não consegue desativar o vínculo de cargo de um usuário da organização B', async () => {
      const { user, userJobRole } = await createOtherOrgUserWithRole('GERENTE_COMERCIAL');

      await expect(
        deactivateUserJobRole({
          organizationId: ORG_ID,
          userId: user.id,
          jobRoleId: userJobRole.jobRoleId,
          actorId: 'admin-org-a',
        }),
      ).rejects.toThrow(JobRoleServiceError);

      // O vínculo real da organização B continua intacto — o ataque não teve efeito nenhum. Lido
      // dentro do tenant real (B) pelo mesmo motivo do create acima: "UserJobRole" não tem
      // cláusula de bypass_rls.
      const untouched = await requestContext.run({ tenantId: OTHER_ORG_ID }, () =>
        prisma.userJobRole.findUnique({ where: { id: userJobRole.id } }),
      );
      expect(untouched?.isActive).toBe(true);

      await cleanupOtherOrg(user.id);
    });
  });

  // Seção 24 do prompt da onda: prova explícita de que JobRole nunca eleva o nível de segurança
  // real do usuário — UserRole (ADMIN/GESTOR/CLOSER/SDR/VISUALIZADOR) continua sendo a única fonte
  // de autoridade, `hasRequiredRole`/`requireRole` nunca leem JobRole.
  describe('segurança — JobRole nunca substitui UserRole', () => {
    it('JobRole=DIRETOR_COMERCIAL com UserRole=VISUALIZADOR não vira ADMIN/GESTOR', async () => {
      const user = await prisma.user.create({
        data: {
          name: 'Gustavo Visualizador',
          email: 'gustavo.visualizador@job-roles.test',
          organizationId: ORG_ID,
          role: 'VISUALIZADOR',
        },
      });
      const diretor = await getJobRoleByCode('DIRETOR_COMERCIAL');

      await assignJobRole({
        organizationId: ORG_ID,
        userId: user.id,
        jobRoleId: diretor!.id,
        assignedBy: 'admin-1',
      });

      const reloaded = await prisma.user.findUnique({ where: { id: user.id } });
      // UserRole real no banco não mudou por causa da atribuição de cargo.
      expect(reloaded?.role).toBe('VISUALIZADOR');
      // E a checagem de autorização real (a mesma usada por requireRole em todas as rotas)
      // continua negando o módulo restrito a GESTOR/ADMIN.
      expect(hasRequiredRole(reloaded!.role, COMMERCIAL_INTELLIGENCE_ROLES)).toBe(false);
    });

    it('JobRole=SDR com UserRole=ADMIN mantém a autoridade real de ADMIN', async () => {
      const user = await prisma.user.create({
        data: {
          name: 'Helena Admin',
          email: 'helena.admin@job-roles.test',
          organizationId: ORG_ID,
          role: 'ADMIN',
        },
      });
      const sdr = await getJobRoleByCode('SDR');

      await assignJobRole({
        organizationId: ORG_ID,
        userId: user.id,
        jobRoleId: sdr!.id,
        assignedBy: 'admin-1',
      });

      const reloaded = await prisma.user.findUnique({ where: { id: user.id } });
      expect(reloaded?.role).toBe('ADMIN');
      expect(hasRequiredRole(reloaded!.role, COMMERCIAL_INTELLIGENCE_ROLES)).toBe(true);
    });
  });
});
