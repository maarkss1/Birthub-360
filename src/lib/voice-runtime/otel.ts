import { trace, metrics, ValueType, Tracer, Meter, Attributes } from '@opentelemetry/api';

// Create a custom collector to store real-time spans and metrics for the frontend ObservabilityPage
//
// Tenancy note (see .agents/handoffs/onda-1/01-para-04-observability-cross-tenant-leak.md):
// this collector is a process-wide singleton. Every span/metric MUST be tagged with the tenant
// it belongs to so read access (getSpans/getMetrics) can filter per-tenant instead of returning
// the raw in-memory array to whoever calls it. Callers that have no real tenant context (e.g. a
// process bootstrap/seed step) must pass the explicit sentinel tenantId 'system' — never omit the
// tag silently. 'system' records are intentionally excluded from any real-tenant-filtered read.
export const SYSTEM_TENANT_ID = 'system';

export interface LocalSpan {
  id: string;
  name: string;
  sessionId: string;
  tenantId: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  attributes: Attributes;
}

export interface LocalMetric {
  name: string;
  value: number;
  tenantId: string;
  timestamp: number;
  attributes: Attributes;
}

class OpenTelemetryCollector {
  private spans: LocalSpan[] = [];
  private metrics: LocalMetric[] = [];
  private tracer: Tracer;
  private meter: Meter;

  constructor() {
    // Initialize the real OpenTelemetry APIs
    this.tracer = trace.getTracer('birth-voices-runtime', '1.0.0');
    this.meter = metrics.getMeter('birth-voices-metrics', '1.0.0');
  }

  public getTracer(): Tracer {
    return this.tracer;
  }

  public getMeter(): Meter {
    return this.meter;
  }

  // Record a span locally for dashboard display.
  //
  // `tenantId` is intentionally the last parameter (not inserted before `attributes`) so that
  // existing positional callers outside Agente 04's ownership (e.g. server.ts's bootstrap seed,
  // owned by the Coordinator) keep compiling unchanged and keep defaulting to the safe
  // SYSTEM_TENANT_ID sentinel instead of silently omitting the tag. Real per-tenant callers
  // (LLMGateway.ts) pass tenantId explicitly.
  public startLocalSpan(
    name: string,
    sessionId: string,
    attributes: Attributes = {},
    tenantId: string = SYSTEM_TENANT_ID
  ): string {
    const spanId = `span-${Date.now()}-${this.spans.length}`;
    const localSpan: LocalSpan = {
      id: spanId,
      name,
      sessionId,
      tenantId,
      startTime: Date.now(),
      attributes
    };
    this.spans.push(localSpan);

    // Also trigger OpenTelemetry API trace
    const otelSpan = this.tracer.startSpan(name, {
      attributes: { sessionId, tenantId, ...attributes }
    });
    // Set active context or store it
    otelSpan.end(); // close API span immediately for simplicity in our synchronous engines

    return spanId;
  }

  public endLocalSpan(spanId: string, additionalAttributes: Attributes = {}) {
    const span = this.spans.find(s => s.id === spanId);
    if (span) {
      span.endTime = Date.now();
      span.duration = span.endTime - span.startTime;
      span.attributes = { ...span.attributes, ...additionalAttributes };

      // Record duration metric via OTEL Meter API
      const durationHistogram = this.meter.createHistogram('engine_latency_ms', {
        description: 'Latency of core engine execution',
        unit: 'ms',
        valueType: ValueType.INT
      });
      durationHistogram.record(span.duration, { engine: span.name, sessionId: span.sessionId });

      // Store local metric, tagged with the same tenant as the span it derives from — never
      // defaults to 'system' here, since the owning span already carries the real tenant (or an
      // explicit 'system' tag of its own).
      this.recordLocalMetric(
        'engine_latency_ms',
        span.duration,
        { engine: span.name, sessionId: span.sessionId },
        span.tenantId
      );
    }
  }

  // See startLocalSpan for why tenantId is the trailing parameter.
  public recordLocalMetric(
    name: string,
    value: number,
    attributes: Attributes = {},
    tenantId: string = SYSTEM_TENANT_ID
  ) {
    this.metrics.push({
      name,
      value,
      tenantId,
      timestamp: Date.now(),
      attributes
    });

    // Clean up older records to avoid memory bloating
    if (this.metrics.length > 1000) this.metrics.shift();
    if (this.spans.length > 500) this.spans.shift();
  }

  // Always filters — never returns the raw process-wide array. Omitting tenantId is treated as
  // "give me system-level records" (SYSTEM_TENANT_ID), which is a real, safe filter rather than
  // an unfiltered leak: it can only ever surface records that were themselves explicitly tagged
  // 'system' (e.g. server.ts's bootstrap seed), never another tenant's data. Real per-tenant
  // reads (observability.controller.ts) always pass req.tenantId! explicitly.
  public getSpans(tenantId: string = SYSTEM_TENANT_ID): LocalSpan[] {
    return this.spans.filter(s => s.tenantId === tenantId);
  }

  public getMetrics(tenantId: string = SYSTEM_TENANT_ID): LocalMetric[] {
    return this.metrics.filter(m => m.tenantId === tenantId);
  }

  public clear() {
    this.spans = [];
    this.metrics = [];
  }
}

export const otelCollector = new OpenTelemetryCollector();
