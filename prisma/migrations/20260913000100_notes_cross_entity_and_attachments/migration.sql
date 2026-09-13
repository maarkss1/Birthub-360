-- CRM-008 (docs/audits/repository-debt-audit/agents/CRM.md): Company.owner nunca foi lido nem
-- escrito por nenhum caminho do código (confirmado por auditoria) — coluna morta, removida.
ALTER TABLE "Company" DROP COLUMN "owner";

-- CRM-004: Note passa a poder anexar a Lead, Company OU Contact (antes, só Lead). leadId vira
-- opcional e ganha dois irmãos opcionais; um CHECK garante em nível de banco que exatamente um
-- dos três é preenchido por registro — não só uma validação de aplicação que pode ser burlada por
-- outro caminho de escrita.
ALTER TABLE "Note" ALTER COLUMN "leadId" DROP NOT NULL;
ALTER TABLE "Note" ADD COLUMN "companyId" TEXT;
ALTER TABLE "Note" ADD COLUMN "contactId" TEXT;

ALTER TABLE "Note"
    ADD CONSTRAINT "Note_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "Company"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Note"
    ADD CONSTRAINT "Note_contactId_fkey"
    FOREIGN KEY ("contactId") REFERENCES "Contact"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "Note_companyId_idx" ON "Note"("companyId");
CREATE INDEX "Note_contactId_idx" ON "Note"("contactId");

ALTER TABLE "Note" ADD CONSTRAINT "Note_exactly_one_parent_check" CHECK (
    (CASE WHEN "leadId" IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN "companyId" IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN "contactId" IS NOT NULL THEN 1 ELSE 0 END) = 1
);

-- A policy de RLS de Note (20260722020322_enable_rls) só olhava leadId — precisa cobrir os três
-- pais agora, senão uma Note de Company/Contact nunca passaria pelo filtro de tenant (ficaria
-- invisível mesmo para o dono real).
DROP POLICY IF EXISTS tenant_isolation_policy ON "Note";
CREATE POLICY tenant_isolation_policy ON "Note" FOR ALL
USING (
    ("leadId" IS NOT NULL AND "leadId" IN (
        SELECT id FROM "Lead" WHERE "organizationId" = current_setting('app.current_tenant_id', TRUE)
    ))
    OR ("companyId" IS NOT NULL AND "companyId" IN (
        SELECT id FROM "Company" WHERE "organizationId" = current_setting('app.current_tenant_id', TRUE)
    ))
    OR ("contactId" IS NOT NULL AND "contactId" IN (
        SELECT id FROM "Contact" WHERE "organizationId" = current_setting('app.current_tenant_id', TRUE)
    ))
    OR current_setting('app.bypass_rls', TRUE) = 'on'
);

-- CRM-005: primeiro modelo de anexo/arquivo para qualquer entidade de CRM. O binário fica no
-- storage S3-compatível (src/lib/storage/index.ts); esta tabela só guarda o metadado e o
-- objectKey, mesmo padrão de outras tabelas com organizationId direto (StripeConnection etc.).
CREATE TABLE "Attachment" (
    "id" TEXT NOT NULL,
    "leadId" TEXT,
    "companyId" TEXT,
    "contactId" TEXT,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "objectKey" TEXT NOT NULL,
    "uploadedBy" TEXT,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,
    "deleteReason" TEXT,

    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Attachment_objectKey_key" ON "Attachment"("objectKey");
CREATE INDEX "Attachment_organizationId_idx" ON "Attachment"("organizationId");
CREATE INDEX "Attachment_leadId_idx" ON "Attachment"("leadId");
CREATE INDEX "Attachment_companyId_idx" ON "Attachment"("companyId");
CREATE INDEX "Attachment_contactId_idx" ON "Attachment"("contactId");

ALTER TABLE "Attachment"
    ADD CONSTRAINT "Attachment_leadId_fkey"
    FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Attachment"
    ADD CONSTRAINT "Attachment_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Attachment"
    ADD CONSTRAINT "Attachment_contactId_fkey"
    FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Attachment"
    ADD CONSTRAINT "Attachment_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_exactly_one_parent_check" CHECK (
    (CASE WHEN "leadId" IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN "companyId" IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN "contactId" IS NOT NULL THEN 1 ELSE 0 END) = 1
);

ALTER TABLE "Attachment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Attachment" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON "Attachment" FOR ALL
USING (
    current_setting('app.current_tenant_id', TRUE) = "organizationId"
    OR current_setting('app.bypass_rls', TRUE) = 'on'
);
