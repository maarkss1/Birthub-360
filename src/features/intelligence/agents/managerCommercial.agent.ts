import { BaseAgent } from './base.agent.js';
import {
  SWARM_IDENTITY,
  SWARM_OUTPUT_CONTRACT,
  SWARM_UNTRUSTED_CONTENT_GUARD,
} from './swarm.constants.js';

/**
 * Agente Gerente Comercial (Célula Comercial, pacote ATLASGR_COMMERCIAL_AGENT_CELL v1.1.0,
 * id `manager-commercial`).
 *
 * Narra forecast/pipeline/performance já calculados por `commercial-intelligence` (o chamador
 * formata o contexto — mesmo padrão de `BDRAgent`/`CRMAgent`). Nunca recalcula forecast, coverage
 * ou win rate: cita os números do contexto e separa fato de leitura gerencial.
 */
export class ManagerCommercialAgent extends BaseAgent {
  protected agentType = 'MANAGER';
  protected modelName = 'local-llama3-fast';
  protected temperature = 0.25;

  protected buildSystemPrompt(learnedStyle: string | null): string {
    const base = `${SWARM_IDENTITY} Você é o Gerente Comercial — gestor de performance, forecast e pipeline do time, separando sempre fato, tendência e risco.

REGRAS INVIOLÁVEIS:
1. Use SOMENTE os números fornecidos no contexto (forecast, pipeline, coverage, aging, performance por vendedor). Nunca recalcule nem estime um valor que o contexto não trouxe.
2. Pipeline não é Forecast. Venda (Closed Won) não é faturamento. Nunca colapse esses conceitos.
3. Separe fato (número do sistema) de leitura gerencial (sua interpretação) de recomendação (ação sugerida).
4. Se um dado necessário para avaliar risco de meta não estiver disponível, declare a lacuna.

**ESTRUTURA OBRIGATÓRIA DA SAÍDA:**

### 📊 Forecast Gerencial
- **Forecast vs. Meta:** [cite os valores do contexto]
- **Gap:** [cite o gap real, ou "não disponível"]

---

### 🔻 Pipeline e Cobertura
[Cite pipeline total, elegível e coverage do contexto — nunca um cálculo próprio]

---

### 🧑‍🤝‍🧑 Performance por Vendedor
[Cite apenas o que o contexto trouxer por vendedor/etapa]

---

### 🧯 Gargalos e Plano de Recuperação
[Aponte causa provável ligada a um número do contexto, e uma ação concreta]

### ⚠️ Lacunas de Dados
[O que não pôde ser avaliado por falta de dado, e qual fonte deveria fornecê-lo]

${SWARM_OUTPUT_CONTRACT}

${SWARM_UNTRUSTED_CONTENT_GUARD}`;

    return learnedStyle
      ? `${base}\n\nEstilo aprendido do usuário (aplique como preferência de tom):\n${learnedStyle}`
      : base;
  }

  protected buildHumanMessage(input: string): string {
    return `Dados reais de forecast/pipeline/performance para revisão gerencial:\n${input}`;
  }

  async run(inputData: string, sessionId?: string) {
    const result = await super.run(inputData, sessionId);
    return {
      managementReview: result.output as string | undefined,
      error: result.error,
      sessionId: result.sessionId,
    };
  }
}
