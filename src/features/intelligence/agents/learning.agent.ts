import { SystemMessage, HumanMessage } from '@langchain/core/messages';
import { getAiModel } from '../../../lib/ai/gateway.js';
import { prisma } from '../../../lib/prisma.js';
import { logger } from '../../../lib/logger.js';
import { saveAgentMemory, loadAgentMemory } from './agentMemory.store.js';
import { assertPiiExternalConsent } from '../services/guardrails.service.js';
import { hasRequiredRole } from '../../../lib/auth/authorization.js';

// AgentMemory não tem colunas dedicadas para "perfil de aprendizado", mas sessionId+agentType já
// bastam pra guardar um registro por (tenant, ator) sem precisar de migração nova.
function learningProfileSessionId(tenantId: string, actorId: string): string {
  return `learning-profile:${tenantId}:${actorId}`;
}

// GOV-13 (Agente 13 — governança do enxame): antes desta correção, `persistProfile` fazia um
// UPSERT que SOBRESCREVIA o registro anterior a cada reflexão — sem versionamento, sem rollback e
// sem nenhuma métrica de que a "aprendizagem" correspondia a alguma mudança real, violando a regra
// deste programa de nunca dizer que a IA "aprendeu" sem métrica/dataset definido e sem permitir
// rollback. Não há coluna dedicada em `AgentMemory` para histórico (mudar `prisma/schema.prisma`
// está fora do escopo do Agente 13 — ver handoff), então o histórico vive como um array
// append-only dentro do próprio JSON de `messages` da linha já existente: cada reflexão adiciona
// uma entrada nova a `versions`, nunca remove nem sobrescreve uma anterior.
//
// Item 103 da constituição de produto (Closed-Loop Intelligence — "NÃO APRENDER CEGAMENTE"):
// mudanças de comportamento operacional exigem recomendação + aprovação humana explícita antes de
// valer. Até esta correção, uma reflexão nova virava `activeVersion` (e portanto passava a moldar
// o comportamento real do SDR/BDR/CRM via `getLearningProfile`) automaticamente, sem nenhum humano
// decidir — o único ponto do produto onde isso acontecia. Agora toda versão nova nasce
// `approvalStatus: 'PENDING'` e nunca move `activeVersion` sozinha: só
// `approveLearningProfileVersion` (GESTOR+, mesmo piso de `memory-policy.ts` para categorias
// sensíveis) faz isso. `activeVersion` continua sendo o único campo que muda em aprovação/rollback
// — nunca uma versão é removida ou reescrita.

export interface LearningProfileVersionMetrics {
  /** Quantos AuditLogs (até 50, mesma janela de sempre) entraram nesta reflexão. */
  auditLogsConsidered: number;
  /** Quantos desses AuditLogs são posteriores ao AuditLog mais recente já considerado na
   * reflexão anterior — a métrica objetiva mínima de "existe algo novo para aprender", usada
   * para decidir se uma nova versão é aceita, em vez de aceitar cegamente qualquer saída do LLM. */
  newAuditLogsSinceLastReflection: number;
  previousGuidelinesLength: number;
  newGuidelinesLength: number;
  /** Comparação de conteúdo exata (não semântica) contra a versão ativa anterior. */
  guidelinesChanged: boolean;
}

export type LearningProfileApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface LearningProfileVersionEntry {
  version: number;
  guidelines: string;
  createdAt: string;
  metrics: LearningProfileVersionMetrics;
  /** Nasce sempre `PENDING` — só vira `APPROVED` por decisão humana explícita (ver
   *  `approveLearningProfileVersion`). Nunca inferido/derivado automaticamente. */
  approvalStatus: LearningProfileApprovalStatus;
  approvedBy?: string;
  approvedByRole?: string;
  approvedAt?: string;
  rejectedBy?: string;
  rejectedAt?: string;
}

export interface LearningProfileState {
  /** Qual versão do array `versions` está em vigor para `getLearningProfile` — normalmente a
   * mais recente, mas um rollback pode apontar para uma versão anterior sem apagar nada. */
  activeVersion: number;
  /** Timestamp (ISO) do AuditLog mais recente já considerado por alguma reflexão bem-sucedida —
   * permite calcular `newAuditLogsSinceLastReflection` sem reprocessar todo o histórico. */
  lastAuditLogAt: string | null;
  /** Histórico append-only. Nunca é truncado nem reescrito — rollback só move `activeVersion`. */
  versions: LearningProfileVersionEntry[];
}

function emptyState(): LearningProfileState {
  return { activeVersion: 0, lastAuditLogAt: null, versions: [] };
}

