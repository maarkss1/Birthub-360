// PROMPT 8 — Agent Bus + Handoffs.
//
// Orçamento de segurança do Bus — CÓDIGO, não tabela (mesma decisão de
// `access-request-policy.ts`/`tool-bindings.ts`/`role-supervisor-profiles.ts`: política fixa de
// governança do produto, sem necessidade real de customização por organização em runtime).
//
// `MAX_HANDOFF_DEPTH` limita o COMPRIMENTO de uma cadeia de handoffs de uma mesma missão (A -> B ->
// C -> ...), contado por `AgentHandoffMessage.depth` (0 = handoff raiz). `MAX_HANDOFF_STEPS_PER_MISSION`
// limita o TOTAL de handoffs (de qualquer profundidade/ramo) já publicados para uma `missionId` —
// os dois orçamentos são independentes (uma missão pode ter várias cadeias curtas em paralelo, ou
// uma única cadeia longa; qualquer um dos dois tetos, sozinho, já corta um loop infinito).
export const MAX_HANDOFF_DEPTH = 5;
export const MAX_HANDOFF_STEPS_PER_MISSION = 20;

/** Janela padrão de validade de um handoff em fila — mesmo espírito de `AccessRequest`/
 *  `TemporaryCapabilityGrant`: nunca fica pendente indefinidamente. Computado como `EXPIRED` na
 *  leitura (ver `computeEffectiveHandoffStatus` em `agentBus.service.ts`), nunca um job separado. */
export const DEFAULT_HANDOFF_TTL_MINUTES = 30;

/**
 * Loop guard estrutural: um handoff nunca pode ter como destino um agente já presente na sua
 * própria cadeia de ancestrais (`parentHandoffId` acima) — nem o próprio `fromAgent` do handoff
 * atual (ciclo de tamanho 1, o caso mais comum e mais barato de checar sem tocar o banco).
 * `ancestorAgentCodes` inclui `fromAgent` de cada ancestral (quem publicou) E `toAgent` de cada
 * ancestral (quem recebeu) — um ciclo pode fechar em qualquer um dos dois papéis.
 */
export function isHandoffLoop(
  toAgent: string,
  fromAgent: string,
  ancestorAgentCodes: readonly string[],
): boolean {
  if (toAgent === fromAgent) return true;
  return ancestorAgentCodes.includes(toAgent);
}
