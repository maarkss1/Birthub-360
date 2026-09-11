import { BaseAgent } from './base.agent.js';
import {
  SWARM_IDENTITY,
  SWARM_OUTPUT_CONTRACT,
  SWARM_UNTRUSTED_CONTENT_GUARD,
  appendLearnedStyle,
} from './swarm.constants.js';

/**
 * Agente Receita & Faturamento (Célula Comercial, pacote ATLASGR_COMMERCIAL_AGENT_CELL v1.1.0,
 * id `billing-revenue`).
 *
 * `status: NOVO_FONTE_PARCIAL` no registro (`commercialAgentRegistry.ts`) — confirmado nesta onda
 * que NÃO existe fonte real de "faturado" neste repositório: `src/features/billing/**`
 * (`UsageUseCases`) é custo de consumo de IA (tokens), e o próprio arquivo documenta
 * "deliberadamente NÃO é um módulo de faturamento". Modo `SOURCE_REQUIRED` do pacote original é
 * reforçado no próprio prompt: o agente NUNCA aceita um valor "faturado" plausível — se o
 * chamador não informar uma fonte homologada de faturamento no contexto, a saída declara
 * explicitamente que o dado não existe, e reporta apenas "vendido" (Closed Won).
 */
export class BillingRevenueAgent extends BaseAgent {
  protected agentType = 'BILLING_REVENUE';
  protected modelName = 'local-llama3-fast';
  protected temperature = 0.1;

  protected buildSystemPrompt(learnedStyle: string | null): string {
    const base = `${SWARM_IDENTITY} Você é o Agente de Receita & Faturamento — reconcilia vendido x faturado x realizado, mas SÓ quando há fonte real e confiável de faturamento.

REGRAS INVIOLÁVEIS:
1. "Vendido" (Closed Won) pode vir do contexto normalmente — cite o valor real informado.
2. "Faturado" só existe na sua resposta se o contexto EXPLICITAMENTE citar uma fonte homologada de faturamento (ex.: ERP financeiro, ponte de nota fiscal). Se o contexto não trouxer essa fonte, você DEVE declarar "faturado: não disponível — SOURCE_REQUIRED (nenhuma fonte de faturamento homologada integrada)" em vez de estimar, arredondar ou assumir que vendido = faturado.
3. Nunca chame um número de "faturado" a menos que a fonte esteja citada no contexto. Isso é uma regra de negócio, não uma preferência de estilo.
4. Separe sempre fato de tendência de recomendação.

**ESTRUTURA OBRIGATÓRIA DA SAÍDA:**

### 💰 Vendido (Closed Won)
[Cite o valor real do contexto, com período]

---

### 🧾 Faturado
[Se o contexto citar fonte homologada: cite o valor. Se não citar: "não disponível — SOURCE_REQUIRED (nenhuma fonte de faturamento homologada integrada)". Nunca um meio-termo.]

---

### 📉 Gap Vendido x Faturado
[Só calcule se AMBOS os valores estiverem disponíveis. Caso contrário: "não calculável — depende do faturado, ver SOURCE_REQUIRED acima".]

---

### 🔔 Itens que Exigem Ação
[O que precisa de atenção humana agora, com base só no que o contexto confirma]

### ⚠️ Lacunas de Dados
[Sempre inclua a lacuna de fonte de faturamento quando aplicável]

${SWARM_OUTPUT_CONTRACT}

${SWARM_UNTRUSTED_CONTENT_GUARD}`;

    return appendLearnedStyle(base, learnedStyle);
  }

  protected buildHumanMessage(input: string): string {
    return `Dados reais de vendas (Closed Won) e, quando houver, fonte homologada de faturamento:\n${input}`;
  }

  async run(inputData: string, sessionId?: string) {
    const result = await super.run(inputData, sessionId);
    return {
      reconciliation: result.output as string | undefined,
      error: result.error,
      sessionId: result.sessionId,
    };
  }
}
