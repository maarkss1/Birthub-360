import type { Request, Response } from 'express';
import { voiceRuntimeSchema } from '../validators/index.js';
import {
  getVoiceRuntimeConfig,
  saveVoiceRuntimeConfig,
  resetVoiceRuntimeConfig,
} from '../services/settingService.js';

function requireOrganizationId(req: Request, res: Response): string | undefined {
  const organizationId = req.organizationId;

  if (!organizationId) {
    res.status(401).json({ error: 'Organization context is required.' });
    return undefined;
  }

  return organizationId;
}

export async function getVoiceRuntimeHandler(req: Request, res: Response) {
  const organizationId = requireOrganizationId(req, res);
  if (!organizationId) return;

  const config = await getVoiceRuntimeConfig(organizationId, req.voiceHubUser?.id);
  return res.json({ config });
}

export async function createVoiceRuntimeHandler(req: Request, res: Response) {
  const organizationId = requireOrganizationId(req, res);
  if (!organizationId) return;

  const parsed = voiceRuntimeSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }

  const config = await saveVoiceRuntimeConfig(
    organizationId,
    req.voiceHubUser?.id,
    parsed.data.config,
    false,
  );

  return res.json({ success: true, config });
}

export async function updateVoiceRuntimeHandler(req: Request, res: Response) {
  const organizationId = requireOrganizationId(req, res);
  if (!organizationId) return;

  const parsed = voiceRuntimeSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }

  const config = await saveVoiceRuntimeConfig(
    organizationId,
    req.voiceHubUser?.id,
    parsed.data.config,
    true,
  );

  return res.json({ success: true, config });
}

export async function resetVoiceRuntimeHandler(req: Request, res: Response) {
  const organizationId = requireOrganizationId(req, res);
  if (!organizationId) return;

  await resetVoiceRuntimeConfig(organizationId, req.voiceHubUser?.id);
  return res.json({
    success: true,
    message: 'Configurações de voz restauradas ao padrão.',
  });
}
