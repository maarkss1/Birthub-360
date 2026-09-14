# TEST — Auditoria de Testes e Qualidade

## Agent
TEST (especialista em cobertura, qualidade e confiabilidade de testes)

## Mission
Auditar profundidade real de testes unitários, integração, E2E e acessibilidade/visuais no
monorepo Birth Hub 360º: achar `.skip`/`xit`/`xdescribe`, testes comentados, padrões flaky,
abuso de snapshot, e lacunas de cobertura em tenancy, segurança, billing, avaliação de IA,
agentes, workflows e migrations. Classificar cobertura por área crítica e traçar, quando
relevante, se o teste é mock-only, integração real ou E2E de verdade.

## Scope
Todo o monorepo — não só `tests/`. Inclui suites colocadas em `src/**/__tests__/`, testes
Android nativos (`android/app/src/test`, `android/app/src/androidTest`), configuração Vitest/
Playwright, gate de CI (`.github/workflows/ci.yml`), e a documentação de testes já existente
(`tests/AGENTS.md`) como fonte de débito já mapeado.

## Areas inspected
- `tests/unit/**` (vitest, ambiente jsdom) — componentes, serviços, rotas com `req.user` fake,
  workers, bootstrap.
- `tests/integration/**` (vitest contra Postgres real, RLS incluída) — tenancy, RBAC E2E com
  sessão real, agent runtime, agent bus, agent catalog, capability engine, LGPD, billing/usage,
  swarm autônomo.
- `tests/e2e/**` (Playwright) — auth, CRM/kanban, cadência, command palette, formulários,
  acessibilidade, visual regression, mobile sweep.
- `src/**/__tests__/**` — suites colocadas (172 arquivos) para intelligence agents, commercial-
  intelligence engine, prospecting, cadence, crypto/PII.
- `android/app/src/test` e `android/app/src/androidTest` — testes nativos Kotlin/Java.
- `vitest.config.ts`, `vitest.unit.config.ts`, `vitest.integration.config.ts`,
  `vitest.container.config.ts`, `playwright.config.ts`, `.github/workflows/ci.yml`.
- `tests/AGENTS.md` (débito de teste já documentado pelo Agente 08 em ondas anteriores).

## Files inspected
Aproximadamente 60 arquivos lidos/grepados diretamente (specs, configs, AGENTS.md, agentes de
IA, rotas), sobre um universo de 256 arquivos `*.test.ts`/`*.spec.ts` em `tests/` + 172 arquivos
`*.test.ts` colocados em `src/**/__tests__/` (428 arquivos de teste no total) mapeados por
varredura estrutural (glob/grep) para achar `.skip`, `expect(true)`, ausência de teste por
módulo/agente e padrões de auth fake vs. real.

## Executive summary
A suíte de testes deste repositório é, em conjunto, **madura e autoconsciente**: já existe uma
prática consistente de comentar `// TEST-XXX (dívida técnica): ...` explicando limitações
conhecidas (ex.: rotas testadas com `req.user` fake vs. sessão real), os 2 `describe.skip`
encontrados estão documentados com causa raiz e handoff aberto em `tests/AGENTS.md`, não há
`toMatchSnapshot` (zero abuso de snapshot), não há testes comentados, e a cobertura de
tenancy/RLS é excepcionalmente ampla (mais de 15 arquivos dedicados a isolamento cross-tenant,
inclusive com bypass de RLS testado explicitamente). O gate de CI roda unit+integration+E2E como
bloqueador de merge (`application-gate`), não é teatro.

Dito isso, a auditoria confirmou lacunas reais e concretas, concentradas em três eixos:

1. **Agentes de IA "registrados mas não usados" (achado de discovery) não têm absolutamente
   nenhum teste** — nem mesmo um teste unitário isolado da classe. Pior: dois agentes **ativos e
   roteados por HTTP em produção** (`RevenueIntelligenceAgent`, `ContractSignatureAgent`) também
   não têm nenhum teste dedicado, nem de rota nem de classe — zero verificação automatizada do
   comportamento que um usuário real recebe ao chamar `POST /api/agent/revenue-intelligence/run`
   ou `/api/agent/contract-signature/run`.
2. **Módulos de produto inteiros sem nenhum teste**, incluindo `roleplay` (feature citada na
   própria identidade do produto — "roleplay de vendas" — no `CLAUDE.md`), `treinamento`,
   `social-selling`, `playbook`, `chatbook`, `design-lab`, `onboarding` e
   `hub-inteligencia-marketing`.
