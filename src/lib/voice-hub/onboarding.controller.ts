import { Request, Response } from 'express';
import { checklistSchema } from '../validators/index.js';
import { getChecklist, saveChecklist, resetChecklist } from '../services/settingService.js';

export async function getChecklistHandler(req: Request, res: Response) {
  const checklist = await getChecklist(req.tenantId!, req.user!.id);
  res.json({ checklist });
}

export async function saveChecklistHandler(req: Request, res: Response) {
  const parsed = checklistSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

  await saveChecklist(req.tenantId!, req.user!.id, parsed.data.checklist);
  res.json({ success: true, checklist: parsed.data.checklist });
}

export async function resetChecklistHandler(req: Request, res: Response) {
  await resetChecklist(req.tenantId!, req.user!.id);
  res.json({ success: true, message: 'Progresso resetado.' });
}
