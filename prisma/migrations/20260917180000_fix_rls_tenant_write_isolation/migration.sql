-- Migration: Fix Row Level Security (RLS) Tenant Write Isolation
-- Replaces insecure WITH CHECK (true) on tenant-scoped tables with strict tenant matching policies.
-- Also establishes static ENABLE/FORCE RLS and global catalog policies for all remaining models.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Static ENABLE / FORCE RLS for LDR / Account Intelligence Tables
-- ─────────────────────────────────────────────────────────────────────────────
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

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. ENABLE / FORCE RLS & global_catalog_policy for Global Catalog Tables
-- These tables represent global catalogs without organizationId/tenantId.
-- ─────────────────────────────────────────────────────────────────────────────

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

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Hardened Tenant Policies for Allowlisted Bootstrap Tables
-- Symmetrical USING and WITH CHECK: allows bypass for authorized bootstrap workers,
-- but enforces strict organizationId matching for all standard tenant requests.
-- ─────────────────────────────────────────────────────────────────────────────

-- CrmCommercialDocument
ALTER TABLE "CrmCommercialDocument" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CrmCommercialDocument" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON "CrmCommercialDocument";
CREATE POLICY tenant_isolation_policy ON "CrmCommercialDocument" FOR ALL
USING (
    current_setting('app.current_tenant_id', TRUE) = "organizationId"
    OR current_setting('app.bypass_rls', TRUE) = 'on'
)
WITH CHECK (
    current_setting('app.current_tenant_id', TRUE) = "organizationId"
    OR current_setting('app.bypass_rls', TRUE) = 'on'
);

-- CadenceSequence
ALTER TABLE "CadenceSequence" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CadenceSequence" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON "CadenceSequence";
CREATE POLICY tenant_isolation_policy ON "CadenceSequence" FOR ALL
USING (
    current_setting('app.current_tenant_id', TRUE) = "organizationId"
    OR current_setting('app.bypass_rls', TRUE) = 'on'
)
WITH CHECK (
    current_setting('app.current_tenant_id', TRUE) = "organizationId"
    OR current_setting('app.bypass_rls', TRUE) = 'on'
);

-- CadenceRun
ALTER TABLE "CadenceRun" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CadenceRun" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON "CadenceRun";
CREATE POLICY tenant_isolation_policy ON "CadenceRun" FOR ALL
USING (
    current_setting('app.current_tenant_id', TRUE) = "organizationId"
    OR current_setting('app.bypass_rls', TRUE) = 'on'
)
WITH CHECK (
    current_setting('app.current_tenant_id', TRUE) = "organizationId"
    OR current_setting('app.bypass_rls', TRUE) = 'on'
);

-- CrmDocumentSignatureRequest
ALTER TABLE "CrmDocumentSignatureRequest" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CrmDocumentSignatureRequest" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON "CrmDocumentSignatureRequest";
CREATE POLICY tenant_isolation_policy ON "CrmDocumentSignatureRequest" FOR ALL
USING (
    current_setting('app.current_tenant_id', TRUE) = "organizationId"
    OR current_setting('app.bypass_rls', TRUE) = 'on'
)
WITH CHECK (
    current_setting('app.current_tenant_id', TRUE) = "organizationId"
    OR current_setting('app.bypass_rls', TRUE) = 'on'
);

-- session (Better Auth)
ALTER TABLE "session" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "session" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON "session";
CREATE POLICY tenant_isolation_policy ON "session" FOR ALL
USING (
    "userId" IN (
        SELECT id FROM "user"
        WHERE "organizationId" = current_setting('app.current_tenant_id', TRUE)
    )
    OR current_setting('app.bypass_rls', TRUE) = 'on'
)
WITH CHECK (
    "userId" IN (
        SELECT id FROM "user"
        WHERE "organizationId" = current_setting('app.current_tenant_id', TRUE)
    )
    OR current_setting('app.bypass_rls', TRUE) = 'on'
);

