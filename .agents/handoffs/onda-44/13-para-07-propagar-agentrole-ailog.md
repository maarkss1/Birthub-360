- De: Agente 13 (Enxame Autônomo e Governança de Agentes)
- Para: Agente 07 (IA e Automações)
- Onda: 44
- Status: aberto (bloqueado até o Agente 01/01A criar a coluna — ver handoff irmão)
- Prioridade: média (ACH-13-03, sev P2, auditoria report-atualizado.html)

## Problema

O painel de SLO por agente (`getSwarmSloSnapshot`,
`src/features/intelligence/services/swarmScheduler.service.ts`) não consegue fatiar custo/latência
de modelo por papel do enxame (SDR/BDR/CLOSER/CRM/OPS) porque `AILog` não registra qual agente
originou cada chamada de IA — só `organizationId`. Abri
`.agents/handoffs/onda-44/13-para-01-ailog-coluna-agentrole.md` propondo ao Agente 01/01A uma coluna
nova `AILog.agentRole` (nullable, mesmo conjunto de valores de `AIPendingAction.agentRole`). Esta
segunda metade do problema é sua: **depois que a coluna existir**, algo no pipeline de chamada de IA
precisa efetivamente preencher esse valor — hoje nada propaga qual agente disparou a chamada até o
ponto onde o log é gravado.

## Onde o log é gravado hoje

`src/lib/ai/usage-log.ts` (`logAiUsage`) é o único ponto real de escrita em `AILog` a partir do
runtime de IA (fora do worker de transcrição, que é um caso separado — ver nota abaixo). Ele já
resolve `organizationId` do jeito relevante aqui: lendo `requestContext.getStore()?.tenantId`
(`src/lib/async-context.ts`, `AsyncLocalStorage`), não recebendo o tenant como parâmetro explícito
de cada chamador. `AiUsageLogInput` (`src/lib/ai/gateway/types.ts`) hoje não carrega nenhum campo de
agente.

```ts
// src/lib/ai/usage-log.ts, forma atual
export const logAiUsage = async (input: AiUsageLogInput): Promise<void> => {
  const organizationId = requestContext.getStore()?.tenantId ?? null;
  const data = {
    model: input.model,
    tokens: input.usage.totalTokens,
    cost: estimateCostUsd(input.model, input.usage),
    latencyMs: input.latencyMs,
    promptId: input.promptId,
    organizationId,
  };
  // ...
};
```

## Onde o papel do agente já é conhecido em memória

`BaseAgent` (`src/features/intelligence/agents/base.agent.ts`, linha ~86) é quem chama
`logAiUsage(...)` depois de obter a resposta do modelo via `getAiModel`/gateway. Toda subclasse
concreta (`sdrQualification.agent.ts`, `sdrOutboundDraft.agent.ts`, `ops.agent.ts`, etc., registradas
em `commercialAgentRegistry.ts`) e `supervisor.agent.ts` sabem seu próprio papel em tempo de
execução — é a mesma informação que `AIPendingAction.agentRole` já grava quando o agente propõe uma
ação. Duas opções, ambas viáveis a partir daí:

1. **Parâmetro explícito**: adicionar `agentRole?: string` a `AiUsageLogInput`
   (`src/lib/ai/gateway/types.ts`) e passá-lo no ponto de chamada de `logAiUsage` dentro de
   `base.agent.ts`, vindo de um campo que a subclasse já define (`this.role` ou equivalente — não
   audité o nome exato do campo interno de `BaseAgent`, mas cada subclasse concreta já se identifica
   para o registry).
2. **`requestContext`**: estender `RequestContext` (`src/lib/async-context.ts`) com um campo novo
   dedicado (ex.: `swarmAgentRole?: string`) e fazer o ponto que invoca o agente
   (`autonomyRoleRunner.service.ts` ou onde o loop do enxame decide qual agente rodar) chamar
   `requestContext.run({ ...store, swarmAgentRole: role }, () => agent.run(...))`, e `logAiUsage` ler
   de lá — mesmo padrão já usado para `tenantId`.
   **Atenção**: `RequestContext` já tem um campo `role?: string` (linha 6) usado no fluxo de
   autenticação/Better Auth (papel do usuário: ADMIN/VISUALIZADOR etc., `User.role`) — **não é o
   mesmo conceito** que o papel do enxame (SDR/BDR/CLOSER/CRM/OPS). Reusar esse campo misturaria os
   dois eixos; um nome novo e distinto evita a colisão.

Não tenho preferência forte entre as duas opções — parâmetro explícito é mais rastreável e testável
isoladamente (sem depender de contexto assíncrono ambiente, que já causou um bug real de
visibilidade nesse mesmo arquivo, ver o comentário grande em `async-context.ts` sobre a onda 9), mas
`requestContext` evita alterar a assinatura de `AiUsageLogInput` e todos os chamadores atuais. Decisão
de arquitetura de `src/lib/ai/**` é sua (`src/lib/ai/AGENTS.md`).

## Nota — segundo ponto de escrita em `AILog`

`src/features/copiloto-ia/jobs/transcribeConversation.worker.ts:68` também grava em `AILog`
diretamente (fora do `usage-log.ts`). Se ele também deveria ganhar `agentRole` (provavelmente não —
é transcrição, não uma decisão de um papel do enxame comercial) fica a seu critério; sinalizando
aqui só para não passar despercebido ao decidir o formato final da coluna.

## Teste esperado

- Ao menos um teste unitário cobrindo que `logAiUsage` (ou o novo caminho escolhido) grava
  `agentRole` corretamente quando a chamada vem de dentro de um agente do enxame, e `null` quando
  vem de um caminho sem agente identificável (ex.: chat direto, telemetria interna) — mesma regra de
  estado vazio explícito já usada no resto do projeto, nunca um valor de fallback inventado.
- `npx tsc --noEmit`, `npm run lint`, testes relevantes de `src/lib/ai/**` e
  `src/features/intelligence/agents/**`, `npm run build` (gate mínimo de `src/lib/ai/AGENTS.md`).

## Depois que isso existir (meu escopo, Agente 13)

Volto a `getSwarmSloSnapshot` e troco o `prisma.aILog.aggregate(...)` único por
`prisma.aILog.groupBy({ by: ['agentRole'], ... })`, preenchendo `SwarmCostSnapshot` por papel do
enxame em vez de só por organização.

## Contexto adicional

Item de auditoria ACH-13-03 (`report-atualizado.html`, sev P2). Depende de
`.agents/handoffs/onda-44/13-para-01-ailog-coluna-agentrole.md` (Agente 01/01A) ser resolvido
primeiro — a coluna precisa existir antes de qualquer código aqui poder gravar nela. Nenhum arquivo
de código foi alterado nesta investigação, só este handoff.
