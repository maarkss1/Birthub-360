# 00 — Mapa Arquitetural do Repositório

> Parte da auditoria multi-domínio de dívida técnica. Este documento é o mapa lógico do monorepo
> Birth Hub 360º, produzido por leitura direta de código/config (não por suposição), para servir de
> contexto compartilhado às auditorias especializadas subsequentes.

## 1. Identidade do projeto

- **Nome de produto:** Birth Hub 360º — CRM B2B com IA (prospecção, pipeline, roleplay de vendas,
  automações, analytics). Nome interno de projeto em `AGENTS.md`:
  `CENTRAL-DE-INTELIGENCIA-COMECIAL-ATLASGR`. `package.json.name` ainda é o genérico
  `"react-example"` — não corrigido.
- **Modelo de negócio:** multi-tenant (`organizationId` em praticamente todo model Prisma).
- **Também é app Android** via Capacitor (`android/`, `capacitor.config.ts`, `ios/` presente mas
  sem workflow de CI dedicado ativo além de `ios-build.yml`).

## 2. Stack técnica (confirmada em `package.json`, configs de build)

| Camada | Tecnologia |
| --- | --- |
| Frontend | React 19, Vite 6, React Router 7, Tailwind CSS 4 (CSS-first, `@theme` em `src/styles/globals.css`), Framer Motion, `@dnd-kit`, `recharts`, `lucide-react`, `@react-three/fiber`/`drei`/`three` |
| Backend | Express (`server.ts`), TypeScript estrito, `tsx`/`esbuild` para dev/build |
| ORM/DB | Prisma 7 com adapter `PrismaPg` (driver `pg`) — `prisma/schema.prisma` (4565 linhas, 112 models) |
| Filas/Workers | BullMQ + ioredis, processo separado `worker.ts` (17k) |
| IA | `@langchain/core` + `@langchain/langgraph` (StateGraph para orquestração de agentes), `@langchain/langgraph-checkpoint-postgres`, `@langchain/openai`, gateway próprio (`src/lib/ai/gateway*`), LiteLLM como proxy/roteador (`litellm-config.yaml`), Groq como motor rápido de fallback, `@qdrant/js-client-rest` para vetores |
| Mobile | Capacitor 8 (Android + iOS) |
| Testes | Vitest (unit/integration/container configs separados), Playwright (E2E), Storybook |
| Lint/format | Biome (`biome lint src`) é o lint runtime real; ESLint (`eslint.config.mjs`, `.eslintrc.js`) coexiste — checar em auditoria de qualidade se há sobreposição/uso confuso dos dois |
| Arquitetura | `dependency-cruiser` (`npm run lint:architecture`) com baseline de violações conhecidas (`.dependency-cruiser-known-violations.json`, 27KB) |
| Infra local | Docker Compose (múltiplos arquivos: base, postgres-local, opensource, services, oci), Redis, Meilisearch, MinIO, Ollama, LiteLLM |
| Infra produção | Render (`render.yaml`), OCI (`docker-compose.oci.yml`, `Caddyfile.oci`, `deploy-oci.yml`), Kubernetes (`k8s/`, `argocd/`, `charts/` Helm) |
| Observabilidade | Prometheus (`prometheus.yml`), tracing (`src/lib/tracing.ts`), Langfuse (`shutdownLangfuse`) |
| Segurança | Gitleaks, Trivy, CodeQL, SonarQube — todos com workflow de CI dedicado |

## 3. Estrutura de diretórios de primeiro/segundo nível

### Raiz — aplicação e infraestrutura

| Diretório | Propósito |
| --- | --- |
| `src/` | Todo o código-fonte da aplicação (frontend + backend compartilhado) — ver detalhamento abaixo |
| `server.ts` / `worker.ts` | Dois processos Node distintos: API HTTP (server) e processador de filas BullMQ (worker) |
| `prisma/` | Schema único (4565 linhas), migrations |
| `android/`, `ios/` | Projetos nativos gerados/mantidos via Capacitor |
| `chrome-extension/` | Extensão de navegador separada (manifest v3, JS puro, não faz parte do build Vite) |
| `k8s/`, `argocd/`, `charts/`, `infrastructure/` | Infraestrutura declarativa (Kubernetes, ArgoCD, Helm chart `prospector-atlas`) |
| `docker/`, `docker-compose*.yml`, `Dockerfile` | Containerização local e produção (múltiplas composições sobrepostas via `-f`) |
| `docs/` | Documentação viva — ADRs, arquitetura, compliance, deploy, segurança, auditorias |
| `.agents/` | Governança do **enxame de desenvolvimento** (agentes 00-18 que editam o código-fonte) — prompts, handoffs, runs, skills |
| `.claude/` | Configuração do Claude Code: subagentes reais (`agents/`), skills do produto (`skills/`), worktrees de execução (`worktrees/`, múltiplos, evidência de execuções paralelas passadas) |
| `identidade-visual/` | Fonte de verdade da marca (logos vetoriais, tokens, brand book) — propriedade exclusiva do Agente 11 |
| `documentacao-aplicacao/` | Documentação institucional adicional, mesma propriedade do Agente 11 |
| `scripts/` | Scripts operacionais (setup, seed, segurança, verificação de integrações/IA, arquitetura) |
| `tests/` | Testes E2E (Playwright) e possivelmente outros não-unitários |
| `LDR_PROMPTS_ORQUESTRADOS/` | Pacote de prompts para agentes de LDR/orquestração (nome sugere pacote externo instalado) |

