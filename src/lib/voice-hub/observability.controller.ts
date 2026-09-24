import { Request, Response } from 'express';
import { otelCollector } from '../../lib/voice-runtime/otel.js';

// Tenant isolation: requireTenant (see observability.routes.ts) only proves the caller is
// authenticated for *some* tenant, not that they own the data — the actual isolation happens
// here, by always passing the authenticated caller's own tenantId into the collector's filtered
// read methods instead of ever calling getSpans()/getMetrics() unfiltered. req.tenantId! is safe:
// requireTenant already rejects the request with 401 before this handler runs if it is missing.
export function observabilityMetricsHandler(req: Request, res: Response) {
  res.json({
    spans: otelCollector.getSpans(req.tenantId!),
    metrics: otelCollector.getMetrics(req.tenantId!)
  });
}
