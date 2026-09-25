import { prisma } from '../../lib/prisma';

/**
 * Ponto único de escrita de `LeadStageHistory` (ver comentário no schema). Chamado pelos pontos
 * do CRM que movem uma oportunidade de etapa (`PrismaCrm360Repository.ts`: `updateLeadStage`,
 * `convertLead`; `PrismaLeadRepository.ts`: `update`/`updateStatus`, ver CRM-011). Movido para
 * `src/shared/` (era `commercial-intelligence/infra/stageHistory.ts`) porque é consumido por
 * `crm`, `crm360` e `commercial-intelligence` — nenhuma feature é dona exclusiva do escritor,
 * então composição via import direto entre features violaria `no-cross-feature-imports`
 * (ver `.dependency-cruiser.cjs`).
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
    // Logger estruturado em vez de console — mesmo padrão do resto do backend
    // (ver src/lib/logger.ts). Falha aqui nunca deve propagar para o caller (moveRecord/
    // createDeal/convertLead) — o negócio já foi movido de verdade, só o registro histórico
    // (usado por Aging por Etapa/Sales Cycle) que ficaria incompleto.
    const { logger } = await import('../../lib/logger.js');
    logger.error({ err: error, leadId, organizationId }, 'Falha ao registrar LeadStageHistory');
  }
}
