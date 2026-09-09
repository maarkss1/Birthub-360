-- Agent Bus + Handoffs (PROMPT 8) — 1 tabela nova, dado de negócio por tenant (mesmo padrão de RLS
-- estrito de AgentExecution/AccessRequest: sem cláusula de bypass_rls no USING, porque
-- "AgentHandoffMessage" não está no allowlist BYPASS_RLS_ALLOWED_MODELS de src/lib/prisma.ts) e
-- WITH CHECK exigindo o mesmo match de tenant do USING.

-- CreateEnum
CREATE TYPE "HandoffStatus" AS ENUM ('CREATED', 'AUTHORIZING', 'QUEUED', 'ACCEPTED', 'RUNNING', 'COMPLETED', 'DENIED', 'FAILED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "HandoffPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateTable
CREATE TABLE "AgentHandoffMessage" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "fromAgent" TEXT NOT NULL,
    "fromRole" TEXT NOT NULL,
    "toAgent" TEXT NOT NULL,
    "toRole" TEXT NOT NULL,
    "requestType" TEXT NOT NULL,
    "requestedCapability" TEXT NOT NULL,
    "resourceScope" JSONB,
    "knownFacts" JSONB NOT NULL DEFAULT '[]',
    "evidence" JSONB NOT NULL DEFAULT '[]',
    "risks" JSONB NOT NULL DEFAULT '[]',
    "authorizationContext" JSONB,
    "priority" "HandoffPriority" NOT NULL DEFAULT 'NORMAL',
    "status" "HandoffStatus" NOT NULL DEFAULT 'CREATED',
    "response" JSONB,
    "confidence" DOUBLE PRECISION,
    "errorMessage" TEXT,
    "idempotencyKey" TEXT,
    "parentHandoffId" TEXT,
    "depth" INTEGER NOT NULL DEFAULT 0,
    "executionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "AgentHandoffMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AgentHandoffMessage_organizationId_idempotencyKey_key" ON "AgentHandoffMessage"("organizationId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "AgentHandoffMessage_organizationId_conversationId_idx" ON "AgentHandoffMessage"("organizationId", "conversationId");

-- CreateIndex
CREATE INDEX "AgentHandoffMessage_organizationId_missionId_idx" ON "AgentHandoffMessage"("organizationId", "missionId");

-- CreateIndex
CREATE INDEX "AgentHandoffMessage_organizationId_status_idx" ON "AgentHandoffMessage"("organizationId", "status");

-- CreateIndex
CREATE INDEX "AgentHandoffMessage_parentHandoffId_idx" ON "AgentHandoffMessage"("parentHandoffId");

-- AddForeignKey
ALTER TABLE "AgentHandoffMessage" ADD CONSTRAINT "AgentHandoffMessage_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentHandoffMessage" ADD CONSTRAINT "AgentHandoffMessage_parentHandoffId_fkey" FOREIGN KEY ("parentHandoffId") REFERENCES "AgentHandoffMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Habilita RLS estrito — mesmo padrão de AgentExecution/AccessRequest (sem cláusula de
-- bypass_rls no USING; toda escrita real acontece dentro de uma requisição HTTP autenticada,
-- POST /api/agent-bus/..., sempre com tenant já resolvido pelo authenticateToken, então não há
-- caso legítimo de bypass aqui).
ALTER TABLE "AgentHandoffMessage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AgentHandoffMessage" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_policy ON "AgentHandoffMessage";
CREATE POLICY tenant_isolation_policy ON "AgentHandoffMessage" FOR ALL
USING (
    current_setting('app.current_tenant_id', TRUE) = "organizationId"
)
WITH CHECK (
    current_setting('app.current_tenant_id', TRUE) = "organizationId"
);
