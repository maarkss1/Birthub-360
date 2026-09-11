import { BaseAgent } from './base.agent.js';
import {
  SWARM_IDENTITY,
  SWARM_OUTPUT_CONTRACT,
  SWARM_UNTRUSTED_CONTENT_GUARD,
} from './swarm.constants.js';

/**
 * Agente Contratos & Assinatura (Célula Comercial, pacote ATLASGR_COMMERCIAL_AGENT_CELL v1.1.0,
 * id `contract-signature`).
 *
 * O pacote original classificava este agente como `BLOCKED`/risco `HIGH` ("nenhuma integração de
 * assinatura confiável encontrada") — falso: `src/shared/domain/signature.ts` (movido de
 * `src/features/cadence/domain/signature.ts` no ITEM-13 de arquitetura — módulo puro, sem dono de
 * feature) e `application/documentSignature.ts` (dono: Agente 17/18, continua em
 * `src/features/cadence/**`, não este agente) já implementam a máquina de estados real de
 * assinatura (provedor gov.br, hoje um stub de transporte documentado em
 * `GovBrSignatureProviderPort.ts`). Este agente nunca importa `documentSignature.ts` (import
 * cross-feature de `src/features/intelligence/agents/**` para `src/features/cadence/**` é
 * rejeitado pelo gate de arquitetura real — `npm run test:architecture` → dependency-cruiser,
 * `no-cross-feature-imports`) — os status válidos abaixo são copiados como literal, não
 * importados de `signature.ts` (que hoje já poderia ser importado sem violar o gate, por viver em
 * `shared/`, mas a lista é mantida literal aqui de propósito: o valor real que este comentário
 * protege é "este agente nunca chama `requestDocumentSignature`/`applySignatureStatusUpdate`", não
 * a origem do enum). Se `signature.ts` mudar esse enum, este comentário e a lista abaixo precisam
 * ser atualizados junto.
 * Este agente nunca chama `requestDocumentSignature`/`applySignatureStatusUpdate` — nunca envia
 * nem assina em nome de ninguém. `src/features/cadence/**` continua propriedade exclusiva do
 * Agente 17.
 */
export class ContractSignatureAgent extends BaseAgent {
  protected agentType = 'CONTRACT_SIGNATURE';
  protected modelName = 'local-llama3-fast';
  protected temperature = 0.1;

  protected buildSystemPrompt(learnedStyle: string | null): string {
    // Espelha `SignatureStatus` de `src/shared/domain/signature.ts` — mantido como
    // literal (não importado) por causa do limite de arquitetura descrito acima.
    const validStatuses = [
      'created',
      'sent',
      'viewed',
      'signed',
      'declined',
      'expired',
      'cancelled',
    ] as const;

    const base = `${SWARM_IDENTITY} Você é o Agente de Contratos & Assinatura — controla PRONTIDÃO e STATUS de contratos, nunca assina ou envia nada.

REGRAS INVIOLÁVEIS:
1. Use SOMENTE os dados fornecidos no contexto (oportunidade, dados legais, signatários, status de assinatura). Nunca invente signatário, prazo, template ou status.
2. Status de assinatura válidos no sistema real: ${validStatuses.join(', ')}. Nunca use um status fora desta lista, nem infira uma transição que o contexto não confirmou.
3. Você JAMAIS assina em nome de uma pessoa, nem afirma ter enviado algo — apenas relata prontidão/status e o que falta.
4. Se um dado obrigatório para emitir o contrato estiver ausente (signatário, e-mail, template, dados legais), liste isso em bloqueadores — nunca presuma um valor plausível.

**ESTRUTURA OBRIGATÓRIA DA SAÍDA:**

### ✅ Checklist de Prontidão
- [Item obrigatório 1]: [presente/ausente, conforme o contexto]
- [Item obrigatório 2]: [presente/ausente, conforme o contexto]

---

### ✍️ Signatários e Status
[Cite nome/e-mail e status atual de cada signatário, só o que o contexto trouxer]

---

### 🚫 Bloqueadores
[O que impede avançar agora — dado ausente, divergência, aprovação pendente]

---

### 🎯 Próxima Ação (requer aprovação humana)
[Qual é o próximo passo concreto — nunca "enviado"/"assinado" como fato consumado]

${SWARM_OUTPUT_CONTRACT}

${SWARM_UNTRUSTED_CONTENT_GUARD}`;

    return learnedStyle
      ? `${base}\n\nEstilo aprendido do usuário (aplique como preferência de tom):\n${learnedStyle}`
      : base;
  }

  protected buildHumanMessage(input: string): string {
    return `Dados reais da oportunidade/contrato para avaliação de prontidão e status de assinatura:\n${input}`;
  }

  async run(inputData: string, sessionId?: string) {
    const result = await super.run(inputData, sessionId);
    return {
      readinessChecklist: result.output as string | undefined,
      error: result.error,
      sessionId: result.sessionId,
    };
  }
}
