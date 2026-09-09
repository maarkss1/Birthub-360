-- Sessão de ligação simulada de roleplay (parecer técnico de fim de ligação) — antes vivia só em
-- useState no RoleplayHub.tsx e era perdida ao recarregar a página (Piloto 008 em
-- .claude/PILOTS.md). Cria a tabela com RLS habilitada já nesta migração, mesmo padrão de
-- 20260821180000_assistant_message.

-- CreateTable
CREATE TABLE "RoleplaySession" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "personaId" TEXT NOT NULL,
    "personaLabel" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL,
    "durationSeconds" INTEGER NOT NULL,
    "transcript" JSONB NOT NULL,
    "turnEvaluations" JSONB NOT NULL,
    "overallScore" INTEGER NOT NULL,
    "clarityScore" INTEGER NOT NULL,
    "objectionHandlingScore" INTEGER NOT NULL,
    "closingScore" INTEGER NOT NULL,
    "strengths" JSONB NOT NULL,
    "improvements" JSONB NOT NULL,
    "summary" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoleplaySession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RoleplaySession_organizationId_userId_createdAt_idx" ON "RoleplaySession"("organizationId", "userId", "createdAt");

-- AddForeignKey
ALTER TABLE "RoleplaySession" ADD CONSTRAINT "RoleplaySession_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoleplaySession" ADD CONSTRAINT "RoleplaySession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RowLevelSecurity
ALTER TABLE "RoleplaySession" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RoleplaySession" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON "RoleplaySession" FOR ALL
USING (
    current_setting('app.current_tenant_id', TRUE) = "organizationId"
    OR current_setting('app.bypass_rls', TRUE) = 'on'
);
