-- Capability & Permission Engine (PROMPT 3).
--
-- Modelagem canônica de Capabilities e Autorização:
-- - Enums: CapabilityRiskLevel, CapabilityActionType
-- - Tabelas: CapabilityDefinition, AgentCapabilityGrant, RoleCapabilityGrant
-- - Índices e Foreign Keys com CASCADE na remoção de agentes/cargos.
--
-- Mantido como catálogo global de produto (sem organizationId / sem RLS),
-- no mesmo tratamento de JobRole, AgentDefinition e RoleAgentGrant.

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
    "domain" TEXT NOT NULL,
    "riskLevel" "CapabilityRiskLevel" NOT NULL DEFAULT 'LOW',
    "actionType" "CapabilityActionType" NOT NULL DEFAULT 'READ',
    "isReadOnly" BOOLEAN NOT NULL DEFAULT false,
    "requiresApprovalByDefault" BOOLEAN NOT NULL DEFAULT false,
    "isSystem" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CapabilityDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentCapabilityGrant" (
    "id" TEXT NOT NULL,
    "agentDefinitionId" TEXT NOT NULL,
    "capabilityDefinitionId" TEXT NOT NULL,
    "requiresApproval" BOOLEAN NOT NULL DEFAULT false,
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
    "requiresApproval" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
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
CREATE UNIQUE INDEX "AgentCapabilityGrant_agentDefinitionId_capabilityDefinitionId_key" ON "AgentCapabilityGrant"("agentDefinitionId", "capabilityDefinitionId");

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
