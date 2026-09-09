import { isJobRoleCode } from '../../../config/job-role-catalog.js';
import { AuditService } from '../../../lib/audit/audit.service.js';
import { prisma } from '../../../lib/prisma.js';

export class JobRoleServiceError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400,
  ) {
    super(message);
  }
}

export interface JobRoleDto {
  id: string;
  code: string;
  name: string;
  description: string | null;
  department: string | null;
  level: number | null;
  isSystem: boolean;
  isActive: boolean;
}

const JOB_ROLE_SELECT = {
  id: true,
  code: true,
  name: true,
  description: true,
  department: true,
  level: true,
  isSystem: true,
  isActive: true,
} as const;

/** Catálogo de cargos — global, não filtrado por organização (ver decisão de arquitetura em
 *  prisma/schema.prisma). `activeOnly` (default true) esconde cargos desativados do catálogo
 *  público, sem nunca apagar a linha (histórico de UserJobRole continua íntegro). */
export async function listJobRoles(options: { activeOnly?: boolean } = {}): Promise<JobRoleDto[]> {
  const activeOnly = options.activeOnly ?? true;
  return prisma.jobRole.findMany({
    where: activeOnly ? { isActive: true } : undefined,
    select: JOB_ROLE_SELECT,
    orderBy: [{ level: 'asc' }, { name: 'asc' }],
  });
}

export async function getJobRoleById(id: string): Promise<JobRoleDto | null> {
  return prisma.jobRole.findUnique({ where: { id }, select: JOB_ROLE_SELECT });
}

export async function getJobRoleByCode(code: string): Promise<JobRoleDto | null> {
  return prisma.jobRole.findUnique({ where: { code }, select: JOB_ROLE_SELECT });
}

/** Cargo principal ativo do ator, dentro do tenant — mesma consulta que `AgentRuntime` (PROMPT 4)
 *  e `RoleSupervisorRuntime` (PROMPT 5) precisam antes de qualquer decisão de autorização. Extraído
 *  aqui para não duplicar a mesma query Prisma nos dois serviços. */
export async function getPrimaryActiveJobRoleForUser(
  organizationId: string,
  userId: string,
): Promise<{ id: string; code: string } | null> {
  const userJobRole = await prisma.userJobRole.findFirst({
    where: { organizationId, userId, isPrimary: true, isActive: true },
    select: { jobRole: { select: { id: true, code: true } } },
  });
  return userJobRole?.jobRole ?? null;
}

/** Seed idempotente dos cargos canônicos — reexecutar nunca duplica (upsert por `code`). Usado
 *  pelo script `scripts/seed-multi-cargo.ts` e pelos testes de integração. Fica aqui (não no
 *  script) para o mesmo comportamento poder ser exercitado em teste sem depender de spawnar um
 *  processo filho. */
export async function seedCanonicalJobRoles(
  catalog: { code: string; name: string; department: string; description: string; level: number }[],
): Promise<JobRoleDto[]> {
  const results: JobRoleDto[] = [];
  for (const entry of catalog) {
    const role = await prisma.jobRole.upsert({
      where: { code: entry.code },
      create: {
        code: entry.code,
        name: entry.name,
        department: entry.department,
        description: entry.description,
        level: entry.level,
        isSystem: true,
        isActive: true,
      },
      // Nome/descrição/departamento/level podem evoluir num catálogo mais recente; `isSystem` e
      // `isActive` nunca são sobrescritos aqui — reativar/desativar um cargo é uma decisão
      // administrativa explícita (ver setJobRoleActive), não um efeito colateral de reseed.
      update: {
        name: entry.name,
        department: entry.department,
        description: entry.description,
        level: entry.level,
      },
      select: JOB_ROLE_SELECT,
    });
    results.push(role);
  }
  return results;
}

export interface UserJobRoleDto {
  id: string;
  userId: string;
  jobRole: JobRoleDto;
  isPrimary: boolean;
  isActive: boolean;
  assignedAt: Date;
  assignedBy: string | null;
}

const USER_JOB_ROLE_SELECT = {
  id: true,
  userId: true,
  isPrimary: true,
  isActive: true,
  assignedAt: true,
  assignedBy: true,
  jobRole: { select: JOB_ROLE_SELECT },
} as const;

export async function listUserJobRoles(
  organizationId: string,
  userId: string,
): Promise<UserJobRoleDto[]> {
  return prisma.userJobRole.findMany({
    where: { organizationId, userId },
    select: USER_JOB_ROLE_SELECT,
    orderBy: [{ isPrimary: 'desc' }, { assignedAt: 'asc' }],
  });
}

export interface JobRoleAssignmentMatrixUser {
  id: string;
  name: string;
  email: string;
  role: string;
  jobRoles: { code: string; name: string; isPrimary: boolean }[];
}

