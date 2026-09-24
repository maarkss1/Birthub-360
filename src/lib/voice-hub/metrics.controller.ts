import { Request, Response } from 'express';
import { metricSchema } from '../validators/index.js';
import { listMetrics, createMetric, clearMetrics } from '../services/metricService.js';

export async function listMetricsHandler(req: Request, res: Response) {
  const metrics = await listMetrics(req.tenantId!, req.user!.id);
  res.json({ metrics });
}

export async function createMetricHandler(req: Request, res: Response) {
  const parsed = metricSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

  const metric = await createMetric(req.tenantId!, req.user!.id, parsed.data);
  res.json({ success: true, metric });
}

export async function updateMetricsHandler(_req: Request, res: Response) {
  res.status(501).json({ error: 'Métricas consolidadas não podem ser editadas diretamente.' });
}

export async function clearMetricsHandler(req: Request, res: Response) {
  await clearMetrics(req.tenantId!, req.user!.id);
  res.json({ success: true, message: 'Métricas limpas para esta organização.' });
}
