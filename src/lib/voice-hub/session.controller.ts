import { Request, Response } from 'express';
import { z } from 'zod';
import { sessionSchema } from '../validators/index.js';
import { listSessions, createSession, updateSession, deleteSession, NotFoundError } from '../services/sessionService.js';

const updateSessionSchema = z.object({
  status: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export async function listSessionsHandler(req: Request, res: Response) {
  const sessions = await listSessions(req.tenantId!, req.user!.id);
  res.json({ sessions });
}

export async function createSessionHandler(req: Request, res: Response) {
  const parsed = sessionSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

  const session = await createSession(req.tenantId!, req.user!.id, parsed.data);
  res.json({ success: true, session });
}

export async function updateSessionHandler(req: Request, res: Response) {
  const parsed = updateSessionSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

  try {
    const session = await updateSession(String(req.params.id), req.tenantId!, req.user!.id, parsed.data);
    res.json({ success: true, session });
  } catch (err) {
    if (err instanceof NotFoundError) return res.status(404).json({ error: err.message });
    throw err;
  }
}

export async function deleteSessionHandler(req: Request, res: Response) {
  try {
    await deleteSession(String(req.params.id), req.tenantId!, req.user!.id);
    res.json({ success: true, message: 'Sessão encerrada e removida com sucesso.' });
  } catch (err) {
    if (err instanceof NotFoundError) return res.status(404).json({ error: err.message });
    throw err;
  }
}
