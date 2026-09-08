-- Agent Runtime Genérico (PROMPT 4) — registro de execução por tenant.
--
-- Diferente das migrations do PROMPT 1/2/3 (catálogo de produto global, sem organizationId, sem
-- RLS), esta tabela é DADO DE NEGÓCIO por tenant (fatos/evidências reais de uma organização) —
-- RLS estrito, mesmo padrão de ModuleAccessGrant (20260907120000_module_access_grant): sem
-- cláusula de bypass_rls no USING (AgentExecution não está no allowlist BYPASS_RLS_ALLOWED_MODELS
-- de src/lib/prisma.ts) e WITH CHECK exigindo o mesmo match de tenant do USING.

-- CreateEnum
CREATE TYPE "AgentExecutionStatus" AS ENUM ('PENDING', 'AUTHORIZING', 'RUNNING', 'SUCCEEDED', 'DENIED', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "AgentExecution" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "actorRole" TEXT NOT NULL,
    "jobRoleCode" TEXT,
    "agentDefinitionId" TEXT,
    "agentVersionId" TEXT,
    "agentCode" TEXT NOT NULL,
    "capabilityCode" TEXT NOT NULL,
    "mission" TEXT,
    "status" "AgentExecutionStatus" NOT NULL DEFAULT 'PENDING',
    "policyDecision" JSONB,
    "summary" TEXT,
    "facts" JSONB,
    "metrics" JSONB,
    "evidence" JSONB,
    "risks" JSONB,
    "recommendations" JSONB,
    "nextActions" JSONB,
    "missingData" JSONB,
    "toolCalls" JSONB,
    "confidence" DOUBLE PRECISION,
    "errorMessage" TEXT,
    "correlationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "AgentExecution_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AgentExecution_organizationId_createdAt_idx" ON "AgentExecution"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "AgentExecution_agentDefinitionId_idx" ON "AgentExecution"("agentDefinitionId");

-- CreateIndex
CREATE INDEX "AgentExecution_organizationId_status_idx" ON "AgentExecution"("organizationId", "status");

-- AddForeignKey
ALTER TABLE "AgentExecution" ADD CONSTRAINT "AgentExecution_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentExecution" ADD CONSTRAINT "AgentExecution_agentDefinitionId_fkey" FOREIGN KEY ("agentDefinitionId") REFERENCES "AgentDefinition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentExecution" ADD CONSTRAINT "AgentExecution_agentVersionId_fkey" FOREIGN KEY ("agentVersionId") REFERENCES "AgentVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Habilita RLS em AgentExecution seguindo o padrão estrito adotado em
-- 20260825120000_scope_rls_bypass_to_bootstrap_allowlist e replicado em
-- 20260907120000_module_access_grant: sem cláusula de bypass_rls no USING (AgentExecution não
-- está no allowlist BYPASS_RLS_ALLOWED_MODELS de src/lib/prisma.ts) e WITH CHECK exigindo o mesmo
-- match de tenant do USING — toda escrita real acontece de dentro de uma requisição HTTP
-- autenticada (POST /api/agents/:agentCode/run), sempre com tenant já resolvido pelo
-- authenticateToken, então não há caso legítimo de bypass aqui.
ALTER TABLE "AgentExecution" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AgentExecution" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_policy ON "AgentExecution";
CREATE POLICY tenant_isolation_policy ON "AgentExecution" FOR ALL
USING (
    current_setting('app.current_tenant_id', TRUE) = "organizationId"
)
WITH CHECK (
    current_setting('app.current_tenant_id', TRUE) = "organizationId"
);
