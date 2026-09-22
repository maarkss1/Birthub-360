import type { BindToolsInput } from '@langchain/core/language_models/chat_models';
import { ChatOpenAI } from '@langchain/openai';

function buildCandidates(modelName: string): ChatOpenAI[] {
  return [
    new ChatOpenAI({
      modelName,
      temperature: 0,
      apiKey: process.env.GROQ_API_KEY || 'missing-key',
      maxRetries: 3,
      timeout: 30_000,
      configuration: { baseURL: 'https://api.groq.com/openai/v1' },
    }),
    new ChatOpenAI({
      modelName: 'gpt-4o-mini',
      temperature: 0,
      apiKey: process.env.OPENAI_API_KEY || 'missing-key',
      maxRetries: 3,
      timeout: 30_000,
    }),
  ];
}

/**
 * Monta o modelo primário (Groq) com fallback para OpenAI, pulando qualquer provedor sem API key
 * configurada. Quando `tools` é informado, cada candidato (primário e fallbacks) recebe bindTools
 * antes do fallback ser montado — sem isso, um fallback assumindo o lugar do primário no meio de
 * uma execução perderia acesso às ferramentas do agente.
 */
export function buildModelWithFallback(modelName: string, tools?: BindToolsInput[]) {
  const candidates = buildCandidates(modelName);
  const available = candidates.filter((llm) => llm.apiKey !== 'missing-key');

  // Fail-fast: sem nenhuma chave configurada, o candidato "cru" chamaria Groq/OpenAI com
  // apiKey='missing-key' e só falharia várias camadas depois, dentro do LangChain, com um 401
  // genérico. Mesmo padrão de erro explícito já usado em groq.provider.ts — o chamador (run()/
  // runWithTools() em base.agent.ts) já converte esta exceção num `{ error: message }` honesto.
  if (available.length === 0) {
    throw new Error(
      'Nenhum provedor de IA configurado (GROQ_API_KEY e OPENAI_API_KEY ausentes) — não é possível executar o agente.',
    );
  }

  const bind = (llm: ChatOpenAI) => (tools ? llm.bindTools(tools) : llm);

  const [primary, ...fallbacks] = available;
  const primaryBound = bind(primary);

  if (fallbacks.length === 0) return primaryBound;

  return primaryBound.withFallbacks({ fallbacks: fallbacks.map(bind) });
}

// Mantido para não obrigar troca simultânea de todos os call sites — delega para
// buildModelWithFallback, que agora cobre os dois casos (com e sem tools) num único lugar.
export function buildModelWithFallbackAndTools(modelName: string, tools: BindToolsInput[]) {
  return buildModelWithFallback(modelName, tools);
}
