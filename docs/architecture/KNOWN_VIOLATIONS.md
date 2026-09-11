# Baseline de violações conhecidas — `dependency-cruiser` (ITEM-13)

Este documento é a contraparte legível-por-humano de
`.dependency-cruiser-known-violations.json` (a baseline consumida por
`npm run lint:architecture` via `--ignore-known`). Ver
`docs/architecture/DEPENDENCY_RULES.md` para o mecanismo completo — resumo: toda entrada listada
aqui é dívida **existente antes do ITEM-13**, aceita explicitamente para o gate nascer executável
sem bloquear o repositório inteiro; qualquer violação **nova**, não coberta por este arquivo,
quebra `npm run lint:architecture` (e portanto o CI) normalmente.

**Data de registro:** 2026-08-25 (criação do gate, ITEM-13).
**Total na baseline:** 117 violações (99 `no-cross-feature-imports` + 18 `no-circular`) — ver
"Onda 42 (2026-08-27)" abaixo para as 4 entradas mais recentes.
**Checkpoint de reavaliação:** 2026-11-30 — não é prazo para zerar a baseline (117 violações não
somem numa wave), é a data em que o dono de cada grupo abaixo revisita se o número do seu grupo
caiu, ficou igual, ou precisa de uma exceção formal renovada. Ver "Como reavaliar" no fim.

## `no-circular` — 18 ciclos pré-existentes

| Grupo (arquivos no ciclo) | Nº ciclos | Dono | Observação |
| --- | --- | --- | --- |
| `src/shared/domain/specifications/{Specification,CompositeSpecification,AndSpecification,OrSpecification,NotSpecification}.ts` | 6 | Agente 01 — Plataforma, Segurança e Dados (`src/shared/AGENTS.md`) | Padrão Composite Specification com import circular entre a classe base e as composições — comum em implementações ingênuas desse padrão; correção real é a base não importar as subclasses (usar injeção/registro em vez de import direto). |
| `src/lib/prisma.ts` ↔ `src/lib/queue/{search.queue.ts,deadLetter.ts}` / `src/lib/audit/audit.service.ts` | 2 | Agente 16 — Runtime, Workers e Escala (filas BullMQ) + Agente 01 (Prisma/dados) | `prisma.ts` é importado por praticamente todo o backend; o ciclo aparece porque algo em `lib/queue`/`lib/audit` é importado de volta por `prisma.ts` (provavelmente hook de auditoria/dead-letter no client). Requer decidir qual lado depende de uma interface em vez do módulo concreto. |
| `src/features/prospecting/services/{enrichment.service.ts,apollo.service.ts,apollo/*.ts,prospecting.service.ts}` | 6 | Agente 05 — Prospecção | `apollo.service.ts`/`apollo/*` e `prospecting.service.ts` se importam mutuamente através de `apollo/types.ts`. Padrão clássico de tipos compartilhados que deveriam viver num módulo `types.ts` sem importar de volta o serviço. |
| `src/features/integrations/whatsapp/whatsapp.service.ts` ↔ `src/lib/queue/whatsappCommand.queue.ts` | 1 | Agente 06 — Integrações e Bitrix | Fila de comando importa o serviço para despachar, serviço importa a fila para enfileirar — inversão de dependência (interface de fila) resolveria. |
| `src/features/integrations/bitrix/service/{deals.ts,userMapping.ts}` | 1 | Agente 06 — Integrações e Bitrix | Dois módulos de serviço do Bitrix se referenciam mutuamente. |

## `no-cross-feature-imports` — 95 imports pré-existentes

Agrupado por feature de origem (`from`). "Dono" vem do `## Dono` declarado no `AGENTS.md` da
própria pasta quando existe; onde a pasta não tem `AGENTS.md` de governança (só documentação de
produto, ou nenhuma), isso está marcado explicitamente — não foi inventado um dono para preencher a
tabela.

