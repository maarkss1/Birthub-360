-- Camada de conectores CRM externos (ExternalCrm*) e layouts de Workspace configuráveis
-- (RoleWorkspaceDefinition/WorkspaceLayout/WorkspaceSection/WorkspaceWidget).
-- Os models entraram em schema.prisma sem migration correspondente, então `prisma migrate deploy`
-- nunca criava essas tabelas nem as protegia com RLS. DDL gerado por `prisma migrate diff`.
-- WorkspaceSection/WorkspaceWidget ganharam `organizationId` próprio (denormalizado) para seguir a
-- convenção do projeto: toda tabela tenant-scoped filtrada por policy simétrica direta, sem subquery.

-- CreateTable
CREATE TABLE "ExternalCrmConnection" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "label" TEXT NOT NULL DEFAULT 'External CRM',
    "config" TEXT NOT NULL,
    "inboundEventsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExternalCrmConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalCrmSyncRule" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'deal',
    "categoryId" TEXT,
    "stageId" TEXT,
    "assignedById" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastRunAt" TIMESTAMP(3),
    "lastImportedCount" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExternalCrmSyncRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalCrmSyncLog" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "connectionId" TEXT,
    "direction" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "leadId" TEXT,
    "externalEntityId" TEXT,
    "payloadSnapshot" TEXT,
    "errorDetails" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExternalCrmSyncLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoleWorkspaceDefinition" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "layoutId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoleWorkspaceDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceLayout" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceLayout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceSection" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "layoutId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "WorkspaceSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceWidget" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "componentCode" TEXT NOT NULL,
    "props" JSONB NOT NULL DEFAULT '{}',
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "WorkspaceWidget_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExternalCrmConnection_organizationId_idx" ON "ExternalCrmConnection"("organizationId");

-- CreateIndex
CREATE INDEX "ExternalCrmConnection_provider_idx" ON "ExternalCrmConnection"("provider");

-- CreateIndex
CREATE INDEX "ExternalCrmSyncRule_organizationId_idx" ON "ExternalCrmSyncRule"("organizationId");

-- CreateIndex
CREATE INDEX "ExternalCrmSyncRule_connectionId_idx" ON "ExternalCrmSyncRule"("connectionId");

-- CreateIndex
CREATE INDEX "ExternalCrmSyncRule_active_idx" ON "ExternalCrmSyncRule"("active");

-- CreateIndex
CREATE INDEX "ExternalCrmSyncLog_organizationId_idx" ON "ExternalCrmSyncLog"("organizationId");

-- CreateIndex
CREATE INDEX "ExternalCrmSyncLog_connectionId_idx" ON "ExternalCrmSyncLog"("connectionId");

-- CreateIndex
CREATE INDEX "ExternalCrmSyncLog_leadId_idx" ON "ExternalCrmSyncLog"("leadId");

-- CreateIndex
CREATE INDEX "ExternalCrmSyncLog_createdAt_idx" ON "ExternalCrmSyncLog"("createdAt");

-- CreateIndex
CREATE INDEX "RoleWorkspaceDefinition_layoutId_idx" ON "RoleWorkspaceDefinition"("layoutId");

-- CreateIndex
CREATE UNIQUE INDEX "RoleWorkspaceDefinition_organizationId_role_key" ON "RoleWorkspaceDefinition"("organizationId", "role");

-- CreateIndex
CREATE INDEX "WorkspaceLayout_organizationId_idx" ON "WorkspaceLayout"("organizationId");

-- CreateIndex
CREATE INDEX "WorkspaceSection_organizationId_idx" ON "WorkspaceSection"("organizationId");

-- CreateIndex
CREATE INDEX "WorkspaceSection_layoutId_idx" ON "WorkspaceSection"("layoutId");

-- CreateIndex
CREATE INDEX "WorkspaceWidget_organizationId_idx" ON "WorkspaceWidget"("organizationId");

-- CreateIndex
CREATE INDEX "WorkspaceWidget_sectionId_idx" ON "WorkspaceWidget"("sectionId");

