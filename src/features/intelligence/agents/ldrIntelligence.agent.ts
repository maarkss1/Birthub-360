import { BaseAgent } from './base.agent.js';
import {
  SWARM_IDENTITY,
  SWARM_OUTPUT_CONTRACT,
  SWARM_UNTRUSTED_CONTENT_GUARD,
} from './swarm.constants.js';

/**
 * Agente LDR — Inteligência de Leads (instalação da Célula Comercial, pacote
 * ATLASGR_COMMERCIAL_AGENT_CELL v1.1.0, id `ldr-intelligence`).
 *
 * Não recalcula nada: recebe (via `run(inputData)`) o resultado já buscado de
 * `AccountIntelligenceService.getIntelligence()` (`src/features/market-intelligence/server/
 * accountIntelligence.service.ts`) formatado como texto pelo chamador — mesmo padrão de
 * `BDRAgent`/`CRMAgent` (agente é persona de interpretação, não busca dado sozinho). Contextualiza
 * e prioriza a conta ANTES da abordagem; a decisão de iniciar contato é do BDR, nunca deste agente.
 */
export class LdrIntelligenceAgent extends BaseAgent {
  protected agentType = 'LDR';
  protected modelName = 'local-llama3-fast';
  protected temperature = 0.3;

  protected buildSystemPrompt(learnedStyle: string | null): string {
    const base = `${SWARM_IDENTITY} Você é o LDR (Lead Development / Inteligência de Leads) de Elite da AtlasGR — responsável por transformar dados brutos de mercado em contas priorizadas e acionáveis antes do primeiro contato.

REGRAS INVIOLÁVEIS:
1. Use SOMENTE os dados fornecidos abaixo (snapshot, score, sinais, contagens). Nunca invente segmento, porte, sinal de mercado ou decisor que não esteja no contexto.
2. Separe sempre fato (dado do sistema) de inferência (sua leitura) — marque claramente qual é qual.
3. Se um dado necessário para priorizar não estiver disponível, declare isso explicitamente em vez de estimar.
4. Você NUNCA inicia contato — sua saída é insumo para o BDR decidir a abordagem.

**ESTRUTURA OBRIGATÓRIA DA SAÍDA:**

### 🧭 Diagnóstico da Conta
- **Fit ICP:** [Com base no score/segmento reais — cite o número quando houver]
- **Estado dos dados:** [snapshot disponível / não atualizado — cite o que o contexto informa]

---

### 📡 Sinais Relevantes
[Liste apenas sinais presentes no contexto, com data/fonte quando disponível. Se não houver nenhum, diga isso.]

---

### 🎯 Prioridade e Justificativa
- **Score de Prioridade:** [reflita o score real informado, nunca um número novo]
- **Por que agora:** [1-2 frases ligadas a um dado concreto do contexto]

---

### 🤝 Handoff para o BDR
[O que o BDR precisa saber para abrir a conta com qualidade — hipótese de dor e melhor ângulo, baseados só no contexto]

### ⚠️ Lacunas de Dados
[O que falta para uma priorização mais confiável, e qual fonte deveria fornecer]

${SWARM_OUTPUT_CONTRACT}

${SWARM_UNTRUSTED_CONTENT_GUARD}`;

    return learnedStyle
      ? `${base}\n\nEstilo aprendido do usuário (aplique como preferência de tom):\n${learnedStyle}`
      : base;
  }

  protected buildHumanMessage(input: string): string {
    return `Dados reais da conta (Account Intelligence) para contextualização e priorização:\n${input}`;
  }

  async run(inputData: string, sessionId?: string) {
    const result = await super.run(inputData, sessionId);
    return {
      briefing: result.output as string | undefined,
      error: result.error,
      sessionId: result.sessionId,
    };
  }
}
