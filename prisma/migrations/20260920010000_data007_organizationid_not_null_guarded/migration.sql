-- Migration: DATA-007 — apply the organizationId/tenantId NOT NULL schema change that landed in
-- prisma/schema.prisma (commit bf9489fe, 2026-09-19) without ever getting a matching migration.
-- See docs/audits/repository-debt-audit/DELTA-2026-09-20.md section 3 for the full drift report.
--
-- The comment removed by bf9489fe said this change was "condicionada a verificar ausência de
-- linhas NULL em produção antes de aplicar" (conditional on verifying there are no NULL rows in
-- production before applying). No such verification was recorded anywhere. Rather than trust that
-- claim, every guarded block below re-checks it at migration time: if a table actually has a NULL
-- organizationId/tenantId row in the environment this migration runs against, the block RAISES an
-- EXCEPTION and the whole migration fails loudly instead of silently violating the new NOT NULL
-- constraint (which Postgres would already reject) or, worse, succeeding by silently orphaning
-- data. A NULL organizationId row is a genuine orphan — there is no safe default tenant to
-- backfill it with, so this migration intentionally does not attempt a backfill.
--
-- Affected models (all six named in the schema diff): Company, Contact, Lead, Activity,
-- AuditLog.tenantId, Prospect. Company/Contact/Lead/Activity/Prospect also flip their
-- organizationId foreign key from the original ON DELETE SET NULL (correct only while the column
-- was nullable) to ON DELETE CASCADE, matching the required-relation the schema now declares.
-- AuditLog.tenantId has no FK relation to Organization in the schema (plain scalar column) — only
-- the NOT NULL constraint applies there.

-- ─────────────────────────────────────────────────────────────────────────────
-- Company.organizationId
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
    orphan_count BIGINT;
BEGIN
    SELECT count(*) INTO orphan_count FROM "Company" WHERE "organizationId" IS NULL;
    IF orphan_count > 0 THEN
        RAISE EXCEPTION
            'DATA-007: Company has % row(s) with NULL organizationId. Aborting migration — run a data audit and resolve/reassign these orphan rows to a real Organization before applying organizationId NOT NULL.',
            orphan_count;
    END IF;
END
$$;

ALTER TABLE "Company" DROP CONSTRAINT IF EXISTS "Company_organizationId_fkey";
ALTER TABLE "Company" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Company" ADD CONSTRAINT "Company_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─────────────────────────────────────────────────────────────────────────────
-- Contact.organizationId
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
    orphan_count BIGINT;
BEGIN
    SELECT count(*) INTO orphan_count FROM "Contact" WHERE "organizationId" IS NULL;
    IF orphan_count > 0 THEN
        RAISE EXCEPTION
            'DATA-007: Contact has % row(s) with NULL organizationId. Aborting migration — run a data audit and resolve/reassign these orphan rows to a real Organization before applying organizationId NOT NULL.',
            orphan_count;
    END IF;
END
$$;

ALTER TABLE "Contact" DROP CONSTRAINT IF EXISTS "Contact_organizationId_fkey";
ALTER TABLE "Contact" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─────────────────────────────────────────────────────────────────────────────
-- Lead.organizationId
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
    orphan_count BIGINT;
BEGIN
    SELECT count(*) INTO orphan_count FROM "Lead" WHERE "organizationId" IS NULL;
    IF orphan_count > 0 THEN
        RAISE EXCEPTION
            'DATA-007: Lead has % row(s) with NULL organizationId. Aborting migration — run a data audit and resolve/reassign these orphan rows to a real Organization before applying organizationId NOT NULL.',
            orphan_count;
    END IF;
END
$$;

ALTER TABLE "Lead" DROP CONSTRAINT IF EXISTS "Lead_organizationId_fkey";
ALTER TABLE "Lead" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─────────────────────────────────────────────────────────────────────────────
-- Activity.organizationId
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
    orphan_count BIGINT;
BEGIN
    SELECT count(*) INTO orphan_count FROM "Activity" WHERE "organizationId" IS NULL;
    IF orphan_count > 0 THEN
        RAISE EXCEPTION
            'DATA-007: Activity has % row(s) with NULL organizationId. Aborting migration — run a data audit and resolve/reassign these orphan rows to a real Organization before applying organizationId NOT NULL.',
            orphan_count;
    END IF;
END
$$;

ALTER TABLE "Activity" DROP CONSTRAINT IF EXISTS "Activity_organizationId_fkey";
ALTER TABLE "Activity" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─────────────────────────────────────────────────────────────────────────────
-- Prospect.organizationId
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
    orphan_count BIGINT;
BEGIN
    SELECT count(*) INTO orphan_count FROM "Prospect" WHERE "organizationId" IS NULL;
    IF orphan_count > 0 THEN
        RAISE EXCEPTION
            'DATA-007: Prospect has % row(s) with NULL organizationId. Aborting migration — run a data audit and resolve/reassign these orphan rows to a real Organization before applying organizationId NOT NULL.',
            orphan_count;
    END IF;
END
$$;

ALTER TABLE "Prospect" DROP CONSTRAINT IF EXISTS "Prospect_organizationId_fkey";
ALTER TABLE "Prospect" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Prospect" ADD CONSTRAINT "Prospect_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─────────────────────────────────────────────────────────────────────────────
-- AuditLog.tenantId — plain scalar column, no FK relation to Organization in the schema.
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
    orphan_count BIGINT;
BEGIN
    SELECT count(*) INTO orphan_count FROM "AuditLog" WHERE "tenantId" IS NULL;
    IF orphan_count > 0 THEN
        RAISE EXCEPTION
            'DATA-007: AuditLog has % row(s) with NULL tenantId. Aborting migration — run a data audit and resolve/reassign these orphan rows to a real tenant before applying tenantId NOT NULL.',
            orphan_count;
    END IF;
END
$$;

ALTER TABLE "AuditLog" ALTER COLUMN "tenantId" SET NOT NULL;
