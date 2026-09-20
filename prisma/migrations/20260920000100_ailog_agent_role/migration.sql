-- Onda 44 (ACH-13-03): getSwarmSloSnapshot (swarmScheduler.service.ts) só consegue fatiar custo e
-- latência de IA por organização hoje, nunca por papel do enxame (SDR/BDR/CLOSER/CRM/OPS), porque
-- AILog não tem nenhuma coluna que amarre um registro a um agente. As outras 4 dimensões do painel
-- de SLO já vêm de AIPendingAction.agentRole. Ver
-- .agents/handoffs/onda-44/13-para-01-ailog-coluna-agentrole.md.
--
-- Nullable pelo mesmo motivo de organizationId: registros anteriores a esta coluna e chamadas de
-- telemetria interna sem agente identificável não têm como ser atribuídos retroativamente.
ALTER TABLE "AILog" ADD COLUMN "agentRole" TEXT;

CREATE INDEX "AILog_organizationId_agentRole_createdAt_idx" ON "AILog"("organizationId", "agentRole", "createdAt");
