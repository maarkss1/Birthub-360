-- Achado real (auditoria de release-readiness, database-integrity): "PublicBookingLink" já existe
-- em prisma/schema.prisma e é usada em produção pelas rotas reais de agendamento público
-- (src/features/calendar/routes/booking.routes.ts), mas NUNCA teve uma migration correspondente no
-- histórico deste repositório — confirmado por
-- `grep -rn 'CREATE TABLE "PublicBookingLink"' prisma/migrations/*/migration.sql` sem resultado. A
-- única menção ao nome em todo `prisma/migrations/` é um comentário em
-- 20260908020000_multi_cargo_agent_governance_foundation/migration.sql, que documenta que a
-- criação desta tabela apareceu no diff bruto do Prisma como drift pré-existente e foi
-- deliberadamente excluída daquela migration. Efeito real: `prisma migrate deploy` contra um banco
-- criado do zero a partir só das migrations versionadas (CI, staging limpo, disaster recovery)
-- nunca cria esta tabela, e toda a rota de agendamento público quebra com P2021.
--
-- Mesmo padrão de 20260827145000_create_saved_search_if_missing: `IF NOT EXISTS`/`DO $$` em tudo
-- de propósito — inofensivo onde a tabela já existe via drift (produção), cria do zero onde não
-- existe (CI/ambientes novos).
--
-- Diferente da SavedSearch (que teve a decisão de RLS deliberadamente adiada para uma migration
-- separada), aqui a RLS é habilitada já nesta migration: "PublicBookingLink" tem organizationId e é
-- lida por slug numa rota pública (booking.routes.ts) — sem RLS, um `findUnique` futuro que
-- esqueça de filtrar por organizationId não tem rede de segurança no banco. Mesmo padrão de
-- 20260828030000_saved_search_threecx_call_event_rls. O bypass necessário para o lookup público
-- por slug (sem tenant conhecido) já foi adicionado a `BYPASS_RLS_ALLOWED_MODELS` em
-- `src/lib/prisma.ts` e ao código de `booking.routes.ts` na mesma mudança que introduziu esta
-- migration — sem isso, habilitar RLS aqui quebraria a busca pública em produção.
--
-- Achado real durante a validação desta migration: `model User` tem `@@map("user")` em
-- schema.prisma — a tabela real é `"user"` (minúscula), não `"User"`. A migration
-- `20260720235926_sync_accumulated_schema_drift` já fez `DROP TABLE "User"` + `CREATE TABLE
-- "user"` há muito tempo; toda FK real do resto do histórico já referencia `"user"` minúsculo. A
-- primeira versão desta migration errou isso (`REFERENCES "User"`) e falhava com "relation User
-- does not exist" ao rodar `prisma migrate deploy` do zero — reproduzido localmente contra um
-- Postgres real com o papel `prospector_app` (NOSUPERUSER) antes desta correção.

CREATE TABLE IF NOT EXISTS "PublicBookingLink" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "durationMin" INTEGER NOT NULL DEFAULT 30,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublicBookingLink_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PublicBookingLink_slug_key" ON "PublicBookingLink"("slug");

CREATE INDEX IF NOT EXISTS "PublicBookingLink_organizationId_userId_idx" ON "PublicBookingLink"("organizationId", "userId");

CREATE INDEX IF NOT EXISTS "PublicBookingLink_slug_idx" ON "PublicBookingLink"("slug");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'PublicBookingLink_userId_fkey'
    ) THEN
        ALTER TABLE "PublicBookingLink"
            ADD CONSTRAINT "PublicBookingLink_userId_fkey"
            FOREIGN KEY ("userId") REFERENCES "user"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'PublicBookingLink_organizationId_fkey'
    ) THEN
        ALTER TABLE "PublicBookingLink"
            ADD CONSTRAINT "PublicBookingLink_organizationId_fkey"
            FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

ALTER TABLE "PublicBookingLink" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PublicBookingLink" FORCE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'PublicBookingLink' AND policyname = 'tenant_isolation_policy'
    ) THEN
        CREATE POLICY tenant_isolation_policy ON "PublicBookingLink" FOR ALL
        USING (
            current_setting('app.current_tenant_id', TRUE) = "organizationId"
            OR current_setting('app.bypass_rls', TRUE) = 'on'
        );
    END IF;
END $$;
