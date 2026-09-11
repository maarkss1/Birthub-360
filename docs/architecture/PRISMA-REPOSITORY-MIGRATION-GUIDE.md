# Guia de migração: `prisma.*` direto → repository (piloto)

**Contexto:** uma auditoria de dívida técnica encontrou que a maioria dos services do backend
acessa `prisma.*` diretamente em vez de passar por uma camada de repository. Só 5 módulos tinham
migrado até então (`PrismaCompanyRepository`, `PrismaCrm360Repository` e os demais listados na
seção "Módulos já migrados" abaixo). Migrar tudo de uma vez é um projeto de meses — este documento
nasceu de um **piloto**: migrar 1-2 módulos pequenos e autocontidos, para consolidar o padrão e
servir de exemplo real para quem migrar o próximo.

Este guia descreve **duas** convenções reais já em uso no repositório (não uma teórica) e como
escolher entre elas, usando os dois módulos deste piloto como exemplo passo a passo.

## As duas convenções já existentes

O repositório já tinha, antes deste piloto, dois estilos de repository — nenhum dos dois foi
inventado aqui, os dois já existiam em código real:

### Estilo A — Clean Architecture completa + container de DI

`domain/<Entidade>.ts` (interface `<Entidade>Repository`) + `application/<Entidade>UseCases.ts`
(classe, geralmente estendendo `BaseUseCases<T, Repo>`) + `infra/Prisma<Entidade>Repository.ts` +
`presentation/<Entidade>Controller.ts`, tudo instanciado e conectado em `src/shared/di/setup.ts`
(`container.register(...)`).

**Exemplos reais:** `src/features/companies/` (Company), `src/features/crm/` (Lead),
`src/features/activities/` (Activity), `src/features/contacts/` (Contact), `src/features/notes/`,
`src/features/automations/`, `src/features/crm360/`, `src/features/billing/`, entre outros
registrados em `setup.ts`.

**Quando usar:** entidade central do produto, múltiplos consumidores (rotas HTTP + agentes de IA +
workers), precisa de Controller HTTP dedicado e/ou de outras features resolvendo a dependência via
`container.resolve<T>(...)` (ver o padrão "Onda 43" comentado em `setup.ts` para composição entre
features sem import cruzado).

**Achado deste piloto:** `activities` e `contacts` já têm o Estilo A completo (repository, use
cases, controller, registrado em `setup.ts`) — mas **um segundo caminho legado** ainda existe em
paralelo: `src/features/activities/services/activity.service.ts` e
`src/features/contacts/services/contact.service.ts` continuam acessando `prisma.*` direto, porque
são consumidos por `src/features/intelligence/services/aiPendingAction.service.ts` e pelas
tools de agente (`opsPendingActions.tool.ts`, `opsTools.ts`) — **não** pelas rotas HTTP (que já usam
o Estilo A via `ActivityController`/`ContactController`). Ou seja: duas implementações da mesma
lógica de CRUD coexistem hoje, uma por caminho de entrada (HTTP vs. ferramentas de IA). Isto **não**
foi resolvido neste piloto (escopo deliberadamente pequeno) — está registrado aqui como o próximo
item de maior valor de quem pegar `activities`/`contacts` na lista de pendências abaixo: não é
"criar" um repository novo, é fazer os dois services legados consumirem o `ActivityRepository`/
`ContactRepository` que já existem, eliminando a duplicação.

### Estilo B — porta leve, injeção explícita por parâmetro, sem container

`domain/<algo>.ts` define tipos + uma interface `<Algo>Repository` (porta), sem estender nenhuma
base genérica. `application/<algo>Service.ts` (ou `services/<algo>.service.ts`) implementa funções
ou uma classe pequena que recebe o repository via **construtor com valor default** (não via
container). `infra/Prisma<Algo>Repository.ts` implementa a porta e exporta uma instância singleton
(`export const prisma<Algo>Repository = new Prisma<Algo>Repository()`), consumida diretamente pelos
call sites (rota, worker, outro service) — sem registrar nada em `setup.ts`.

**Exemplo real pré-existente:** `src/features/cadence/domain/optOut.ts` +
`application/optOutService.ts` + `infra/PrismaOptOutRepository.ts` (`prismaOptOutRepository`). Os
testes (`src/features/cadence/__tests__/optOut.test.ts`) usam `InMemoryOptOutRepository` — nenhum
teste de `optOutService` toca banco.

**Quando usar:** módulo pequeno, poucos consumidores, sem necessidade de Controller HTTP dedicado
nem de ser resolvido por outras features via container. É o estilo que este piloto seguiu.

