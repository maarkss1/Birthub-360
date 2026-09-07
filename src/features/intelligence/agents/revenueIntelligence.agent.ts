import { BaseAgent } from './base.agent.js';
import {
  SWARM_IDENTITY,
  SWARM_OUTPUT_CONTRACT,
  SWARM_UNTRUSTED_CONTENT_GUARD,
} from './swarm.constants.js';

/**
 * Agente Revenue Intelligence — Forecast & Pipeline (Célula Comercial, pacote
 * ATLASGR_COMMERCIAL_AGENT_CELL v1.1.0, id `revenue-intelligence`).
 *
 * Import direto de `src/features/commercial-intelligence/**` foi tentado nesta onda e REJEITADO
 * pelo gate de arquitetura real (`npm run test:architecture` → dependency-cruiser,
 * `no-cross-feature-imports`) — `src/features/intelligence/agents/**` não pode importar de outro
 * feature. Por isso este agente segue o mesmo padrão de `BDRAgent`/`CRMAgent`: é uma persona de
 * interpretação que recebe (via `run(inputData)`) o texto já formatado pelo chamador com os
 * números REAIS já calculados por `CommercialIntelligenceUseCases`/`CommercialIntelligenceAiService`
 * (overview, pipeline, forecast, trends) — nunca recalcula nada, nunca inventa um número que o
 * contexto não trouxe. Quem compõe esse contexto (uma rota/serviço fora de `intelligence/agents/**`,
 * que pode importar os dois domínios) é trabalho de integração cross-domínio — ver handoff da onda.
 */
export class RevenueIntelligenceAgent extends BaseAgent {
  protected agentType = 'REVENUE_INTELLIGENCE';
  protected modelName = 'local-llama3-fast';
  protected temperature = 0.2;

  protected buildSystemPrompt(learnedStyle: string | null): string {
    const base = `${SWARM_IDENTITY} Você é o Revenue Intelligence — traduz métricas reais do cockpit comercial em previsibilidade, separando sempre Pipeline de Forecast.

REGRAS INVIOLÁVEIS:
1. Use SOMENTE os números fornecidos no contexto (overview, pipeline, coverage, trends, forecast accuracy). Nunca recalcule, arredonde de forma que mude o sentido, ou estime um valor ausente.
2. Pipeline não é Forecast. Venda (Closed Won) não é faturamento. Nunca colapse esses conceitos numa mesma frase.
3. Separe fato (número do sistema) de leitura (sua interpretação) de recomendação.
4. Se faltar um dado para responder "quanto venderemos" ou "há cobertura suficiente", declare a lacuna.

**ESTRUTURA OBRIGATÓRIA DA SAÍDA:**

### 🔭 Previsibilidade
- **Forecast:** [cite o valor do contexto] | **Gap para a meta:** [cite ou "não disponível"]

---

### 📦 Pipeline vs. Forecast
[Cite pipeline total, elegível e coverage do contexto — deixe explícito que pipeline não é garantia de venda]

---

### 📈 Tendência e Precisão do Forecast
[Cite momentum/tendência e forecast accuracy do contexto, se disponíveis]

---

### 🎯 Plano de Ação
[1 a 3 ações concretas ligadas a um número específico do contexto]

### ⚠️ Lacunas de Dados
[O que não pôde ser avaliado por falta de dado, e qual fonte deveria fornecê-lo]

${SWARM_OUTPUT_CONTRACT}

${SWARM_UNTRUSTED_CONTENT_GUARD}`;

    return learnedStyle
      ? `${base}\n\nEstilo aprendido do usuário (aplique como preferência de tom):\n${learnedStyle}`
      : base;
  }

  protected buildHumanMessage(input: string): string {
    return `Métricas reais do Comercial Inteligente (overview, pipeline, forecast, trends) para diagnóstico de previsibilidade:\n${input}`;
  }

  async run(inputData: string, sessionId?: string) {
    const result = await super.run(inputData, sessionId);
    return {
      diagnosis: result.output as string | undefined,
      error: result.error,
      sessionId: result.sessionId,
    };
  }
}
