-- O resumo executivo diário gerado por IA (dailyExecutiveSummary.worker.ts) já chamava o modelo
-- de IA de verdade, mas o texto só ia pro log — nunca era salvo nem exibido em nenhuma tela.
-- Em vez de criar uma tabela nova (a forma do dado é a mesma de `Report`: markdown + snapshot de
-- métricas), adiciona um discriminador de origem. Aditivo com DEFAULT — nenhuma linha existente
-- precisa de backfill, e todo `Report` já gravado até hoje é, de fato, ON_DEMAND.
CREATE TYPE "ReportSource" AS ENUM ('ON_DEMAND', 'DAILY_AUTO');

ALTER TABLE "Report" ADD COLUMN "source" "ReportSource" NOT NULL DEFAULT 'ON_DEMAND';

CREATE INDEX "Report_organizationId_source_createdAt_idx" ON "Report"("organizationId", "source", "createdAt");