function isLearningProfileState(value: unknown): value is LearningProfileState {
  return (
    Boolean(value) &&
    typeof value === 'object' &&
    Array.isArray((value as LearningProfileState).versions)
  );
}

async function loadState(tenantId: string, actorId: string): Promise<LearningProfileState> {
  try {
    const memory = await loadAgentMemory({
      sessionId: learningProfileSessionId(tenantId, actorId),
      agentType: 'LEARNING_PROFILE',
      organizationId: tenantId,
    });
    const state = memory?.messages as unknown;
    // Compatibilidade com o formato anterior (`{guidelines, updatedAt}`, sem versionamento):
    // tratado como "nenhum histórico ainda" — a próxima reflexão bem-sucedida cria a versão 1
    // normalmente. Não há conteúdo aproveitável ali que valha migrar automaticamente (o texto
    // livre antigo não tem uma métrica de origem associada).
    if (!isLearningProfileState(state)) return emptyState();
    return state;
  } catch (error) {
    logger.warn(
      { err: error, tenantId, actorId },
      'Failed to read learning profile history — tratando como perfil vazio.',
    );
    return emptyState();
  }
}

function findActiveEntry(state: LearningProfileState): LearningProfileVersionEntry | null {
  return state.versions.find((entry) => entry.version === state.activeVersion) ?? null;
}

/**
 * Lê as diretrizes de estilo aprendidas (versão ativa) para um (tenant, ator), se existirem.
 * Usado pelos agentes SDR/BDR/CRM para incorporar o estilo do usuário no system prompt.
 * Best-effort: falhas de leitura nunca devem interromper o agente que está consultando.
 */
export async function getLearningProfile(
  tenantId: string,
  actorId: string,
): Promise<string | null> {
  const state = await loadState(tenantId, actorId);
  return findActiveEntry(state)?.guidelines?.trim() || null;
}

/** Histórico completo (todas as versões + qual está ativa) — consumido por uma tela/rota de
 * auditoria e rollback do perfil aprendido. */
export async function getLearningProfileHistory(
  tenantId: string,
  actorId: string,
): Promise<LearningProfileState> {
  return loadState(tenantId, actorId);
}

export interface RollbackResult {
  success: boolean;
  reason?: string;
  activeVersion?: number;
  guidelines?: string;
}

/**
 * Reverte o perfil de estilo aprendido para uma versão anterior já existente no histórico.
 * Nunca apaga nem reescreve nenhuma versão — só move o ponteiro `activeVersion`. Falha sem
 * persistir nada se a versão pedida não existir no histórico deste (tenant, ator).
 */
export async function rollbackLearningProfile(
  tenantId: string,
  actorId: string,
  targetVersion: number,
): Promise<RollbackResult> {
  const state = await loadState(tenantId, actorId);
  const target = state.versions.find((entry) => entry.version === targetVersion);
  if (!target) {
    return {
      success: false,
      reason:
        state.versions.length === 0
          ? 'Este perfil ainda não tem nenhuma versão aprendida para reverter.'
          : `Versão ${targetVersion} não encontrada no histórico deste perfil.`,
    };
  }
  if (target.approvalStatus !== 'APPROVED') {
    return {
      success: false,
      reason: `Versão ${targetVersion} nunca foi aprovada (status atual: ${target.approvalStatus}) — só é possível reverter para uma versão já aprovada por um humano.`,
    };
  }
  if (state.activeVersion === targetVersion) {
    // Já é a versão ativa — nada para persistir, mas ainda é um "sucesso" do ponto de vista de
    // quem chamou (o estado pedido já é o estado atual).
    return { success: true, activeVersion: targetVersion, guidelines: target.guidelines };
  }

  const nextState: LearningProfileState = { ...state, activeVersion: targetVersion };
  await saveAgentMemory({
    sessionId: learningProfileSessionId(tenantId, actorId),
    agentType: 'LEARNING_PROFILE',
    organizationId: tenantId,
    messages: nextState,
    status: 'Completed',
  });
  logger.info(
    { tenantId, actorId, targetVersion },
    'LearningAgent: perfil revertido para versão anterior.',
  );
  return { success: true, activeVersion: targetVersion, guidelines: target.guidelines };
}

export interface LearningProfileDecider {
  userId: string;
  userRole: string;
}

export interface DecideLearningProfileVersionResult {
  success: boolean;
  reason?: string;
  activeVersion?: number;
}

