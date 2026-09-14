-- REVOPS-004 (onda 5): winLossAnalysis.worker.ts computava a análise semanal por IA e só logava —
-- nunca persistia nem expunha o resultado em lugar nenhum. Operação puramente aditiva — ALTER TYPE
-- ... ADD VALUE é permitida dentro de transação a partir do PostgreSQL 12 (aqui roda pg16), desde
-- que o valor novo não seja *usado* na mesma transação (esta migração só o adiciona). IF NOT
-- EXISTS torna a migração reexecutável sem quebrar em bancos que já a receberam. Nenhum valor
-- existente foi removido/renomeado — `ON_DEMAND`/`DAILY_AUTO` continuam com o mesmo significado.
--
-- Dois valores próprios (não reusa `ON_DEMAND`): `/report/latest` já filtra estritamente
-- `ON_DEMAND` para o relatório executivo do ReportsHub — reusar o mesmo valor para Win/Loss
-- misturaria dois tipos de conteúdo diferentes na mesma consulta.
ALTER TYPE "ReportSource" ADD VALUE IF NOT EXISTS 'WEEKLY_WIN_LOSS_AUTO';
ALTER TYPE "ReportSource" ADD VALUE IF NOT EXISTS 'WIN_LOSS_ON_DEMAND';
