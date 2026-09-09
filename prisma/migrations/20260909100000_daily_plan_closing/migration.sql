-- CreateTable
CREATE TABLE "DailyPlanClosing" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "referenceDate" TEXT NOT NULL,
    "totalItems" INTEGER NOT NULL,
    "completedItems" INTEGER NOT NULL,
    "pendingItems" INTEGER NOT NULL,
    "completionRate" INTEGER NOT NULL,
    "userComment" TEXT NOT NULL,
    "nextDayGoals" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyPlanClosing_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DailyPlanClosing_userId_referenceDate_key" ON "DailyPlanClosing"("userId", "referenceDate");

-- CreateIndex
CREATE INDEX "DailyPlanClosing_organizationId_userId_idx" ON "DailyPlanClosing"("organizationId", "userId");

-- AddForeignKey
ALTER TABLE "DailyPlanClosing" ADD CONSTRAINT "DailyPlanClosing_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyPlanClosing" ADD CONSTRAINT "DailyPlanClosing_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Habilita RLS seguindo o padrao estrito de 20260907220000_mesa_tratamento_sdr_logs: sem clausula
-- de bypass_rls no USING (tabela nova nao entra no allowlist BYPASS_RLS_ALLOWED_MODELS de
-- src/lib/prisma.ts) e WITH CHECK exigindo o mesmo match de tenant do USING.
ALTER TABLE "DailyPlanClosing" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DailyPlanClosing" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_policy ON "DailyPlanClosing";
CREATE POLICY tenant_isolation_policy ON "DailyPlanClosing" FOR ALL
USING (
    current_setting('app.current_tenant_id', TRUE) = "organizationId"
)
WITH CHECK (
    current_setting('app.current_tenant_id', TRUE) = "organizationId"
);
