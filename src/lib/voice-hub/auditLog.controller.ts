import type { Request, Response } from 'express';
import { listAuditLog, parsePagination } from '../services/auditLogService.js';

export async function listAuditLogHandler(req: Request, res: Response) {
  const { page, pageSize } = parsePagination(req.query.page, req.query.pageSize);
  const result = await listAuditLog(req.organizationId!, page, pageSize);
  return res.json(result);
}
