import { BaseProvider, ProviderResponse, ProviderInput, ProviderContext } from './BaseProvider';
import { logger } from '../../../src/lib/logger.js';

export class OpenAIRealtimeProvider extends BaseProvider {
  public id = 'OpenAI';
  public name = 'OpenAI Realtime API';
  public type = 'LLM' as const;

  public async initialize(_config: Record<string, unknown>): Promise<void> {
    logger.debug(`[${this.name}] Initialized`);
  }

  public async process(input: ProviderInput, context?: ProviderContext): Promise<ProviderResponse> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      // Must throw, not return a fake success — see GeminiProvider.process for why. A swallowed
      // failure here means FailoverEngine never tries the next provider in the chain.
      throw new Error('Chave da OpenAI não configurada.');
    }

    const start = Date.now();
    const systemMessage = context ? JSON.stringify(context) : "Você é um assistente de voz.";

    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemMessage },
            { role: 'user', content: String(input) }
          ],
          temperature: 0.7
        })
      });

      if (!res.ok) {
        throw new Error(`OpenAI API Error: ${res.statusText}`);
      }

      const data = await res.json();
      const text = data.choices?.[0]?.message?.content;
      if (!text) {
        throw new Error('OpenAI retornou resposta vazia.');
      }

      return {
        text,
        latencyMs: Date.now() - start
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error(`[${this.name}] Error processing LLM request`, err);
      throw new Error(`OpenAI API Error: ${msg}`);
    }
  }

  public async checkHealth(): Promise<boolean> {
    return !!process.env.OPENAI_API_KEY;
  }

  public async destroy(): Promise<void> {
    logger.debug(`[${this.name}] Destroyed`);
  }
}

export const openaiProvider = new OpenAIRealtimeProvider();
