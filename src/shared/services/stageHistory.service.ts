import { prisma } from '../../lib/prisma.js';

/**
 * Ponto único de escrita de `LeadStageHistory` (ver comentário no schema). Mora em `src/shared/`
 * (seguindo o mesmo desenho de `leadFieldChangeHistory.service.ts`) porque é consumido por
 * múltiplas features (`crm`, `crm360`, `commercial-intelligence`), evitando violações de
 * `no-cross-feature-imports` (docs/architecture/DEPENDENCY_RULES.md).
 *
 * Fecha a entrada aberta anterior (se houver) e abre uma nova. Não lança em caso de erro de
 * histórico — nunca deve derrubar a operação real de mover o negócio (o histórico é uma camada de
 * observabilidade, não a fonte de verdade da etapa atual, que continua sendo `Lead.pipelineStageId`).
 */
export async function recordStageTransition(
  organizationId: string,
  leadId: string,
  stage: { id: string; name: string; probability: number; isWon: boolean; isLost: boolean } | null,
  pipelineId: string | null,
  now: Date = new Date(),
): Promise<void> {
  try {
    await prisma.leadStageHistory.updateMany({
      where: { organizationId, leadId, exitedAt: null },
      data: { exitedAt: now },
    });

    if (stage) {
      await prisma.leadStageHistory.create({
        data: {
          organizationId,
          leadId,
          pipelineId,
          stageId: stage.id,
          stageName: stage.name,
          probability: stage.probability,
          isWon: stage.isWon,
          isLost: stage.isLost,
          enteredAt: now,
        },
      });
    }
  } catch (error) {
    const { logger } = await import('../../lib/logger.js');
    logger.error({ err: error, leadId, organizationId }, 'Falha ao registrar LeadStageHistory');
  }
}
