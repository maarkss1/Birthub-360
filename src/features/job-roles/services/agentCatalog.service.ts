import type {
  AgentAccessLevel,
  AgentDefinitionStatus,
  AgentVersionStatus,
  Prisma,
} from '@prisma/client';
import { prisma } from '../../../lib/prisma.js';
import { AuditService } from '../../../lib/audit/audit.service.js';

export class AgentCatalogServiceError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400,
  ) {
    super(message);
  }
}

export interface AgentDefinitionDto {
  id: string;
  code: string;
  name: string;
  description: string | null;
  domain: string | null;
  status: AgentDefinitionStatus;
  risk: string | null;
  requiresApproval: boolean;
  isSystem: boolean;
  isActive: boolean;
  primaryJobRole: { id: string; code: string; name: string } | null;
}

const AGENT_DEFINITION_SELECT = {
  id: true,
  code: true,
  name: true,
  description: true,
  domain: true,
  status: true,
  risk: true,
  requiresApproval: true,
  isSystem: true,
  isActive: true,
  primaryJobRole: { select: { id: true, code: true, name: true } },
} as const;

export async function listAgentDefinitions(
  options: { activeOnly?: boolean; jobRoleId?: string } = {},
): Promise<AgentDefinitionDto[]> {
  const activeOnly = options.activeOnly ?? true;
  return prisma.agentDefinition.findMany({
    where: {
      ...(activeOnly ? { isActive: true } : {}),
      ...(options.jobRoleId ? { primaryJobRoleId: options.jobRoleId } : {}),
    },
    select: AGENT_DEFINITION_SELECT,
    orderBy: { name: 'asc' },
  });
}

export interface AgentDefinitionDetailDto extends AgentDefinitionDto {
  versions: {
    id: string;
    version: number;
    status: AgentVersionStatus;
    createdAt: Date;
    activatedAt: Date | null;
    deprecatedAt: Date | null;
  }[];
  roleGrants: {
    jobRole: { id: string; code: string; name: string };
    accessLevel: AgentAccessLevel;
    isActive: boolean;
    requiresApproval: boolean;
  }[];
}

export async function getAgentDefinitionById(id: string): Promise<AgentDefinitionDetailDto | null> {
  return prisma.agentDefinition.findUnique({
    where: { id },
    select: {
      ...AGENT_DEFINITION_SELECT,
      versions: {
        select: {
          id: true,
          version: true,
          status: true,
          createdAt: true,
          activatedAt: true,
          deprecatedAt: true,
        },
        orderBy: { version: 'desc' },
      },
      roleGrants: {
        where: { isActive: true },
        select: {
          accessLevel: true,
          isActive: true,
          requiresApproval: true,
          jobRole: { select: { id: true, code: true, name: true } },
        },
      },
    },
  });
}

/** Agentes liberados para um cargo — responde "quais agentes este cargo pode usar?" (RoleAgentGrant
 *  ativo, agente ativo). Ordenado por nível de acesso decrescente (EXECUTE primeiro) para a UI
 *  destacar o que o cargo pode realmente rodar antes do que só pode descobrir/pedir. */
export interface RoleAgentGrantDto {
  agent: AgentDefinitionDto;
  accessLevel: AgentAccessLevel;
  requiresApproval: boolean;
}

const ACCESS_LEVEL_ORDER: Record<AgentAccessLevel, number> = {
  EXECUTE: 0,
  READ: 1,
  REQUEST: 2,
  DISCOVER: 3,
};

export async function listAgentsForJobRole(jobRoleId: string): Promise<RoleAgentGrantDto[]> {
  const grants = await prisma.roleAgentGrant.findMany({
    where: { jobRoleId, isActive: true, agentDefinition: { isActive: true } },
    select: {
      accessLevel: true,
      requiresApproval: true,
      agentDefinition: { select: AGENT_DEFINITION_SELECT },
    },
  });

  return grants
    .map((g) => ({
      agent: g.agentDefinition,
      accessLevel: g.accessLevel,
      requiresApproval: g.requiresApproval,
    }))
    .sort((a, b) => ACCESS_LEVEL_ORDER[a.accessLevel] - ACCESS_LEVEL_ORDER[b.accessLevel]);
}

/** Upsert idempotente por `code` — usado pelo seed (scripts/seed-multi-cargo.ts) para popular o
 *  catálogo a partir dos 12 agentes já reais de `commercialAgentRegistry.ts`, e por qualquer
 *  cadastro futuro de agente (inclusive a importação dos 392 do PROMPT 2). `AgentDefinition` é só
 *  identidade/estado administrativo — nunca grava prompt/configuração/versão aqui, isso é papel
 *  exclusivo de `AgentVersion` (ver `upsertAgentVersion`/`getActiveAgentVersion` abaixo). */
export async function upsertAgentDefinition(input: {
  code: string;
  name: string;
  description?: string;
  domain?: string;
  primaryJobRoleId?: string | null;
  status: AgentDefinitionStatus;
  risk?: string;
  requiresApproval?: boolean;
}): Promise<AgentDefinitionDto> {
  return prisma.agentDefinition.upsert({
    where: { code: input.code },
    create: {
      code: input.code,
      name: input.name,
      description: input.description,
      domain: input.domain,
      primaryJobRoleId: input.primaryJobRoleId ?? null,
      status: input.status,
      risk: input.risk,
      requiresApproval: input.requiresApproval ?? false,
      isSystem: true,
      isActive: true,
    },
    update: {
      name: input.name,
      description: input.description,
      domain: input.domain,
      primaryJobRoleId: input.primaryJobRoleId ?? null,
      status: input.status,
      risk: input.risk,
      requiresApproval: input.requiresApproval ?? false,
    },
    select: AGENT_DEFINITION_SELECT,
  });
}

