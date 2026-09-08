-- CreateTable
CREATE TABLE "MesaTratamentoTreatment" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MesaTratamentoTreatment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PomodoroSession" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "cycleNumber" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PomodoroSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MesaTratamentoTreatment_organizationId_userId_createdAt_idx" ON "MesaTratamentoTreatment"("organizationId", "userId", "createdAt");

-- CreateIndex
CREATE INDEX "MesaTratamentoTreatment_leadId_idx" ON "MesaTratamentoTreatment"("leadId");

-- CreateIndex
CREATE INDEX "PomodoroSession_organizationId_userId_createdAt_idx" ON "PomodoroSession"("organizationId", "userId", "createdAt");

-- AddForeignKey
ALTER TABLE "MesaTratamentoTreatment" ADD CONSTRAINT "MesaTratamentoTreatment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MesaTratamentoTreatment" ADD CONSTRAINT "MesaTratamentoTreatment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MesaTratamentoTreatment" ADD CONSTRAINT "MesaTratamentoTreatment_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PomodoroSession" ADD CONSTRAINT "PomodoroSession_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PomodoroSession" ADD CONSTRAINT "PomodoroSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Habilita RLS seguindo o padrao estrito de 20260907120000_module_access_grant: sem clausula de
-- bypass_rls no USING (tabelas novas nao entram no allowlist BYPASS_RLS_ALLOWED_MODELS de
-- src/lib/prisma.ts) e WITH CHECK exigindo o mesmo match de tenant do USING.
ALTER TABLE "MesaTratamentoTreatment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MesaTratamentoTreatment" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_policy ON "MesaTratamentoTreatment";
CREATE POLICY tenant_isolation_policy ON "MesaTratamentoTreatment" FOR ALL
USING (
    current_setting('app.current_tenant_id', TRUE) = "organizationId"
)
WITH CHECK (
    current_setting('app.current_tenant_id', TRUE) = "organizationId"
);

ALTER TABLE "PomodoroSession" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PomodoroSession" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_policy ON "PomodoroSession";
CREATE POLICY tenant_isolation_policy ON "PomodoroSession" FOR ALL
USING (
    current_setting('app.current_tenant_id', TRUE) = "organizationId"
)
WITH CHECK (
    current_setting('app.current_tenant_id', TRUE) = "organizationId"
);