### `src/` — aplicação

| Diretório | Propósito |
| --- | --- |
| `src/bootstrap/` | Composição/registro de rotas Express (`routes.ts`) e bootstrap do app |
| `src/features/` | Módulos verticais de produto (ver lista abaixo) — cada um com `components/`, `routes/`, `services/`, às vezes `domain/`/`application/`/`infra/` (Clean Architecture parcial) |
| `src/shared/` | Código cross-feature deliberado: `domain/`, `application/`, `infra/`, `contracts/`, `di/` (container de injeção de dependência), `security/`, `http/`, `middlewares/`, `time/`, `utils/` |
| `src/lib/` | Bibliotecas de integração: `ai/` (gateway de IA, checkpointer LangGraph), `queue/` (BullMQ workers), `auth/`, `crypto/`, `email/`, `enrichment/`, `qdrant/`, `search/`, `security/`, `storage/`, `telemetry/` |
| `src/components/` | UI compartilhada: `ui/` (primitivos de design system), `layout/`, `brand/` (logo gerado), `charts/`, `editor/`, `workspace/`, `icons/`, `pdf/` |
| `src/config/` | Configuração estática: `brand.ts`, `env.ts`, `playbooks.ts`, `capability-catalog.ts` |
| `src/middleware/`, `src/hooks/`, `src/pages/`, `src/contexts/`, `src/types/`, `src/utils/`, `src/styles/` | Camadas convencionais de app React/Express |

**Módulos em `src/features/` (33):** `activities`, `analytics`, `auth`, `automations`, `billing`,
`bug-reports`, `cadence`, `calendar`, `chatbook`, `commercial-intelligence`, `companies`,
`contacts`, `copiloto-ia`, `crm`, `crm360`, `dashboard`, `design-lab`, `document-editor`,
`feature-flags`, `gamification`, `hub`, `hub-inteligencia-marketing`, `integrations`,
`intelligence` (**onde vive o enxame de agentes de IA runtime**), `job-roles` (**onde vive o
segundo sistema de agentes, genérico e orientado a cargo**), `knowledge`, `lgpd`,
`market-intelligence`, `mesa-tratamento`, `module-access`, `notes`, `notifications`, `onboarding`,
`playbook`, `propostas`, `prospecting`, `roleplay`, `settings`, `social-selling`, `team`,
`treinamento`, `workspace`.

## 4. Onde vivem os "agentes de IA de runtime" (o produto que o cliente usa)

Dois sistemas distintos e não totalmente unificados coexistem — ver `01-AGENT-INVENTORY.md` para o
detalhamento completo:

1. **Enxame Comercial ("Swarm")** — `src/features/intelligence/agents/`. Orquestração via
   LangGraph `StateGraph` (`SwarmOrchestrator` em `supervisor.agent.ts`), 5 especialistas
   (SDR/BDR/Closer/CRM/Ops) + `LearningAgent` (aprendizado contínuo de estilo, versionado com
   aprovação humana). Este é o sistema **em produção real**, exposto por
   `src/features/intelligence/routes/agent.routes.ts` (`/api/agent/swarm/mission`,
   `/swarm/stream`, `/swarm/learn*`, `/swarm/slo`).
2. **Célula Comercial de 12 agentes** — `commercialAgentRegistry.ts` (catálogo estático) +
   arquivos `*.agent.ts` individuais. Parcialmente wrapper fino sobre (1) e sobre serviços de
   `commercial-intelligence`/`analytics`/`cadence`, parcialmente sem fonte real de dado
   (`billing-revenue`). Só 3 dos 12 têm rota HTTP própria hoje.
3. **Job Roles / Agent Runtime genérico** — `src/features/job-roles/`. Sistema orientado a
   dados (`AgentDefinition`, `AgentVersion`, `RoleAgentGrant`, `AgentExecution`,
   `AgentCapabilityGrant` em `prisma/schema.prisma`), com autorização por capability
   (`capabilityAuthorization.service.ts`), execução via `toolExecutors.ts` (nunca duplica motor de
   negócio — só chama serviços reais) e barramento (`agentBus.service.ts`). Todas as 9 rotas deste
   módulo **estão registradas** em `src/bootstrap/routes.ts` (`/api/job-roles`, `/api/agents`,
   `/api/role-supervisor`, `/api/access-requests`, e mais — ver rotas específicas não listadas
   individualmente aqui).

Estes três sistemas não devem ser confundidos entre si nem com os **agentes de desenvolvimento
00-18** de `AGENTS.md`/`.agents/` (que editam o próprio código-fonte do repositório, papel
totalmente diferente).

