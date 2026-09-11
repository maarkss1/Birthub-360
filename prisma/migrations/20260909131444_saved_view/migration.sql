-- Onda B2b (Agente 00 — Commercial AI OS): SavedView, view salva (funil + filtros) do Kanban de
-- Leads/Negócios, pessoal por padrão (userId é o dono exclusivo). Migration escrita à mão a partir
-- do SQL gerado pelo Prisma (`prisma migrate dev --create-only`), mantendo só as instruções
-- relativas a SavedView — o diff bruto trazia drift real e não relacionado, já existente entre
-- schema.prisma e o histórico de migrations (DROP TABLE "KnowledgeChunk", colunas novas em
-- Prospect, novo valor de AutomationTrigger, renomeações de índice), fora do escopo desta fatia e
-- não revisado/autorizado — não incluído aqui.

-- CreateTable
CREATE TABLE "SavedView" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "funnel" TEXT NOT NULL,
    "filters" JSONB NOT NULL DEFAULT '{}',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavedView_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SavedView_organizationId_userId_idx" ON "SavedView"("organizationId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "SavedView_userId_name_key" ON "SavedView"("userId", "name");

-- AddForeignKey
ALTER TABLE "SavedView" ADD CONSTRAINT "SavedView_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedView" ADD CONSTRAINT "SavedView_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RLS: isolamento por tenant (organizationId), mesmo padrão de todas as tabelas multi-tenant deste
-- projeto (ver 20260902130000_copiloto_ia_rls) — libera quando app.current_tenant_id bate com a
-- linha, ou quando app.bypass_rls='on' (workers/rotinas cross-tenant). A restrição "pessoal"
-- (userId = dono) é aplicada na camada de aplicação, não em RLS — mesmo padrão de outras
-- distinções de autorização por usuário dentro do mesmo tenant neste projeto.
ALTER TABLE "SavedView" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SavedView" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_policy ON "SavedView";
CREATE POLICY tenant_isolation_policy ON "SavedView" FOR ALL
USING (
    current_setting('app.current_tenant_id', TRUE) = "organizationId"
    OR current_setting('app.bypass_rls', TRUE) = 'on'
)
WITH CHECK (true);