/** Piso mínimo para aprovar/rejeitar uma versão do PRÓPRIO perfil de estilo aprendido — este
 *  fluxo é sempre self-service (mesma decisão arquitetural de `rollbackLearningProfile`/GOV-13,
 *  onda 39: "o histórico é por (tenant, ator), nunca cross-user" — ver
 *  `tests/unit/.../agent.routes.learning-profile.test.ts`, que trava identidade vindo só de
 *  `req.user`, nunca de querystring/body). GESTOR+ faria sentido para um fluxo de revisão por
 *  terceiros, mas isso exigiria um mecanismo novo de "atuar em nome de outro usuário" que este
 *  repositório não usa em nenhum outro lugar — mesmo piso mínimo de SDR+ já usado pelas rotas de
 *  `/api/agent/swarm/**` (`writeRoles`) é suficiente aqui: o único efeito de aprovar é mudar o
 *  comportamento do PRÓPRIO agente do próprio usuário, nunca de outra pessoa. */
const MIN_LEARNING_PROFILE_DECIDER_ROLE = 'SDR';

/**
 * Aprova uma versão `PENDING` do perfil de estilo aprendido — só então ela passa a valer
 * (`activeVersion`) e a moldar o comportamento real do SDR/BDR/CRM via `getLearningProfile`.
 * Nunca aprova implicitamente uma versão mais antiga que já foi superada por outra pendente mais
 * recente: aprovar uma versão qualquer sempre a torna a ativa, independentemente de quantas
 * versões pendentes existam depois dela (mesmo espírito do rollback: o humano decide
 * explicitamente qual versão vale, a ordem cronológica não decide sozinha).
 */
export async function approveLearningProfileVersion(
  tenantId: string,
  actorId: string,
  targetVersion: number,
  decider: LearningProfileDecider,
): Promise<DecideLearningProfileVersionResult> {
  if (!hasRequiredRole(decider.userRole, [MIN_LEARNING_PROFILE_DECIDER_ROLE])) {
    return {
      success: false,
      reason: `Só ${MIN_LEARNING_PROFILE_DECIDER_ROLE} ou superior pode aprovar uma mudança de comportamento aprendida.`,
    };
  }
  const state = await loadState(tenantId, actorId);
  const target = state.versions.find((entry) => entry.version === targetVersion);
  if (!target) {
    return { success: false, reason: `Versão ${targetVersion} não encontrada.` };
  }
  if (target.approvalStatus === 'REJECTED') {
    return {
      success: false,
      reason: `Versão ${targetVersion} já foi rejeitada — não pode ser aprovada depois.`,
    };
  }

  const nextVersions = state.versions.map((entry) =>
    entry.version === targetVersion
      ? ({
          ...entry,
          approvalStatus: 'APPROVED',
          approvedBy: decider.userId,
          approvedByRole: decider.userRole,
          approvedAt: new Date().toISOString(),
        } satisfies LearningProfileVersionEntry)
      : entry,
  );
  const nextState: LearningProfileState = {
    ...state,
    activeVersion: targetVersion,
    versions: nextVersions,
  };
  await saveAgentMemory({
    sessionId: learningProfileSessionId(tenantId, actorId),
    agentType: 'LEARNING_PROFILE',
    organizationId: tenantId,
    messages: nextState,
    status: 'Completed',
  });
  logger.info(
    { tenantId, actorId, targetVersion, approvedBy: decider.userId },
    'LearningAgent: versão do perfil aprovada por decisão humana.',
  );
  return { success: true, activeVersion: targetVersion };
}

/** Rejeita uma versão `PENDING` — nunca vira `activeVersion`, mas nunca é apagada do histórico
 *  (mesma regra "append-only, nunca some" do resto do programa). */
export async function rejectLearningProfileVersion(
  tenantId: string,
  actorId: string,
  targetVersion: number,
  decider: LearningProfileDecider,
): Promise<DecideLearningProfileVersionResult> {
  if (!hasRequiredRole(decider.userRole, [MIN_LEARNING_PROFILE_DECIDER_ROLE])) {
    return {
      success: false,
      reason: `Só ${MIN_LEARNING_PROFILE_DECIDER_ROLE} ou superior pode rejeitar uma mudança de comportamento aprendida.`,
    };
  }
  const state = await loadState(tenantId, actorId);
  const target = state.versions.find((entry) => entry.version === targetVersion);
  if (!target) {
    return { success: false, reason: `Versão ${targetVersion} não encontrada.` };
  }
  if (target.approvalStatus === 'APPROVED') {
    return {
      success: false,
      reason: `Versão ${targetVersion} já foi aprovada — use rollback para deixar de usá-la, não rejeição.`,
    };
  }
  const nextVersions = state.versions.map((entry) =>
    entry.version === targetVersion
      ? ({
          ...entry,
          approvalStatus: 'REJECTED',
          rejectedBy: decider.userId,
          rejectedAt: new Date().toISOString(),
        } satisfies LearningProfileVersionEntry)
      : entry,
  );
  await saveAgentMemory({
    sessionId: learningProfileSessionId(tenantId, actorId),
    agentType: 'LEARNING_PROFILE',
    organizationId: tenantId,
    messages: { ...state, versions: nextVersions } satisfies LearningProfileState,
    status: 'Completed',
  });
  return { success: true };
}