3. **Testes nativos Android são 100% boilerplate/placeholder** — o app é distribuído como
   aplicativo Android real via Capacitor (regra de negócio explícita no `CLAUDE.md`), mas
   `android/app/src/test/.../ExampleUnitTest.java` ainda é literalmente `assertEquals(4, 2+2)`,
   e o teste instrumentado só verifica o nome do pacote — nenhum teste nativo cobre
   `MainActivity.java`, permissões, deep links ou a ponte do Capacitor.

Fora isso, há testes de fumaça (`expect(true).toBe(true)`) classificáveis como WEAK TEST em telas
de negócio relevantes (`CommercialIntelligenceHub`, `CompanyList`/`ContactList`), e a cobertura de
"RBAC com sessão real de ponta a ponta" (`rbac-e2e-*.test.ts`) existe para ~7 grupos de rotas mas
não para a maioria dos outros ~25 módulos de `src/features/`, que dependem de testes de RLS/
tenancy (fortes, mas não passam pelo middleware de autenticação real) ou de testes de rota com
usuário injetado artificialmente.

## Critical
Nenhum achado deste domínio atinge o critério de CRITICAL (vazamento cross-tenant confirmado,
perda de dados ou feature core quebrada) — a ausência de teste em si não é uma falha confirmada
de comportamento, é uma lacuna de verificação. Os dois achados mais graves (agentes de produção
sem teste) foram classificados como HIGH porque o risco é real mas não há evidência de que o
comportamento em si esteja quebrado, só não verificado.

## High
- **TEST-001** — Agentes ativos com rota HTTP real e zero teste automatizado
  (`RevenueIntelligenceAgent`, `ContractSignatureAgent`).
- **TEST-002** — Módulo `src/features/roleplay/` (feature de produto citada no `CLAUDE.md`) sem
  nenhum teste.
- **TEST-003** — Testes nativos Android são boilerplate não adaptado ao app real.

## Medium
- **TEST-004** — 5 agentes "registrados mas não usados" (LDR Intelligence, Coordinator
  Commercial, Manager Commercial, Executive Director, Bitrix Guardian) + o placeholder
  `BillingRevenueAgent` sem nenhum teste de classe.
- **TEST-005** — Módulos de produto sem nenhum teste: `treinamento`, `social-selling`,
  `playbook`, `chatbook`, `design-lab`, `onboarding`, `hub-inteligencia-marketing`.
- **TEST-006** — Cobertura de "RBAC com sessão real ponta a ponta" concentrada em poucos módulos;
  a maioria das rotas só é testada com `req.user` injetado artificialmente ou por testes de
  RLS/tenancy que não passam pelo middleware de autenticação real.
- **TEST-007** — `Billing`/`Usage` (rota de faturamento de uso de IA) só tem testes
  unitários com Prisma mockado — nenhum teste de integração contra Postgres real valida
  persistência/tenancy do ledger de uso que viraria cobrança.

## Low
- **TEST-008** — Testes de "fumaça" com asserção trivial (`expect(true).toBe(true)`) em telas de
  negócio (`CommercialIntelligenceHub`, `CompanyList`, `ContactList`) — classificáveis como WEAK
  TEST, cobrem só "não lança exceção ao montar", não comportamento.
- **TEST-009** — `tests/e2e/visual.spec.ts` inteiro em `describe.skip` (5 testes de regressão
  visual) — já documentado em `tests/AGENTS.md` com causa raiz e handoff aberto; permanece
  confirmado e sem baseline Linux até hoje.
- **TEST-010** — `tests/container/postgres.test.ts` só roda com `RUN_INFRA_TESTS=1` (opt-in) —
  já documentado, comportamento intencional, mas significa que o gate padrão nunca exercita esse
  teste.

## Info
- **TEST-011** — Cobertura de código (`vitest.config.ts`) exclui `src/components/**/*.tsx`
  inteiramente do relatório de cobertura, sem threshold mínimo configurado em nenhum dos configs
  — nenhuma barreira automática impede queda de cobertura ao longo do tempo.
- **TEST-012** — Catálogo normalizado de 392 agentes (`agents.normalized.json`) tem teste de
  integridade de importação (unicidade, idempotência, deduplicação semântica) mas não tem teste
  que execute de fato o `AgentRuntimeService` para uma amostra ampla dos 392 códigos de agente —
  `agent-runtime.test.ts` cobre um punhado de `agentCode`s manualmente escolhidos, não uma
  varredura do catálogo. Real executabilidade em escala permanece não verificada por teste
  automatizado (consistente com o `UNKNOWN` já levantado pelo discovery).

## Technical debt
Ver TEST-006, TEST-007, TEST-011, TEST-012.

## Implementation debt
Ver TEST-001, TEST-002, TEST-004, TEST-005.

