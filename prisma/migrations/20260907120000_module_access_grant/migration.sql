-- CreateTable
CREATE TABLE "ModuleAccessGrant" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "moduleKey" TEXT NOT NULL,
    "grantedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModuleAccessGrant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ModuleAccessGrant_userId_moduleKey_key" ON "ModuleAccessGrant"("userId", "moduleKey");

-- CreateIndex
CREATE INDEX "ModuleAccessGrant_organizationId_idx" ON "ModuleAccessGrant"("organizationId");

-- CreateIndex
CREATE INDEX "ModuleAccessGrant_userId_idx" ON "ModuleAccessGrant"("userId");

-- AddForeignKey
ALTER TABLE "ModuleAccessGrant" ADD CONSTRAINT "ModuleAccessGrant_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModuleAccessGrant" ADD CONSTRAINT "ModuleAccessGrant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Habilita RLS em ModuleAccessGrant seguindo o padrao estrito adotado em
-- 20260825120000_scope_rls_bypass_to_bootstrap_allowlist: sem clausula de bypass_rls no USING
-- (ModuleAccessGrant nao esta no allowlist BYPASS_RLS_ALLOWED_MODELS de src/lib/prisma.ts) e
-- WITH CHECK exigindo o mesmo match de tenant do USING, para nao reabrir a janela de escrita
-- cross-tenant ja corrigida naquela migration para tabelas novas.
ALTER TABLE "ModuleAccessGrant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ModuleAccessGrant" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_policy ON "ModuleAccessGrant";
CREATE POLICY tenant_isolation_policy ON "ModuleAccessGrant" FOR ALL
USING (
    current_setting('app.current_tenant_id', TRUE) = "organizationId"
)
WITH CHECK (
    current_setting('app.current_tenant_id', TRUE) = "organizationId"
);
