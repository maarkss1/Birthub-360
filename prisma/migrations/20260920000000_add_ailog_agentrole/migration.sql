-- AlterTable: Adiciona coluna opcional agentRole em AILog (Onda 44 / ACH-13-03 / Freeze Sprint 13)
ALTER TABLE "AILog" ADD COLUMN IF NOT EXISTS "agentRole" TEXT;

-- CreateIndex: Índice composto para consulta por org + agentRole + createdAt
CREATE INDEX IF NOT EXISTS "AILog_organizationId_agentRole_createdAt_idx" ON "AILog"("organizationId", "agentRole", "createdAt");