## Feature debt
N/A direto — achados deste domínio são sobre verificação, não sobre a feature em si (ver
achados de outros agentes de domínio para status funcional dos agentes/módulos citados).

## Bugs
Nenhum bug de comportamento confirmado por execução neste pass (fora do escopo: não executei a
suíte completa, só inspecionei estaticamente — ver `tests/AGENTS.md` para os números de última
execução confirmada: `test:unit` 706/706, `test:integration` 48/48, `test:e2e` 44/50 com 5 skips
esperados, conforme Onda 6/2026-08-15).

## Architecture
- `vitest.config.ts` orquestra 2 "projects" (unit+integration em jsdom, Storybook em browser
  real via Playwright) — arquitetura de configuração é razoável e evita duplicação.
- Padrão de teste de rota é inconsistente entre módulos: alguns usam Express real com
  `authenticateToken` e sessão `better-auth` real (`rbac-e2e-*.test.ts`), outros injetam
  `req.user` diretamente num middleware fake (`*.routes.test.ts` em `tests/unit/features/`).
  Isso já é uma decisão documentada (comentário citando "TEST-006" no próprio
  `tests/integration/rbac-e2e.test.ts`), mas a cobertura do padrão "forte" (sessão real) não se
  estende a todos os módulos.

## Security
- Cobertura de segurança é um ponto forte real: `account-lockout`, `sec001-bullboard-access`,
  `sec006-session-revocation`, `rls-bypass-allowlist`, `organization-rls-bypass`,
  `webhookReplayGuard`, `requirePlatformOperator`, `urlGuard` — todos com teste de integração
  dedicado.
- `tests/integration/agent-runtime.test.ts` testa explicitamente prompt injection via `leadId`
  malicioso e sanitização de stack trace em erro — sinal de maturidade de segurança na suíte.
- Gap: os dois agentes de IA roteados por HTTP sem teste (TEST-001) significam que autorização,
  tenancy e sanitização de erro dessas duas rotas especificamente não são verificadas por teste
  automatizado (diferente do padrão aplicado ao resto do Agent Runtime).

## Tests
Classificação por área crítica (visão consolidada):

| Área | Classificação |
| --- | --- |
| Tenancy / RLS (RLS bypass, isolamento cross-tenant) | INTEGRATION TEST — forte, testado contra Postgres real com RLS ligada |
| RBAC / sessão real ponta a ponta | INTEGRATION TEST — forte, mas só ~7 grupos de rotas (bug-reports, commercial-intelligence, copiloto-ia, crm-operations, crm-write-routes, feature-flags, usage) |
| Rotas de outros módulos (billing routes, company/contact routes, etc.) | MOCK-ONLY TEST — `req.user` injetado, Prisma real via integração separada quando existe |
| Billing / Usage (ledger de uso de IA) | MOCK-ONLY TEST — nenhuma integração contra Postgres real |
| Agentes ACTIVE com rota HTTP (Supervisor, SDR, BDR, Closer, CRM, Ops, Learning, ChurnRetention) | INTEGRATION TEST / MOCK-ONLY misto — consent/budget bem cobertos; execução ponta a ponta coberta por `swarm-autonomous-mission-e2e.test.ts` com LLM stubado (pipeline real, geração de texto não é avaliada) |
| Agentes ACTIVE RevenueIntelligence / ContractSignature | **NO TEST** |
| Agentes REGISTERED BUT UNUSED (5) + BillingRevenue placeholder | **NO TEST** |
| Agent Runtime genérico (job-roles) | INTEGRATION TEST — forte para os `agentCode`s exercitados, amostral (não cobre os 392) |
| Catálogo de 392 agentes | INTEGRATION TEST (integridade de import) — execução real não coberta |
| E2E de fluxos de produto (CRM, kanban, cadência, auth, command palette) | E2E TEST — Playwright real |
| Acessibilidade | E2E TEST (`accessibility.spec.ts`, axe-core) — existe, não auditei profundidade de asserções neste pass |
| Regressão visual | **NO TEST em execução** — suíte inteira em skip por falta de baseline Linux (já documentado) |
| Módulos roleplay/treinamento/social-selling/playbook/chatbook/design-lab/onboarding/hub-inteligencia-marketing | **NO TEST** |
| Android nativo | **FALSE TEST** — boilerplate não relacionado ao app real |
| LGPD (erasure, auditoria) | INTEGRATION TEST — forte, inclusive cross-tenant |
| Migrations (schema drift, reversibilidade) | Coberto apenas indiretamente via `prisma migrate deploy` idempotente no script de bootstrap de integração (`tests/AGENTS.md` §4) — não há teste vitest dedicado a migration individual |

