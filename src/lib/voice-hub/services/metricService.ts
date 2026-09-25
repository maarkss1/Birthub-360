import * as metricRepository from '../repositories/metricRepository.js';

export function listMetrics(organizationId: string, userId: string) {
  return metricRepository.listMetricsForUser(organizationId, userId);
}

// `userId` is null for tenant-wide events with no single attributable user (e.g. an AI provider
// call from lib/voice-runtime/providers/LLMGateway.ts) — see metricRepository.createMetric.
export function createMetric(organizationId: string, userId: string | null, data: { name: string; value: number; tags?: unknown }) {
  return metricRepository.createMetric(organizationId, userId, data);
}

export function clearMetrics(organizationId: string, userId: string) {
  return metricRepository.deleteMetricsForUser(organizationId, userId);
}