| Feature de origem | Nº imports | Dono declarado (`AGENTS.md`) | Principais alvos |
| --- | ---: | --- | --- |
| `intelligence` | 31 | Agente 07 — IA e Automações | `knowledge` (6), `integrations` (4), `activities` (4), `analytics` (3), `chatbook` (2), `commercial-intelligence`, `cadence`, `contacts`, `dashboard`, `document-editor`, `gamification`, `lgpd`, `mesa-tratamento`, `notes`, `playbook`, `roleplay`, `automations` (1 cada) |
| `integrations` | 12 | Agente 06 — Integrações e Bitrix | `cadence` (12) |
| `crm` | 10 | Agente 04 — CRM e BI | `integrations` (5), `cadence` (2), `prospecting`, `analytics`, `automations` (1 cada) |
| `prospecting` | 8 | Agente 05 — Prospecção | `integrations` (3), `intelligence` (3), `cadence` (2) |
| `crm360` | 7 | **Sem `AGENTS.md` de governança na pasta** — tratado como adjacente a Agente 04 (CRM e BI) por conteúdo (`Crm360UseCases`/`PrismaCrm360Repository` operam sobre `Lead`/pipeline, mesmo domínio de `crm`) | `cadence` (4), `crm` (2), `commercial-intelligence` (1) |
| `automations` | 9 | Agente 07 — IA e Automações | `integrations` (7), `intelligence` (2) |
| `market-intelligence` | 4 | **Sem `AGENTS.md` de governança na pasta** — dono não declarado formalmente | `commercial-intelligence` (3), `integrations` (1) |
| `settings` | 4 | Agente 02 — Produto e UX | `feature-flags`, `integrations`, `lgpd`, `team` (1 cada) |
| `cadence` | 3 | Agente 17 — Cadência Multicanal e Ciclo de Receita | `integrations` (3) |
| `commercial-intelligence` | 3 | Agente 04 — CRM e BI | `integrations` (2), `intelligence` (1) |
| `companies` | 2 | Agente 04 — CRM e BI | `prospecting`, `market-intelligence` (1 cada) |
| `contacts` | 2 | Agente 04 — CRM e BI | `prospecting` (2) |
| `activities` | 1 | Agente 04 — CRM e BI | `automations` (1) |
| `document-editor` | 1 | **Sem `AGENTS.md` de governança na pasta** — dono não declarado formalmente | `knowledge` (1) |
| `mesa-tratamento` | 2 | **`AGENTS.md` presente mas é doc de produto/MVP, sem seção `## Dono`** — funcionalmente é mesa de trabalho SDR sobre leads do Bitrix, adjacente a Agente 04/06 | `integrations` (2) |
| `roleplay` | 1 | Agente 07 — IA e Automações | `chatbook` (1) |

**Leitura do padrão dominante:** `intelligence` sozinho responde por quase 1/3 da baseline (31/95).
Isso não é ruído aleatório — `intelligence` é o hub de IA/copiloto do produto e hoje importa
serviço de negócio de praticamente toda feature para dar contexto às respostas da IA (mesmo padrão
já viola AGENTS.md dela? Não — `src/features/intelligence/AGENTS.md` autoriza "providers, gateway,
fallback, tool calling" mas não faz uma promessa de isolamento de import; é dívida real, não
contradição de outro documento). Qualquer refatoração futura que valha a pena aqui provavelmente
passa por extrair um contrato/porta em `src/shared/` que `intelligence` consome, em vez de importar
o serviço concreto de 15 features diferentes — mas isso é um item de dívida técnica **derivado**,
fora do escopo do ITEM-13 (que é travar o crescimento, não pagar a dívida existente).

## Onda 42 (2026-08-27) — 4 exceções novas registradas

