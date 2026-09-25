import { LatencyMetrics } from './types';
import { observability } from './Observability';

// The numeric timing fields of LatencyMetrics — distinct from the provider-identity fields
// (llmProviderUsed, ttsProviderUsed, ...), which are strings/booleans and go through
// recordProviderUsed instead. Keeping this separate from `keyof LatencyMetrics` is what makes
// `sessionMetrics[stage] = valueMs` type-safe below.
type NumericLatencyStage = 'sttMs' | 'llmMs' | 'toolMs' | 'ttsMs' | 'streamingMs' | 'totalMs';

export class LatencyMonitor {
  private metrics: Map<string, LatencyMetrics> = new Map();

  public initialize(sessionId: string) {
    this.metrics.set(sessionId, {
      sttMs: 0,
      llmMs: 0,
      toolMs: 0,
      ttsMs: 0,
      streamingMs: 0,
      totalMs: 0
    });
  }

  public recordMetric(sessionId: string, stage: NumericLatencyStage, valueMs: number) {
    const sessionMetrics = this.metrics.get(sessionId);
    if (!sessionMetrics) return;

    sessionMetrics[stage] = valueMs;
    
    // Recalculate total
    sessionMetrics.totalMs = 
      sessionMetrics.sttMs + 
      sessionMetrics.llmMs + 
      sessionMetrics.toolMs + 
      sessionMetrics.ttsMs + 
      sessionMetrics.streamingMs;

    observability.logEvent(sessionId, 'LATENCY_UPDATED', { stage, valueMs, total: sessionMetrics.totalMs });
  }

  // Records which provider actually served a stage of the call — call this with the
  // `providerUsed`/`usedFallback` a FailoverEngine.executeWithFailover call returned, never with
  // the provider that was merely *requested*, so the dashboard reflects reality after a
  // degradation (AGENTS.md, Onda 2, Agente 04 — "LatencyMonitor deve refletir o provedor
  // efetivamente usado").
  public recordProviderUsed(sessionId: string, stage: 'llm' | 'tts', providerId: string, usedFallback: boolean) {
    const sessionMetrics = this.metrics.get(sessionId);
    if (!sessionMetrics) return;

    if (stage === 'llm') {
      sessionMetrics.llmProviderUsed = providerId;
      sessionMetrics.llmUsedFallback = usedFallback;
    } else {
      sessionMetrics.ttsProviderUsed = providerId;
      sessionMetrics.ttsUsedFallback = usedFallback;
    }

    observability.logEvent(sessionId, 'PROVIDER_USED', { stage, providerId, usedFallback });
  }

  public getMetrics(sessionId: string): LatencyMetrics | undefined {
    return this.metrics.get(sessionId);
  }

  public clear(sessionId: string) {
    this.metrics.delete(sessionId);
  }
}

export const latencyMonitor = new LatencyMonitor();
