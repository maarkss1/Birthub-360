-- Fecha o drift documentado (mas nunca corrigido) em duas migrations anteriores
-- (20260908020000_multi_cargo_agent_governance_foundation, 20260909131444_saved_view): o
-- schema Prisma sempre declarou `Prospect.companyId`/`Prospect.leadId` como relações opcionais
-- com Company/Lead, mas nenhuma migration jamais criou essas colunas no Postgres real — a
-- CREATE TABLE original (20260726013952_add_ai_engine_setting) não as incluiu.
--
-- Write path real e ativo que quebra hoje sem esta migration: LeadDeduplicationService.ts
-- (`prisma.prospect.updateMany({ where: { leadId: { in: duplicateIds }, organizationId } , ... })`)
-- roda incondicionalmente dentro do merge de leads duplicados — falha com "column leadId of
-- relation Prospect does not exist" sempre que essa transação é executada, porque a coluna nunca
-- existiu no banco.
--
-- Aditiva: colunas nullable (mesma nulabilidade do schema — `Company?`/`Lead?`), sem necessidade
-- de backfill (Prospect não tem write path anterior a este, ver comentário do schema.prisma:3165-3172).

-- AlterTable
ALTER TABLE "Prospect" ADD COLUMN "companyId" TEXT;
ALTER TABLE "Prospect" ADD COLUMN "leadId" TEXT;

-- AddForeignKey
ALTER TABLE "Prospect"
    ADD CONSTRAINT "Prospect_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "Company"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Prospect"
    ADD CONSTRAINT "Prospect_leadId_fkey"
    FOREIGN KEY ("leadId") REFERENCES "Lead"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "Prospect_companyId_idx" ON "Prospect"("companyId");
CREATE INDEX "Prospect_leadId_idx" ON "Prospect"("leadId");
