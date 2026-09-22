-- CreateTable "CommercialMission"
CREATE TABLE "CommercialMission" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT,
    "accountName" TEXT NOT NULL,
    "cnpj" TEXT,
    "segment" TEXT,
    "fleetSize" INTEGER,
    "estimatedRevenue" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "currentCadenceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommercialMission_pkey" PRIMARY KEY ("id")
);

-- CreateTable "NextBestActionRecommendation"
CREATE TABLE "NextBestActionRecommendation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "channel" TEXT,
    "objective" TEXT NOT NULL,
    "rationale" TEXT NOT NULL,
    "recommendedMessage" TEXT,
    "evidence" JSONB,
    "confidence" DOUBLE PRECISION NOT NULL,
    "requiresApproval" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "scheduledFor" TIMESTAMP(3),
    "executedAt" TIMESTAMP(3),
    "actorId" TEXT,
    "feedbackReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NextBestActionRecommendation_pkey" PRIMARY KEY ("id")
);

-- CreateTable "CommercialMissionEvent"
CREATE TABLE "CommercialMissionEvent" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommercialMissionEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable "MissionScore"
CREATE TABLE "MissionScore" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "icpScore" DOUBLE PRECISION NOT NULL,
    "fitScore" DOUBLE PRECISION NOT NULL,
    "intentScore" DOUBLE PRECISION NOT NULL,
    "opportunityScore" DOUBLE PRECISION NOT NULL,
    "evidence" JSONB,

    CONSTRAINT "MissionScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable "MissionAgentTrace"
CREATE TABLE "MissionAgentTrace" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "trace" JSONB NOT NULL,

    CONSTRAINT "MissionAgentTrace_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX "CommercialMission_organizationId_status_idx" ON "CommercialMission"("organizationId", "status");
CREATE INDEX "NextBestActionRecommendation_missionId_status_idx" ON "NextBestActionRecommendation"("missionId", "status");
CREATE INDEX "NextBestActionRecommendation_organizationId_status_idx" ON "NextBestActionRecommendation"("organizationId", "status");
CREATE INDEX "CommercialMissionEvent_missionId_createdAt_idx" ON "CommercialMissionEvent"("missionId", "createdAt");
CREATE INDEX "CommercialMissionEvent_organizationId_eventType_idx" ON "CommercialMissionEvent"("organizationId", "eventType");
CREATE UNIQUE INDEX "MissionScore_missionId_key" ON "MissionScore"("missionId");
CREATE INDEX "MissionScore_organizationId_idx" ON "MissionScore"("organizationId");
CREATE UNIQUE INDEX "MissionAgentTrace_missionId_key" ON "MissionAgentTrace"("missionId");
CREATE INDEX "MissionAgentTrace_organizationId_idx" ON "MissionAgentTrace"("organizationId");

-- Foreign Keys
ALTER TABLE "CommercialMission" ADD CONSTRAINT "CommercialMission_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "NextBestActionRecommendation" ADD CONSTRAINT "NextBestActionRecommendation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NextBestActionRecommendation" ADD CONSTRAINT "NextBestActionRecommendation_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "CommercialMission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CommercialMissionEvent" ADD CONSTRAINT "CommercialMissionEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommercialMissionEvent" ADD CONSTRAINT "CommercialMissionEvent_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "CommercialMission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MissionScore" ADD CONSTRAINT "MissionScore_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MissionScore" ADD CONSTRAINT "MissionScore_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "CommercialMission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MissionAgentTrace" ADD CONSTRAINT "MissionAgentTrace_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MissionAgentTrace" ADD CONSTRAINT "MissionAgentTrace_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "CommercialMission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RLS
ALTER TABLE "CommercialMission" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CommercialMission" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "CommercialMission" FOR ALL USING ("organizationId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "NextBestActionRecommendation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "NextBestActionRecommendation" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "NextBestActionRecommendation" FOR ALL USING ("organizationId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "CommercialMissionEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CommercialMissionEvent" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "CommercialMissionEvent" FOR ALL USING ("organizationId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "MissionScore" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MissionScore" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "MissionScore" FOR ALL USING ("organizationId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "MissionAgentTrace" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MissionAgentTrace" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "MissionAgentTrace" FOR ALL USING ("organizationId" = current_setting('app.current_tenant_id', true));
