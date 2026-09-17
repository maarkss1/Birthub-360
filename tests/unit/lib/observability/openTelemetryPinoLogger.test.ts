import { describe, expect, it } from 'vitest';
import { OpenTelemetryPinoLogger } from '../../../../src/lib/observability/openTelemetryPinoLogger.js';

describe('OpenTelemetryPinoLogger (Agente 10)', () => {
  it('formata logs estruturados em JSON com contexto OpenTelemetry e tenant', () => {
    const logger = new OpenTelemetryPinoLogger('birthub-api-test');
    const log = logger.info('Processamento de webhook de sincronização concluído', {
      traceId: 'otel-trace-abc-123',
      spanId: 'otel-span-456',
      organizationId: 'org-atlas-gr',
    }, { dealsCount: 15 });

    expect(log.level).toBe('info');
    expect(log.service).toBe('birthub-api-test');
    expect(log.traceContext.traceId).toBe('otel-trace-abc-123');
    expect(log.traceContext.organizationId).toBe('org-atlas-gr');
    expect(log.extra?.dealsCount).toBe(15);
  });
});