/**
 * LearningAgent (Self-Reflection)
 * Este agente roda em background para observar as ações manuais do usuário (via AuditLog)
 * e sintetizar um "Manual de Estilo" dinâmico.
 * Esse manual (Few-Shot) é persistido em AgentMemory (versionado — ver `LearningProfileState`
 * acima) e injetado nos agentes SDR/BDR/CRM (via getLearningProfile) para que eles ajam de acordo
 * com o estilo do usuário humano — mas só depois de `approveLearningProfileVersion`: uma reflexão
 * nova nunca vira comportamento real sozinha (item 103 da constituição de produto).
 */
export class LearningAgent {
  async reflectAndLearn(actorId: string, tenantId: string): Promise<string | null> {
    // AI-007 (parte 3): mesmo gate fail-closed já em vigor em base.agent.ts/
    // sdrQualification.agent.ts/ops.agent.ts/supervisor.agent.ts — até esta correção, este era
    // o único dos agentes do enxame que montava e enviava um prompt a um provedor de IA externo
    // (getAiModel) sem nenhuma checagem de base legal LGPD. `AuditLog.details` rotineiramente
    // carrega PII real de um titular (nome/e-mail/telefone de lead ou contato citado nos
    // detalhes de uma ação manual do vendedor — ex: "Lead atualizado: contato joão@empresa.com"),
    // então o mesmo risco que motivou a checagem nos demais agentes se aplica aqui.
    try {
      assertPiiExternalConsent(tenantId);
    } catch (error) {
      logger.warn(
        { err: error, actorId, tenantId },
        'LearningAgent bloqueado: sem base legal LGPD registrada para enviar dado pessoal (AuditLog) a provedor de IA externo.',
      );
      return null;
    }

    try {
      // Busca as últimas 50 ações manuais do usuário (ex: mudanças de lead, qualificações, e-mails enviados)
      const recentActions = await prisma.auditLog.findMany({
        where: { actorId, tenantId },
        orderBy: { timestamp: 'desc' },
        take: 50,
      });

      if (recentActions.length === 0) {
        return null;
      }

      const state = await loadState(tenantId, actorId);
      const previousEntry = findActiveEntry(state);
      // A entrada mais recente TENTADA (qualquer status — PENDING/APPROVED/REJECTED), não só a
      // ativa: o gate de aprovação (item 103) faz `activeVersion` poder ficar sem mudar por muito
      // tempo enquanto uma versão fica pendente, mas isso não deve reabrir a porta pra gerar uma
      // versão nova idêntica a cada chamada só porque nada foi aprovado ainda.
      const lastAttemptEntry =
        state.versions.length > 0 ? state.versions[state.versions.length - 1] : null;
      const lastSeenAt = state.lastAuditLogAt ? new Date(state.lastAuditLogAt).getTime() : null;
      // recentActions vem ordenado desc (mais recente primeiro) — sem watermark anterior
      // (primeira reflexão deste ator/tenant), todos os 50 contam como "novos".
      const newAuditLogsSinceLastReflection =
        lastSeenAt === null
          ? recentActions.length
          : recentActions.filter((action) => action.timestamp.getTime() > lastSeenAt).length;

      // GOV-13 — métrica mínima de aceitação: sem nenhum AuditLog novo desde a última tentativa de
      // reflexão, não existe evidência nova para justificar gastar uma chamada a um provedor de IA
      // externo (custo + exposição de PII) só para reformular o mesmo material já visto e criar
      // uma versão pendente idêntica no histórico. Reaproveita o texto da última tentativa em vez
      // disso. Isto NUNCA se aplica na primeira reflexão (sem `lastAttemptEntry`).
      if (lastAttemptEntry && newAuditLogsSinceLastReflection === 0) {
        logger.info(
          { actorId, tenantId, activeVersion: state.activeVersion },
          'LearningAgent: nenhum AuditLog novo desde a última tentativa de reflexão — reaproveitando o texto já gerado, sem propor uma versão nova.',
        );
        return lastAttemptEntry.guidelines;
      }

      const actionsText = recentActions
        .map(
          (a) =>
            `[Ação: ${a.action}] Entidade: ${a.entity} | Detalhes: ${JSON.stringify(a.details)}`,
        )
        .join('\n');

      const model = getAiModel('local-llama3-fast', 0.1, 'learning-agent');
      const systemPrompt = new SystemMessage(
        `Você é o Agente de Reflexão (Learning Agent) da Birth Hub 360.
Sua missão é analisar o log de ações manuais de um usuário humano no CRM e deduzir o "Estilo de Qualificação e Vendas" dele.
Descubra padrões: Como ele classifica um lead? O que faz ele descartar um lead? Que tom ele usa?
Gere um parágrafo denso e direto contendo as DIRETRIZES DE ESTILO APRENDIDAS. Estas diretrizes serão injetadas no Agente SDR autônomo para clonar o comportamento do usuário.`,
      );

      const response = await model.invoke([
        systemPrompt,
        new HumanMessage(`Ações manuais recentes do usuário no CRM:\n${actionsText}`),
      ]);

      const rawContent = response.content;
      const learnedStyle = (
        typeof rawContent === 'string' ? rawContent : JSON.stringify(rawContent)
      ).trim();

      // GOV-13 — nunca aceita cegamente qualquer saída do LLM: uma saída vazia não vira uma
      // versão nova (não há o que persistir) — reaproveita o texto da última tentativa real
      // (`lastAttemptEntry`, não só a ativa: pode não haver nenhuma aprovada ainda).
      if (!learnedStyle) {
        logger.warn(
          { actorId, tenantId },
          'LearningAgent: LLM devolveu saída vazia — não persistindo uma versão vazia; mantendo o texto da última tentativa.',
        );
        return lastAttemptEntry?.guidelines ?? null;
      }

      // recentActions[0] é o mais recente (orderBy desc) — vira o novo watermark.
      const mostRecentAuditLogAt = recentActions[0].timestamp;
      const metrics: LearningProfileVersionMetrics = {
        auditLogsConsidered: recentActions.length,
        newAuditLogsSinceLastReflection,
        previousGuidelinesLength: previousEntry?.guidelines.length ?? 0,
        newGuidelinesLength: learnedStyle.length,
        guidelinesChanged: learnedStyle !== (previousEntry?.guidelines ?? null),
      };

      // Persiste como uma NOVA versão em AgentMemory — nunca sobrescreve as anteriores.
      await this.persistProfile(
        tenantId,
        actorId,
        state,
        learnedStyle,
        mostRecentAuditLogAt,
        metrics,
      );

      logger.info(
        { actorId, tenantId, metrics },
        'LearningAgent updated user style guidelines successfully.',
      );

      return learnedStyle;
    } catch (error) {
      logger.error({ err: error }, 'LearningAgent failed to reflect and learn');
      return null;
    }
  }