### Como decidir qual estilo usar no próximo módulo

- Entidade central do produto (Lead/Company/Contact-like), múltiplos consumidores incluindo HTTP +
  IA + workers, ou outra feature vai precisar resolver a dependência via `container.resolve`? →
  **Estilo A**.
- Módulo pequeno, 1-2 consumidores, sem necessidade de Controller HTTP próprio? → **Estilo B**. Mais
  rápido de migrar, menor superfície de risco, e não infla `setup.ts` com módulos que não
  participam da composição entre features.

Nenhum dos dois é "o padrão errado" — são dois pontos legítimos do mesmo espectro, já em uso.
Inventar um terceiro estilo para um módulo novo é o erro a evitar.

## Piloto deste guia: os dois módulos migrados (Estilo B)

### 1. `module-access` (`src/features/module-access/`)

- **Antes:** `services/moduleAccess.service.ts` exportava 4 funções livres (`getModuleAccessMatrix`,
  `listGrantedModulesForUser`, `grantModuleAccess`, `revokeModuleAccess`) chamando `prisma.user` e
  `prisma.moduleAccessGrant` direto.
- **Depois:**
  - `domain/ModuleAccess.ts` — tipos (`ModuleAccessUserRow`, `ModuleAccessGrantRow`,
    `ModuleAccessMatrixUser`, `GrantModuleAccessInput`, `RevokeModuleAccessInput`) + a porta
    `ModuleAccessRepository`.
  - `infra/PrismaModuleAccessRepository.ts` — implementação Prisma real, mesmas 6 queries de
    antes, shape de retorno idêntico. Exporta `prismaModuleAccessRepository` (singleton).
  - `services/moduleAccess.service.ts` — agora define `class ModuleAccessService` com o
    repository injetado por construtor (`constructor(repository: ModuleAccessRepository =
    prismaModuleAccessRepository)`) e exporta `moduleAccessService` (instância com a
    implementação real). **As 4 funções livres originais continuam exportadas** como wrappers
    finos que delegam para `moduleAccessService` — decisão deliberada para não precisar tocar
    `moduleAccess.routes.ts` (zero mudança de comportamento, zero risco de regressão no único
    consumidor deste service).
  - `services/__tests__/moduleAccess.service.test.ts` — teste novo, repository em memória
    (mesmo padrão de `InMemoryOptOutRepository`), sem tocar Prisma/banco.
- **Por que este módulo:** pequeno (118 linhas), 1 único consumidor (`moduleAccess.routes.ts`),
  sem lógica de transação, fora do escopo excluído pela tarefa (não é Bitrix/CRM core/billing/auth
  — é autorização de visibilidade de módulo executivo, não autenticação).

### 2. `gamification` — `sellerPerformanceAggregator` (`src/features/gamification/`)

- **Antes:** `services/sellerPerformanceAggregator.service.ts` era uma classe com um único método
  `compute()` rodando 6 queries Prisma em paralelo (`Promise.all`) e combinando o resultado.
- **Depois:**
  - `domain/SellerPerformance.ts` — tipos (`SellerPerformancePeriod`,
    `AggregatedSellerPerformance`, `LossReasonCount`, `SellerPerformanceRawMetrics`) + a porta
    `SellerPerformanceRepository` (um único método, `getRawMetrics`, devolvendo os números brutos
    ainda não combinados).
  - `infra/PrismaSellerPerformanceRepository.ts` — as mesmas 6 queries, exporta
    `prismaSellerPerformanceRepository`.
  - `services/sellerPerformanceAggregator.service.ts` — `SellerPerformanceAggregatorService`
    passou a receber o repository por construtor (mesmo default de instância real) e `compute()`
    ficou só com a combinação (taxa de conversão, maior motivo de perda) — lógica de domínio pura,
    sem `await prisma...` no meio. **Nenhuma mudança no call site**
    (`gamification.routes.ts` continua chamando `sellerPerformanceAggregator.compute(...)`
    exatamente como antes) porque o construtor tem valor default.
  - `services/__tests__/sellerPerformanceAggregator.service.test.ts` — teste novo, repository
    fake controlando os números brutos, cobrindo a combinação (conversão, ticket médio quando não
    há negócio fechado, maior motivo de perda).
- **Por que este módulo:** pequeno (111 linhas), 2 consumidores (`gamification.routes.ts`; e um
  comentário em `ai-suite.routes.ts` que só cita o nome, não importa), somente leitura (nenhum
  `create`/`update`/`delete`), sem transação.

## Verificação feita neste piloto

