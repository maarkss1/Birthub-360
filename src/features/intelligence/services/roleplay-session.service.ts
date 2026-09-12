import type { Prisma } from '@prisma/client';
import { prisma } from '../../../lib/prisma.js';
import { logger } from '../../../lib/logger.js';
import { generateRoleplayEvaluation } from './studio/generators/roleplay.js';

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
  brand: 'birthub360';
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

export interface RoleplaySessionHistoryItem {
  id: string;
  personaId: string;
  personaLabel: string;
  difficulty: 'facil' | 'medio' | 'dificil';
  durationSeconds: number;
  overallScore: number;
  clarityScore: number;
  objectionHandlingScore: number;
  closingScore: number;
  strengths: string[];
  improvements: string[];
  summary: string;
  createdAt: Date;
}

/** Quantas sessões a tela de histórico carrega ao montar — mesmo raciocínio de HISTORY_LIMIT em
 *  assistant-history.service.ts: teto fixo para não devolver a tabela inteira do usuário. */
const HISTORY_LIMIT = 20;

/**
 * Parecer técnico de fim de ligação do Roleplay (chamado por
 * POST /api/intelligence/roleplay/finish, consumido por RoleplayHub.finishCall no frontend): chama
 * a IA (generateRoleplayEvaluation, mesmo motor `invokeStructured` já usado pelos turnos em
 * produção) e persiste a sessão completa.
 *
 * Vive em intelligence/ (não em features/roleplay/) pelo mesmo motivo de
 * assistant-history.service.ts: é persistência de sessão de IA de uma tela de outra feature, e
 * `no-cross-feature-imports` (.dependency-cruiser.cjs) proíbe features/roleplay/ importar
 * internals de features/intelligence/ (o gerador do Studio) diretamente — a composição entre
 * features tem que passar por src/shared/ ou por chamada HTTP à rota, nunca por import direto.
 *
 * roleplay/AGENTS.md: "estados de simulação e falhas de IA são explícitos e testados" — uma falha
 * da IA aqui propaga (nunca fabrica nota/feedback), mesmo raciocínio já aplicado em
 * RoleplayAiService.evaluateSession. Só a ESCRITA no banco é best-effort (mesmo padrão de
 * appendAssistantTurn logo acima neste diretório): o parecer já foi computado e entregue ao
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

/**
 * Histórico de ligações do Roleplay para a tela `/app/roleplay` — as sessões já eram persistidas
 * por finishRoleplaySession, mas até agora não havia nenhuma rota para reler o que foi salvo (a
 * tela mostrava o parecer técnico uma vez e ele sumia ao sair da tela ou trocar de marca). Escopado
 * por usuário + marca, mesmo raciocínio de listAssistantHistory: é treino pessoal do vendedor, não
 * um documento de equipe, e cada marca tem personas/playbook distintos.
 */
export async function listRoleplaySessions(
  organizationId: string,
  userId: string,
  brand: 'birthub360',
): Promise<RoleplaySessionHistoryItem[]> {
  const rows = await prisma.roleplaySession.findMany({
    where: { organizationId, userId, brand },
    orderBy: { createdAt: 'desc' },
    take: HISTORY_LIMIT,
  });
  return rows.map((row) => ({
    id: row.id,
    personaId: row.personaId,
    personaLabel: row.personaLabel,
    difficulty: row.difficulty as 'facil' | 'medio' | 'dificil',
    durationSeconds: row.durationSeconds,
    overallScore: row.overallScore,
    clarityScore: row.clarityScore,
    objectionHandlingScore: row.objectionHandlingScore,
    closingScore: row.closingScore,
    strengths: row.strengths as string[],
    improvements: row.improvements as string[],
    summary: row.summary,
    createdAt: row.createdAt,
  }));
}
