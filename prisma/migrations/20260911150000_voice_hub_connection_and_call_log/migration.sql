-- Conexão com o Birth Voices Hub por organização — antes desta tabela, a configuração (URL,
-- API key, agentId) vivia inteiramente em variáveis de ambiente globais do processo
-- (BIRTH_VOICES_URL/API_KEY/AGENT_ID), um único valor pra todo o deployment. Mesmo padrão de
-- ThreeCXConnection: apiKey cifrado em repouso (AES-256-GCM) de forma transparente pela extensão
-- Prisma em src/lib/prisma.ts (ver ENCRYPTED_FIELDS). O segredo do webhook de resultado de
-- chamada continua vindo só de env var (BIRTH_VOICES_WEBHOOK_SECRET/ATLASGR_WEBHOOK_SECRET) —
-- fora do escopo desta migration, ver comentário do model em prisma/schema.prisma.

CREATE TABLE "VoiceHubConnection" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "label" TEXT NOT NULL DEFAULT 'Birth Voices Hub',
    "baseUrl" TEXT NOT NULL,
    "apiKey" TEXT,
    "agentId" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VoiceHubConnection_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "VoiceHubConnection_organizationId_idx" ON "VoiceHubConnection"("organizationId");

ALTER TABLE "VoiceHubConnection"
    ADD CONSTRAINT "VoiceHubConnection_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- Isolamento de tenant via RLS — mesmo padrão de ThreeCXConnection
-- (20260814120000_three_cx_connection): FORCE também restringe o dono da tabela, e a policy
-- libera acesso quando app.current_tenant_id (setado pelo middleware do Prisma em
-- src/lib/prisma.ts) bate com a organização da linha, ou quando app.bypass_rls = 'on' (rotas de
-- bootstrap sem tenant conhecido).
ALTER TABLE "VoiceHubConnection" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "VoiceHubConnection" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON "VoiceHubConnection" FOR ALL
USING (
    current_setting('app.current_tenant_id', TRUE) = "organizationId"
    OR current_setting('app.bypass_rls', TRUE) = 'on'
);

-- Log estruturado de cada chamada de voz IA (Birth Voices Hub / Bland AI) — antes desta tabela, o
-- resultado só existia como texto livre dentro de Note (voiceResult.webhook.ts), sem jeito de
-- listar/filtrar chamadas recentes fora do card de um lead específico. Escrito no MESMO ponto que
-- já grava a Note/TimelineEvent — nunca a única fonte de verdade do resultado da chamada, só a
-- projeção estruturada dela. "leadId" de propósito sem FK: apagar um Lead não deve apagar o
-- histórico de chamadas (valor de auditoria) — mesmo padrão de CallSuppression.leadId.

CREATE TABLE "VoiceCallLog" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "providerCallId" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "durationSeconds" INTEGER NOT NULL DEFAULT 0,
    "summary" TEXT,
    "transcript" TEXT,
    "recordingUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VoiceCallLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "VoiceCallLog_organizationId_providerCallId_key" ON "VoiceCallLog"("organizationId", "providerCallId");
CREATE INDEX "VoiceCallLog_organizationId_createdAt_idx" ON "VoiceCallLog"("organizationId", "createdAt");
CREATE INDEX "VoiceCallLog_organizationId_leadId_idx" ON "VoiceCallLog"("organizationId", "leadId");

ALTER TABLE "VoiceCallLog"
    ADD CONSTRAINT "VoiceCallLog_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "VoiceCallLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "VoiceCallLog" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON "VoiceCallLog" FOR ALL
USING (
    current_setting('app.current_tenant_id', TRUE) = "organizationId"
    OR current_setting('app.bypass_rls', TRUE) = 'on'
);
