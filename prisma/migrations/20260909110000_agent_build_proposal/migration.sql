-- Agent Builder / Fábrica de Agentes (PROMPT 10) — 1 tabela nova, dado de negócio por tenant
-- (mesmo padrão de RLS estrito de AgentExecution/AccessRequest/AgentHandoffMessage/
-- LearningCandidate: sem cláusula de bypass_rls no USING, "AgentBuildProposal" não está no
-- allowlist BYPASS_RLS_ALLOWED_MODELS de src/lib/prisma.ts) e WITH CHECK exigindo o mesmo match
-- de tenant do USING.

-- CreateEnum
CREATE TYPE "AgentBuildProposalStatus" AS ENUM ('DRAFT', 'GAP_NOT_CONFIRMED', 'UNDER_REVIEW', 'APPROVED_FOR_DEVELOPMENT', 'REJECTED');

-- CreateTable
CREATE TABLE "AgentBuildProposal" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "requestedBy" TEXT NOT NULL,
    "requestedByRole" TEXT NOT NULL,
    "need" TEXT NOT NULL,
    "targetJobRoleCode" TEXT,
    "gapAnalysis" JSONB NOT NULL,
    "agentSpec" JSONB,
    "capabilitySpec" JSONB,
    "toolBindingSpec" JSONB,
    "promptSpec" JSONB,
    "testsSpec" JSONB,
    "riskReview" JSONB,
    "status" "AgentBuildProposalStatus" NOT NULL DEFAULT 'DRAFT',
    "reviewedBy" TEXT,
    "reviewedByRole" TEXT,
    "reviewNotes" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentBuildProposal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AgentBuildProposal_organizationId_status_idx" ON "AgentBuildProposal"("organizationId", "status");

-- CreateIndex
CREATE INDEX "AgentBuildProposal_organizationId_createdAt_idx" ON "AgentBuildProposal"("organizationId", "createdAt");

-- AddForeignKey
ALTER TABLE "AgentBuildProposal" ADD CONSTRAINT "AgentBuildProposal_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Habilita RLS estrito — mesmo padrão de AgentExecution/AccessRequest/AgentHandoffMessage/
-- LearningCandidate (sem cláusula de bypass_rls no USING; toda escrita real acontece dentro de
-- uma requisição HTTP autenticada, POST /api/agent-builder/..., sempre com tenant já resolvido
-- pelo authenticateToken, então não há caso legítimo de bypass aqui).
ALTER TABLE "AgentBuildProposal" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AgentBuildProposal" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_policy ON "AgentBuildProposal";
CREATE POLICY tenant_isolation_policy ON "AgentBuildProposal" FOR ALL
USING (
    current_setting('app.current_tenant_id', TRUE) = "organizationId"
)
WITH CHECK (
    current_setting('app.current_tenant_id', TRUE) = "organizationId"
);
