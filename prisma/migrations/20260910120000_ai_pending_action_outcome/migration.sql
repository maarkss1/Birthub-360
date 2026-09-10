-- Item 103 da constituição de produto (Closed-Loop Intelligence — "signal → recommendation →
-- decision → action → execution → outcome → measurement → learning"). `AIPendingAction` já cobre
-- signal→recommendation→decision→execution (ver 20260802213000_ai_pending_action_execution,
-- 20260827140000_ai_pending_action_approver_trail); outcome→measurement nunca existiu. Captura
-- MANUAL nesta primeira fatia (um humano registra o resultado de negócio observado depois da
-- execução) — detecção automática (ex.: reply de e-mail) é escopo do Agente 17
-- (.agents/prompts/17-cadencia-ciclo-receita.md), não duplicada aqui. Aditivo, nullable/default —
-- nenhuma linha existente precisa de backfill.
CREATE TYPE "AIPendingActionOutcome" AS ENUM ('UNMEASURED', 'POSITIVE', 'NEGATIVE', 'NEUTRAL');

ALTER TABLE "AIPendingAction" ADD COLUMN "outcomeStatus" "AIPendingActionOutcome" NOT NULL DEFAULT 'UNMEASURED';
ALTER TABLE "AIPendingAction" ADD COLUMN "outcome" JSONB;
ALTER TABLE "AIPendingAction" ADD COLUMN "outcomeNotes" TEXT;
ALTER TABLE "AIPendingAction" ADD COLUMN "outcomeMeasuredAt" TIMESTAMP(3);
ALTER TABLE "AIPendingAction" ADD COLUMN "outcomeMeasuredBy" TEXT;
