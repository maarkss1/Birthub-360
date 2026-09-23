import { AIMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';
import { getAiModel, logAiUsage } from '../../../lib/ai/gateway.js';
import { getTenantId } from '../../../lib/async-context.js';
import { loadAgentMemory, recordAgentFailure, saveAgentMemory } from '../agents/agentMemory.store.js';
import { redactAndTrackPiiLeak } from './guardrails.service.js';

export interface GatewayCallConfig {
  /** ID da sessão para recuperar/salvar memória. Se omitido, a chamada será stateless. */
  sessionId?: string;
  /** Papel ou tipo do agente chamador. Usado para métricas e escopo de memória. */
  agentType?: string;
  /** ID da organização/tenant. Opcional, faz fallback para getTenantId() do contexto. */
  organizationId?: string;
  /** Modelo de linguagem. Default: local-llama3 */
  modelName?: string;
  /** Temperatura. Default: 0.7 */
  temperature?: number;
  /** Prompt de sistema inicial. */
  systemPrompt?: string;
  /** Mensagens da interação atual. */
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  /** ID do prompt armazenado no banco, para telemetria. */
  promptId?: string;
}

/**
 * P5: Gateway de Inteligência (IntelligenceGateway)
 * 
 * Este serviço atua como um wrapper genérico e centralizado para todas as chamadas aos modelos de IA,
 * garantindo a aplicação uniforme das diretrizes P5:
 * 
 * 1. Normalização de Chamadas: abstrai a chamada ao getAiModel, compondo o histórico (se stateless) ou 
 *    recuperando-o via AgentMemory.
 * 2. Log e Telemetria: Garante o registro padronizado de uso de tokens, custos e latência via logAiUsage (AILog).
 * 3. Governança e Risco (Guardrails): Mascara automaticamente PII da saída gerada e registra vazamentos contidos 
 *    no AIGuardrailEvent via redactAndTrackPiiLeak.
 * 4. Memória: Reutiliza o `AgentMemory` store para carregar e salvar estado conversacional de forma atômica
 *    e segura (se um sessionId for fornecido).
 */
export class IntelligenceGateway {
  async invoke(config: GatewayCallConfig): Promise<string> {
    const {
      sessionId,
      agentType = 'default-agent',
      modelName = 'local-llama3',
      temperature = 0.7,
      systemPrompt,
      messages,
      promptId
    } = config;

    const organizationId = config.organizationId ?? getTenantId();

    // 1. Memória: Recupera contexto de AgentMemory (se sessionId foi informado)
    let history: Array<{ role: string; content: string }> = [];
    if (sessionId) {
      const memory = await loadAgentMemory({
        sessionId,
        agentType,
        organizationId
      });
      if (memory?.messages) {
        history = memory.messages as Array<{ role: string; content: string }>;
      }
    }

    // Compõe a lista completa de mensagens (histórico + system + novas mensagens)
    const allMessages = [...history];
    if (systemPrompt && !allMessages.some(m => m.role === 'system')) {
      allMessages.unshift({ role: 'system', content: systemPrompt });
    }
    allMessages.push(...messages);

    const langChainMessages = allMessages.map(m => {
      if (m.role === 'system') return new SystemMessage(m.content);
      if (m.role === 'assistant') return new AIMessage(m.content);
      return new HumanMessage(m.content);
    });

    // 2. Chamada ao Gateway de Provedores (litellm, openai, groq)
    const model = getAiModel(modelName, temperature, agentType);
    const startTime = Date.now();
    let result: Awaited<ReturnType<typeof model.invoke>>;
    try {
      result = await model.invoke(langChainMessages);
    } catch (error) {
      // Registra falha estruturada na memória do agente para auditoria de falhas e fallback
      if (sessionId) {
        await recordAgentFailure({
          sessionId,
          agentType,
          organizationId,
          errorMessage: error instanceof Error ? error.message : String(error)
        });
      }
      throw error;
    }

    // 3. Telemetria: Registro de tokens e custos via AILog
    await logAiUsage({
      model: result.response_metadata.model,
      usage: result.response_metadata.tokenUsage,
      latencyMs: Date.now() - startTime,
      promptId,
      // O tenant do AILog vem de `requestContext` (RLS), não do input — ver src/lib/ai/usage-log.ts.
      agentRole: agentType
    });

    // 4. Governança: Sanitização de PII e registro no AIGuardrailEvent
    const redactedContent = await redactAndTrackPiiLeak(result.content, agentType);

    // 5. Atualização da Memória
    if (sessionId) {
      allMessages.push({ role: 'assistant', content: redactedContent });
      await saveAgentMemory({
        sessionId,
        agentType,
        organizationId,
        messages: allMessages,
        status: 'Completed'
      });
    }

    return redactedContent;
  }
}

export const intelligenceGateway = new IntelligenceGateway();
