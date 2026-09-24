import { Request, Response } from 'express';
import { brandColorSchema } from '../validators/index.js';
import { getBrandColor, saveBrandColor, resetBrandColor } from '../services/settingService.js';

export async function getBrandColorHandler(req: Request, res: Response) {
  const brandColor = await getBrandColor(req.tenantId ?? null);
  res.json({ brandColor });
}

export async function saveBrandColorHandler(req: Request, res: Response) {
  const parsed = brandColorSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

  await saveBrandColor(req.tenantId!, parsed.data.color);
  res.json({ success: true, brandColor: parsed.data.color });
}

export async function resetBrandColorHandler(req: Request, res: Response) {
  await resetBrandColor(req.tenantId!);
  res.json({ success: true, brandColor: '#2563eb' });
}