- `npx tsc --noEmit` — 0 erros, antes e depois de cada módulo.
- `npx vitest run -c vitest.unit.config.ts` nos dois `__tests__/` novos — 8/8 testes passando.
- Nenhuma migration criada (`prisma/schema.prisma` inalterado) — esta tarefa é só reestruturação de
  acesso a dados, não mudança de schema.
- Nenhum call site externo aos dois módulos precisou mudar (routes.ts de ambos os módulos
  permaneceram idênticos).

## Checklist para o próximo módulo (o resto da lista da auditoria)

Lista obtida com `grep -rl "prisma\." src/features/*/services/*.ts` no início deste piloto, menos
os dois já migrados acima. **Excluídos do escopo de um piloto pequeno** (alto risco/alto tráfego —
avalie migrar com mais tempo e mais teste de regressão, não como próximo item pequeno):
`crm/services/assignment.service.ts`, `crm/services/savedView.service.ts` (CRM core),
`prospecting/services/*.ts` (enriquecimento — várias integrações externas encadeadas), qualquer
coisa sob `integrations/bitrix/`.

- [ ] `activities/services/activity.service.ts` — **não crie um repository novo**: já existe
      `ActivityRepository`/`PrismaActivityRepository` (Estilo A, ver acima). O trabalho aqui é
      trocar os `prisma.*` deste service legado (consumido por `aiPendingAction.service.ts` e pelas
      tools de agente) para usar o repository já existente, eliminando a duplicação com
      `ActivityUseCases`.
- [ ] `contacts/services/contact.service.ts` — mesmo achado: já existe `ContactRepository`/
      `PrismaContactRepository`. Consolidar, não recriar.
- [ ] `crm/services/assignment.service.ts` — CRM core, fora do escopo de um piloto pequeno.
- [ ] `crm/services/savedView.service.ts` — idem.
- [ ] `gamification/services/sellerPerformanceAggregator.service.ts` — ✅ migrado neste piloto.
- [ ] `intelligence/services/abTesting.service.ts`
- [ ] `intelligence/services/ai-settings.service.ts`
- [ ] `intelligence/services/ai.service.ts` — módulo de IA central, avaliar com mais cautela (muitos
      consumidores).
- [ ] `intelligence/services/aiPendingAction.service.ts`
- [ ] `intelligence/services/assistant-history.service.ts`
- [ ] `intelligence/services/evaluationMetrics.service.ts`
- [ ] `intelligence/services/guardrails.service.ts`
- [ ] `intelligence/services/pending-actions.service.ts`
- [ ] `intelligence/services/prompt.service.ts`
- [ ] `intelligence/services/roleplay-session.service.ts`
- [ ] `intelligence/services/swarmScheduler.service.ts`
- [ ] `intelligence/services/winLossAnalysis.worker.ts`
- [ ] `job-roles/services/accessRequest.service.ts`
- [ ] `job-roles/services/agentBuilder.service.ts`
- [ ] `job-roles/services/agentBus.service.ts`
- [ ] `job-roles/services/agentCatalog.service.ts`
- [ ] `job-roles/services/agentRuntime.service.ts`
- [ ] `job-roles/services/capability.service.ts`
- [ ] `job-roles/services/capabilityAuthorization.service.ts`
- [ ] `job-roles/services/jobRole.service.ts`
- [ ] `job-roles/services/memory.service.ts`
- [ ] `job-roles/services/roleSupervisor.service.ts`
- [ ] `job-roles/services/toolExecutors.ts`
- [ ] `module-access/services/moduleAccess.service.ts` — ✅ migrado neste piloto.
- [ ] `prospecting/services/companyIdentity.service.ts` — avaliar escopo antes (cadeia de
      enriquecimento externo).
- [ ] `prospecting/services/enrichment.service.ts` — idem.
- [ ] `prospecting/services/enrichmentCascade.service.ts` — idem.
- [ ] `prospecting/services/lookalike-scoring.service.ts` — idem.
- [ ] `prospecting/services/providerBudget.ts` — idem.
- [ ] `prospecting/services/searchExecution.service.ts` — idem.
- [ ] `team/services/team.service.ts`

Para cada item **novo** (que ainda não tem repository de nenhum estilo): antes de escrever código,
leia 2-3 repositories já existentes (`PrismaCompanyRepository.ts` para Estilo A,
`PrismaOptOutRepository.ts`/`PrismaModuleAccessRepository.ts` para Estilo B) para confirmar a
convenção de nomenclatura/interface antes de migrar — não invente um terceiro padrão. Rode
`npx tsc --noEmit` depois de cada módulo e os testes existentes daquele módulo
(`__tests__` na mesma pasta do service) antes de considerar a migração concluída.
