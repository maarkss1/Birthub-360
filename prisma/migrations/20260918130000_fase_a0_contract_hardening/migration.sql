CREATE TYPE "CompanyRegistryEstablishmentType" AS ENUM ('HEADQUARTERS', 'BRANCH');
CREATE TYPE "CompanyRegistryTaxRegime" AS ENUM ('SIMPLES_MEI', 'SIMPLES_ME_EPP', 'NORMAL', 'UNKNOWN');
CREATE TYPE "CommercialMissionStatus" AS ENUM ('PLANNED', 'ACTIVE', 'WAITING_EVENT', 'ENGAGED', 'MEETING_BOOKED', 'QUALIFIED', 'NURTURING', 'EXHAUSTED', 'STOPPED', 'CONVERTED');
CREATE TYPE "CommercialMissionEventType" AS ENUM ('EMAIL_SENT', 'EMAIL_OPENED', 'EMAIL_REPLIED', 'WHATSAPP_SENT', 'WHATSAPP_READ', 'WHATSAPP_REPLIED', 'CALL_ATTEMPTED', 'CALL_COMPLETED', 'MEETING_BOOKED', 'MEETING_COMPLETED', 'MANUAL_INTERACTION', 'OPPORTUNITY_CREATED', 'DEAL_WON', 'DEAL_LOST', 'MISSION_STATUS_CHANGED');
CREATE TYPE "CommercialMissionEventSourceType" AS ENUM ('WHATSAPP_MESSAGE', 'VOICE_CALL_LOG', 'ACTIVITY', 'MANUAL', 'WEBHOOK', 'SYSTEM');
CREATE TYPE "MissionAgentName" AS ENUM ('HUNTER', 'ENRICHER', 'GISELLE', 'PATRICIA', 'GUARDIAO', 'TAGARELA', 'NBA_ENGINE', 'ADAPTIVE_CADENCE');
CREATE TYPE "MissionDecisionKind" AS ENUM ('RULE', 'LLM', 'FALLBACK', 'HUMAN_OVERRIDE');
CREATE TYPE "RecommendationChannel" AS ENUM ('EMAIL', 'WHATSAPP', 'PHONE_VOICE', 'LINKEDIN', 'PROPOSAL_REVIEW');
CREATE TABLE "CompanyRegistry" (
    "id" TEXT NOT NULL,
    "cnpj" TEXT NOT NULL,
    "cnpjRoot" TEXT NOT NULL,
    "establishmentType" "CompanyRegistryEstablishmentType" NOT NULL,
    "legalName" TEXT NOT NULL,
    "tradeName" TEXT,
    "registrationStatus" TEXT NOT NULL,
    "registrationStatusDate" TIMESTAMP(3),
    "legalNature" TEXT,
    "size" TEXT,
    "shareCapital" DOUBLE PRECISION,
    "primaryCnae" TEXT,
    "secondaryCnaes" TEXT[],
    "city" TEXT,
    "state" TEXT,
    "ibgeCode" TEXT,
    "taxRegime" "CompanyRegistryTaxRegime" NOT NULL DEFAULT 'UNKNOWN',
    "simplesOptant" BOOLEAN,
    "simplesOptedAt" TIMESTAMP(3),
    "meiOptant" BOOLEAN,
    "sourceName" TEXT NOT NULL,
    "sourceVersion" TEXT,
    "sourceSnapshot" JSONB NOT NULL,
    "retrievedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyRegistry_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "CommercialMission" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "leadId" TEXT,
    "ownerId" TEXT,
    "status" "CommercialMissionStatus" NOT NULL DEFAULT 'PLANNED',
    "objective" TEXT,
    "strategySnapshotId" TEXT,
    "currentCadenceRunId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommercialMission_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "CommercialMissionEvent" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "eventType" "CommercialMissionEventType" NOT NULL,
    "sourceType" "CommercialMissionEventSourceType",
    "sourceId" TEXT,
    "providerEventId" TEXT,
    "correlationId" TEXT,
    "payload" JSONB,
    "previousStatus" "CommercialMissionStatus",
    "newStatus" "CommercialMissionStatus",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommercialMissionEvent_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "MissionAgentTrace" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "agentName" "MissionAgentName" NOT NULL,
    "decisionKind" "MissionDecisionKind" NOT NULL,
    "ruleId" TEXT,
    "model" TEXT,
    "inputHash" TEXT,
    "confidence" DOUBLE PRECISION,
    "aiLogId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MissionAgentTrace_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "MissionAgentTraceEvidence" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "traceId" TEXT NOT NULL,
    "evidenceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MissionAgentTraceEvidence_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "CommercialMission" ADD CONSTRAINT "CommercialMission_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommercialMission" ADD CONSTRAINT "CommercialMission_companyId_organizationId_fkey" FOREIGN KEY ("companyId", "organizationId") REFERENCES "Company"("id", "organizationId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommercialMission" ADD CONSTRAINT "CommercialMission_leadId_organizationId_fkey" FOREIGN KEY ("leadId", "organizationId") REFERENCES "Lead"("id", "organizationId") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CommercialMission" ADD CONSTRAINT "CommercialMission_ownerId_organizationId_fkey" FOREIGN KEY ("ownerId", "organizationId") REFERENCES "user"("id", "organizationId") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CommercialMission" ADD CONSTRAINT "CommercialMission_strategySnapshotId_organizationId_compan_fkey" FOREIGN KEY ("strategySnapshotId", "organizationId", "companyId") REFERENCES "AccountIntelligenceSnapshot"("id", "organizationId", "companyId") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CommercialMission" ADD CONSTRAINT "CommercialMission_currentCadenceRunId_organizationId_fkey" FOREIGN KEY ("currentCadenceRunId", "organizationId") REFERENCES "CadenceRun"("id", "organizationId") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CommercialMissionEvent" ADD CONSTRAINT "CommercialMissionEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommercialMissionEvent" ADD CONSTRAINT "CommercialMissionEvent_missionId_organizationId_fkey" FOREIGN KEY ("missionId", "organizationId") REFERENCES "CommercialMission"("id", "organizationId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MissionAgentTrace" ADD CONSTRAINT "MissionAgentTrace_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MissionAgentTrace" ADD CONSTRAINT "MissionAgentTrace_missionId_organizationId_fkey" FOREIGN KEY ("missionId", "organizationId") REFERENCES "CommercialMission"("id", "organizationId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MissionAgentTraceEvidence" ADD CONSTRAINT "MissionAgentTraceEvidence_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MissionAgentTraceEvidence" ADD CONSTRAINT "MissionAgentTraceEvidence_traceId_organizationId_fkey" FOREIGN KEY ("traceId", "organizationId") REFERENCES "MissionAgentTrace"("id", "organizationId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MissionAgentTraceEvidence" ADD CONSTRAINT "MissionAgentTraceEvidence_evidenceId_organizationId_fkey" FOREIGN KEY ("evidenceId", "organizationId") REFERENCES "IntelligenceEvidence"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
-- Add companyRegistryId to Company
ALTER TABLE "Company" ADD COLUMN "companyRegistryId" TEXT;
ALTER TABLE "Company" ADD CONSTRAINT "Company_companyRegistryId_fkey" FOREIGN KEY ("companyRegistryId") REFERENCES "CompanyRegistry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "Company_companyRegistryId_idx" ON "Company"("companyRegistryId");
-- Add AccountRecommendation columns and constraints
ALTER TABLE "AccountRecommendation" ADD COLUMN "missionId" TEXT;
ALTER TABLE "AccountRecommendation" ADD COLUMN "channel" "RecommendationChannel";
ALTER TABLE "AccountRecommendation" ADD COLUMN "confidence" DOUBLE PRECISION;
ALTER TABLE "AccountRecommendation" ADD COLUMN "decisionVersion" TEXT;
ALTER TABLE "AccountRecommendation" ADD COLUMN "supersededAt" TIMESTAMP(3);
ALTER TABLE "AccountRecommendation" ADD COLUMN "supersededByRecommendationId" TEXT;
ALTER TABLE "AccountRecommendation" ADD COLUMN "supersededReason" TEXT;
DROP INDEX IF EXISTS "AccountRecommendation_organizationId_companyId_actionType_inputHash_key";
CREATE UNIQUE INDEX "AccountRecommendation_org_company_action_decisionVer_inputHash_key" ON "AccountRecommendation"("organizationId", "companyId", "actionType", "decisionVersion", "inputHash");
ALTER TABLE "AccountRecommendation" ADD CONSTRAINT "AccountRecommendation_missionId_organizationId_fkey" FOREIGN KEY ("missionId", "organizationId") REFERENCES "CommercialMission"("id", "organizationId") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AccountRecommendation" ADD CONSTRAINT "AccountRecommendation_supersededByRecommendationId_fkey" FOREIGN KEY ("supersededByRecommendationId") REFERENCES "AccountRecommendation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
-- Add unique composite keys
CREATE UNIQUE INDEX "Lead_id_organizationId_key" ON "Lead"("id", "organizationId");
CREATE UNIQUE INDEX "User_id_organizationId_key" ON "User"("id", "organizationId");
CREATE UNIQUE INDEX "CadenceRun_id_organizationId_key" ON "CadenceRun"("id", "organizationId");
CREATE UNIQUE INDEX "IntelligenceEvidence_id_organizationId_key" ON "IntelligenceEvidence"("id", "organizationId");
CREATE INDEX "CompanyRegistry_cnpjRoot_idx" ON "CompanyRegistry"("cnpjRoot");
CREATE INDEX "CompanyRegistry_legalName_idx" ON "CompanyRegistry"("legalName");
CREATE INDEX "CompanyRegistry_registrationStatus_idx" ON "CompanyRegistry"("registrationStatus");
CREATE UNIQUE INDEX "CompanyRegistry_cnpj_key" ON "CompanyRegistry"("cnpj");
CREATE UNIQUE INDEX "CommercialMission_currentCadenceRunId_key" ON "CommercialMission"("currentCadenceRunId");
CREATE INDEX "CommercialMission_organizationId_status_idx" ON "CommercialMission"("organizationId", "status");
CREATE INDEX "CommercialMission_organizationId_companyId_idx" ON "CommercialMission"("organizationId", "companyId");
CREATE UNIQUE INDEX "CommercialMission_id_organizationId_key" ON "CommercialMission"("id", "organizationId");
CREATE INDEX "CommercialMissionEvent_organizationId_missionId_createdAt_idx" ON "CommercialMissionEvent"("organizationId", "missionId", "createdAt");
CREATE INDEX "MissionAgentTrace_organizationId_missionId_createdAt_idx" ON "MissionAgentTrace"("organizationId", "missionId", "createdAt");
CREATE UNIQUE INDEX "MissionAgentTrace_id_organizationId_key" ON "MissionAgentTrace"("id", "organizationId");
CREATE INDEX "MissionAgentTraceEvidence_organizationId_evidenceId_idx" ON "MissionAgentTraceEvidence"("organizationId", "evidenceId");
CREATE UNIQUE INDEX "MissionAgentTraceEvidence_traceId_evidenceId_key" ON "MissionAgentTraceEvidence"("traceId", "evidenceId");
-- Partial index for Event Idempotency
CREATE UNIQUE INDEX "CommercialMissionEvent_org_providerEventId_key" ON "CommercialMissionEvent"("organizationId", "providerEventId") WHERE "providerEventId" IS NOT NULL;

-- CompanyRegistry Global Policy
ALTER TABLE "CompanyRegistry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CompanyRegistry" FORCE ROW LEVEL SECURITY;
CREATE POLICY global_catalog_policy ON "CompanyRegistry" FOR ALL USING (true) WITH CHECK (true);

-- CommercialMission Tenant Isolation
ALTER TABLE "CommercialMission" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CommercialMission" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "CommercialMission" FOR ALL
USING (current_setting('app.current_tenant_id', TRUE) = "organizationId" OR current_setting('app.bypass_rls', TRUE) = 'on')
WITH CHECK (current_setting('app.current_tenant_id', TRUE) = "organizationId" OR current_setting('app.bypass_rls', TRUE) = 'on');

-- CommercialMissionEvent Tenant Isolation
ALTER TABLE "CommercialMissionEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CommercialMissionEvent" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "CommercialMissionEvent" FOR ALL
USING (current_setting('app.current_tenant_id', TRUE) = "organizationId" OR current_setting('app.bypass_rls', TRUE) = 'on')
WITH CHECK (current_setting('app.current_tenant_id', TRUE) = "organizationId" OR current_setting('app.bypass_rls', TRUE) = 'on');

-- MissionAgentTrace Tenant Isolation
ALTER TABLE "MissionAgentTrace" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MissionAgentTrace" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "MissionAgentTrace" FOR ALL
USING (current_setting('app.current_tenant_id', TRUE) = "organizationId" OR current_setting('app.bypass_rls', TRUE) = 'on')
WITH CHECK (current_setting('app.current_tenant_id', TRUE) = "organizationId" OR current_setting('app.bypass_rls', TRUE) = 'on');

-- MissionAgentTraceEvidence Tenant Isolation
ALTER TABLE "MissionAgentTraceEvidence" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MissionAgentTraceEvidence" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "MissionAgentTraceEvidence" FOR ALL
USING (current_setting('app.current_tenant_id', TRUE) = "organizationId" OR current_setting('app.bypass_rls', TRUE) = 'on')
WITH CHECK (current_setting('app.current_tenant_id', TRUE) = "organizationId" OR current_setting('app.bypass_rls', TRUE) = 'on');
