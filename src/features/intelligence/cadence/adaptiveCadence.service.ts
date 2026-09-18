import { NextBestActionService } from '../next-best-action/nextBestAction.service.js';
import { prisma } from '../../../lib/prisma.js';

export class AdaptiveCadenceService {
  private nbaService = new NextBestActionService();

  /**
   * Chamado sempre que um evento de interação ocorre (ex: Email aberto, resposta recebida)
   * Dispara o re-cálculo da NBA e atualiza a missão.
   */
  public async handleInteractionEvent(missionId: string, eventType: string, payload: any) {
    const mission = await prisma.commercialMission.findUnique({
      where: { id: missionId },
    });

    if (!mission || mission.status !== 'ACTIVE') return;

    // Registra o evento
    await prisma.commercialMissionEvent.create({
      data: {
        organizationId: mission.organizationId,
        missionId,
        eventType,
        payload,
      },
    });

    // Remonta o contexto histórico
    const events = await prisma.commercialMissionEvent.findMany({
      where: { missionId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    const interactionHistory = events.map((e) => ({
      type: e.eventType,
      date: e.createdAt,
      payload: e.payload,
    }));

    // Chama o NBA Engine
    const decision = await this.nbaService.evaluateNextBestAction({
      organizationId: mission.organizationId,
      missionId,
      accountName: mission.accountName,
      scores: {
        icpScore: 90, // mock integration for scores
        fitScore: 85,
        intentScore: payload.intentScore ?? 50,
      },
      interactionHistory,
      currentDateTime: new Date(),
    });

    // Interrompe cadência estática atual caso exista
    // Exemplo: se for CALL ou MEETING crítico, limpa a fila antiga
    if (decision.priority === 'CRITICAL' || decision.actionType === 'MEETING') {
      await prisma.commercialMission.update({
        where: { id: missionId },
        data: { currentCadenceId: null },
      });
    }

    return decision;
  }
}