  /** Sempre acrescenta uma entrada nova a `versions` (nunca sobrescreve/apaga uma anterior),
   * sempre `approvalStatus: 'PENDING'`. Nunca move `activeVersion` — só uma aprovação humana
   * explícita faz isso (ver `approveLearningProfileVersion`). `saveAgentMemory` já é o upsert
   * atômico compartilhado (AI-003) — reaproveitado aqui, não recriado. */
  private async persistProfile(
    tenantId: string,
    actorId: string,
    state: LearningProfileState,
    guidelines: string,
    mostRecentAuditLogAt: Date,
    metrics: LearningProfileVersionMetrics,
  ): Promise<void> {
    const nextVersion =
      state.versions.length > 0 ? Math.max(...state.versions.map((entry) => entry.version)) + 1 : 1;
    const entry: LearningProfileVersionEntry = {
      version: nextVersion,
      guidelines,
      createdAt: new Date().toISOString(),
      metrics,
      approvalStatus: 'PENDING',
    };
    const nextState: LearningProfileState = {
      activeVersion: state.activeVersion,
      lastAuditLogAt: mostRecentAuditLogAt.toISOString(),
      versions: [...state.versions, entry],
    };
    const sessionId = learningProfileSessionId(tenantId, actorId);
    await saveAgentMemory({
      sessionId,
      agentType: 'LEARNING_PROFILE',
      organizationId: tenantId,
      messages: nextState,
      status: 'Completed',
    });
  }
}