-- AddForeignKey
ALTER TABLE "ExternalCrmConnection" ADD CONSTRAINT "ExternalCrmConnection_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalCrmSyncRule" ADD CONSTRAINT "ExternalCrmSyncRule_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalCrmSyncRule" ADD CONSTRAINT "ExternalCrmSyncRule_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "ExternalCrmConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalCrmSyncLog" ADD CONSTRAINT "ExternalCrmSyncLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalCrmSyncLog" ADD CONSTRAINT "ExternalCrmSyncLog_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "ExternalCrmConnection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalCrmSyncLog" ADD CONSTRAINT "ExternalCrmSyncLog_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoleWorkspaceDefinition" ADD CONSTRAINT "RoleWorkspaceDefinition_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoleWorkspaceDefinition" ADD CONSTRAINT "RoleWorkspaceDefinition_layoutId_fkey" FOREIGN KEY ("layoutId") REFERENCES "WorkspaceLayout"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceLayout" ADD CONSTRAINT "WorkspaceLayout_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceSection" ADD CONSTRAINT "WorkspaceSection_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceSection" ADD CONSTRAINT "WorkspaceSection_layoutId_fkey" FOREIGN KEY ("layoutId") REFERENCES "WorkspaceLayout"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceWidget" ADD CONSTRAINT "WorkspaceWidget_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceWidget" ADD CONSTRAINT "WorkspaceWidget_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "WorkspaceSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- RowLevelSecurity
-- Padrão simétrico USING/WITH CHECK (mesmo de 20260920010000_add_playbook_insight) — nenhum bypass
-- de tenant nestas tabelas.

ALTER TABLE "ExternalCrmConnection" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ExternalCrmConnection" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON "ExternalCrmConnection" FOR ALL
USING (
    current_setting('app.current_tenant_id', TRUE) = "organizationId"
)
WITH CHECK (
    current_setting('app.current_tenant_id', TRUE) = "organizationId"
);

ALTER TABLE "ExternalCrmSyncRule" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ExternalCrmSyncRule" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON "ExternalCrmSyncRule" FOR ALL
USING (
    current_setting('app.current_tenant_id', TRUE) = "organizationId"
)
WITH CHECK (
    current_setting('app.current_tenant_id', TRUE) = "organizationId"
);

ALTER TABLE "ExternalCrmSyncLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ExternalCrmSyncLog" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON "ExternalCrmSyncLog" FOR ALL
USING (
    current_setting('app.current_tenant_id', TRUE) = "organizationId"
)
WITH CHECK (
    current_setting('app.current_tenant_id', TRUE) = "organizationId"
);

ALTER TABLE "RoleWorkspaceDefinition" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RoleWorkspaceDefinition" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON "RoleWorkspaceDefinition" FOR ALL
USING (
    current_setting('app.current_tenant_id', TRUE) = "organizationId"
)
WITH CHECK (
    current_setting('app.current_tenant_id', TRUE) = "organizationId"
);

ALTER TABLE "WorkspaceLayout" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WorkspaceLayout" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON "WorkspaceLayout" FOR ALL
USING (
    current_setting('app.current_tenant_id', TRUE) = "organizationId"
)
WITH CHECK (
    current_setting('app.current_tenant_id', TRUE) = "organizationId"
);

ALTER TABLE "WorkspaceSection" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WorkspaceSection" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON "WorkspaceSection" FOR ALL
USING (
    current_setting('app.current_tenant_id', TRUE) = "organizationId"
)
WITH CHECK (
    current_setting('app.current_tenant_id', TRUE) = "organizationId"
);

ALTER TABLE "WorkspaceWidget" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WorkspaceWidget" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON "WorkspaceWidget" FOR ALL
USING (
    current_setting('app.current_tenant_id', TRUE) = "organizationId"
)
WITH CHECK (
    current_setting('app.current_tenant_id', TRUE) = "organizationId"
);