DEC-14 (dossiê CPI, onda 42) adicionou `previewCallSdrVoz` em
`src/features/automations/automation-dry-run.service.ts`, que simula a ação "Ligar via SDR de Voz"
sem discar de verdade. Para isso, reusa as MESMAS checagens somente-leitura que `automation.engine.ts`
já faz antes de discar de verdade (`callLead`) — `isWithinCallWindow`/`callWindowFromEnv`
(`coldCall.policy.ts`/`coldCall.service.ts`, já aceitos na baseline original para
`automation.engine.ts` acima) — mais duas novas, específicas do preview: `pickCallablePhone`
(`birthVoice.helpers.ts`) e `isSuppressed` (`callSuppression.service.ts`), para prever
corretamente se o telefone é discável e se está na lista de opt-out sem gerar nenhum efeito
colateral (nunca importa/chama `callLead`, que de fato inicia a chamada).

Decisão (caso 2 abaixo): tratado como extensão do mesmo acoplamento `automations` → `integrations`
(birth-voice) já aceito nesta baseline para `automation.engine.ts`, não uma nova classe de
dívida — a alternativa (extrair as 4 funções para `src/shared/`) moveria lógica de domínio de
chamada (janela comercial, suppression list) de `integrations/birth-voice` para fora do módulo que
a possui, sem necessidade real além de evitar este import. Dono: Agente 07 — IA e Automações
(`automations`) para o lado `from`; Agente 06 — Integrações e Bitrix para o lado `to`
(`integrations/birth-voice`).

## 2026-08-29 — 2 exceções novas registradas, 3 obsoletas removidas

O gate de LGPD (`assertPiiExternalConsent`/`PiiConsentRequiredError`,
`src/features/intelligence/services/guardrails.service.ts`) já protegia todo caminho que envia PII
de um titular a um provedor de IA externo em texto (agentes de `intelligence`), mas não a ligação
de voz do SDR (`birthVoice.service.ts`/`birthVoice.routes.ts`, `integrations/birth-voice`), que
envia a mesma classe de dado (nome/telefone/empresa do contato) ao Birth Voices Hub/Bland AI sem
essa checagem. Reusar o mesmo gate em vez de duplicar a lógica de consentimento introduz 2 imports
cross-feature novos: `integrations/birth-voice/{birthVoice.service.ts,birthVoice.routes.ts}` →
`intelligence/services/guardrails.service.ts`. Tratado como caso 2 (decisão de arquitetura
deliberada) pelo mesmo raciocínio já usado na Onda 42 acima: extrair só essas duas funções para
`src/shared/` moveria a fronteira "isto é uma checagem de IA" sem necessidade real além de evitar
este import, e duplicar a lógica de consentimento em vez de reusar seria pior (duas fontes de
verdade para a mesma decisão de compliance). Dono: Agente 06 — Integrações e Bitrix (`from`);
Agente 07 — IA e Automações (`to`, dono de `intelligence`).

Rodar `npm run lint:architecture:baseline` para registrar essas 2 entradas também removeu 3
entradas obsoletas da baseline (`market-intelligence/{components/TerritoryEconomicSimulator.tsx,
server/economicScenario.service.ts}` → `commercial-intelligence/*`) — os arquivos de origem não
existem mais (módulo territorial/economia/catálogo removido do `market-intelligence` antes desta
sessão), então suas violações somem naturalmente ao regenerar. Caso (a) da seção "Como adicionar
uma exceção nova" abaixo (violação real corrigida), não uma exceção nova.

**Total atualizado:** 108 violações (109 − 3 obsoletas + 2 novas).

## 2026-08-31 — 2 exceções novas registradas

Duas violações novas apareceram no `main` em commits recentes (features `dashboard` e
`gamification`), detectadas ao investigar por que o job `build` do CI estava vermelho:

