import type { Prisma } from '@prisma/client';
import { prisma } from '../../../lib/prisma.js';
import { logger } from '../../../lib/logger.js';
import { generateRoleplayEvaluation } from '../../intelligence/services/studio/generators/roleplay.js';

export interface RoleplayFinishTranscriptMessage {
  sender: 'bot' | 'user';
  text: string;
}

export interface RoleplayFinishTurnEvaluation {
  clarity: number;
  objectionHandling: number;
  total: number;
  feedback: string;
}

export interface RoleplayFinishInput {
  organizationId: string;
  userId: string;
  brand: 'atlasgr' | 'totaltrac';
  brandName: string;
  brandDescription: string;
  personaId: string;
  personaLabel: string;
  personaKey: 'skeptical_cfo' | 'strict_buyer' | 'tech_director';
  difficulty: 'facil' | 'medio' | 'dificil';
  durationSeconds: number;
  transcript: RoleplayFinishTranscriptMessage[];
  turnEvaluations: RoleplayFinishTurnEvaluation[];
}

export interface RoleplaySessionEvaluation {
  sessionId: string | null;
  overallScore: number;
  clarityScore: number;
  objectionHandlingScore: number;
  closingScore: number;
  strengths: string[];
  improvements: string[];
  summary: string;
}

/**
 * Parecer técnico de fim de ligação: chama a IA (generateRoleplayEvaluation, mesmo motor
 * `invokeStructured` já usado pelos turnos em produção) e persiste a sessão completa.
 *
 * roleplay/AGENTS.md: "estados de simulação e falhas de IA são explícitos e testados" — uma falha
 * da IA aqui propaga (nunca fabrica nota/feedback), mesmo raciocínio já aplicado em
 * RoleplayAiService.evaluateSession. Só a ESCRITA no banco é best-effort (mesmo padrão de
 * appendAssistantTurn em assistant-history.service.ts): o parecer já foi computado e entregue ao
 * vendedor, então uma falha de persistência não deve derrubar a resposta — só a sobrevivência a
 * reload/histórico é perdida, sinalizada com `sessionId: null`.
 */
export async function finishRoleplaySession(
  input: RoleplayFinishInput,
): Promise<RoleplaySessionEvaluation> {
  const evaluation = await generateRoleplayEvaluation({
    kind: 'roleplay_evaluation',
    brand: { name: input.brandName, description: input.brandDescription },
    inputs: {
      persona: input.personaKey,
      difficulty: input.difficulty,
      transcript: input.transcript.map((message) => ({
        sender: message.sender === 'user' ? 'sdr' : 'buyer',
        text: message.text,
      })),
    },
  });

  let sessionId: string | null = null;
  try {
    const session = await prisma.roleplaySession.create({
      data: {
        organizationId: input.organizationId,
        userId: input.userId,
        brand: input.brand,
        personaId: input.personaId,
        personaLabel: input.personaLabel,
        difficulty: input.difficulty,
        durationSeconds: input.durationSeconds,
        transcript: input.transcript as unknown as Prisma.InputJsonValue,
        turnEvaluations: input.turnEvaluations as unknown as Prisma.InputJsonValue,
        overallScore: evaluation.overallScore,
        clarityScore: evaluation.clarityScore,
        objectionHandlingScore: evaluation.objectionHandlingScore,
        closingScore: evaluation.closingScore,
        strengths: evaluation.strengths as unknown as Prisma.InputJsonValue,
        improvements: evaluation.improvements as unknown as Prisma.InputJsonValue,
        summary: evaluation.summary,
      },
    });
    sessionId = session.id;
  } catch (err) {
    logger.warn(
      { err, organizationId: input.organizationId, userId: input.userId },
      'Falha ao persistir sessão de roleplay (o parecer técnico já foi entregue ao usuário).',
    );
  }

  return { sessionId, ...evaluation };
}
