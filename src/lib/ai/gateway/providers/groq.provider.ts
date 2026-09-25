/**
 * Adapter Groq — rota principal do gateway hoje (rápido, sem o gargalo de concorrência do modelo
 * local). Ver `../chat-model.ts` para a ordem de fallback completa.
 */
import { callProvider } from '../circuit-breaker';
import { requestChatCompletion } from '../http-client';
import { resolveGroqModelName } from '../model-routing';
import type { ChatCompletionResponse } from '../types';
import type { ProviderAdapter, ProviderChatParams } from './types';

const GROQ_CHAT_URL = 'https://api.groq.com/openai/v1/chat/completions';

export const groqProvider: ProviderAdapter = {
  name: 'groq',
  isConfigured(): boolean {
    return Boolean(process.env.GROQ_API_KEY);
  },
  async chatCompletion(params: ProviderChatParams): Promise<ChatCompletionResponse> {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error('Groq não está configurado (GROQ_API_KEY ausente).');
    const groqModel = resolveGroqModelName(params.resolvedModel);
    return callProvider('groq', () =>
      requestChatCompletion(
        GROQ_CHAT_URL,
        apiKey,
        groqModel,
        params.messages,
        params.temperature,
        params.agentContext,
        params.timeoutMs,
        false, // Groq ignora user/metadata — não vazamos agentContext para fora sem necessidade.
      ),
    );
  },
};