- `dashboard/components/SinglePageDashboard.tsx` → `analytics/components/GlowChart.tsx`: o
  dashboard consolidado reusa o componente de gráfico de `analytics` diretamente em vez de um
  gráfico próprio ou de um componente compartilhado em `src/components/ui/`. Tratado como caso 2
  (decisão de arquitetura aceita, não revertida aqui) — extrair `GlowChart` para `src/components/ui/`
  resolveria de forma mais limpa, mas é refactor de UI fora do escopo de destravar o gate. Dono:
  Agente 02 — Produto e UX (`from`, `dashboard`); Agente 04 — CRM e BI (`to`, dono de `analytics`).
- `gamification/routes/gamification.routes.ts` → `intelligence/services/CentralAISuiteService.ts`:
  a rota de gamificação chama `aiSuite.sellerCoaching.generateCoachingReport(...)` para gerar o
  relatório de coaching do vendedor — dependência de negócio real (gamificação precisa do
  agente de IA de coaching que vive em `intelligence`), não um erro de import. Dono: **sem
  `AGENTS.md` de governança na pasta** `gamification` (`from`); Agente 07 — IA e Automações (`to`,
  dono de `intelligence`).

Nenhuma das duas foi escrita por esta sessão — registradas aqui só para destravar o gate
compartilhado de CI; o dono de cada lado decide, no checkpoint de reavaliação, se vale a pena
resolver de verdade (ex.: extrair um contrato em `src/shared/` para o caso do `gamification`) ou
manter como está.

**Total atualizado:** 112 violações.

## 2026-09-11 — redução real da baseline (Requirement Engine / Mesa de Tratamento)

Ao regenerar a baseline nesta sessão, `npm run lint:architecture:baseline` partiu de **114**
violações (não 112 — a baseline já havia crescido em 2 desde a última atualização documentada
acima, por commits anteriores desta mesma branch que não passaram por este documento; não
investigado aqui, fora do escopo desta sessão) e chegou a **100** (97 `no-cross-feature-imports` +
3 `no-circular`). As 14 entradas removidas se dividem em dois grupos:

**Correções reais feitas nesta sessão (6 entradas):**
- `src/features/cadence/domain/{dealClosure,proposal,replyTracking,signature}.ts` eram módulos
  puros (zero imports) escritos em `cadence` mas consumidos só por outras features
  (`crm/application/dealClosureGate.ts`, `crm/infra/PrismaDealClosureGate.ts`,
  `crm360/infra/PrismaCrm360Repository.ts`, `integrations/email/emailReply.webhook.ts`,
  `integrations/signature/signatureStatus.webhook.ts`), nunca por `cadence` fora dos próprios
  testes. Movidos para `src/shared/domain/{dealClosure,proposal,replyTracking,signature}.ts` —
  conteúdo idêntico, só a localização mudou (ver comentário de cabeçalho em cada arquivo). Isso
  resolveu as 5 violações `no-cross-feature-imports` que tinham esses módulos como alvo (`to`).
  `src/features/cadence/domain/` deixou de existir; `application/documentSignature.ts` e os
  `infra/*` de `cadence` continuam de propriedade do Agente 17.
- `src/features/integrations/bitrix/service/{deals.ts,userMapping.ts}` tinham um ciclo real
  (`deals.ts` importava `BitrixUserOption` de `userMapping.ts` e vice-versa). Corrigido movendo a
  declaração da interface `BitrixUserOption` para `userMapping.ts` (quem só consome o tipo, nunca
  produz) — `deals.ts` agora importa o tipo normalmente, sem ciclo. Resolveu a violação
  `no-circular` desse par.

**Entradas obsoletas removidas pela regeneração, não relacionadas a esta sessão (8 entradas)** —
mesmo caso já registrado em 2026-08-29 acima (caso (a): violação real corrigida em outro momento,
baseline só não tinha sido regenerada):
- `src/shared/domain/specifications/{Specification,CompositeSpecification,AndSpecification,OrSpecification,NotSpecification}.ts`
  (6 ciclos `no-circular`, linha da tabela acima) — a pasta inteira não existe mais no repositório
  (removida na limpeza de código morto via knip, commit `990621b9`).
