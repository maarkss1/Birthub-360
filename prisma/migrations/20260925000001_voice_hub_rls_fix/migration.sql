
-- WorkflowVersion
ALTER TABLE "WorkflowVersion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WorkflowVersion" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "WorkflowVersion" AS PERMISSIVE FOR ALL TO public USING (EXISTS (SELECT 1 FROM "Workflow" WHERE "Workflow"."id" = "WorkflowVersion"."workflowId" AND "Workflow"."organizationId" = current_setting('app.current_tenant_id', true)));

-- CallAttempt
ALTER TABLE "CallAttempt" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CallAttempt" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "CallAttempt" AS PERMISSIVE FOR ALL TO public USING (EXISTS (SELECT 1 FROM "Campaign" WHERE "Campaign"."id" = "CallAttempt"."campaignId" AND "Campaign"."organizationId" = current_setting('app.current_tenant_id', true)));

-- Integration
ALTER TABLE "Integration" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Integration" FORCE ROW LEVEL SECURITY;
CREATE POLICY "Global Read Integration" ON "Integration" FOR SELECT USING (true);
CREATE POLICY "Global Write Integration" ON "Integration" FOR ALL USING (true) WITH CHECK (true);

-- Plan
ALTER TABLE "Plan" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Plan" FORCE ROW LEVEL SECURITY;
CREATE POLICY "Global Read Plan" ON "Plan" FOR SELECT USING (true);
CREATE POLICY "Global Write Plan" ON "Plan" FOR ALL USING (true) WITH CHECK (true);

