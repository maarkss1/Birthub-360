import { prisma } from '../lib/prisma.js';

export function listCallLogsForTenant(tenantId: string) {
  return prisma.callLog.findMany({ where: { tenantId }, orderBy: { timestamp: 'desc' }, take: 100 });
}

export function createCallLog(tenantId: string, userId: string | null, data: {
  contactName?: string; duration?: string; status?: string; agent?: string;
}) {
  return prisma.callLog.create({
    data: {
      tenantId,
      userId: userId ?? undefined,
      contactName: data.contactName || 'Contato Anônimo',
      duration: data.duration || '02:15',
      status: data.status || 'Concluído',
      time: 'Agora mesmo',
      agent: data.agent || 'Catarina Atendimento',
    },
  });
}

export function findCallLogForTenant(id: string, tenantId: string) {
  return prisma.callLog.findFirst({ where: { id, tenantId } });
}

export function updateCallLog(id: string, data: { contactName?: string; status?: string; duration?: string }) {
  return prisma.callLog.update({ where: { id }, data });
}

export function deleteCallLog(id: string) {
  return prisma.callLog.delete({ where: { id } });
}

// Bulk retention purge — not tenant-scoped by design, it runs across every tenant's expired
// records in one pass. `timestamp` is set once at creation (see createCallLog) and never updated,
// so it is a safe, monotonic cutoff for "how old is this record" regardless of any later edits via
// updateCallLog.
export function deleteCallLogsOlderThan(cutoff: Date) {
  return prisma.callLog.deleteMany({ where: { timestamp: { lt: cutoff } } });
}
