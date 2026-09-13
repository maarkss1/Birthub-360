-- CRM-011 (docs/audits/repository-debt-audit/agents/CRM.md): reconcilia o modelo de tags de Lead
-- com o padrão já usado por Company (coluna nativa `String[]`, em vez de JSON não tipado dentro de
-- `customFields`). Backfill preserva qualquer tag já gravada em `customFields.tags`.

ALTER TABLE "Lead" ADD COLUMN "tags" TEXT[] NOT NULL DEFAULT '{}';

UPDATE "Lead"
SET "tags" = ARRAY(
  SELECT jsonb_array_elements_text("customFields" -> 'tags')
)
WHERE "customFields" IS NOT NULL
  AND jsonb_typeof("customFields" -> 'tags') = 'array';
