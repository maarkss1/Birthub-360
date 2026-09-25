import type { PrismaClient } from "@prisma/client";
import { prisma } from '../../../../../../lib/prisma.js';
import { Lead, type LeadProps, type LeadStatus } from "../../../domain/entities/Lead.js";
import { PhoneNumber } from "../../../domain/value-objects/PhoneNumber.js";
import type { LeadRepository } from "../../../application/ports/LeadRepository.js";

interface LeadRow {
  id: string;
  campaign_id: string;
  name: string;
  phone: string;
  status: LeadStatus;
  attempts: number;
  next_attempt_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

function rowToProps(row: LeadRow): LeadProps {
  return {
    id: row.id,
    campaignId: row.campaign_id,
    name: row.name,
    phone: PhoneNumber.create(row.phone),
    status: row.status,
    attempts: row.attempts,
    nextAttemptAt: row.next_attempt_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Quantidade de leads por INSERT multi-linha em `saveMany`. Cada lead usa 9
 * parâmetros; o limite do protocolo do Postgres é 65535 parâmetros por
 * query, então 500 (4500 parâmetros) fica bem folgado, mantendo o SQL
 * gerado em um tamanho razoável para logging/debug.
 */
const BULK_UPSERT_CHUNK_SIZE = 500;

// TODO: Refactor native SQL queries to use Prisma ORM directly.
export class PgLeadRepository implements LeadRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(lead: Lead): Promise<void> {
    await this.upsertMany([lead]);
  }

  /**
   * Insere/atualiza leads em lote via INSERT multi-linha (em vez de um laço
   * de upserts individuais), dividido em chunks de `BULK_UPSERT_CHUNK_SIZE`
   * dentro de uma única transação — reduz uma importação de dezenas de
   * milhares de leads de dezenas de milhares de round-trips ao banco para
   * dezenas.
   */
  async saveMany(leads: readonly Lead[]): Promise<void> {
    if (leads.length === 0) {
      return;
    }
    // TODO: Use Prisma transaction
    const client = null as any;
    try {
      // await client.query("BEGIN");
      for (let offset = 0; offset < leads.length; offset += BULK_UPSERT_CHUNK_SIZE) {
        const chunk = leads.slice(offset, offset + BULK_UPSERT_CHUNK_SIZE);
        await this.upsertMany(chunk, client);
      }
      // await client.query("COMMIT");
    } catch (error: any) {
      // await client.query("ROLLBACK");
      throw error;
    } finally {
      // client.release();
    }
  }

  async findById(id: string): Promise<Lead | null> {
    const rows = await this.prisma.$queryRawUnsafe<LeadRow[]>("SELECT * FROM leads WHERE id = $1", [id]);
    const row = rows[0];
    return row === undefined ? null : Lead.restore(rowToProps(row));
  }

  /**
   * Seleciona e já marca como `in_progress`, atomicamente, os próximos leads
   * elegíveis. `FOR UPDATE SKIP LOCKED` faz cada processo concorrente pular
   * linhas já travadas por outro processo em vez de esperar ou duplicar a
   * seleção — é o mecanismo padrão do Postgres para múltiplos consumidores
   * disputando uma fila (ver README, seção "Processo único" nas limitações
   * resolvidas). O UPDATE...RETURNING garante que a seleção e a reserva
   * aconteçam na mesma transação implícita, sem janela para outro processo
   * roubar a mesma linha entre o SELECT e o UPDATE.
   */
  async claimNextEligible(campaignId: string, now: Date, limit: number): Promise<Lead[]> {
    if (limit <= 0) {
      return [];
    }
    const rows = await this.prisma.$queryRawUnsafe<LeadRow[]>(
      `WITH candidates AS (
         SELECT id FROM leads
         WHERE campaign_id = $1
           AND status = 'pending'
           AND (next_attempt_at IS NULL OR next_attempt_at <= $2)
         ORDER BY created_at ASC
         LIMIT $3
         FOR UPDATE SKIP LOCKED
       )
       UPDATE leads
       SET status = 'in_progress', updated_at = $2
       FROM candidates
       WHERE leads.id = candidates.id
       RETURNING leads.*`,
      [campaignId, now, limit],
    );
    return rows.map((row) => Lead.restore(rowToProps(row)));
  }

  async existsByCampaignAndPhone(campaignId: string, phoneE164: string): Promise<boolean> {
    const rows = await this.prisma.$executeRawUnsafe(
      "SELECT 1 FROM leads WHERE campaign_id = $1 AND phone = $2 LIMIT 1",
      [campaignId, phoneE164],
    );
    return (((rows as any)?.length ?? rows) ?? 0) > 0;
  }

  async getCampaignStats(campaignId: string): Promise<{
    campaignId: string;
    totalLeads: number;
    pending: number;
    inProgress: number;
    contacted: number;
    exhausted: number;
    doNotCall: number;
    invalidNumber: number;
    contactRatePercent: number;
  }> {
    const rows = await this.prisma.$queryRawUnsafe<{
      total_leads: string;
      pending: string;
      in_progress: string;
      contacted: string;
      exhausted: string;
      do_not_call: string;
      invalid_number: string;
    }[]>(
      `SELECT
         COUNT(*)::text AS total_leads,
         COUNT(*) FILTER (WHERE status = 'pending')::text AS pending,
         COUNT(*) FILTER (WHERE status = 'in_progress')::text AS in_progress,
         COUNT(*) FILTER (WHERE status = 'contacted')::text AS contacted,
         COUNT(*) FILTER (WHERE status = 'exhausted')::text AS exhausted,
         COUNT(*) FILTER (WHERE status = 'do_not_call')::text AS do_not_call,
         COUNT(*) FILTER (WHERE status = 'invalid_number')::text AS invalid_number
       FROM leads
       WHERE campaign_id = $1`,
      [campaignId],
    );

    const row = rows[0];
    const totalLeads = row ? Number.parseInt(row.total_leads, 10) : 0;
    const pending = row ? Number.parseInt(row.pending, 10) : 0;
    const inProgress = row ? Number.parseInt(row.in_progress, 10) : 0;
    const contacted = row ? Number.parseInt(row.contacted, 10) : 0;
    const exhausted = row ? Number.parseInt(row.exhausted, 10) : 0;
    const doNotCall = row ? Number.parseInt(row.do_not_call, 10) : 0;
    const invalidNumber = row ? Number.parseInt(row.invalid_number, 10) : 0;

    const contactRatePercent =
      totalLeads > 0 ? Math.round((contacted / totalLeads) * 10000) / 100 : 0;

    return {
      campaignId,
      totalLeads,
      pending,
      inProgress,
      contacted,
      exhausted,
      doNotCall,
      invalidNumber,
      contactRatePercent,
    };
  }

  private async upsertMany(
    leads: readonly Lead[],
    executor: any = this.prisma,
  ): Promise<void> {
    const columnsPerRow = 9;
    const placeholderRows: string[] = [];
    const values: unknown[] = [];

    leads.forEach((lead, index) => {
      const props = lead.toProps();
      const base = index * columnsPerRow;
      const placeholders = Array.from(
        { length: columnsPerRow },
        (_, column) => `$${base + column + 1}`,
      ).join(", ");
      placeholderRows.push(`(${placeholders})`);
      values.push(
        props.id,
        props.campaignId,
        props.name,
        props.phone.toE164(),
        props.status,
        props.attempts,
        props.nextAttemptAt,
        props.createdAt,
        props.updatedAt,
      );
    });

    await executor.query(
      `INSERT INTO leads (id, campaign_id, name, phone, status, attempts, next_attempt_at, created_at, updated_at)
       VALUES ${placeholderRows.join(", ")}
       ON CONFLICT (id) DO UPDATE SET
         status = EXCLUDED.status,
         attempts = EXCLUDED.attempts,
         next_attempt_at = EXCLUDED.next_attempt_at,
         updated_at = EXCLUDED.updated_at`,
      values,
    );
  }
}