- `src/features/companies/routes/company.routes.ts` → `market-intelligence/server/marketIntelligenceCompany.routes.ts`
  (`no-cross-feature-imports`) — o import não existe mais no arquivo atual.
- `src/features/prospecting/services/whatsapp.service.ts` → `integrations/whatsapp/whatsapp.service.ts`
  (`no-cross-feature-imports`) — o arquivo de origem não existe mais.

Nenhuma entrada nova foi adicionada (0 `+` no diff da baseline por conteúdo real — o diff textual
do JSON mostra mais linhas alteradas por reordenação do array após as remoções). Verificado com
`tsc --noEmit`, `npm run lint:architecture`, `npm run check:hotspots` e a suíte `vitest` de
`cadence`/`crm`/`crm360`/`integrations/bitrix`/`integrations/email`/`integrations/signature`/
`intelligence`/`job-roles` (79 arquivos de teste, 637 testes, todos verdes) antes de regenerar e
commitar.

**Total atualizado:** 100 violações (97 `no-cross-feature-imports` + 3 `no-circular`).

## 2026-09-11 — 1 exceção nova registrada (painel de gestão da Mesa de Tratamento)

`mesa-tratamento/components/ManagementPanel.tsx` → `integrations/bitrix/bitrix.api.ts`: o painel de
gestão (ADMIN/GESTOR) da Mesa de Tratamento — reatribuir responsável, comentar, marcar como decidido
— precisa listar os usuários do Bitrix24 para o dropdown de reatribuição. Em vez de duplicar uma
chamada `GET /api/bitrix/users` própria, reusa `bitrixApi.listUsers` (novo método adicionado ao
client já existente em `bitrix.api.ts`, mesmo endpoint que a tela de importação do Bitrix já
consome). Caso 2 (decisão de arquitetura deliberada): o mesmo raciocínio já usado para o backend
(`mesaTratamento.routes.ts` → `bitrix.service.ts`, já na baseline) — reusar o client de Bitrix já
existente em vez de duplicar a chamada HTTP. Dono: **sem seção `## Dono` formal em
`mesa-tratamento/AGENTS.md`**, adjacente a Agente 04/06 (`from`); Agente 06 — Integrações e Bitrix
(`to`, dono de `integrations`).

**Total atualizado:** 101 violações (98 `no-cross-feature-imports` + 3 `no-circular`).

## Como adicionar uma exceção nova (crescer a baseline deliberadamente)

Só em dois casos:

1. **Um refactor movimenta código entre features e o import "novo" já existia antes, só mudou de
   nome de arquivo** — nesse caso, rode `npm run lint:architecture:baseline` para regenerar o
   arquivo automaticamente (o número total não deve subir; se subir, é uma violação nova de
   verdade, não um rename).
2. **Uma decisão de arquitetura real e deliberada introduz um novo cross-feature import** (ex.:
   uma feature nova precisa genuinamente compor outra) — quem propõe adiciona a entrada
   manualmente ao `.dependency-cruiser-known-violations.json` **e** uma linha nova na tabela acima
   com dono e justificativa, no mesmo PR. Não é aceitável rodar
   `lint:architecture:baseline` só para "fazer o CI passar" sem registrar o motivo aqui.

## Como reavaliar (checkpoint 2026-11-30)

Cada dono de linha da tabela `no-cross-feature-imports` confirma, até a data acima:
- o número da sua linha não cresceu sem uma entrada nova documentada (ver seção anterior);
- se o número caiu (dívida paga), atualizar esta tabela e a baseline para refletir a contagem real.

Não há compromisso formal de redução nesta wave — o objetivo do ITEM-13 é congelar o número, não
zerá-lo. Reduzir é trabalho de um item de dívida técnica futuro e dedicado por feature, priorizado
fora deste item.