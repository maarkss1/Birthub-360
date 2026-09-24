import type { PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  CallAttempt,
  TERMINAL_CALL_ATTEMPT_STATUSES,
  type CallAttemptProps,
  type CallAttemptStatus,
} from "../../../domain/entities/CallAttempt.js";
import {
  AgentDnConflictError,
  type CallAttemptRepository,
} from "../../../application/ports/CallAttemptRepository.js";

/** Nome do índice único parcial criado na migration 002 (ver esse arquivo para o motivo). */
const ACTIVE_AGENT_DN_CONSTRAINT = "uq_call_attempts_active_agent_dn";

function isActiveAgentDnViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "23505" &&
    "constraint" in error &&
    (error as { constraint?: unknown }).constraint === ACTIVE_AGENT_DN_CONSTRAINT
  );
}

interface CallAttemptRow {
  id: string;
  lead_id: string;
  campaign_id: string;
  agent_dn: string;
  status: CallAttemptStatus;
  provider_call_id: string | null;
  started_at: Date;
  ended_at: Date | null;
}

function rowToProps(row: CallAttemptRow): CallAttemptProps {
  return {
    id: row.id,
    leadId: row.lead_id,
    campaignId: row.campaign_id,
    agentDn: row.agent_dn,
    status: row.status,
    providerCallId: row.provider_call_id,
    startedAt: row.started_at,
    endedAt: row.ended_at,
  };
}

/**
 * Gera a lista de placeholders SQL ($N, $N+1, ...) para os status terminais,
 * a partir da constante do domínio — uma única fonte de verdade em vez de
 * duplicar a lista de status em SQL. `startAt` é a posição do primeiro
 * placeholder (depende de quantos outros parâmetros vêm antes na query).
 */
function terminalStatusPlaceholders(startAt: number): string {
  return TERMINAL_CALL_ATTEMPT_STATUSES.map((_, index) => `$${startAt + index}`).join(", ");
}

// TODO: Refactor native SQL queries to use Prisma ORM directly.
export class PgCallAttemptRepository implements CallAttemptRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(attempt: CallAttempt): Promise<void> {
    const props = attempt.toProps();
    try {
      await this.prisma.$executeRawUnsafe(
        `INSERT INTO call_attempts (id, lead_id, campaign_id, agent_dn, status, provider_call_id, started_at, ended_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO UPDATE SET
           status = EXCLUDED.status,
           provider_call_id = EXCLUDED.provider_call_id,
           ended_at = EXCLUDED.ended_at`,
        [
          props.id,
          props.leadId,
          props.campaignId,
          props.agentDn,
          props.status,
          props.providerCallId,
          props.startedAt,
          props.endedAt,
        ],
      );
    } catch (error) {
      if (isActiveAgentDnViolation(error)) {
        throw new AgentDnConflictError(props.agentDn);
      }
      throw error;
    }
  }

  async findById(id: string): Promise<CallAttempt | null> {
    const rows = await this.prisma.$queryRawUnsafe<CallAttemptRow[]>(
      "SELECT * FROM call_attempts WHERE id = $1",
      [id],
    );
    const row = rows[0];
    return row === undefined ? null : CallAttempt.restore(rowToProps(row));
  }

  async findInProgress(campaignId: string): Promise<CallAttempt[]> {
    const rows = await this.prisma.$queryRawUnsafe<CallAttemptRow[]>(
      `SELECT * FROM call_attempts
       WHERE campaign_id = $1 AND status NOT IN (${terminalStatusPlaceholders(2)})`,
      [campaignId, ...TERMINAL_CALL_ATTEMPT_STATUSES],
    );
    return rows.map((row) => CallAttempt.restore(rowToProps(row)));
  }

  async findBusyAgentDns(): Promise<Set<string>> {
    const rows = await this.prisma.$queryRawUnsafe<{ agent_dn: string }[]>(
      `SELECT DISTINCT agent_dn FROM call_attempts
       WHERE status NOT IN (${terminalStatusPlaceholders(1)})`,
      [...TERMINAL_CALL_ATTEMPT_STATUSES],
    );
    return new Set(rows.map((row) => row.agent_dn));
  }
}
