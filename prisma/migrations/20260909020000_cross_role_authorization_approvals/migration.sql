-- Cross-Role Authorization + Aprovações (PROMPT 7) — 3 tabelas novas, dado de negócio por tenant
-- (mesmo padrão de RLS estrito de AgentExecution, 20260908120000_agent_runtime_execution): sem
-- cláusula de bypass_rls no USING (nenhum dos 3 modelos está no allowlist BYPASS_RLS_ALLOWED_MODELS
-- de src/lib/prisma.ts) e WITH CHECK exigindo o mesmo match de tenant do USING.

-- CreateEnum
CREATE TYPE "AccessRequestCategory" AS ENUM ('READ_CONSULTA', 'HANDOFF_OPERACIONAL', 'DEAL_CHANGES', 'FORECAST_META', 'DESCONTO_PRECO', 'CONTRATO', 'FINANCEIRO', 'ASSINATURA', 'BITRIX_CONFIG');

-- CreateEnum
CREATE TYPE "AccessRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'DENIED', 'EXPIRED', 'REVOKED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ApprovalDecisionOutcome" AS ENUM ('APPROVED', 'DENIED');

-- CreateTable
CREATE TABLE "AccessRequest" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "requesterRole" TEXT NOT NULL,
    "requesterJobRoleCode" TEXT,
    "capabilityDefinitionId" TEXT NOT NULL,
    "category" "AccessRequestCategory" NOT NULL,
    "resource" JSONB NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "AccessRequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccessRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalDecision" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "accessRequestId" TEXT NOT NULL,
    "approverId" TEXT NOT NULL,
    "approverRole" TEXT NOT NULL,
    "outcome" "ApprovalDecisionOutcome" NOT NULL,
    "reasonCode" TEXT NOT NULL,
    "notes" TEXT,
    "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApprovalDecision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TemporaryCapabilityGrant" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "accessRequestId" TEXT NOT NULL,
    "granteeId" TEXT NOT NULL,
    "capabilityDefinitionId" TEXT NOT NULL,
    "resource" JSONB NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "revokedBy" TEXT,
    "revokedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TemporaryCapabilityGrant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AccessRequest_organizationId_status_idx" ON "AccessRequest"("organizationId", "status");

-- CreateIndex
CREATE INDEX "AccessRequest_requesterId_idx" ON "AccessRequest"("requesterId");

-- CreateIndex
CREATE INDEX "AccessRequest_capabilityDefinitionId_idx" ON "AccessRequest"("capabilityDefinitionId");

-- CreateIndex
CREATE INDEX "ApprovalDecision_accessRequestId_idx" ON "ApprovalDecision"("accessRequestId");

-- CreateIndex
CREATE INDEX "ApprovalDecision_organizationId_idx" ON "ApprovalDecision"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "TemporaryCapabilityGrant_accessRequestId_key" ON "TemporaryCapabilityGrant"("accessRequestId");

-- CreateIndex
CREATE INDEX "TemporaryCapabilityGrant_organizationId_granteeId_capabili_idx" ON "TemporaryCapabilityGrant"("organizationId", "granteeId", "capabilityDefinitionId");

-- CreateIndex
CREATE INDEX "TemporaryCapabilityGrant_expiresAt_idx" ON "TemporaryCapabilityGrant"("expiresAt");

-- AddForeignKey
ALTER TABLE "AccessRequest" ADD CONSTRAINT "AccessRequest_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessRequest" ADD CONSTRAINT "AccessRequest_capabilityDefinitionId_fkey" FOREIGN KEY ("capabilityDefinitionId") REFERENCES "CapabilityDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalDecision" ADD CONSTRAINT "ApprovalDecision_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalDecision" ADD CONSTRAINT "ApprovalDecision_accessRequestId_fkey" FOREIGN KEY ("accessRequestId") REFERENCES "AccessRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemporaryCapabilityGrant" ADD CONSTRAINT "TemporaryCapabilityGrant_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemporaryCapabilityGrant" ADD CONSTRAINT "TemporaryCapabilityGrant_accessRequestId_fkey" FOREIGN KEY ("accessRequestId") REFERENCES "AccessRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemporaryCapabilityGrant" ADD CONSTRAINT "TemporaryCapabilityGrant_capabilityDefinitionId_fkey" FOREIGN KEY ("capabilityDefinitionId") REFERENCES "CapabilityDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Habilita RLS estrito nas 3 tabelas — mesmo padrão de AgentExecution
-- (20260908120000_agent_runtime_execution): sem cláusula de bypass_rls no USING (nenhum dos 3
-- modelos está no allowlist BYPASS_RLS_ALLOWED_MODELS de src/lib/prisma.ts) e WITH CHECK exigindo
-- o mesmo match de tenant do USING — toda escrita real acontece de dentro de uma requisição HTTP
-- autenticada (POST /api/access-requests, .../approve, .../deny, .../revoke), sempre com tenant já
-- resolvido pelo authenticateToken, então não há caso legítimo de bypass aqui.
ALTER TABLE "AccessRequest" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AccessRequest" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_policy ON "AccessRequest";
CREATE POLICY tenant_isolation_policy ON "AccessRequest" FOR ALL
USING (
    current_setting('app.current_tenant_id', TRUE) = "organizationId"
)
WITH CHECK (
    current_setting('app.current_tenant_id', TRUE) = "organizationId"
);

ALTER TABLE "ApprovalDecision" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ApprovalDecision" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_policy ON "ApprovalDecision";
CREATE POLICY tenant_isolation_policy ON "ApprovalDecision" FOR ALL
USING (
    current_setting('app.current_tenant_id', TRUE) = "organizationId"
)
WITH CHECK (
    current_setting('app.current_tenant_id', TRUE) = "organizationId"
);

ALTER TABLE "TemporaryCapabilityGrant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TemporaryCapabilityGrant" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_policy ON "TemporaryCapabilityGrant";
CREATE POLICY tenant_isolation_policy ON "TemporaryCapabilityGrant" FOR ALL
USING (
    current_setting('app.current_tenant_id', TRUE) = "organizationId"
)
WITH CHECK (
    current_setting('app.current_tenant_id', TRUE) = "organizationId"
);
