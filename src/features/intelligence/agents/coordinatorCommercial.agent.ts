import { BaseAgent } from './base.agent.js';
import {
  SWARM_IDENTITY,
  SWARM_OUTPUT_CONTRACT,
  SWARM_UNTRUSTED_CONTENT_GUARD,
  appendLearnedStyle,
} from './swarm.constants.js';

/**
 * Agente Coordenador Comercial (Célula Comercial, pacote ATLASGR_COMMERCIAL_AGENT_CELL v1.1.0,
 * id `coordinator-commercial`).
 *
 * Papel novo (não existia como agente de swarm) classificado como risco MÉDIO de freeze pelo
 * `REPO_REALITY_CHECK.md` do pacote — pode ser lido como reorganização do que o scheduler/Ops já
 * fazem (permitido) ou como camada de gestão nova (bloqueada). Implementado nesta onda como
 * NARRAÇÃO apenas (lê e organiza o que já existe: alertas, aging, indicadores), sem nenhuma ação
 * própria de orquestração de agente — `agent_orchestration` fica como capacidade mapeada, não
 * implementada, até essa decisão de escopo ser tomada explicitamente (ver handoff da onda).
 */
export class CoordinatorCommercialAgent extends BaseAgent {
  protected agentType = 'COORDINATOR';
  protected modelName = 'local-llama3-fast';
  protected temperature = 0.2;

  protected buildSystemPrompt(learnedStyle: string | null): string {
    const base = `${SWARM_IDENTITY} Você é o Coordenador Comercial — responsável por operar o ritmo diário do time, citando apenas dados reais já calculados (alertas, aging, indicadores, atividades vencidas).

REGRAS INVIOLÁVEIS:
1. Use SOMENTE os dados fornecidos no contexto. Nunca invente prazo, responsável ou pendência.
2. Você não decide nem executa nada por conta própria — sua saída é uma fila priorizada para humanos agirem.
3. Separe sempre fato de recomendação.
4. Se faltar um dado para priorizar corretamente, declare a lacuna em vez de presumir.

**ESTRUTURA OBRIGATÓRIA DA SAÍDA:**

### 📋 Fila do Dia (priorizada)
[Liste os itens mais urgentes do contexto, cada um com responsável e prazo quando disponíveis]

---

### 🚧 Gargalos Identificados
[Aponte desvios reais citados no contexto — SLA estourado, aging crítico, follow-up sem próxima ação]

---

### 📈 Indicadores-Chave do Dia
[Cite os números do contexto, sem recalcular nada]

---

### 🔺 Escalonamentos Necessários
[O que precisa da atenção de um gestor humano agora, e por quê]

### ⚠️ Lacunas de Dados
[O que não pôde ser avaliado por falta de dado, e qual fonte deveria fornecê-lo]

${SWARM_OUTPUT_CONTRACT}

${SWARM_UNTRUSTED_CONTENT_GUARD}`;

    return appendLearnedStyle(base, learnedStyle);
  }

  protected buildHumanMessage(input: string): string {
    return `Dados reais do dia (alertas, aging, atividades, indicadores) para controle do ritmo comercial:\n${input}`;
  }

  async run(inputData: string, sessionId?: string) {
    const result = await super.run(inputData, sessionId);
    return {
      dailyControl: result.output as string | undefined,
      error: result.error,
      sessionId: result.sessionId,
    };
  }
}
