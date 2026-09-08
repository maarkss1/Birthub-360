-- Fundação Multi-Cargo e Governança de Agentes (PROMPT 1).
--
-- Escrita à mão a partir do diff real gerado por `prisma migrate dev --create-only` contra um
-- banco com todas as migrations existentes aplicadas, MAS filtrada manualmente: o diff bruto
-- também trazia drift pré-existente e completamente alheio a esta mudança (DROP TABLE
-- "KnowledgeChunk", ADD COLUMN em "Prospect", ALTER TYPE "AutomationTrigger", DROP de índices
-- trigram, criação de "PublicBookingLink" e renomeação de constraints/índices por normalização
-- de nome do Prisma) — nada disso pertence a esta migration e nada disso foi tocado aqui. Ver
-- relatório da onda ("K. Problemas encontrados") para o registro desse drift pré-existente.
--
-- Apenas os 5 modelos novos da fundação Multi-Cargo (JobRole, UserJobRole, AgentDefinition,
-- AgentVersion, RoleAgentGrant) e os 3 enums que eles usam.

-- CreateEnum
CREATE TYPE "AgentDefinitionStatus" AS ENUM ('CATALOG_ONLY', 'PROMPT_READY', 'SERVICE_WRAPPER', 'WORKFLOW_READY', 'PRODUCTION_READY', 'SOURCE_REQUIRED', 'DUPLICATE_ALIAS', 'BLOCKED', 'DEPRECATED');

-- CreateEnum
CREATE TYPE "AgentVersionStatus" AS ENUM ('DRAFT', 'ACTIVE', 'DEPRECATED');

-- CreateEnum
CREATE TYPE "AgentAccessLevel" AS ENUM ('DISCOVER', 'READ', 'EXECUTE', 'REQUEST');

-- CreateTable
CREATE TABLE "JobRole" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "department" TEXT,
    "level" INTEGER,
    "isSystem" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserJobRole" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "jobRoleId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedBy" TEXT,

    CONSTRAINT "UserJobRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentDefinition" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "domain" TEXT,
    "primaryJobRoleId" TEXT,
    "status" "AgentDefinitionStatus" NOT NULL DEFAULT 'CATALOG_ONLY',
    "risk" TEXT,
    "requiresApproval" BOOLEAN NOT NULL DEFAULT false,
    "isSystem" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentVersion" (
    "id" TEXT NOT NULL,
    "agentDefinitionId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "systemPrompt" TEXT,
    "configuration" JSONB,
    "status" "AgentVersionStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "activatedAt" TIMESTAMP(3),
    "deprecatedAt" TIMESTAMP(3),

    CONSTRAINT "AgentVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoleAgentGrant" (
    "id" TEXT NOT NULL,
    "jobRoleId" TEXT NOT NULL,
    "agentDefinitionId" TEXT NOT NULL,
    "accessLevel" "AgentAccessLevel" NOT NULL DEFAULT 'EXECUTE',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "requiresApproval" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoleAgentGrant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "JobRole_code_key" ON "JobRole"("code");

-- CreateIndex
CREATE INDEX "JobRole_isActive_idx" ON "JobRole"("isActive");

-- CreateIndex
CREATE INDEX "UserJobRole_organizationId_idx" ON "UserJobRole"("organizationId");

-- CreateIndex
CREATE INDEX "UserJobRole_userId_idx" ON "UserJobRole"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserJobRole_userId_jobRoleId_key" ON "UserJobRole"("userId", "jobRoleId");

-- CreateIndex (índice único parcial — só um cargo principal ATIVO por usuário; não representável
-- em `@@unique` do Prisma por ser condicional. Reforça a regra de negócio da seção 5 do prompt da
-- onda no nível do banco, não só na camada de serviço.)
CREATE UNIQUE INDEX "UserJobRole_one_active_primary_per_user" ON "UserJobRole"("userId") WHERE "isPrimary" = true AND "isActive" = true;

-- CreateIndex
CREATE UNIQUE INDEX "AgentDefinition_code_key" ON "AgentDefinition"("code");

-- CreateIndex
CREATE INDEX "AgentDefinition_isActive_idx" ON "AgentDefinition"("isActive");

-- CreateIndex
CREATE INDEX "AgentDefinition_primaryJobRoleId_idx" ON "AgentDefinition"("primaryJobRoleId");

-- CreateIndex
CREATE UNIQUE INDEX "AgentVersion_agentDefinitionId_version_key" ON "AgentVersion"("agentDefinitionId", "version");

-- CreateIndex
CREATE INDEX "AgentVersion_agentDefinitionId_status_idx" ON "AgentVersion"("agentDefinitionId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "RoleAgentGrant_jobRoleId_agentDefinitionId_key" ON "RoleAgentGrant"("jobRoleId", "agentDefinitionId");

-- CreateIndex
CREATE INDEX "RoleAgentGrant_agentDefinitionId_idx" ON "RoleAgentGrant"("agentDefinitionId");

-- AddForeignKey
ALTER TABLE "UserJobRole" ADD CONSTRAINT "UserJobRole_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserJobRole" ADD CONSTRAINT "UserJobRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserJobRole" ADD CONSTRAINT "UserJobRole_jobRoleId_fkey" FOREIGN KEY ("jobRoleId") REFERENCES "JobRole"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentDefinition" ADD CONSTRAINT "AgentDefinition_primaryJobRoleId_fkey" FOREIGN KEY ("primaryJobRoleId") REFERENCES "JobRole"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentVersion" ADD CONSTRAINT "AgentVersion_agentDefinitionId_fkey" FOREIGN KEY ("agentDefinitionId") REFERENCES "AgentDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoleAgentGrant" ADD CONSTRAINT "RoleAgentGrant_jobRoleId_fkey" FOREIGN KEY ("jobRoleId") REFERENCES "JobRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoleAgentGrant" ADD CONSTRAINT "RoleAgentGrant_agentDefinitionId_fkey" FOREIGN KEY ("agentDefinitionId") REFERENCES "AgentDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Habilita RLS em "UserJobRole" seguindo o padrão estrito adotado em
-- 20260825120000_scope_rls_bypass_to_bootstrap_allowlist e replicado em
-- 20260907120000_module_access_grant: sem cláusula de bypass_rls no USING (UserJobRole não está
-- no allowlist BYPASS_RLS_ALLOWED_MODELS de src/lib/prisma.ts) e WITH CHECK exigindo o mesmo
-- match de tenant do USING, para não reabrir a janela de escrita cross-tenant já corrigida
-- naquela migration para tabelas novas.
--
-- "JobRole", "AgentDefinition", "AgentVersion" e "RoleAgentGrant" NÃO recebem RLS aqui de
-- propósito — são catálogo global de produto (sem organizationId), mesmo tratamento hoje dado a
-- "FeatureFlag" (que também não tem RLS; só o override "OrganizationFeatureFlag" tem
-- organizationId e seria candidato a RLS se viesse a manipular dado sensível de tenant).
ALTER TABLE "UserJobRole" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UserJobRole" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_policy ON "UserJobRole";
CREATE POLICY tenant_isolation_policy ON "UserJobRole" FOR ALL
USING (
    current_setting('app.current_tenant_id', TRUE) = "organizationId"
)
WITH CHECK (
    current_setting('app.current_tenant_id', TRUE) = "organizationId"
);
