-- Conexões de Slack, Stripe e Omie por organização — mesmo padrão de VoiceHubConnection/
-- ThreeCXConnection (20260911150000_voice_hub_connection_and_call_log): credenciais cifradas em
-- repouso (AES-256-GCM) de forma transparente pela extensão Prisma em src/lib/prisma.ts (ver
-- ENCRYPTED_FIELDS), isolamento de tenant via RLS (FORCE + policy), não @unique por
-- organizationId (uma organização pode ter mais de uma conexão de cada tipo).

CREATE TABLE "SlackConnection" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "label" TEXT NOT NULL DEFAULT 'Slack',
    "webhookUrl" TEXT,
    "botToken" TEXT,
    "defaultChannel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SlackConnection_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SlackConnection_organizationId_idx" ON "SlackConnection"("organizationId");

ALTER TABLE "SlackConnection"
    ADD CONSTRAINT "SlackConnection_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SlackConnection" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SlackConnection" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON "SlackConnection" FOR ALL
USING (
    current_setting('app.current_tenant_id', TRUE) = "organizationId"
    OR current_setting('app.bypass_rls', TRUE) = 'on'
);

CREATE TABLE "StripeConnection" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "label" TEXT NOT NULL DEFAULT 'Stripe',
    "secretKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StripeConnection_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "StripeConnection_organizationId_idx" ON "StripeConnection"("organizationId");

ALTER TABLE "StripeConnection"
    ADD CONSTRAINT "StripeConnection_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StripeConnection" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StripeConnection" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON "StripeConnection" FOR ALL
USING (
    current_setting('app.current_tenant_id', TRUE) = "organizationId"
    OR current_setting('app.bypass_rls', TRUE) = 'on'
);

CREATE TABLE "OmieConnection" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "label" TEXT NOT NULL DEFAULT 'Omie',
    "appKey" TEXT NOT NULL,
    "appSecret" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OmieConnection_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OmieConnection_organizationId_idx" ON "OmieConnection"("organizationId");

ALTER TABLE "OmieConnection"
    ADD CONSTRAINT "OmieConnection_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OmieConnection" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OmieConnection" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON "OmieConnection" FOR ALL
USING (
    current_setting('app.current_tenant_id', TRUE) = "organizationId"
    OR current_setting('app.bypass_rls', TRUE) = 'on'
);
