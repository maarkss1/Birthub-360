-- BILLING-003 (Onda 5): vínculo real entre uma Fatura (CrmCommercialDocument) e uma cobrança
-- Stripe confirmada — "Pago" deixa de ser uma transição manual livre para o tipo Fatura (ver
-- reconcileFaturaStripePayment/PrismaCrm360Repository.updateDocumentStatus). `stripeConnectionId`
-- usa ON DELETE SET NULL (não CASCADE): desconectar a integração não pode apagar o fato de que a
-- Fatura foi paga. Unique em (organizationId, stripePaymentIntentId) impede a mesma cobrança
-- reconciliar duas Faturas diferentes; múltiplos NULLs continuam permitidos (comportamento padrão
-- de unique constraint no Postgres).

ALTER TABLE "CrmCommercialDocument" ADD COLUMN "stripeConnectionId" TEXT;
ALTER TABLE "CrmCommercialDocument" ADD COLUMN "stripePaymentIntentId" TEXT;
ALTER TABLE "CrmCommercialDocument" ADD COLUMN "paymentReconciledAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "CrmCommercialDocument_organizationId_stripePaymentIntentId_key"
    ON "CrmCommercialDocument"("organizationId", "stripePaymentIntentId");

ALTER TABLE "CrmCommercialDocument"
    ADD CONSTRAINT "CrmCommercialDocument_stripeConnectionId_fkey"
    FOREIGN KEY ("stripeConnectionId") REFERENCES "StripeConnection"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