## Integration
Ver seção Security e Tests acima — testes de integração contra Postgres real são o ponto mais
forte da suíte (RLS, RBAC, LGPD, agent runtime, capability engine). A fronteira controlada
consistente em toda a suíte é o modelo de LLM externo (Groq/OpenAI/LiteLLM) — sempre stubado
porque não há credencial de provedor no ambiente de execução dos testes, documentado
explicitamente em `swarm-autonomous-mission-e2e.test.ts`. Isso significa que **nenhum teste
automatizado deste repositório avalia a qualidade real de uma geração de IA** (alucinação,
aderência a playbook, tom) — apenas o pipeline (roteamento → execução → persistência). Isso é
uma limitação de ambiente conhecida e razoável, não um teste malfeito, mas é uma lacuna real de
"AI evaluation" que vale registrar.

## Product
N/A direto (fora do escopo deste agente — ver domínio de produto/funcionalidade para status real
dos módulos citados como sem teste).

## Mock/Fake/Placeholder
- `tests/unit/features/billing/**` — MOCK-ONLY (TEST-007).
- `android/app/src/test/.../ExampleUnitTest.java` — placeholder puro (`assertEquals(4, 2+2)`),
  sem qualquer relação com o app (TEST-003).
- `tests/unit/commercial-intelligence.test.tsx`, `tests/unit/features/ui.test.tsx` — testes de
  fumaça com asserção final trivial `expect(true).toBe(true)` (TEST-008).

## Dead/Orphan code
Não é o foco deste domínio, mas observação lateral: os 5 agentes "registrados mas não usados"
(sem rota HTTP, per discovery) também não têm teste — ou seja, não só estão desconectados do
roteamento, como estão fora de qualquer rede de segurança de teste (TEST-004). Se forem
reativados no futuro sem que alguém adicione teste primeiro, uma regressão silenciosa é o
cenário mais provável.

## Quick wins
- Adicionar pelo menos um teste de rota (`agent.routes.test.ts` no padrão dos já existentes para
  `evaluation-metrics`/`golden-dataset`/`slo`) cobrindo `POST /api/agent/revenue-intelligence/run`
  e `/api/agent/contract-signature/run` — baixo esforço, mesmo padrão de mock de `vi.mock` já
  usado nos arquivos vizinhos do mesmo diretório.
- Substituir `assertEquals(4, 2 + 2)` em `android/app/src/test/.../ExampleUnitTest.java` por um
  teste real (ou remover o arquivo) — trivial, e hoje é um falso sinal de "testes Android
  passando" que não testa nada do app.
- Trocar o `expect(true).toBe(true)` final em `tests/unit/commercial-intelligence.test.tsx` e
  `tests/unit/features/ui.test.tsx` por uma asserção sobre conteúdo renderizado real (ex.: um
  texto/role específico da tela) — a infraestrutura de render já está montada, falta só a
  asserção.

## Structural problems
- Ausência de threshold de cobertura configurado em `vitest.config.ts`/`vitest.unit.config.ts`/
  `vitest.integration.config.ts` — nada impede que a cobertura efetiva caia ao longo do tempo
  sem que o CI reaja (TEST-011).
- Padrão de teste de rota fragmentado entre "sessão real" e "usuário fake" sem uma convenção
  documentada de quando usar qual (o único apontamento está num comentário isolado num arquivo,
  não num guia central) — risco de novos módulos adotarem o padrão mais fraco por padrão
  (TEST-006).

## Needs verification
- **TEST-012** (catálogo de 392 agentes / execução real em escala) — status `NEEDS_VERIFICATION`,
  confiança MEDIUM: confirmei que o teste de importação cobre integridade estrutural, mas não
  tenho evidência de execução real do runtime para além da amostra manual em
  `agent-runtime.test.ts`; verificar exigiria rodar uma varredura dedicada, fora do escopo desta
  auditoria estática.
- Profundidade real das asserções de `tests/e2e/accessibility.spec.ts` (quantas páginas/estados
  cobre vs. quantas existem no app) — não abri o arquivo linha a linha neste pass; sinalizo como
  NEEDS_VERIFICATION, confiança LOW, para quem for revisar accessibility especificamente.

## Complete findings list

