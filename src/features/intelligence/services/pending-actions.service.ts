import type { prisma } from '../../../lib/prisma.js';
import type { getTenantPrisma } from '../../../lib/tenant-prisma.js';
import { executeAndRecord, type ExecutionResult } from './aiPendingAction.service.js';

// União exata dos dois valores que o caller pode passar (`req.db || prisma`, ver
// authenticateToken.ts) — um `Pick<typeof prisma, ...>` estrutural quebra o typecheck aqui porque
// o client estendido por $extends() usa `Exact<>` internamente, que não sobrevive a Pick.
type Db = typeof prisma | ReturnType<typeof getTenantPrisma>;

// PROMPT 7 (schema cresceu com AccessRequest/ApprovalDecision/TemporaryCapabilityGrant): chamar um
// método sobre `db: Db` diretamente faz o TypeScript comparar as duas metades genéricas da união
// (`DefaultArgs` vs `InternalArgs & {...}`) em cada um dos ~50 models do client gerado — acima de
// um certo número de models isso estoura "Excessive stack depth" (TS2321). As duas metades da
// união são runtime-compatíveis (mesmo shape, `getTenantPrisma` só troca o `organizationId`
// implícito), então o cast para uma única metade concreta antes de chamar o delegate é seguro e
// evita a comparação — a assinatura pública das funções abaixo continua aceitando `Db`.
function asClient(db: Db): typeof prisma {
  return db as typeof prisma;
}

export async function listPendingActions(db: Db, organizationId: string) {
  return asClient(db).aIPendingAction.findMany({
    where: { approved: false, discardedAt: null, organizationId },
    orderBy: { createdAt: 'desc' },
  });
}

const EXECUTED_ACTIONS_LIST_LIMIT = 30;

/** Ações já executadas (IA-005) com resultado de negócio ainda não registrado — a fila de
 *  "registrar o que aconteceu" do fechamento do closed loop (item 103 da constituição de
 *  produto). Mesmo teto de itens que `Notification.list` (`LIST_LIMIT`): lista de trabalho, não
 *  histórico paginado. */
export async function listActionsAwaitingOutcome(db: Db, organizationId: string) {
  return asClient(db).aIPendingAction.findMany({
    where: { organizationId, executed: true, outcomeStatus: 'UNMEASURED' },
    orderBy: { executedAt: 'desc' },
    take: EXECUTED_ACTIONS_LIST_LIMIT,
  });
}

/**
 * Registra o resultado de negócio observado depois da execução — captura manual (um humano
 * decide e registra), nunca inferida automaticamente. Só se aplica a uma ação já executada; nunca
 * sobrescreve um outcome já registrado (rejeita, não reabre a decisão silenciosamente).
 */
export async function recordActionOutcome(
  db: Db,
  organizationId: string,
  id: string,
  actorId: string,
  input: {
    status: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
    notes?: string;
    detail?: Record<string, unknown>;
  },
) {
  const client = asClient(db);
  const action = await client.aIPendingAction.findFirst({
    where: { id, organizationId, executed: true },
  });
  if (!action) {
    return null;
  }
  if (action.outcomeStatus !== 'UNMEASURED') {
    return { alreadyRecorded: true as const, action };
  }
  const updated = await client.aIPendingAction.update({
    where: { id },
    data: {
      outcomeStatus: input.status,
      outcome: input.detail as object | undefined,
      outcomeNotes: input.notes,
      outcomeMeasuredAt: new Date(),
      outcomeMeasuredBy: actorId,
    },
  });
  return { alreadyRecorded: false as const, action: updated };
}

/**
 * Aprova e tenta executar a ação de fato (IA-005) — antes disso, "aprovar" só marcava um flag no
 * banco e nada consumia isso depois. `execution.sent` diz pro chamador se realmente foi enviado;
 * quando não (`not_configured`/`send_failed`), a tela ainda pode cair no fallback manual.
 */
export async function approvePendingAction(
  db: Db,
  organizationId: string,
  id: string,
  actorId: string,
): Promise<{
  action: Awaited<ReturnType<typeof prisma.aIPendingAction.update>>;
  execution: ExecutionResult;
} | null> {
  const client = asClient(db);
  const pendingAction = await client.aIPendingAction.findFirst({
    where: { id, organizationId, approved: false, discardedAt: null },
  });
  if (!pendingAction) {
    return null;
  }
  const action = await client.aIPendingAction.update({
    where: { id },
    data: { approved: true, approvedAt: new Date(), approvedBy: actorId },
  });
  const execution = await executeAndRecord(action);
  return { action, execution };
}

export async function discardPendingAction(
  db: Db,
  organizationId: string,
  id: string,
  actorId: string,
) {
  const client = asClient(db);
  const pendingAction = await client.aIPendingAction.findFirst({
    where: { id, organizationId, approved: false, discardedAt: null },
  });
  if (!pendingAction) {
    return false;
  }
  // Preserva a decisão para auditoria e aprendizado; descartar não deve apagar o rastro da IA.
  await client.aIPendingAction.update({
    where: { id: pendingAction.id },
    data: { discardedAt: new Date(), discardedBy: actorId },
  });
  return true;
}
