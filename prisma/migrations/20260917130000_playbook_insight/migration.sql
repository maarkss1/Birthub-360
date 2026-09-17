-- CreateEnum
CREATE TYPE "PlaybookInsightStatus" AS ENUM ('SUGGESTED', 'APPROVED', 'BROADCAST', 'DISMISSED', 'ARCHIVED');

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
    "conversionRate" DOUBLE PRECISION,
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
CREATE INDEX "PlaybookInsight_organizationId_status_idx" ON "PlaybookInsight"("organizationId", "status");
CREATE INDEX "PlaybookInsight_organizationId_createdAt_idx" ON "PlaybookInsight"("organizationId", "createdAt");

-- AddForeignKey
ALTER TABLE "PlaybookInsight" ADD CONSTRAINT "PlaybookInsight_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Enable RLS
ALTER TABLE "PlaybookInsight" ENABLE ROW LEVEL SECURITY;

-- RLS Policy (Fail-closed multi-tenant)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'PlaybookInsight' AND policyname = 'tenant_isolation_policy'
  ) THEN
    CREATE POLICY tenant_isolation_policy ON "PlaybookInsight"
      FOR ALL
      USING ("organizationId" = current_setting('app.current_organization_id', true))
      WITH CHECK ("organizationId" = current_setting('app.current_organization_id', true));
  END IF;
END $$;