/** Ativar uma versão (`status: 'ACTIVE'`, o default) precisa demover a versão ACTIVE anterior do
 *  mesmo agente na mesma transação — o índice único parcial `AgentVersion_one_active_per_agent`
 *  (migration 20260908020000) só barra duas linhas ACTIVE simultâneas, ele não demove a antiga
 *  sozinho. Sem a transação, ativar uma v2 com uma v1 ainda ACTIVE cai direto no P2002 cru. */
export async function upsertAgentVersion(input: {
  agentDefinitionId: string;
  version: number;
  systemPrompt?: string;
  configuration?: Prisma.InputJsonValue;
  status?: AgentVersionStatus;
  createdBy?: string;
}): Promise<{ id: string; version: number }> {
  const status = input.status ?? 'ACTIVE';

  try {
    return await prisma.$transaction(async (tx) => {
      if (status === 'ACTIVE') {
        await tx.agentVersion.updateMany({
          where: {
            agentDefinitionId: input.agentDefinitionId,
            status: 'ACTIVE',
            version: { not: input.version },
          },
          data: { status: 'DEPRECATED', deprecatedAt: new Date() },
        });
      }

      return tx.agentVersion.upsert({
        where: {
          agentDefinitionId_version: {
            agentDefinitionId: input.agentDefinitionId,
            version: input.version,
          },
        },
        create: {
          agentDefinitionId: input.agentDefinitionId,
          version: input.version,
          systemPrompt: input.systemPrompt,
          configuration: input.configuration,
          status,
          createdBy: input.createdBy,
          activatedAt: status === 'ACTIVE' ? new Date() : null,
        },
        update: {
          systemPrompt: input.systemPrompt,
          configuration: input.configuration,
          status,
          activatedAt: status === 'ACTIVE' ? new Date() : null,
        },
        select: { id: true, version: true },
      });
    });
  } catch (err) {
    // Corrida genuína remanescente (duas ativações concorrentes da mesma versão entre o
    // updateMany e o upsert acima) — mesmo padrão de cadence.routes.ts para
    // CadenceRun_leadId_active_unique: 409 de negócio, nunca o P2002 cru subindo pro handler.
    if ((err as { code?: string })?.code === 'P2002') {
      throw new AgentCatalogServiceError(
        'Outra versão deste agente já foi ativada concorrentemente. Tente novamente.',
        409,
      );
    }
    throw err;
  }
}

/** Única forma de perguntar "qual é a versão ativa deste agente?" — nunca um contador
 *  denormalizado em `AgentDefinition` (ver comentário do model `AgentVersion` em
 *  prisma/schema.prisma). `null` quando o agente ainda não tem nenhuma versão ativada. */
export async function getActiveAgentVersion(agentDefinitionId: string): Promise<{
  id: string;
  version: number;
  systemPrompt: string | null;
  configuration: Prisma.JsonValue | null;
} | null> {
  return prisma.agentVersion.findFirst({
    where: { agentDefinitionId, status: 'ACTIVE' },
    select: { id: true, version: true, systemPrompt: true, configuration: true },
  });
}

/** Concede um agente a um cargo — idempotente por (jobRoleId, agentDefinitionId). Nunca duplica o
 *  AgentDefinition em si (regra #12 do prompt da onda): o mesmo agente pode ser concedido a vários
 *  cargos com uma linha de RoleAgentGrant por par. */
export async function grantAgentToRole(input: {
  jobRoleId: string;
  agentDefinitionId: string;
  accessLevel?: AgentAccessLevel;
  requiresApproval?: boolean;
  actorId?: string;
  organizationIdForAudit?: string;
}): Promise<void> {
  const grant = await prisma.roleAgentGrant.upsert({
    where: {
      jobRoleId_agentDefinitionId: {
        jobRoleId: input.jobRoleId,
        agentDefinitionId: input.agentDefinitionId,
      },
    },
    create: {
      jobRoleId: input.jobRoleId,
      agentDefinitionId: input.agentDefinitionId,
      accessLevel: input.accessLevel ?? 'EXECUTE',
      requiresApproval: input.requiresApproval ?? false,
      isActive: true,
    },
    update: {
      accessLevel: input.accessLevel ?? 'EXECUTE',
      requiresApproval: input.requiresApproval ?? false,
      isActive: true,
    },
  });

  if (input.actorId) {
    await AuditService.log({
      action: 'PERMISSION_CHANGE',
      entity: 'RoleAgentGrant',
      entityId: grant.id,
      actorId: input.actorId,
      tenantId: input.organizationIdForAudit,
      afterState: {
        jobRoleId: input.jobRoleId,
        agentDefinitionId: input.agentDefinitionId,
        accessLevel: grant.accessLevel,
      },
    });
  }
}

export async function revokeAgentFromRole(input: {
  jobRoleId: string;
  agentDefinitionId: string;
  actorId: string;
  organizationIdForAudit?: string;
}): Promise<void> {
  const grant = await prisma.roleAgentGrant.findUnique({
    where: {
      jobRoleId_agentDefinitionId: {
        jobRoleId: input.jobRoleId,
        agentDefinitionId: input.agentDefinitionId,
      },
    },
  });
  if (!grant) {
    throw new AgentCatalogServiceError('Concessão não encontrada.', 404);
  }

  await prisma.roleAgentGrant.update({ where: { id: grant.id }, data: { isActive: false } });

  await AuditService.log({
    action: 'PERMISSION_CHANGE',
    entity: 'RoleAgentGrant',
    entityId: grant.id,
    actorId: input.actorId,
    tenantId: input.organizationIdForAudit,
    beforeState: { isActive: true },
    afterState: { isActive: false },
  });
}