/** Matriz usuário × cargo da organização — mesmo padrão de `getModuleAccessMatrix`
 *  (module-access.service.ts): cada linha é um usuário real com os cargos ativos que já tem. */
export async function getJobRoleAssignmentMatrix(
  organizationId: string,
): Promise<JobRoleAssignmentMatrixUser[]> {
  const [users, assignments] = await Promise.all([
    prisma.user.findMany({
      where: { organizationId },
      select: { id: true, name: true, email: true, role: true },
      orderBy: { name: 'asc' },
    }),
    prisma.userJobRole.findMany({
      where: { organizationId, isActive: true },
      select: {
        userId: true,
        isPrimary: true,
        jobRole: { select: { code: true, name: true } },
      },
    }),
  ]);

  const byUser = new Map<string, JobRoleAssignmentMatrixUser['jobRoles']>();
  for (const a of assignments) {
    const list = byUser.get(a.userId) ?? [];
    list.push({ code: a.jobRole.code, name: a.jobRole.name, isPrimary: a.isPrimary });
    byUser.set(a.userId, list);
  }

  return users.map((user) => ({ ...user, jobRoles: byUser.get(user.id) ?? [] }));
}

/**
 * Atribui um cargo a um usuário da organização. Nunca infere o cargo a partir de `UserRole` (ver
 * seção 18 do prompt da onda — GESTOR poderia ser Coordenador, Gerente, Diretor ou outra função:
 * atribuição é sempre explícita, feita por um ADMIN). Quando `isPrimary` (default true), qualquer
 * outro cargo ativo marcado como principal para o mesmo usuário é rebaixado a secundário na mesma
 * transação — nunca dois cargos principais ativos ao mesmo tempo (reforçado também por índice
 * único parcial no banco, `UserJobRole_one_active_primary_per_user`).
 */
export async function assignJobRole(input: {
  organizationId: string;
  userId: string;
  jobRoleId: string;
  isPrimary?: boolean;
  assignedBy: string;
}): Promise<UserJobRoleDto> {
  const jobRole = await prisma.jobRole.findUnique({ where: { id: input.jobRoleId } });
  if (!jobRole?.isActive) {
    throw new JobRoleServiceError('Cargo inválido ou inativo.', 400);
  }

  const target = await prisma.user.findFirst({
    where: { id: input.userId, organizationId: input.organizationId },
    select: { id: true },
  });
  if (!target) {
    throw new JobRoleServiceError('Usuário não encontrado nesta organização.', 404);
  }

  const isPrimary = input.isPrimary ?? true;

  const result = await prisma.$transaction(async (tx) => {
    if (isPrimary) {
      await tx.userJobRole.updateMany({
        where: {
          userId: input.userId,
          isPrimary: true,
          isActive: true,
          jobRoleId: { not: input.jobRoleId },
        },
        data: { isPrimary: false },
      });
    }

    return tx.userJobRole.upsert({
      where: { userId_jobRoleId: { userId: input.userId, jobRoleId: input.jobRoleId } },
      create: {
        organizationId: input.organizationId,
        userId: input.userId,
        jobRoleId: input.jobRoleId,
        isPrimary,
        isActive: true,
        assignedBy: input.assignedBy,
      },
      update: {
        isPrimary,
        isActive: true,
        assignedBy: input.assignedBy,
        assignedAt: new Date(),
      },
      select: USER_JOB_ROLE_SELECT,
    });
  });

  await AuditService.log({
    action: 'ROLE_CHANGE',
    entity: 'UserJobRole',
    entityId: result.id,
    actorId: input.assignedBy,
    tenantId: input.organizationId,
    afterState: { userId: input.userId, jobRoleCode: jobRole.code, isPrimary },
  });

  return result;
}

/** Desativa (soft) o vínculo usuário↔cargo — nunca apaga a linha (histórico de auditoria). */
export async function deactivateUserJobRole(input: {
  organizationId: string;
  userId: string;
  jobRoleId: string;
  actorId: string;
}): Promise<void> {
  const existing = await prisma.userJobRole.findFirst({
    where: {
      organizationId: input.organizationId,
      userId: input.userId,
      jobRoleId: input.jobRoleId,
    },
  });
  if (!existing) {
    throw new JobRoleServiceError('Vínculo de cargo não encontrado nesta organização.', 404);
  }

  await prisma.userJobRole.update({
    where: { id: existing.id },
    data: { isActive: false, isPrimary: false },
  });

  await AuditService.log({
    action: 'ROLE_CHANGE',
    entity: 'UserJobRole',
    entityId: existing.id,
    actorId: input.actorId,
    tenantId: input.organizationId,
    beforeState: { isActive: existing.isActive, isPrimary: existing.isPrimary },
    afterState: { isActive: false, isPrimary: false },
  });
}

export function isKnownJobRoleCode(code: string): boolean {
  return isJobRoleCode(code);
}
