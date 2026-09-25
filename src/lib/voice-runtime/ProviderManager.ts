import { BaseProvider } from './providers/BaseProvider';
import { observability } from './Observability';
import { logger } from '../../src/lib/logger.js';
import { geminiProvider } from './providers/GeminiProvider';
import { openaiProvider } from './providers/OpenAIProvider';
import { anthropicProvider } from './providers/AnthropicProvider';
import { elevenLabsProvider } from './providers/ElevenLabsProvider';
import { voiceboxProvider } from './providers/VoiceboxProvider';
import { twilioProvider } from './providers/TwilioProvider';

export class ProviderManager {
  private providers: Map<string, BaseProvider> = new Map();

  public registerProvider(provider: BaseProvider) {
    this.providers.set(provider.id, provider);
    logger.debug(`[ProviderManager] Registered provider: ${provider.name} (${provider.type})`);
  }

  public getProvider(id: string): BaseProvider | undefined {
    return this.providers.get(id);
  }

  public getProvidersByType(type: 'STT' | 'LLM' | 'TTS' | 'E2E'): BaseProvider[] {
    return Array.from(this.providers.values()).filter(p => p.type === type);
  }

  public async getHealthyProvider(preferredId: string, type: 'STT' | 'LLM' | 'TTS' | 'E2E', fallbacks: string[] = []): Promise<BaseProvider> {
    const preferred = this.getProvider(preferredId);
    
    if (preferred && await preferred.checkHealth()) {
      return preferred;
    }

    observability.logEvent('SYSTEM', 'PROVIDER_FAILOVER', { failed: preferredId, trying: fallbacks });

    for (const fallbackId of fallbacks) {
      const fallbackProvider = this.getProvider(fallbackId);
      if (fallbackProvider && await fallbackProvider.checkHealth()) {
        return fallbackProvider;
      }
    }

    throw new Error(`No healthy provider available for type ${type}`);
  }
}

export const providerManager = new ProviderManager();

// Register every runtime provider eagerly. Without this, `providers` stays empty forever —
// nothing in the codebase ever called `registerProvider` before (verified: no call site outside
// this file as of the Onda 2 failover audit), so `getHealthyProvider` unconditionally threw
// "No healthy provider available" for every single attempt, meaning FailoverEngine could never
// actually reach any provider, let alone the guaranteed GoogleGemini fallback. Registration
// happens once, at module load, so any caller that imports `providerManager` (directly or via
// FailoverEngine/SessionManager) gets a populated registry regardless of import order.
providerManager.registerProvider(geminiProvider);
providerManager.registerProvider(openaiProvider);
providerManager.registerProvider(anthropicProvider);
providerManager.registerProvider(elevenLabsProvider);
providerManager.registerProvider(voiceboxProvider);
providerManager.registerProvider(twilioProvider);
