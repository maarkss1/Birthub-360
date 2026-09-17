-- Migration: Enable and Force Row Level Security (RLS) on all remaining tables

-- 1. Explicit static ENABLE / FORCE RLS for LDR / Account Intelligence tables
-- (complementing dynamic PL/pgSQL block in 20260818100000_ldr_account_intelligence_foundation)
ALTER TABLE "AccountIntelligenceSnapshot" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AccountIntelligenceSnapshot" FORCE ROW LEVEL SECURITY;

ALTER TABLE "AccountSignal" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AccountSignal" FORCE ROW LEVEL SECURITY;

ALTER TABLE "DecisionMaker" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DecisionMaker" FORCE ROW LEVEL SECURITY;

ALTER TABLE "IntelligenceEvidence" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "IntelligenceEvidence" FORCE ROW LEVEL SECURITY;

ALTER TABLE "AccountScore" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AccountScore" FORCE ROW LEVEL SECURITY;

ALTER TABLE "AccountRecommendation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AccountRecommendation" FORCE ROW LEVEL SECURITY;

ALTER TABLE "EconomicRelationship" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EconomicRelationship" FORCE ROW LEVEL SECURITY;

-- 2. ENABLE / FORCE RLS and global_catalog_policy for Global Catalog Tables (JobRole, Agent & Capability Governance)
-- These tables are global system-wide catalogs without organizationId/tenantId.
-- Using USING (true) WITH CHECK (true) ensures system seeds, background tasks, and application queries
-- can freely query and manage global catalogs under FORCE RLS while preventing RLS 42501 violations.

-- JobRole
ALTER TABLE "JobRole" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "JobRole" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS app_context_policy ON "JobRole";
DROP POLICY IF EXISTS global_catalog_policy ON "JobRole";
CREATE POLICY global_catalog_policy ON "JobRole" FOR ALL
USING (true)
WITH CHECK (true);

-- AgentDefinition
ALTER TABLE "AgentDefinition" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AgentDefinition" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS app_context_policy ON "AgentDefinition";
DROP POLICY IF EXISTS global_catalog_policy ON "AgentDefinition";
CREATE POLICY global_catalog_policy ON "AgentDefinition" FOR ALL
USING (true)
WITH CHECK (true);

-- AgentVersion
ALTER TABLE "AgentVersion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AgentVersion" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS app_context_policy ON "AgentVersion";
DROP POLICY IF EXISTS global_catalog_policy ON "AgentVersion";
CREATE POLICY global_catalog_policy ON "AgentVersion" FOR ALL
USING (true)
WITH CHECK (true);

-- RoleAgentGrant
ALTER TABLE "RoleAgentGrant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RoleAgentGrant" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS app_context_policy ON "RoleAgentGrant";
DROP POLICY IF EXISTS global_catalog_policy ON "RoleAgentGrant";
CREATE POLICY global_catalog_policy ON "RoleAgentGrant" FOR ALL
USING (true)
WITH CHECK (true);

-- CapabilityDefinition
ALTER TABLE "CapabilityDefinition" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CapabilityDefinition" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS app_context_policy ON "CapabilityDefinition";
DROP POLICY IF EXISTS global_catalog_policy ON "CapabilityDefinition";
CREATE POLICY global_catalog_policy ON "CapabilityDefinition" FOR ALL
USING (true)
WITH CHECK (true);

-- AgentCapabilityGrant
ALTER TABLE "AgentCapabilityGrant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AgentCapabilityGrant" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS app_context_policy ON "AgentCapabilityGrant";
DROP POLICY IF EXISTS global_catalog_policy ON "AgentCapabilityGrant";
CREATE POLICY global_catalog_policy ON "AgentCapabilityGrant" FOR ALL
USING (true)
WITH CHECK (true);

-- RoleCapabilityGrant
ALTER TABLE "RoleCapabilityGrant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RoleCapabilityGrant" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS app_context_policy ON "RoleCapabilityGrant";
DROP POLICY IF EXISTS global_catalog_policy ON "RoleCapabilityGrant";
CREATE POLICY global_catalog_policy ON "RoleCapabilityGrant" FOR ALL
USING (true)
WITH CHECK (true);
