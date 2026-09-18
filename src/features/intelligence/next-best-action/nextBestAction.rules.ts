import type { NextBestActionContext, NextBestActionDecision } from './nextBestAction.types.js';

/**
 * Avalia regras determinísticas antes de recorrer ao LLM.
 * Garante as políticas inegociáveis de contato.
 */
export class NextBestActionRules {
  public evaluateDeterministicRules(
    ctx: NextBestActionContext,
  ): Partial<NextBestActionDecision> | null {
    const { scores, interactionHistory } = ctx;

    // Regra 1: ICP muito baixo -> Desqualificar automaticamente
    if (scores.icpScore !== undefined && scores.icpScore < 40) {
      return {
        actionType: 'DISQUALIFY',
        priority: 'LOW',
        objective: 'Desqualificar lead fora do perfil',
        rationale: 'ICP Score abaixo de 40.',
        confidence: 1.0,
        requiresApproval: false,
        evidence: [{ type: 'SCORE', value: `ICP = ${scores.icpScore}` }],
      };
    }

    // Regra 2: Sinais fortes de engajamento mas sem resposta recente
    const recentEmails = interactionHistory.filter(
      (i) =>
        i.type === 'EMAIL_OPENED' &&
        ctx.currentDateTime.getTime() - i.date.getTime() < 48 * 3600 * 1000,
    );
    const lastInteraction = interactionHistory[0];

    if (recentEmails.length >= 3 && scores.icpScore && scores.icpScore > 80) {
      // Se não falamos com ele nas últimas 24h
      const hoursSinceLastContact = lastInteraction
        ? (ctx.currentDateTime.getTime() - lastInteraction.date.getTime()) / (1000 * 3600)
        : 999;

      if (hoursSinceLastContact > 24) {
        return {
          actionType: 'CALL',
          channel: 'PHONE_VOICE',
          priority: 'HIGH',
          objective: 'Aproveitar alto interesse e ICP para converter em reunião',
          rationale: 'Lead abriu múltiplos emails recentemente e possui alto ICP.',
          confidence: 0.95,
          requiresApproval: true,
          evidence: [
            { type: 'SCORE', value: `ICP = ${scores.icpScore}` },
            { type: 'EVENT', value: `${recentEmails.length} aberturas de email em 48h` },
          ],
        };
      }
    }

    // Regra 3: Cliente acabou de responder
    const justReplied = interactionHistory.find((i) =>
      ['EMAIL_REPLIED', 'WHATSAPP_REPLIED'].includes(i.type),
    );
    if (
      justReplied &&
      ctx.currentDateTime.getTime() - justReplied.date.getTime() < 24 * 3600 * 1000
    ) {
      return {
        actionType: 'MEETING',
        priority: 'CRITICAL',
        objective: 'Agendar call após resposta positiva',
        rationale: 'Cliente respondeu à nossa última interação.',
        confidence: 0.98,
        requiresApproval: true,
        evidence: [{ type: 'EVENT', value: justReplied.type }],
      };
    }

    return null;
  }
}