-- account (Better Auth)
ALTER TABLE "account" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "account" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON "account";
CREATE POLICY tenant_isolation_policy ON "account" FOR ALL
USING (
    "userId" IN (
        SELECT id FROM "user"
        WHERE "organizationId" = current_setting('app.current_tenant_id', TRUE)
    )
    OR current_setting('app.bypass_rls', TRUE) = 'on'
)
WITH CHECK (
    "userId" IN (
        SELECT id FROM "user"
        WHERE "organizationId" = current_setting('app.current_tenant_id', TRUE)
    )
    OR current_setting('app.bypass_rls', TRUE) = 'on'
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Hardened Strict Tenant Policies (No Bypass, No WITH CHECK (true))
-- Restricts both read and write operations strictly to the matching organizationId.
-- ─────────────────────────────────────────────────────────────────────────────

-- ForecastSnapshot
ALTER TABLE "ForecastSnapshot" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ForecastSnapshot" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON "ForecastSnapshot";
CREATE POLICY tenant_isolation_policy ON "ForecastSnapshot" FOR ALL
USING (
    current_setting('app.current_tenant_id', TRUE) = "organizationId"
)
WITH CHECK (
    current_setting('app.current_tenant_id', TRUE) = "organizationId"
);

-- ProspectingSearchExecution
ALTER TABLE "ProspectingSearchExecution" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProspectingSearchExecution" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON "ProspectingSearchExecution";
CREATE POLICY tenant_isolation_policy ON "ProspectingSearchExecution" FOR ALL
USING (
    current_setting('app.current_tenant_id', TRUE) = "organizationId"
)
WITH CHECK (
    current_setting('app.current_tenant_id', TRUE) = "organizationId"
);

-- AutomationVersion
ALTER TABLE "AutomationVersion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AutomationVersion" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON "AutomationVersion";
CREATE POLICY tenant_isolation_policy ON "AutomationVersion" FOR ALL
USING (
    current_setting('app.current_tenant_id', TRUE) = "organizationId"
)
WITH CHECK (
    current_setting('app.current_tenant_id', TRUE) = "organizationId"
);

-- CopilotoConversation
ALTER TABLE "CopilotoConversation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CopilotoConversation" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON "CopilotoConversation";
CREATE POLICY tenant_isolation_policy ON "CopilotoConversation" FOR ALL
USING (
    current_setting('app.current_tenant_id', TRUE) = "organizationId"
)
WITH CHECK (
    current_setting('app.current_tenant_id', TRUE) = "organizationId"
);

-- CopilotoTranscriptSegment
ALTER TABLE "CopilotoTranscriptSegment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CopilotoTranscriptSegment" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON "CopilotoTranscriptSegment";
CREATE POLICY tenant_isolation_policy ON "CopilotoTranscriptSegment" FOR ALL
USING (
    current_setting('app.current_tenant_id', TRUE) = "organizationId"
)
WITH CHECK (
    current_setting('app.current_tenant_id', TRUE) = "organizationId"
);

-- CopilotoInsight
ALTER TABLE "CopilotoInsight" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CopilotoInsight" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON "CopilotoInsight";
CREATE POLICY tenant_isolation_policy ON "CopilotoInsight" FOR ALL
USING (
    current_setting('app.current_tenant_id', TRUE) = "organizationId"
)
WITH CHECK (
    current_setting('app.current_tenant_id', TRUE) = "organizationId"
);

-- CopilotoCrmFieldSuggestion
ALTER TABLE "CopilotoCrmFieldSuggestion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CopilotoCrmFieldSuggestion" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON "CopilotoCrmFieldSuggestion";
CREATE POLICY tenant_isolation_policy ON "CopilotoCrmFieldSuggestion" FOR ALL
USING (
    current_setting('app.current_tenant_id', TRUE) = "organizationId"
)
WITH CHECK (
    current_setting('app.current_tenant_id', TRUE) = "organizationId"
);

-- CopilotoDealHealthSnapshot
ALTER TABLE "CopilotoDealHealthSnapshot" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CopilotoDealHealthSnapshot" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON "CopilotoDealHealthSnapshot";
CREATE POLICY tenant_isolation_policy ON "CopilotoDealHealthSnapshot" FOR ALL
USING (
    current_setting('app.current_tenant_id', TRUE) = "organizationId"
)
WITH CHECK (
    current_setting('app.current_tenant_id', TRUE) = "organizationId"
);

-- CopilotoConsentRecord
ALTER TABLE "CopilotoConsentRecord" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CopilotoConsentRecord" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON "CopilotoConsentRecord";
CREATE POLICY tenant_isolation_policy ON "CopilotoConsentRecord" FOR ALL
USING (
    current_setting('app.current_tenant_id', TRUE) = "organizationId"
)
WITH CHECK (
    current_setting('app.current_tenant_id', TRUE) = "organizationId"
);

-- CopilotoBitrixFieldMapping
ALTER TABLE "CopilotoBitrixFieldMapping" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CopilotoBitrixFieldMapping" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON "CopilotoBitrixFieldMapping";
CREATE POLICY tenant_isolation_policy ON "CopilotoBitrixFieldMapping" FOR ALL
USING (
    current_setting('app.current_tenant_id', TRUE) = "organizationId"
)
WITH CHECK (
    current_setting('app.current_tenant_id', TRUE) = "organizationId"
);

-- CopilotoCoachingEvaluation
ALTER TABLE "CopilotoCoachingEvaluation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CopilotoCoachingEvaluation" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON "CopilotoCoachingEvaluation";
CREATE POLICY tenant_isolation_policy ON "CopilotoCoachingEvaluation" FOR ALL
USING (
    current_setting('app.current_tenant_id', TRUE) = "organizationId"
)
WITH CHECK (
    current_setting('app.current_tenant_id', TRUE) = "organizationId"
);

-- SavedView
ALTER TABLE "SavedView" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SavedView" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON "SavedView";
CREATE POLICY tenant_isolation_policy ON "SavedView" FOR ALL
USING (
    current_setting('app.current_tenant_id', TRUE) = "organizationId"
)
WITH CHECK (
    current_setting('app.current_tenant_id', TRUE) = "organizationId"
);
