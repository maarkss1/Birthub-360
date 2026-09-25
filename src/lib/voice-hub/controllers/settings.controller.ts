import type { Request, Response } from 'express';
import { userSettingsSchema } from '../validators/index.js';
import { getUserSettings, saveUserSettings, resetUserSettings } from '../services/settingService.js';

export async function getSettingsHandler(req: Request, res: Response) {
  const settings = await getUserSettings(req.organizationId!, req.user!.id);
  res.json({ settings });
}

export async function createSettingsHandler(req: Request, res: Response) {
  const parsed = userSettingsSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

  const settings = await saveUserSettings(req.organizationId!, req.user!.id, parsed.data.settings, false);
  res.json({ success: true, settings });
}

export async function updateSettingsHandler(req: Request, res: Response) {
  const parsed = userSettingsSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

  const settings = await saveUserSettings(req.organizationId!, req.user!.id, parsed.data.settings, true);
  res.json({ success: true, settings });
}

export async function resetSettingsHandler(req: Request, res: Response) {
  await resetUserSettings(req.organizationId!, req.user!.id);
  res.json({ success: true, message: 'Configurações resetadas.' });
}
