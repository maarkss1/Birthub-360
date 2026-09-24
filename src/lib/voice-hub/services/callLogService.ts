import * as callLogRepository from '../repositories/callLogRepository.js';
import { logger } from '../lib/logger.js';

export class NotFoundError extends Error {}

// LGPD requires a defined retention period for personal data — a CallLog's contactName is
// personal data tied to a real contact. 365 days is the default when `CALL_LOG_RETENTION_DAYS` is
// not set; callers that want a stricter (or, with explicit business justification, longer) window
// can override per invocation.
const DEFAULT_CALL_LOG_RETENTION_DAYS = 365;

export function listCallLogs(tenantId: string) {
  return callLogRepository.listCallLogsForTenant(tenantId);
}

export function createCallLog(tenantId: string, userId: string | null, data: { contactName?: string; duration?: string; status?: string; agent?: string }) {
  return callLogRepository.createCallLog(tenantId, userId, data);
}

export async function updateCallLog(id: string, tenantId: string, data: { contactName?: string; status?: string; duration?: string }) {
  const existing = await callLogRepository.findCallLogForTenant(id, tenantId);
  if (!existing) throw new NotFoundError('Log de chamada não encontrado.');
  return callLogRepository.updateCallLog(id, data);
}

export async function deleteCallLog(id: string, tenantId: string) {
  const existing = await callLogRepository.findCallLogForTenant(id, tenantId);
  if (!existing) throw new NotFoundError('Log não encontrado para exclusão.');
  await callLogRepository.deleteCallLog(id);
}

/**
 * Enforces the CallLog retention window across every tenant. This module only exposes the
 * mechanism — it is deliberately not self-scheduling (no setInterval/cron here), because owning a
 * periodic job's cadence and failure alerting is an infrastructure/deployment concern outside this
 * service's responsibility. Whoever wires a scheduled trigger (a BullMQ repeatable job, a Cloud Run
 * job, a cron container) should call this on a daily cadence — see
 * `.agents/handoffs/onda-1/05-para-00-callLog-retention-scheduling.md`.
 */
export async function purgeExpiredCallLogs(retentionDays: number = Number(process.env.CALL_LOG_RETENTION_DAYS) || DEFAULT_CALL_LOG_RETENTION_DAYS) {
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
  const result = await callLogRepository.deleteCallLogsOlderThan(cutoff);
  logger.info('[CallLogService] Retention purge complete', { retentionDays, cutoff: cutoff.toISOString(), deletedCount: result.count });
  return { deletedCount: result.count, cutoff };
}
