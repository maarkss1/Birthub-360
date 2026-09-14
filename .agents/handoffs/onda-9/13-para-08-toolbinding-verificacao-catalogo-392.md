- De: 13 (Enxame Autônomo e Governança de Agentes de Runtime)
- Para: 08 (QA e Release — apoio designado para esta investigação)
- Onda: 9
- Status: resolvido
- Prioridade: normal

## Problema

Tarefa 4 da Onda 9 (`Onda-9-Escala.txt`) e item UNKNOWN de `01-AGENT-INVENTORY.md` (seção A.3,
última linha da tabela): "confirmar quantos dos 392 agentes do JSON normalizado têm `ToolBinding
VERIFIED` real vs. são só metadado sem capability implementada".

Reaudite (protocolo obrigatório, passo 1) antes de qualquer correção — e o reaudite muda o
enquadramento da pergunta original.

## Arquivo(s) envolvido(s)

- `src/features/job-roles/config/tool-bindings.ts` (registry real de `ToolBinding`)
- `src/features/job-roles/catalog/agents.normalized.json` (catálogo de 379 agentes canônicos —
  "392" no texto da onda é `totalSourceRecords` antes de consolidar 15 aliases)
- `src/features/job-roles/catalog/agentCapabilities.normalized.json` (391 entradas — 379 do Birth
  Hub + os 12 agentes da Célula Comercial de A.2, com sobreposição)
- `scripts/import-agent-catalog.ts`, `scripts/seed-capability-engine.ts`
- `src/features/job-roles/services/agentCatalog.service.ts`,
  `src/features/job-roles/routes/agentCatalog.routes.ts`
- `tests/integration/tool-bindings.evidence.test.ts`, `tests/integration/agent-execute.test.ts`
  (já existentes, cobrem exatamente o que a auditoria original recomendava testar)

## Alteração necessária (achados da reaudite — nenhuma mudança de código proposta)

**1) "ToolBinding VERIFIED" é uma propriedade por CAPABILITY (27 no total), não por agente do
catálogo de 379.** `ToolBinding` não é uma tabela do banco — é um registry estático em código
(`tool-bindings.ts`, decisão explícita do PROMPT 3). Existe exatamente UM `ToolBinding` relevante
para o catálogo inteiro de 379 agentes: `capabilityCode: 'agent.execute'`, `verification:
'VERIFIED'`, evidência real (`getAiModel` em `src/lib/ai/gateway/chat-model.ts`, confirmado por
`grep` que o símbolo existe e é exportado, e por `tests/integration/tool-bindings.evidence.test.ts`
que importa e confirma isso em runtime). A pergunta original ("quantos agentes têm ToolBinding
VERIFIED") tem uma resposta trivial e uniforme: **todos os 379**, porque todos compartilham o mesmo
binding de capability.

**2) A distinção real entre os 379 agentes não é ToolBinding — é `AgentVersion.systemPrompt`
existir ou não.** Confirmado lendo `import-agent-catalog.ts`: todo agente com `primaryJobRole`
recebe `RoleAgentGrant` nível EXECUTE **independente do `status`** (`BLOCKED`/`CATALOG_ONLY`/
`SOURCE_REQUIRED`/`PROMPT_READY`) — `capabilityAuthorization.service.ts` não checa `AgentDefinition.
status` em nenhum ponto (busca por `AgentDefinitionStatus`/`BLOCKED` no arquivo não retornou
nenhuma ocorrência). Confirmado também que `agentCapabilities.normalized.json` concede
`agent.execute` às 391 entradas, sem exceção (0 agentes sem essa capability).

Ou seja: **autorização passa igual para todo mundo.** O fail-closed real acontece uma camada
depois, dentro do executor genérico (`agentExecute` em `toolExecutors.ts`, PR #465): se
`AgentVersion.systemPrompt` for `null`, o executor recusa executar e nunca fabrica resposta — isso
já é coberto por teste existente (`tests/integration/agent-execute.test.ts`, bloco "(b) agente SEM
systemPrompt"), satisfazendo a recomendação #1 do `01-AGENT-INVENTORY.md` sem precisar escrever
teste novo.

**Número real e atual** (o que a auditoria original queria saber, reformulado corretamente):
`summary.withPrompt` de `agents.normalized.json` é a contagem de agentes com conteúdo executável de
verdade. Em `origin/main` neste momento: **27 de 379**. A trilha "expansão de prompt do catálogo"
desta mesma Onda 9 (lotes `fix/onda9-agent-prompts-batch1` a `batch12`, ainda não mergeados) eleva
esse número para **311 de 379** quando aplicados — os 68 restantes usam binding
`SOURCE_REQUIRED`/`FUTURE_TOOL`/`EXISTING_SERVICE` por design (fonte de dado real ausente, onda
futura ainda não decidida, ou já resolvido por serviço existente sem precisar de prompt) e
corretamente nunca recebem `AgentVersion`.

**3) A rota HTTP de disparo direto existe** — resolve a lacuna "PARTIALLY ACTIVE" da tabela A.3.
`POST /api/agents/:agentCode/run` (`agentCatalog.routes.ts`) aceita `agentCode` arbitrário do
catálogo de 379 via parâmetro de rota, e `requestedCapability` arbitrário no body, chamando
`runAgentExecution` diretamente. Recomendo à próxima atualização do inventário promover este item de
`PARTIALLY ACTIVE` para `ACTIVE`.

**4) Risco de UI anunciando disponibilidade falsa (recomendação #4 do inventário): confirmado
como risco teórico, não manifestado.** `GET /api/agents` (`listAgentDefinitions`) filtra por
`AgentDefinition.isActive` (que é `true` para todo mundo — é um flag de soft-delete, eixo diferente
de executabilidade) e **inclui o campo `status` no DTO retornado** — ou seja, o contrato já carrega
a informação necessária para o frontend distinguir `PROMPT_READY` de `CATALOG_ONLY`/`SOURCE_
REQUIRED`/`BLOCKED`. Busquei no repositório qualquer arquivo de frontend (`.tsx`/`.ts` em `src/
features`) que consuma `api/agents` — **nenhum resultado**. Não existe hoje nenhuma tela
consumindo este catálogo, então o risco apontado pela auditoria original é real *se* uma tela
futura for construída sem checar `status`, mas não existe nenhuma tela violando isso agora.

## Teste esperado

- `tests/integration/tool-bindings.evidence.test.ts` já verifica em runtime que cada `ToolBinding`
  `VERIFIED` (incluindo `agent.execute`) aponta para um símbolo real e exportado — não precisa de
  teste novo.
- `tests/integration/agent-execute.test.ts` já verifica o caminho fail-closed para um agente sem
  `systemPrompt` (bloco "(b)") e o caminho de sucesso para agentes `PROMPT_READY` (bloco "(a)",
  hoje com amostras dos lotes 1-12 da trilha de prompt) — cobre a recomendação #1 do inventário.
- Nenhum teste novo foi adicionado neste lote — é um lote de verificação/documentação, sem mudança
  de código de produção.

## Contexto adicional

**Observação de design a acompanhar (não é bug, não bloqueia nada agora):**
`AgentDefinition.status` é calculado uma única vez em `resolveStatus()` (`import-agent-catalog.ts`)
a partir do JSON estático no momento do import, e nunca é re-derivado a partir da existência real
de `AgentVersion` no banco depois disso. Hoje os dois estão sempre em sincronia porque o único jeito
de um `AgentVersion` existir é `agent.hasPrompt && agent.systemPrompt` no mesmo import — mas se
algum dia um `AgentVersion` for criado ou removido por um caminho diferente do import script (ex.:
`agentBuilder.service.ts`, o Agent Builder do PROMPT 10, que deliberadamente nunca publica sozinho
mas poderia ser usado manualmente), `status` ficaria desatualizado sem nenhum código detectando a
divergência. Não implementei nenhuma correção porque não há evidência de que isso já aconteceu —
registro aqui só para uma futura auditoria de `functional-completeness` saber que esse invariante
não é garantido por código, só por convenção de que existe um único caminho de escrita.

**Reconciliação do número "392":** o texto da onda usa 392, que é `totalSourceRecords` (registros
brutos antes de deduplicar). O número canônico de agentes distintos é 379 (`totalCanonicalAgents`,
15 aliases consolidados). `agentCapabilities.normalized.json` tem 391 entradas porque soma os 379
do catálogo Birth Hub aos 12 agentes da Célula Comercial de A.2 (com alguma sobreposição de
código entre os dois conjuntos, ex. `ldr-intelligence`/`bdr-outbound`/`bitrix-guardian`, que
`import-agent-catalog.ts` trata explicitamente como já existentes, nunca duplicados).

## Resolução

Nenhuma mudança de código de produção necessária. Achados documentados acima resolvem a
investigação pedida pelo item UNKNOWN de `01-AGENT-INVENTORY.md` seção A.3: o catálogo de 379
agentes tem exatamente 1 `ToolBinding` relevante (`agent.execute`, VERIFIED, compartilhado por
todos), a rota de disparo genérica existe e aceita `agentCode` arbitrário (upgrade de PARTIALLY
ACTIVE para ACTIVE recomendado na próxima revisão do inventário), e o risco de UI mal informada é
teórico/dormente (nenhuma tela consome o catálogo hoje). O número real de agentes com conteúdo
executável (`summary.withPrompt`) é rastreável diretamente em `agents.normalized.json` e está sendo
resolvido pela trilha paralela "expansão de prompt do catálogo" desta mesma Onda 9 (27→311 quando
os lotes 1-12 forem mergeados). Sem merge/push feito por mim — este é um handoff informativo, não
um bloqueador.
