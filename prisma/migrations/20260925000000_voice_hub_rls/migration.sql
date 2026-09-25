
-- Models with organizationId
ALTER TABLE "Workflow" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Workflow" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "Workflow" AS PERMISSIVE FOR ALL TO public USING ("organizationId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "Agent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Agent" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "Agent" AS PERMISSIVE FOR ALL TO public USING ("organizationId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "CallLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CallLog" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "CallLog" AS PERMISSIVE FOR ALL TO public USING ("organizationId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "Metric" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Metric" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "Metric" AS PERMISSIVE FOR ALL TO public USING ("organizationId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "Setting" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Setting" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "Setting" AS PERMISSIVE FOR ALL TO public USING ("organizationId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "OrganizationAiConsent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OrganizationAiConsent" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "OrganizationAiConsent" AS PERMISSIVE FOR ALL TO public USING ("organizationId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "AtlasGRCallResult" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AtlasGRCallResult" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "AtlasGRCallResult" AS PERMISSIVE FOR ALL TO public USING ("organizationId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "APIKey" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "APIKey" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "APIKey" AS PERMISSIVE FOR ALL TO public USING ("organizationId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "OrganizationWebhookEndpoint" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OrganizationWebhookEndpoint" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "OrganizationWebhookEndpoint" AS PERMISSIVE FOR ALL TO public USING ("organizationId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "Transaction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Transaction" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "Transaction" AS PERMISSIVE FOR ALL TO public USING ("organizationId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "Wallet" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Wallet" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "Wallet" AS PERMISSIVE FOR ALL TO public USING ("organizationId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "AgentSession" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AgentSession" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "AgentSession" AS PERMISSIVE FOR ALL TO public USING ("organizationId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "Campaign" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Campaign" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "Campaign" AS PERMISSIVE FOR ALL TO public USING ("organizationId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "DncList" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DncList" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "DncList" AS PERMISSIVE FOR ALL TO public USING ("organizationId" = current_setting('app.current_tenant_id', true));

-- Models that inherit
ALTER TABLE "WorkflowVersion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WorkflowVersion" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "WorkflowVersion" AS PERMISSIVE FOR ALL TO public USING (EXISTS (SELECT 1 FROM "Workflow" WHERE "Workflow"."id" = "WorkflowVersion"."workflowId" AND "Workflow"."organizationId" = current_setting('app.current_tenant_id', true)));

ALTER TABLE "CallAttempt" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CallAttempt" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "CallAttempt" AS PERMISSIVE FOR ALL TO public USING (EXISTS (SELECT 1 FROM "Campaign" WHERE "Campaign"."id" = "CallAttempt"."campaignId" AND "Campaign"."organizationId" = current_setting('app.current_tenant_id', true)));

