-- Memória + Aprendizado Contínuo Governado (PROMPT 9) — 4 tabelas novas, dado de negócio por
-- tenant (mesmo padrão de RLS estrito de AgentExecution/AccessRequest/AgentHandoffMessage: sem
-- cláusula de bypass_rls no USING, nenhum dos 4 modelos está no allowlist
-- BYPASS_RLS_ALLOWED_MODELS de src/lib/prisma.ts) e WITH CHECK exigindo o mesmo match de tenant
-- do USING.

-- CreateEnum
CREATE TYPE "MemoryScope" AS ENUM ('AGENT', 'ROLE', 'ORGANIZATION');

-- CreateEnum
CREATE TYPE "MemoryCategory" AS ENUM ('PRICING', 'DISCOUNT', 'FORECAST_RULE', 'CONTRACT', 'FINANCE', 'COMPLIANCE', 'WRITE_AUTOMATION', 'CAPABILITY', 'OPERATIONAL');

-- CreateEnum
CREATE TYPE "MemoryStatus" AS ENUM ('PROPOSED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'SUPERSEDED', 'ROLLED_BACK');

-- CreateTable
CREATE TABLE "LearningCandidate" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "sourceExecutionId" TEXT NOT NULL,
    "agentCode" TEXT NOT NULL,
    "jobRoleCode" TEXT,
    "targetScope" "MemoryScope" NOT NULL,
    "topic" TEXT NOT NULL,
    "category" "MemoryCategory" NOT NULL,
    "proposedContent" JSONB NOT NULL,
    "reflection" JSONB NOT NULL,
    "evidence" JSONB NOT NULL DEFAULT '[]',
    "sanitization" JSONB,
    "status" "MemoryStatus" NOT NULL DEFAULT 'PROPOSED',
    "deciderId" TEXT,
    "deciderRole" TEXT,
    "decisionNotes" TEXT,
    "decidedAt" TIMESTAMP(3),
    "resultingMemoryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LearningCandidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentMemoryRecord" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "agentCode" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "category" "MemoryCategory" NOT NULL,
    "content" JSONB NOT NULL,
    "evidence" JSONB NOT NULL DEFAULT '[]',
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "MemoryStatus" NOT NULL DEFAULT 'APPROVED',
    "sourceCandidateId" TEXT NOT NULL,
    "supersedesId" TEXT,
    "supersededById" TEXT,
    "rolledBackBy" TEXT,
    "rolledBackAt" TIMESTAMP(3),
    "rolledBackReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentMemoryRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoleMemoryRecord" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "jobRoleCode" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "category" "MemoryCategory" NOT NULL,
    "content" JSONB NOT NULL,
    "evidence" JSONB NOT NULL DEFAULT '[]',
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "MemoryStatus" NOT NULL DEFAULT 'APPROVED',
    "sourceCandidateId" TEXT NOT NULL,
    "supersedesId" TEXT,
    "supersededById" TEXT,
    "rolledBackBy" TEXT,
    "rolledBackAt" TIMESTAMP(3),
    "rolledBackReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoleMemoryRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationMemoryRecord" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "category" "MemoryCategory" NOT NULL,
    "content" JSONB NOT NULL,
    "evidence" JSONB NOT NULL DEFAULT '[]',
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "MemoryStatus" NOT NULL DEFAULT 'APPROVED',
    "sourceCandidateId" TEXT NOT NULL,
    "supersedesId" TEXT,
    "supersededById" TEXT,
    "rolledBackBy" TEXT,
    "rolledBackAt" TIMESTAMP(3),
    "rolledBackReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationMemoryRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LearningCandidate_organizationId_status_idx" ON "LearningCandidate"("organizationId", "status");

-- CreateIndex
CREATE INDEX "LearningCandidate_organizationId_targetScope_topic_idx" ON "LearningCandidate"("organizationId", "targetScope", "topic");

-- CreateIndex
CREATE INDEX "LearningCandidate_sourceExecutionId_idx" ON "LearningCandidate"("sourceExecutionId");

-- CreateIndex
CREATE UNIQUE INDEX "AgentMemoryRecord_organizationId_agentCode_topic_version_key" ON "AgentMemoryRecord"("organizationId", "agentCode", "topic", "version");

-- CreateIndex
CREATE INDEX "AgentMemoryRecord_organizationId_agentCode_status_topic_idx" ON "AgentMemoryRecord"("organizationId", "agentCode", "status", "topic");

-- CreateIndex
CREATE UNIQUE INDEX "RoleMemoryRecord_organizationId_jobRoleCode_topic_version_key" ON "RoleMemoryRecord"("organizationId", "jobRoleCode", "topic", "version");

-- CreateIndex
CREATE INDEX "RoleMemoryRecord_organizationId_jobRoleCode_status_topic_idx" ON "RoleMemoryRecord"("organizationId", "jobRoleCode", "status", "topic");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationMemoryRecord_organizationId_topic_version_key" ON "OrganizationMemoryRecord"("organizationId", "topic", "version");

-- CreateIndex
CREATE INDEX "OrganizationMemoryRecord_organizationId_status_topic_idx" ON "OrganizationMemoryRecord"("organizationId", "status", "topic");

-- AddForeignKey
ALTER TABLE "LearningCandidate" ADD CONSTRAINT "LearningCandidate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentMemoryRecord" ADD CONSTRAINT "AgentMemoryRecord_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoleMemoryRecord" ADD CONSTRAINT "RoleMemoryRecord_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationMemoryRecord" ADD CONSTRAINT "OrganizationMemoryRecord_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Habilita RLS estrito nas 4 tabelas — mesmo padrão de AgentExecution/AccessRequest/
-- AgentHandoffMessage (sem cláusula de bypass_rls no USING; toda escrita real acontece dentro de
-- uma requisição HTTP autenticada, sempre com tenant já resolvido pelo authenticateToken, então
-- não há caso legítimo de bypass aqui).
ALTER TABLE "LearningCandidate" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LearningCandidate" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_policy ON "LearningCandidate";
CREATE POLICY tenant_isolation_policy ON "LearningCandidate" FOR ALL
USING (
    current_setting('app.current_tenant_id', TRUE) = "organizationId"
)
WITH CHECK (
    current_setting('app.current_tenant_id', TRUE) = "organizationId"
);

ALTER TABLE "AgentMemoryRecord" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AgentMemoryRecord" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_policy ON "AgentMemoryRecord";
CREATE POLICY tenant_isolation_policy ON "AgentMemoryRecord" FOR ALL
USING (
    current_setting('app.current_tenant_id', TRUE) = "organizationId"
)
WITH CHECK (
    current_setting('app.current_tenant_id', TRUE) = "organizationId"
);

ALTER TABLE "RoleMemoryRecord" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RoleMemoryRecord" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_policy ON "RoleMemoryRecord";
CREATE POLICY tenant_isolation_policy ON "RoleMemoryRecord" FOR ALL
USING (
    current_setting('app.current_tenant_id', TRUE) = "organizationId"
)
WITH CHECK (
    current_setting('app.current_tenant_id', TRUE) = "organizationId"
);

ALTER TABLE "OrganizationMemoryRecord" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OrganizationMemoryRecord" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_policy ON "OrganizationMemoryRecord";
CREATE POLICY tenant_isolation_policy ON "OrganizationMemoryRecord" FOR ALL
USING (
    current_setting('app.current_tenant_id', TRUE) = "organizationId"
)
WITH CHECK (
    current_setting('app.current_tenant_id', TRUE) = "organizationId"
);