### TEST-001 — Agentes de IA ativos e roteados por HTTP sem nenhum teste automatizado
- **Categoria:** TD-TEST, TD-AI, TD-AGENT
- **Severidade:** HIGH · **Prioridade:** P1 · **Confiança:** HIGH · **Status:** CONFIRMED
- **Evidência:** `src/features/intelligence/routes/agent.routes.ts` registra
  `POST /api/agent/revenue-intelligence/run` (linha ~271, usa `RevenueIntelligenceAgent`, linha
  294) e `POST /api/agent/contract-signature/run` (linha ~402, usa `ContractSignatureAgent`,
  linha 437). Busca por `revenueIntelligenceAgent`/`ContractSignatureAgent`/nome de arquivo em
  todo `tests/` e `src/features/intelligence/agents/__tests__/` não retornou nenhum arquivo de
  teste (`grep -rl` vazio); `src/features/intelligence/agents/__tests__/` só cobre
  `base.agent`, `sdrQualification`, `sdrOutboundDraft`, `ops`, `learning`, `churnRetention`
  (consent), `supervisor` (consent/decision) e `closer` (no-win-path) — nenhum arquivo
  `revenueIntelligence.*` ou `contractSignature.*`.
- **Causa raiz:** ao adicionar rota + agente na Onda 13 (Commercial Agent Cell), teste de
  consentimento/comportamento foi replicado para alguns agentes (`churnRetention.agent.consent.
  test.ts`) mas não para estes dois, apesar de ambos terem rota HTTP real.
- **Impacto no usuário/negócio:** qualquer regressão em autorização, tenancy, sanitização de erro
  ou formato de resposta dessas duas rotas de IA — usadas por gestores para decisões de forecast/
  assinatura de contrato — só seria pega em produção.
- **Resolução sugerida:** criar `agent.routes.revenue-intelligence.test.ts` e
  `agent.routes.contract-signature.test.ts` no padrão já usado por
  `agent.routes.evaluation-metrics.test.ts` (mock dos serviços de domínio, request real via
  supertest, cobrindo happy path + 400 de validação + erro sanitizado).
- **Esforço:** S

