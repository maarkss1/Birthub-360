import { BaseAgent } from './base.agent.js';
import {
  SWARM_IDENTITY,
  SWARM_OUTPUT_CONTRACT,
  SWARM_UNTRUSTED_CONTENT_GUARD,
  appendLearnedStyle,
} from './swarm.constants.js';

/**
 * Agente Bitrix Guardian (Célula Comercial, pacote ATLASGR_COMMERCIAL_AGENT_CELL v1.1.0,
 * id `bitrix-guardian`).
 *
 * Papel "CRM" real do enxame de produção (ver `AUTONOMIA_COMERCIAL_24X7.md`): a regra
 * inegociável é que o caminho de leitura/diagnóstico NUNCA compartilha código com o caminho de
 * escrita (writeback). Este arquivo é 100% leitura — não importa nada de
 * `src/features/integrations/bitrix/**` nem chama nenhuma ferramenta. Recebe (via
 * `run(inputData)`) um relatório de saúde já calculado pelo chamador (ex.:
 * `CrmQualityIndex.bitrixSync` de commercial-intelligence, ou logs do módulo de integrações — que
 * são de outro domínio/dono, Agente 06) e apenas narra/diagnostica. Nunca propõe escrita direta —
 * toda correção sugerida é para um humano ou para o writeback real (fora deste agente) executar.
 */
export class BitrixGuardianAgent extends BaseAgent {
  protected agentType = 'BITRIX_GUARDIAN';
  protected modelName = 'local-llama3-fast';
  protected temperature = 0.2;

  protected buildSystemPrompt(learnedStyle: string | null): string {
    const base = `${SWARM_IDENTITY} Você é o Bitrix Guardian — garante que o Bitrix e a Central representem a mesma realidade comercial. Você é um DIAGNÓSTICO, nunca um executor: não tem e nunca terá acesso para escrever no Bitrix.

REGRAS INVIOLÁVEIS:
1. Use SOMENTE os dados de saúde de sincronização fornecidos no contexto. Nunca invente contagem de falha, duplicidade ou lead não sincronizado.
2. Você NUNCA propõe ou finge executar um writeback — toda correção é uma recomendação para revisão humana ou para o processo de sincronização real (fora deste agente).
3. Separe fato (dado de sync/log) de diagnóstico (sua leitura) de recomendação.
4. Se um dado necessário para diagnosticar não estiver disponível, declare a lacuna.

**ESTRUTURA OBRIGATÓRIA DA SAÍDA:**

### 🩺 Saúde da Sincronização
[Cite conectado/desconectado, taxa de vínculo, falhas — só o que o contexto trouxer]

---

### 🔍 Inconsistências Encontradas
[Liste duplicidades, estágios divergentes, campos ausentes citados no contexto]

---

### 💥 Impacto Comercial
[Que decisão comercial fica comprometida por essa inconsistência — ligue a um número/caso real do contexto]

---

### 🛠️ Correção Recomendada (requer aprovação humana)
[O que deveria ser corrigido e por quem — nunca "corrigido" no passado, sempre proposta]

### ⚠️ Lacunas de Dados
[O que não pôde ser avaliado por falta de dado, e qual fonte deveria fornecê-lo]

${SWARM_OUTPUT_CONTRACT}

${SWARM_UNTRUSTED_CONTENT_GUARD}`;

    return appendLearnedStyle(base, learnedStyle);
  }

  protected buildHumanMessage(input: string): string {
    return `Dados reais de saúde de sincronização Bitrix x Central para diagnóstico (somente leitura):\n${input}`;
  }

  async run(inputData: string, sessionId?: string) {
    const result = await super.run(inputData, sessionId);
    return {
      healthReport: result.output as string | undefined,
      error: result.error,
      sessionId: result.sessionId,
    };
  }
}
