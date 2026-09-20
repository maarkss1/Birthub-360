-- Item 42 do roadmap ("Playbook Vivo") — Onda 49.
-- A v1 (livingPlaybook.service.ts) computava sugestões sob demanda, sem tabela própria (ver
-- .agents/handoffs/onda-49/00-para-01-playbook-insight-schema-proposal.md). Esta migration cria a
-- tabela que persiste cada padrão gerado, com histórico e status de distribuição.

-- CreateEnum
CREATE TYPE "PlaybookInsightStatus" AS ENUM ('SUGGESTED', 'BROADCAST', 'DISMISSED');

-- CreateTable
CREATE TABLE "PlaybookInsight" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "segment" TEXT NOT NULL,
    "patternTitle" TEXT NOT NULL,
    "patternDescription" TEXT NOT NULL,
    "suggestedScript" TEXT NOT NULL,
    "evidenceCount" INTEGER NOT NULL,
    "sourceActionIds" TEXT[],
    "status" "PlaybookInsightStatus" NOT NULL DEFAULT 'SUGGESTED',
    "broadcastAt" TIMESTAMP(3),
    "broadcastBy" TEXT,
    "promotedToObjectionMatrixItemId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlaybookInsight_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlaybookInsight_organizationId_sellerId_idx" ON "PlaybookInsight"("organizationId", "sellerId");

-- CreateIndex
CREATE INDEX "PlaybookInsight_organizationId_status_idx" ON "PlaybookInsight"("organizationId", "status");

-- AddForeignKey
ALTER TABLE "PlaybookInsight" ADD CONSTRAINT "PlaybookInsight_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RowLevelSecurity
-- Padrão simétrico USING/WITH CHECK (mesmo corrigido em 20260917180000_fix_rls_tenant_write_isolation
-- para ObjectionMatrixItem/QualificationMatrixItem) — nenhum bypass de tenant nesta tabela nova.
ALTER TABLE "PlaybookInsight" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PlaybookInsight" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON "PlaybookInsight" FOR ALL
USING (
    current_setting('app.current_tenant_id', TRUE) = "organizationId"
)
WITH CHECK (
    current_setting('app.current_tenant_id', TRUE) = "organizationId"
);