### TEST-002 — `src/features/roleplay/` sem nenhum teste
- **Categoria:** TD-TEST, TD-FEAT
- **Severidade:** HIGH · **Prioridade:** P2 · **Confiança:** HIGH · **Status:** CONFIRMED
- **Evidência:** `find src/features/roleplay -type f` retorna 8 arquivos reais (`RoleplayHub.tsx`,
  `ActiveCallView.tsx`, `CallAnalysisReport.tsx`, `CallSetup.tsx`, `RoleplayHistoryPanel.tsx`,
  `scoreColor.ts`, `types.ts`, `roleplay-ai.service.ts`); nenhum tem teste colocado
  (`find ... -iname "*.test.ts*"` = 0) nem existe em `tests/`. `RoleplayAiService` (a classe real
  exportada por `roleplay-ai.service.ts`) é consumida por
  `src/features/intelligence/services/roleplay-session.service.ts` e `CentralAISuiteService.ts`,
  cujos testes (`roleplay-session.service.test.ts`,
  `CentralAISuiteService.test.ts` teste #9) exercitam a classe indiretamente — mas nenhum arquivo
  de teste cobre os componentes React do hub de roleplay em si (setup de chamada, relatório de
  análise, histórico).
- **Causa raiz:** feature de UI nunca recebeu teste dedicado; a única cobertura indireta vem de
  quem consome o serviço, não da tela.
- **Impacto:** "roleplay de vendas" é citado no `CLAUDE.md` como um dos 4 pilares do produto
  ("prospecção, pipeline, roleplay de vendas, automações"), mas a interface que o vendedor
  realmente usa não tem nenhuma rede de segurança de teste.
- **Resolução sugerida:** ao menos um teste de render/interação para `CallSetup` (formulário de
  configuração da simulação) e `ActiveCallView` (fluxo de turno de conversa), seguindo o padrão
  RTL já usado em `tests/unit/features/cadence/components/CadenceHub.test.tsx`.
- **Esforço:** M

### TEST-003 — Testes nativos Android são boilerplate não adaptado ao app real
- **Categoria:** TD-TEST, TD-MOCK
- **Severidade:** HIGH · **Prioridade:** P3 · **Confiança:** HIGH · **Status:** CONFIRMED
- **Evidência:** `android/app/src/test/java/br/com/atlasgr/prospector/ExampleUnitTest.java`
  contém apenas `assertEquals(4, 2 + 2)` — nenhuma relação com código do app.
  `android/app/src/androidTest/java/.../ExampleInstrumentedTest.java` só verifica
  `appContext.getPackageName()` contra `"br.com.atlasgr.prospector"` (o próprio comentário do
  arquivo, datado "Onda 4/Roadmap v2, Agente 09", documenta que isso era boilerplate do
  `npx cap add android` cujo nome de pacote errado foi corrigido, mas o teste em si continua sem
  cobrir nenhum comportamento do app). Nenhum outro arquivo de teste existe sob `android/`.
- **Causa raiz:** boilerplate gerado pelo Capacitor CLI nunca foi substituído por testes reais.
- **Impacto:** `MainActivity.java` (customizado, per discovery) e qualquer configuração nativa
  (permissões, deep link, WebView) não têm nenhuma cobertura nativa — dependência total dos
  testes E2E web via `mobile-sweep.spec.ts`/`crm-kanban-mobile.spec.ts`, que testam viewport
  responsivo mas não o runtime Android real (Capacitor bridge, permissões nativas, ciclo de vida
  da Activity).
- **Resolução sugerida:** não é bloqueador — mas registrar como débito explícito; se
  `MainActivity.java` ganhar lógica customizada além do boilerplate padrão, um teste
  instrumentado real deveria cobri-la.
- **Esforço:** S (para remover o falso sinal) / M (para cobertura real)

### TEST-004 — Agentes "registrados mas não usados" + placeholder sem nenhum teste de classe
- **Categoria:** TD-TEST, TD-AI, TD-AGENT, TD-DEAD
- **Severidade:** MEDIUM · **Prioridade:** P3 · **Confiança:** HIGH · **Status:** CONFIRMED
- **Evidência:** `grep -rl` por `ldrIntelligenceAgent|ldrIntelligence.agent`,
  `coordinatorCommercialAgent`, `managerCommercialAgent`, `executiveDirectorAgent`,
  `bitrixGuardianAgent`, `billingRevenueAgent` em `tests/` e
  `src/features/intelligence/agents/__tests__/` não retornou nenhum arquivo — dos 18 arquivos
  `*.agent.ts` em `src/features/intelligence/agents/`, apenas 10 nomes de classe aparecem em
  algum teste (via `base.agent.consent.test.ts`, `churnRetention.agent.consent.test.ts`, etc.).
- **Impacto:** mesmo sendo `REGISTERED BUT UNUSED`/`PLACEHOLDER` hoje (per discovery), se algum
  desses agentes for conectado a uma rota no futuro sem que alguém adicione teste antes, não há
  rede de segurança nenhuma — nem para orçamento de IA, nem para consentimento LGPD de dados
  externos, que é o padrão testado em todos os outros agentes ativos.
- **Resolução sugerida:** ao ativar qualquer um desses agentes com rota HTTP, exigir teste de
  consentimento/orçamento no mesmo PR (mesmo padrão de `base.agent.consent.test.ts`) como
  critério de "pronto".
- **Esforço:** N/A (ação preventiva, não corretiva)

### TEST-005 — Módulos de produto inteiros sem nenhum teste
- **Categoria:** TD-TEST
- **Severidade:** MEDIUM · **Prioridade:** P2 · **Confiança:** HIGH · **Status:** CONFIRMED
- **Evidência:** varredura `find src/features/<módulo> -iname "*.test.ts*"` (colocado) +
  `find tests -ipath "*<módulo>*" -iname "*.test.ts*"` (árvore central) retornou 0 em ambos para:
  `chatbook` (4 arquivos de código), `design-lab` (4), `hub-inteligencia-marketing` (1),
  `onboarding` (1), `playbook` (17), `social-selling` (1), `treinamento` (1). `roleplay` é
  tratado separadamente em TEST-002 por ter maior superfície (8 arquivos, incluindo um serviço de
  IA consumido por código testado indiretamente).
- **Impacto:** varia por módulo — `playbook` com 17 arquivos reais é o mais preocupante do grupo
  (módulo substancial sem qualquer teste); os demais são majoritariamente 1 a 4 arquivos, provável
  menor risco individual mas ainda uma lacuna real.
- **Resolução sugerida:** priorizar `playbook` primeiro (maior superfície); para os módulos de 1
  arquivo, avaliar se justificam teste dedicado ou se são triviais o bastante para aceitar o risco
  conscientemente (documentar a decisão, não deixar por omissão).
- **Esforço:** L (para `playbook`) / S por módulo pequeno

### TEST-006 — Cobertura de "RBAC com sessão real" concentrada em poucos módulos
- **Categoria:** TD-TEST, TD-AUTH
- **Severidade:** MEDIUM · **Prioridade:** P2 · **Confiança:** HIGH · **Status:** CONFIRMED
- **Evidência:** apenas 11 arquivos em `tests/integration/` usam `signUpRealUser`/
  `authenticateToken` real (`rbac-e2e-bug-reports`, `rbac-e2e-commercial-intelligence`,
  `rbac-e2e-copiloto-ia`, `rbac-e2e-crm-operations`, `rbac-e2e-crm-write-routes`,
  `rbac-e2e-feature-flags`, `rbac-e2e-usage`, `rbac-e2e` genérico, `capability-engine`,
  `analytics-cohort-export-tenancy`, `lead-export-audit`, `sec001-bullboard-access`), contra 14
  arquivos `*.routes.test.ts` que injetam `req.user` fake diretamente. O próprio comentário em
  `tests/integration/rbac-e2e.test.ts` (citado como "TEST-006 (dívida técnica)" no código-fonte
  do teste) já reconhece essa fragmentação como conhecida.
- **Impacto:** para módulos fora da lista de 7 acima (ex.: prospecting, market-intelligence,
  knowledge, mesa-tratamento, automations, cadence, integrations/bitrix/whatsapp/3CX), uma
  regressão especificamente no encadeamento cookie → `auth.api.getSession()` → `req.user` →
  `requireRole` para aquela rota específica não seria pega por nenhum teste — só pelos testes de
  RLS/tenancy (que não passam pelo middleware de auth) ou pelos testes de unidade com usuário
  fake.
- **Resolução sugerida:** não é necessário replicar para todos os módulos (custo alto), mas
  documentar centralmente (não só num comentário isolado) quando um novo módulo de rota exige o
  padrão "sessão real" vs. quando o padrão fake é aceitável (ex.: rotas de baixo risco/somente
  leitura interna).
- **Esforço:** M

### TEST-007 — Billing/Usage só testado com Prisma mockado
- **Categoria:** TD-TEST, TD-BILLING
- **Severidade:** MEDIUM · **Prioridade:** P2 · **Confiança:** HIGH · **Status:** CONFIRMED
- **Evidência:** `tests/unit/features/billing/application/UsageUseCases.test.ts`,
  `tests/unit/features/billing/infra/PrismaUsageRepository.test.ts` e
  `tests/unit/features/billing/routes/usage.routes.test.ts` usam exclusivamente
  `vi.fn().mockResolvedValue(...)` / `vi.mock('@/lib/prisma', ...)`. Não existe
  `tests/integration/*billing*` nem `*usage*` que grave/leia um `UsageLog` real em Postgres (a
  única aparição de "usage" em `tests/integration/` é `rbac-e2e-usage.test.ts`, que testa
  autorização de rota, não persistência do dado de uso em si).
- **Impacto:** o dado que sustenta consumo de IA por tenant (potencialmente base de cobrança) só
  é validado contra um mock — nenhuma garantia de que RLS/tenancy do modelo `UsageLog` real no
  Postgres se comporta como o mock assume, nem de que `groupBy`/`aggregate` do Prisma real
  produzem os agregados esperados.
- **Resolução sugerida:** um teste de integração simples que grava `AILog`/`UsageLog` para 2
  tenants e confere que `getUsageSummary` (ou equivalente) nunca soma entre tenants — mesmo
  padrão já usado em `tests/integration/ai-budget.test.ts`/`ailog-rls.test.ts` (que parecem
  cobrir uma tabela irmã, `AILog`, mas não o agregado de billing em si).
- **Esforço:** S

### TEST-008 — Testes de fumaça com asserção trivial
- **Categoria:** TD-TEST
- **Severidade:** LOW · **Prioridade:** P3 · **Confiança:** HIGH · **Status:** CONFIRMED
- **Evidência:** `tests/unit/commercial-intelligence.test.tsx:25` e
  `tests/unit/features/ui.test.tsx:32,50` terminam com `expect(true).toBe(true)` como asserção
  final — em `ui.test.tsx` há um `waitFor` real antes (esperando o spinner de loading sumir), mas
  a asserção conclusiva do teste não verifica nenhum conteúdo real renderizado. Em
  `commercial-intelligence.test.tsx`, `useDatabase` é mockado para sempre devolver
  `{ data: [], loading: false, error: null }` — o teste nunca exercita estado de loading, erro ou
  dados reais da tela de inteligência comercial.
- **Impacto:** classifica como WEAK TEST — dá falso conforto de "a tela está coberta" quando na
  prática só verifica "não lança exceção síncrona ao montar com dados vazios".
- **Resolução sugerida:** trocar a asserção final por checagem de conteúdo (`screen.getByText`/
  `getByRole`) real; para `CommercialIntelligenceHub`, adicionar um segundo cenário com
  `loading: true` e outro com `error` preenchido.
- **Esforço:** XS

### TEST-009 — Suíte de regressão visual inteira em skip (já documentado)
- **Categoria:** TD-TEST
- **Severidade:** LOW · **Prioridade:** P3 · **Confiança:** HIGH · **Status:** CONFIRMED
  (achado pré-existente, reconfirmado)
- **Evidência:** `tests/e2e/visual.spec.ts-snapshots/` só contém baselines
  `*-chromium-win32.png` (5 telas); `tests/AGENTS.md` §6 documenta `describe.skip` no arquivo
  inteiro porque o CI (`ubuntu-latest`) buscaria `*-chromium-linux.png`, que nunca foi gerado, e
  aponta um handoff aberto (`.agents/handoffs/onda-6/14-para-08-baselines-visuais-linux.md`).
  Confirmei que o problema persiste: nenhum arquivo `*-chromium-linux.png` existe no diretório de
  snapshots.
- **Impacto:** zero cobertura de regressão visual automatizada rodando de fato hoje.
- **Resolução sugerida:** já mapeada no handoff citado — gerar baseline Linux dentro do próprio
  CI (`--update-snapshots`) em vez de localmente. Não é um achado novo, mantido aqui por
  completude do domínio de teste.
- **Esforço:** M (não é deste agente resolver, é do handoff já aberto)

### TEST-010 — `postgres.test.ts` (testcontainers) é opt-in por padrão
- **Categoria:** TD-TEST
- **Severidade:** LOW · **Prioridade:** P4 · **Confiança:** HIGH · **Status:** CONFIRMED
  (já documentado, comportamento intencional)
- **Evidência:** `tests/container/postgres.test.ts:5` —
  `const suite = runContainerTests ? describe : describe.skip;`, condicionado a
  `RUN_INFRA_TESTS=1`. Documentado em `tests/AGENTS.md` §6 como opt-in por ser mais pesado
  (sobe imagem própria via testcontainers).
- **Impacto:** o gate padrão (`npm run test:containers` sem a env var) sempre reporta "1 skip",
  nunca exercita esse teste — risco de ninguém rodar com a flag por meses sem que ninguém note.
- **Resolução sugerida:** nenhuma ação corretiva necessária além de considerar rodá-lo
  periodicamente em CI agendado (não a cada PR, dado o custo).
- **Esforço:** N/A

### TEST-011 — Sem threshold de cobertura configurado
- **Categoria:** TD-TEST, TD-CONFIG
- **Severidade:** INFO · **Prioridade:** P4 · **Confiança:** HIGH · **Status:** CONFIRMED
- **Evidência:** `vitest.config.ts` define `coverage.exclude` incluindo
  `'src/components/**/*.tsx'` inteiro, mas nenhum dos 4 configs Vitest (`vitest.config.ts`,
  `vitest.unit.config.ts`, `vitest.integration.config.ts`, `vitest.container.config.ts`) define
  `coverage.thresholds`. `.github/workflows/ci.yml` roda `test:unit -- --coverage` e
  `test:integration -- --coverage` e faz upload do relatório, mas não falha o job se a cobertura
  cair.
- **Impacto:** cobertura pode regredir silenciosamente; o relatório é gerado mas nunca é gate.
- **Resolução sugerida:** considerar um threshold mínimo não-regressivo (ex.: não cair abaixo do
  nível atual) antes de qualquer campanha de "aumentar cobertura" — sem isso, ganhos são
  facilmente perdidos depois.
- **Esforço:** S

### TEST-012 — Execução real do catálogo de 392 agentes não coberta em escala
- **Categoria:** TD-TEST, TD-AGENT
- **Severidade:** INFO · **Prioridade:** P4 · **Confiança:** MEDIUM · **Status:**
  NEEDS_VERIFICATION
- **Evidência:** `tests/integration/import-agent-catalog.test.ts` testa integridade de
  importação do `agents.normalized.json` (unicidade, idempotência, deduplicação Premium/Standard,
  grants por cargo) — não executa os agentes via `AgentRuntimeService`.
  `tests/integration/agent-runtime.test.ts` executa o runtime real, mas só para `agentCode`s
  específicos escolhidos manualmente (`ldr-intelligence`, etc.), não uma varredura dos 392.
- **Por que não é CONFIRMED:** não tenho evidência de que uma varredura completa seja necessária
  ou vantajosa (pode haver decisão deliberada de amostrar); marco como NEEDS_VERIFICATION porque
  não confirmei nem a ausência total de necessidade nem um caso concreto de falha.
- **Resolução sugerida:** se o objetivo é usar o catálogo de 392 em produção meses à frente, vale
  um teste paramétrico que itere por uma amostra maior (ou todos) os `agentCode`s e confira ao
  menos que o `ToolBinding` resolve sem erro de configuração — sem chamar o LLM de verdade.
- **Esforço:** M
