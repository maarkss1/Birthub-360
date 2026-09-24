import { Request, Response } from 'express';
import { callLogSchema } from '../validators/index.js';
import { listCallLogs, createCallLog, updateCallLog, deleteCallLog, NotFoundError } from '../services/callLogService.js';
import { writeAuditLog } from '../services/audit.js';

export async function listCallLogsHandler(req: Request, res: Response) {
  const logs = await listCallLogs(req.tenantId!);
  res.json({ callLogs: logs });
}

export async function createCallLogHandler(req: Request, res: Response) {
  const parsed = callLogSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

  const log = await createCallLog(req.tenantId!, req.user?.id ?? null, parsed.data);
  if (req.user) writeAuditLog(req.tenantId, req.user.id, 'CALL_LOG_CREATE', { logId: log.id });
  res.json({ success: true, log });
}

export async function updateCallLogHandler(req: Request, res: Response) {
  const parsed = callLogSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

  try {
    const log = await updateCallLog(String(req.params.id), req.tenantId!, parsed.data);
    res.json({ success: true, log });
  } catch (err) {
    if (err instanceof NotFoundError) return res.status(404).json({ error: err.message });
    throw err;
  }
}

export async function deleteCallLogHandler(req: Request, res: Response) {
  try {
    await deleteCallLog(String(req.params.id), req.tenantId!);
    res.json({ success: true, message: 'Log excluído com sucesso.' });
  } catch (err) {
    if (err instanceof NotFoundError) return res.status(404).json({ error: err.message });
    throw err;
  }
}
