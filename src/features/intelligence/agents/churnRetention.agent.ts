import { BaseAgent } from './base.agent.js';
import {
  appendLearnedStyle,
  SWARM_IDENTITY,
  SWARM_OUTPUT_CONTRACT,
  SWARM_UNTRUSTED_CONTENT_GUARD,
} from './swarm.constants.js';

/**
 * Agente Churn & Retenção (Célula Comercial, pacote ATLASGR_COMMERCIAL_AGENT_CELL v1.1.0,
 * id `churn-retention`).
 *
 * Importar `ChurnPredictionService` diretamente (`src/features/analytics/services/
 * churn-prediction.service.ts`) foi tentado nesta onda e REJEITADO pelo gate de arquitetura real
 * (`npm run test:architecture` → dependency-cruiser, `no-cross-feature-imports`). Por isso este
 * agente segue o mesmo padrão de `BDRAgent`/`CRMAgent`: recebe (via `run(inputData)`) o resultado
 * JÁ CALCULADO pelo motor real (`churnRisk`, `healthScore`, fatores de risco, playbook de
 * retenção) formatado como texto pelo chamador — este agente NUNCA recalcula o score de churn,
 * apenas prioriza contas e traduz o resultado em plano de ação e handoff. Se o contexto não trouxer
 * um score já calculado, o agente deve declarar isso como lacuna, nunca inventar um número.
 */
export class ChurnRetentionAgent extends BaseAgent {
  protected agentType = 'CHURN_RETENTION';
  protected modelName = 'local-llama3-fast';
  protected temperature = 0.2;

  protected buildSystemPrompt(learnedStyle: string | null): string {
    const base = `${SWARM_IDENTITY} Você é o Agente de Churn & Retenção — prioriza contas em risco e propõe plano de ação, SEM recalcular o risco de churn (isso já vem pronto de um motor real).

REGRAS INVIOLÁVEIS:
1. Use SOMENTE o churnRisk/healthScore/fatores de risco JÁ FORNECIDOS no contexto. Nunca calcule ou ajuste esses números — se o contexto não trouxer um score, declare a lacuna em vez de estimar.
2. Separe fato (o que o motor de churn já calculou) de recomendação (sua priorização/plano).
3. Receita em risco só aparece se o contexto citar o MRR/valor da conta — nunca estime.
4. Se faltar dado para priorizar entre contas, declare isso explicitamente.

**ESTRUTURA OBRIGATÓRIA DA SAÍDA:**

### 🚨 Risco (já calculado pelo motor real)
- **Nível:** [cite exatamente o valor do contexto] | **Health Score:** [cite exatamente o valor do contexto]

---

### 🔎 Fatores de Risco
[Liste apenas os fatores citados no contexto]

---

### 💵 Receita em Risco
[Só se o contexto trouxer o valor — caso contrário "não disponível"]

---

### 🛟 Plano de Retenção Priorizado
[Ordene as ações do playbook fornecido por urgência/impacto, com responsável quando possível]

### ⚠️ Lacunas de Dados
[O que não pôde ser avaliado por falta de dado, e qual fonte deveria fornecê-lo]

${SWARM_OUTPUT_CONTRACT}

${SWARM_UNTRUSTED_CONTENT_GUARD}`;

    return appendLearnedStyle(base, learnedStyle);
  }

  protected buildHumanMessage(input: string): string {
    return `Resultado real de análise de churn (já calculado) para priorização e plano de retenção:\n${input}`;
  }

  async run(inputData: string, sessionId?: string) {
    const result = await super.run(inputData, sessionId);
    return {
      retentionPlan: result.output as string | undefined,
      error: result.error,
      sessionId: result.sessionId,
    };
  }
}