## 5. Filas, workers e agendadores (`worker.ts`, `src/lib/queue/`)

Processo `worker.ts` separado do servidor HTTP, registrando múltiplos workers BullMQ: leads,
`agent.worker.ts` (execução assíncrona de missões do enxame), enrichment (+ cascade), search,
relatório diário, cold call, sinais/comandos de WhatsApp, e outros não totalmente listados aqui —
ver `src/lib/queue/` para o inventário completo (relevante para a auditoria de
runtime/workers/escala, domínio do Agente 16).

## 6. Integrações externas conhecidas

Bitrix24 (CRM externo, `src/features/integrations/bitrix/`), Google Workspace
(`GoogleWorkspaceConnection` no schema), WhatsApp/Baileys (`@whiskeysockets/baileys` em
`package.json`), Apollo/Hunter/Google Maps (prospecção paga, modo `hybrid`), Groq/LiteLLM/Gemini
(provedores de IA), AWS S3 (armazenamento), gov.br (assinatura de documentos, stub de transporte
documentado como tal). Slack/Stripe/Omie citados no commit mais recente
(`feat(integrations): adiciona conectores Slack, Stripe e Omie`) — não auditados neste documento,
ver auditoria de integrações dedicada.

## 7. CI/CD (`.github/workflows/`, 18 arquivos)

`ci.yml` (principal — type check, lint, build), `qualidade-ci.yml`, `playwright-ci.yml`,
`codeql.yml`, `security-trivy.yml`, `sonarqube.yml`, `dependency-review.yml`,
`android-build.yml`/`ios-build.yml`, `deploy-oci.yml`, `deploy-pages.yml`, `docker-publish.yml`,
`cd-homolog.yml`, `production.yaml`, `backup-production.yml`, `endpoint-latency-budget.yml`,
`frontend-bundle-budget.yml`, `public-assets-budget.yml`, `onda-2.5-validation.yml` (workflow
nomeado por uma onda específica do enxame de desenvolvimento — candidato a revisão de
descartabilidade numa auditoria de CI).

## 8. Documentação institucional relevante já existente

- `AGENTS.md` (raiz) — constituição de governança dos agentes de desenvolvimento 00-18, regra de
  concorrência, isolamento por worktree, protocolo de handoff, bloqueadores prioritários, LGPD,
  gate obrigatório por onda. **Leitura obrigatória antes de qualquer auditoria** — evita
  redescobrir débito já mapeado.
- `.claude/CLAUDE.md` — constituição de Design Engineering (regras visuais, tokens, acessibilidade,
  motion, performance).
- `AUTONOMIA_COMERCIAL_24X7.md` — políticas/gatilhos/observabilidade da operação autônoma do
  enxame comercial (SDR/BDR/Closer 24/7).
- `PRODUCT_EXPERIENCE.md`, `ROADMAP_FINALIZACAO_PLATAFORMA.html`, `REMEDIACAO_FINAL.md`,
  `CHANGELOG-MELHORIAS.md`, `EXECUCAO-ONDAS.md` — histórico de produto/roadmap/remediação.
  `DIVIDA_TECNICA_MULTIAGENTE_ATLASGR_2026-09-08.html` — auditoria de dívida técnica anterior,
  gerada por um enxame multiagente prévio; **confira antes de reportar um achado desta auditoria
  como inédito**.
- `docs/ADR/` — decisões arquiteturais registradas (BetterAuth, Clean Architecture, decisões
  estruturais onda 6-8).
- `docs/architecture/DEPENDENCY_RULES.md`, `docs/architecture/KNOWN_VIOLATIONS.md`,
  `docs/architecture/HOTSPOT_EXCEPTIONS.md` — regras e débito de arquitetura já formalizados
  (fronteiras `dependency-cruiser`, arquivos grandes demais).
- `docs/REMOVED-DOCS.md` — registra que `DESIGN_QA_CENTRAL_ATLASGR.md` foi removido do controle de
  versão por pedido explícito do usuário; não recriar como "descoberta".
- `.agents/completion/` — relatórios de mapeamento e bloqueadores já produzidos por rodadas
  anteriores do enxame de desenvolvimento (`01-bloqueadores.md`, `02-mapa-plataforma.md`,
  `03-ondas-de-finalizacao.md`, `04-prompt-criacao-agentes.md`, `FINAL-REPORT-onda-1.md`) — leitura
  recomendada antes de reabrir uma investigação já concluída.

## 9. Observações de higiene do repositório (superficiais, não é o foco desta auditoria)

- `.claude/worktrees/` contém **12+ worktrees git completos** (cada um uma cópia quase total da
  árvore de trabalho, alguns com `node_modules/` próprio) versionados dentro do próprio
  repositório de trabalho local — não necessariamente commitados no git (não verificado aqui se
  estão no `.gitignore`), mas ocupam espaço em disco real e são evidência de execuções paralelas
  passadas do enxame de agentes. Vale checar em auditoria de higiene/CI se algum destes vazou para
  o histórico do git.
- `package.json.name` continua `"react-example"` — nome genérico de scaffold, não corrigido para
  refletir o produto real.
