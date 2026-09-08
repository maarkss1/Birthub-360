-- Capability & Permission Engine (PROMPT 3).
--
-- Escrita à mão, mesmo processo do PROMPT 1 (20260908020000_multi_cargo_agent_governance_foundation):
-- gerada via `prisma migrate dev --create-only` contra um banco com todas as migrations aplicadas
-- e depois filtrada manualmente para conter apenas os 2 enums e os 3 modelos novos desta onda
-- (CapabilityDefinition, AgentCapabilityGrant, RoleCapabilityGrant) — nenhum drift pré-existente
-- alheio a esta mudança foi incluído aqui.
--
-- Sem RLS: catálogo de produto global, mesmo tratamento de JobRole/AgentDefinition/AgentVersion/
-- RoleAgentGrant (ver comentário no schema.prisma acima destes 3 modelos) — nenhuma das 3 tabelas
-- novas tem `organizationId`.

-- CreateEnum
CREATE TYPE "CapabilityRiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "CapabilityActionType" AS ENUM ('READ', 'WRITE', 'EXECUTE', 'ADMIN');

-- CreateTable
CREATE TABLE "CapabilityDefinition" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "domain" TEXT,
    "riskLevel" "CapabilityRiskLevel" NOT NULL DEFAULT 'LOW',
    "actionType" "CapabilityActionType" NOT NULL,
    "isReadOnly" BOOLEAN NOT NULL DEFAULT false,
    "requiresApprovalByDefault" BOOLEAN NOT NULL DEFAULT false,
    "isSystem" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CapabilityDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentCapabilityGrant" (
    "id" TEXT NOT NULL,
    "agentDefinitionId" TEXT NOT NULL,
    "capabilityDefinitionId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentCapabilityGrant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoleCapabilityGrant" (
    "id" TEXT NOT NULL,
    "jobRoleId" TEXT NOT NULL,
    "capabilityDefinitionId" TEXT NOT NULL,
    "accessLevel" "AgentAccessLevel" NOT NULL DEFAULT 'EXECUTE',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "requiresApproval" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoleCapabilityGrant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CapabilityDefinition_code_key" ON "CapabilityDefinition"("code");

-- CreateIndex
CREATE INDEX "CapabilityDefinition_isActive_idx" ON "CapabilityDefinition"("isActive");

-- CreateIndex
CREATE INDEX "CapabilityDefinition_domain_idx" ON "CapabilityDefinition"("domain");

-- CreateIndex
CREATE UNIQUE INDEX "AgentCapabilityGrant_agentDefinitionId_capabilityDefinition_key" ON "AgentCapabilityGrant"("agentDefinitionId", "capabilityDefinitionId");

-- CreateIndex
CREATE INDEX "AgentCapabilityGrant_capabilityDefinitionId_idx" ON "AgentCapabilityGrant"("capabilityDefinitionId");

-- CreateIndex
CREATE UNIQUE INDEX "RoleCapabilityGrant_jobRoleId_capabilityDefinitionId_key" ON "RoleCapabilityGrant"("jobRoleId", "capabilityDefinitionId");

-- CreateIndex
CREATE INDEX "RoleCapabilityGrant_capabilityDefinitionId_idx" ON "RoleCapabilityGrant"("capabilityDefinitionId");

-- AddForeignKey
ALTER TABLE "AgentCapabilityGrant" ADD CONSTRAINT "AgentCapabilityGrant_agentDefinitionId_fkey" FOREIGN KEY ("agentDefinitionId") REFERENCES "AgentDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentCapabilityGrant" ADD CONSTRAINT "AgentCapabilityGrant_capabilityDefinitionId_fkey" FOREIGN KEY ("capabilityDefinitionId") REFERENCES "CapabilityDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoleCapabilityGrant" ADD CONSTRAINT "RoleCapabilityGrant_jobRoleId_fkey" FOREIGN KEY ("jobRoleId") REFERENCES "JobRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoleCapabilityGrant" ADD CONSTRAINT "RoleCapabilityGrant_capabilityDefinitionId_fkey" FOREIGN KEY ("capabilityDefinitionId") REFERENCES "CapabilityDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
