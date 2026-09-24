import { Request, Response } from 'express';
import { voiceRuntimeSchema } from '../validators/index.js';
import { getVoiceRuntimeConfig, saveVoiceRuntimeConfig, resetVoiceRuntimeConfig } from '../services/settingService.js';

export async function getVoiceRuntimeHandler(req: Request, res: Response) {
  const config = await getVoiceRuntimeConfig(req.tenantId!, req.user!.id);
  res.json({ config });
}

export async function createVoiceRuntimeHandler(req: Request, res: Response) {
  const parsed = voiceRuntimeSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

  const config = await saveVoiceRuntimeConfig(req.tenantId!, req.user!.id, parsed.data.config, false);
  res.json({ success: true, config });
}

export async function updateVoiceRuntimeHandler(req: Request, res: Response) {
  const parsed = voiceRuntimeSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

  const config = await saveVoiceRuntimeConfig(req.tenantId!, req.user!.id, parsed.data.config, true);
  res.json({ success: true, config });
}

export async function resetVoiceRuntimeHandler(req: Request, res: Response) {
  await resetVoiceRuntimeConfig(req.tenantId!, req.user!.id);
  res.json({ success: true, message: 'Configurações de voz restauradas ao padrão.' });
}
