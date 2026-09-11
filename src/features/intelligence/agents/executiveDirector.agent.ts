import { BaseAgent } from './base.agent.js';
import {
  SWARM_IDENTITY,
  SWARM_OUTPUT_CONTRACT,
  SWARM_UNTRUSTED_CONTENT_GUARD,
  appendLearnedStyle,
} from './swarm.constants.js';

/**
 * Agente Diretoria — Executivo Comercial (Célula Comercial, pacote
 * ATLASGR_COMMERCIAL_AGENT_CELL v1.1.0, id `executive-director`).
 *
 * Camada final de tradução operação → decisão executiva. Narra o cockpit executivo já calculado
 * (overview, tendências, health score, forecast accuracy) — o chamador monta o contexto, este
 * agente nunca recalcula nada nem acessa banco diretamente.
 */
export class ExecutiveDirectorAgent extends BaseAgent {
  protected agentType = 'EXECUTIVE_DIRECTOR';
  protected modelName = 'local-llama3-fast';
  protected temperature = 0.2;

  protected buildSystemPrompt(learnedStyle: string | null): string {
    const base = `${SWARM_IDENTITY} Você é o Executivo Comercial — resume para a Diretoria, com objetividade, se a máquina comercial sustenta a meta atual e futura.

REGRAS INVIOLÁVEIS:
1. Use SOMENTE os dados fornecidos no contexto (forecast, meta, pipeline, tendências, health score, forecast accuracy). Nunca invente número, tendência ou risco não citado.
2. Máximo 1 página: seja direto, sem jargão vazio.
3. Separe fato de leitura estratégica de decisão recomendada — nunca apresente uma recomendação como decisão já tomada.
4. Se um dado necessário para a leitura de suficiência de pipeline não estiver disponível, declare a lacuna em vez de estimar.

**ESTRUTURA OBRIGATÓRIA DA SAÍDA (1 página):**

### 🎯 Estamos batendo a meta?
[Resposta direta em 1-2 frases, com o número do contexto]

---

### 📉 Suficiência do Pipeline (90 dias)
[Cite cobertura e criação de pipeline do contexto — diga explicitamente se está ou não dentro do recomendado]

---

### 🚨 Principais Riscos
[Liste só riscos com evidência no contexto — churn, contrato, faturamento, forecast confidence — priorizados por impacto]

---

### 🧭 Decisões Recomendadas
[1 a 3 decisões concretas para a Diretoria considerar, cada uma ligada a um risco/número específico]

### ⚠️ Lacunas de Dados
[O que não pôde ser avaliado por falta de dado, e qual fonte deveria fornecê-lo]

${SWARM_OUTPUT_CONTRACT}

${SWARM_UNTRUSTED_CONTENT_GUARD}`;

    return appendLearnedStyle(base, learnedStyle);
  }

  protected buildHumanMessage(input: string): string {
    return `Cockpit executivo real (overview, tendências, health score, forecast accuracy) para leitura da Diretoria:\n${input}`;
  }

  async run(inputData: string, sessionId?: string) {
    const result = await super.run(inputData, sessionId);
    return {
      executiveBrief: result.output as string | undefined,
      error: result.error,
      sessionId: result.sessionId,
    };
  }
}
