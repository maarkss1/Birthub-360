import { providerManager } from './ProviderManager';
import { observability } from './Observability';
import { otelCollector } from './otel';
import { BaseProvider } from './providers/BaseProvider';

export interface FailoverResult<T> {
  result: T;
  // The provider that actually produced `result` — NOT necessarily `preferredProviderId`. Callers
  // (LatencyMonitor via SessionManager) must record this, not the originally-requested provider,
  // so dashboards reflect what really served the call after a degradation.
  providerUsed: string;
  usedFallback: boolean;
  failedProviders: string[];
}

export class FailoverEngine {

  public async executeWithFailover<T>(
    sessionId: string,
    operationName: string,
    preferredProviderId: string,
    type: 'STT' | 'LLM' | 'TTS' | 'E2E',
    fallbacks: string[],
    operation: (provider: BaseProvider) => Promise<T>,
    tenantId?: string
  ): Promise<FailoverResult<T>> {

    let currentProviderId = preferredProviderId;
    const attempts = [preferredProviderId, ...fallbacks];
    const failedProviders: string[] = [];

    for (let i = 0; i < attempts.length; i++) {
      try {
        const provider = await providerManager.getHealthyProvider(attempts[i], type, []);
        currentProviderId = provider.id;

        const result = await operation(provider);
        return {
          result,
          providerUsed: currentProviderId,
          usedFallback: i > 0,
          failedProviders
        };

      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        failedProviders.push(attempts[i]);

        // Every degradation step during a real call must be observable — never a silently
        // swallowed error mid-conversation (AGENTS.md bloqueador #6). Emit both the existing
        // session event log AND a discrete OTel span per failed attempt so it shows up in the
        // observability dashboard's span timeline, not just buried in a final aggregate.
        observability.logEvent(sessionId, 'FAILOVER_TRIGGERED', {
          operation: operationName,
          failedProvider: attempts[i],
          error: message,
          nextProvider: attempts[i + 1] || 'NONE'
        });
        const failSpan = otelCollector.startLocalSpan(
          `FailoverEngine.${operationName}.attempt`,
          sessionId,
          { provider: attempts[i], type },
          tenantId
        );
        otelCollector.endLocalSpan(failSpan, { error: message, failed: true });

        if (i === attempts.length - 1) {
          throw new Error(`All providers failed for ${operationName}. Last error: ${message}`);
        }
      }
    }

    throw new Error('Unexpected end of failover loop');
  }
}

export const failoverEngine = new FailoverEngine();
