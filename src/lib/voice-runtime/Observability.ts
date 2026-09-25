import { RuntimeEvent } from './types';
import { logger } from '../../src/lib/logger.js';

export class ObservabilityEngine {
  private events: Map<string, RuntimeEvent[]> = new Map();
  private activeSpans: Map<string, number> = new Map();

  public logEvent(sessionId: string, type: string, payload: Record<string, unknown> = {}): RuntimeEvent {
    const event: RuntimeEvent = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      type,
      payload
    };

    if (!this.events.has(sessionId)) {
      this.events.set(sessionId, []);
    }
    
    this.events.get(sessionId)!.push(event);
    
    // In production, this would stream to DataDog, OpenTelemetry, etc.
    logger.debug(`[Observability] [${sessionId}] ${type}`, payload);
    return event;
  }

  public startSpan(spanId: string) {
    this.activeSpans.set(spanId, Date.now());
  }

  public endSpan(spanId: string, sessionId: string, type: string, additionalPayload: Record<string, unknown> = {}) {
    const start = this.activeSpans.get(spanId);
    if (!start) return;

    const latency = Date.now() - start;
    this.logEvent(sessionId, type, { ...additionalPayload, latency });
    this.activeSpans.delete(spanId);
    
    return latency;
  }

  public getEvents(sessionId: string): RuntimeEvent[] {
    return this.events.get(sessionId) || [];
  }
}

export const observability = new ObservabilityEngine();
