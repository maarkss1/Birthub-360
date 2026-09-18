import { getAiModel } from '../../../lib/ai/gateway/chat-model.js';
import { SystemMessage, HumanMessage } from '@langchain/core/messages';
import { NextBestActionRules } from './nextBestAction.rules.js';
import type { NextBestActionContext, NextBestActionDecision } from './nextBestAction.types.js';
import { prisma } from '../../../lib/prisma.js';

export class NextBestActionService {
  private rulesEngine = new NextBestActionRules();

  /**
   * Avalia a próxima melhor ação para uma missão (Híbrido: Regras + LLM)
   */
  public async evaluateNextBestAction(ctx: NextBestActionContext): Promise<NextBestActionDecision> {
    // 1. Camada Determinística (Regras de Negócio e Policy)
    const deterministicDecision = this.rulesEngine.evaluateDeterministicRules(ctx);
    if (deterministicDecision) {
      // Se a regra determinística tomou a decisão, preenchemos e persistimos
      const decision = this.completeDecision(deterministicDecision);
      await this.persistDecision(ctx, decision);
      return decision;
    }

    // 2. Camada Heurística/IA (LLM via Gateway)
    const ai = getAiModel(
      'groq-llama3-70b',
      0.1,
      'Você é o motor de Next Best Action (NBA) Comercial.',
    );

    const prompt = new SystemMessage(`
Você deve determinar a Próxima Melhor Ação para a missão comercial baseada no contexto.
A decisão não deve inventar canais inexistentes (Temos apenas EMAIL, WHATSAPP, VOICE, LINKEDIN).
Se não houver dados, decida por RESEARCH ou WAIT.

Responda APENAS UM JSON VÁLIDO no formato:
{
  "actionType": "CALL|EMAIL|WHATSAPP|LINKEDIN|MEETING|FOLLOW_UP|WAIT|RESEARCH|DISQUALIFY",
  "priority": "LOW|MEDIUM|HIGH|CRITICAL",
  "channel": "EMAIL|WHATSAPP|PHONE_VOICE|LINKEDIN",
  "objective": "Objetivo comercial desta ação",
  "rationale": "Por que esta ação foi escolhida",
  "recommendedMessage": "Template de mensagem ou roteiro (se aplicável)",
  "confidence": 0.0 a 1.0,
  "requiresApproval": true|false,
  "evidence": [ { "type": "SCORE|EVENT|STRATEGY", "value": "A evidência" } ]
}
`);

    const contextPayload = JSON.stringify(ctx, null, 2);
    const userMsg = new HumanMessage(`Avalie o seguinte contexto e decida:\n${contextPayload}`);

    try {
      const response = await ai.invoke([prompt, userMsg]);
      let content = response.content || '{}';
      content = content
        .replace(/```json/gi, '')
        .replace(/```/g, '')
        .trim();

      const parsed = JSON.parse(content) as Partial<NextBestActionDecision>;
      const decision = this.completeDecision(parsed);

      await this.persistDecision(ctx, decision);
      return decision;
    } catch (err) {
      console.warn('[NBA Engine] Falha na avaliação do LLM, usando Fallback Fail-Closed', err);
      // Fail-closed
      const fallback = this.completeDecision({
        actionType: 'RESEARCH',
        priority: 'MEDIUM',
        objective: 'Avaliação manual necessária devido a falha no motor de inferência.',
        rationale: 'Fail-closed acionado.',
        confidence: 1.0,
        requiresApproval: true,
      });
      await this.persistDecision(ctx, fallback);
      return fallback;
    }
  }

  private completeDecision(partial: Partial<NextBestActionDecision>): NextBestActionDecision {
    return {
      actionType: partial.actionType ?? 'RESEARCH',
      priority: partial.priority ?? 'MEDIUM',
      channel: partial.channel ?? undefined,
      objective: partial.objective ?? 'Revisar conta',
      rationale: partial.rationale ?? 'Decisão padrão',
      recommendedMessage: partial.recommendedMessage,
      confidence: partial.confidence ?? 1.0,
      requiresApproval: partial.requiresApproval ?? true,
      evidence: partial.evidence ?? [],
      scheduledFor: partial.scheduledFor ?? new Date(),
    };
  }

  private async persistDecision(ctx: NextBestActionContext, decision: NextBestActionDecision) {
    // Auditabilidade: Persistir decisão no Prisma
    await prisma.nextBestActionRecommendation.create({
      data: {
        organizationId: ctx.organizationId,
        missionId: ctx.missionId,
        actionType: decision.actionType,
        priority: decision.priority,
        channel: decision.channel,
        objective: decision.objective,
        rationale: decision.rationale,
        recommendedMessage: decision.recommendedMessage,
        evidence: decision.evidence as any,
        confidence: decision.confidence,
        requiresApproval: decision.requiresApproval,
        scheduledFor: decision.scheduledFor,
      },
    });
  }
}
