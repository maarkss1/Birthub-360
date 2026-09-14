# 01 — Inventário Completo de Agentes / Orquestradores / Workflows

> Parte da auditoria multi-domínio de dívida técnica. Cobre TODO agente/orquestrador encontrado no
> repositório, em três camadas distintas que não devem ser confundidas entre si:
>
> **A.** Agentes de IA de **runtime** (o produto que o cliente final usa) — `src/features/intelligence/agents/`, `src/features/job-roles/`.
> **B.** Agentes de **desenvolvimento** (o enxame que edita este próprio código-fonte) — `.agents/`, `AGENTS.md`.
> **C.** Subagentes/skills do **Claude Code** usados para construir/revisar este produto — `.claude/agents/`, `.claude/skills/`, `.agents/skills/mantis-*`.
>
> Status usa a taxonomia pedida: ACTIVE, PARTIALLY ACTIVE, REGISTERED BUT UNUSED, UNREGISTERED,
> ORPHANED, PLACEHOLDER, MOCK, LEGACY, UNKNOWN.

---

## A. Agentes de IA de runtime (produto)

### A.1 — Enxame Comercial ("Swarm") — `src/features/intelligence/agents/`

Orquestração real via LangGraph `StateGraph`. Classe base comum: `base.agent.ts` (grafo de turno
único, `MemorySaver`, carregamento de `AgentMemory`/perfil de estilo aprendido, orçamento de IA via
`assertAiBudgetNotExceeded`, guardrail de consentimento PII via `assertPiiExternalConsent`).
Identidade/contrato de saída compartilhados em `swarm.constants.ts`.

| Nome | Arquivo | Papel | Registrado | Invocado | Status |
| --- | --- | --- | --- | --- | --- |
| SwarmOrchestrator (Supervisor) | `supervisor.agent.ts` (761 linhas) | Orquestrador central: LangGraph `StateGraph` que roteia a missão entre os 5 especialistas abaixo, decide via LLM (`gpt-oss-20b` com fallback, `fallback.util.ts`) qual agente chamar a cada passo (máx. 5 saltos, `MAX_STEPS`), expõe `executeMission`/`executeMissionStream` | Sim — instanciado direto | Sim — `agent.routes.ts`: `POST /api/agent/swarm/mission`, `POST /api/agent/swarm/stream` | **ACTIVE** |
| SDRQualificationAgent | `sdrQualification.agent.ts` | Qualifica lead já cadastrado no CRM (fit ICP, porte/faturamento) | Sim (import direto no supervisor) | Sim — nó `sdr` do grafo | **ACTIVE** |
| BDRAgent | `bdr.agent.ts` | Avalia fit outbound de lead/empresa novo, sugere abordagem de primeiro contato | Sim | Sim — nó `bdr` | **ACTIVE** |
| CloserAgent | `closer.agent.ts` | Estratégia de negociação/fechamento; nunca move deal para ganho sem evento verificável | Sim | Sim — nó `closer` | **ACTIVE** |
| CRMAgent | `crm.agent.ts` | Resume risco de estagnação/perda de deals em andamento | Sim | Sim — nó `crm` | **ACTIVE** |
| OpsAgent | `ops.agent.ts` (+ `opsPendingActions.tool.ts`) | Executa ações concretas (agendar follow-up, notificar equipe) via `AIPendingAction` | Sim | Sim — nó `ops` | **ACTIVE** |
| LearningAgent | `learning.agent.ts` (492 linhas) | Reflexão contínua sobre missões passadas → perfil de estilo versionado por (tenant, ator), nunca ativa sozinho (gate de aprovação humana, item 103 da constituição de produto) | Sim | Sim — `/api/agent/swarm/learn`, `/learn/history`, `/learn/rollback`, `/learn/approve`, `/learn/reject` | **ACTIVE** |
| `agentMemory.store.ts` | — | Persistência de memória/falhas por agente (`AgentMemory` no Prisma) | Sim | Sim, usado por `base.agent.ts` | **ACTIVE** (infraestrutura, não um agente em si) |
| `swarmScheduler.service.ts` + `swarmScheduler.worker.ts` | fila BullMQ | Agendador 24/7 do enxame autônomo (ver `AUTONOMIA_COMERCIAL_24X7.md`) | Sim | Sim — `worker.ts` registra o worker; `GET /api/agent/swarm/slo` lê `getSwarmSloSnapshot` | **ACTIVE** |
| `evaluationMetrics.service.ts` | — | Harness de avaliação em 9 dimensões do enxame (AI-006, onda 35) | Sim | Sim — `GET /api/agent/evaluation-metrics` | **ACTIVE** |
| Golden Dataset (`evaluation/goldenDataset.service.ts`) | — | Fixture de QA versionado, usado para validar tool-use dos agentes | Sim | Sim — `GET /api/agent/golden-dataset/summary` | **ACTIVE** |

### A.2 — Célula Comercial de 12 Agentes (pacote `ATLASGR_COMMERCIAL_AGENT_CELL v1.1.0`, onda 13)

Catálogo estático em `commercialAgentRegistry.ts` (385 linhas) + contrato de saída em
`commercialAgentTypes.ts` (`AgentExecutionResult`, `AgentHandoff`, `AgentReflection` — separação
fato/inferência/recomendação obrigatória). O comentário de topo do próprio arquivo documenta que os
campos `status`/`risk`/`bindings` do pacote original foram corrigidos manualmente após leitura do
código real — ou seja, esta reclassificação já é auditoria feita por um agente de desenvolvimento
anterior; não redescobrir do zero, só verificar se segue válida.

| ID no registry | Nome | Status declarado no registry | Verificação nesta auditoria | Rota HTTP própria | Status real (esta auditoria) |
| --- | --- | --- | --- | --- | --- |
| `bdr-outbound` | Agente BDR — Outbound | `REAL_EM_PRODUCAO` | = A.1 BDRAgent (mesmo arquivo) | via `/swarm/*` | **ACTIVE** (é o mesmo agente do enxame, só catalogado aqui também) |
| `sdr-qualification` | Agente SDR — Qualificação | `REAL_EM_PRODUCAO` | = A.1 SDRQualificationAgent | via `/swarm/*` | **ACTIVE** |
| `closer-sales` | Agente Closer | `REAL_EM_PRODUCAO` | = A.1 CloserAgent | via `/swarm/*` | **ACTIVE** |
| `revenue-intelligence` | Revenue Intelligence — Forecast & Pipeline | `NOVO_SOBRE_SERVICO_REAL` | `RevenueIntelligenceAgent` (79 linhas) narra texto pré-formatado por `CommercialIntelligenceAiService` (resolvido via DI container, nunca import direto — bloqueado por `no-cross-feature-imports`) | Sim — `POST /api/agent/commercial-cell/revenue-intelligence/run` | **ACTIVE** |
| `churn-retention` | Churn & Retenção | `NOVO_SOBRE_SERVICO_REAL` | `ChurnRetentionAgent` narra resultado já calculado por `ChurnPredictionService.analyzeChurnRisk` | Sim — `POST /api/agent/commercial-cell/churn-retention/run` | **ACTIVE** |
| `contract-signature` | Contratos & Assinatura | `NOVO_SOBRE_SERVICO_REAL` | `ContractSignatureAgent` narra status real de `SignatureRequestRepositoryPort.findByDocumentId` (ACH-17-02, fechado nesta onda) | Sim — `POST /api/agent/commercial-cell/contract-signature/run` | **ACTIVE** |
| `ldr-intelligence` | LDR — Inteligência de Leads | `NOVO_SOBRE_SERVICO_REAL` | `ldrIntelligence.agent.ts` (77 linhas) existe, binding para `AccountIntelligenceService.getIntelligence` documentado, mas **nenhuma rota HTTP e nenhum outro call site** encontrado fora do próprio registry/tipo | Não | **REGISTERED BUT UNUSED** |
| `coordinator-commercial` | Coordenador Comercial | `NOVO_SOBRE_SERVICO_REAL` | `coordinatorCommercial.agent.ts` (76 linhas) existe, sem rota nem call site externo | Não | **REGISTERED BUT UNUSED** |
| `manager-commercial` | Gerente Comercial | `NOVO_SOBRE_SERVICO_REAL` | `managerCommercial.agent.ts` (74 linhas) existe, sem rota nem call site externo | Não | **REGISTERED BUT UNUSED** |
| `executive-director` | Diretoria — Executivo Comercial | `NOVO_SOBRE_SERVICO_REAL` | `executiveDirector.agent.ts` (73 linhas) existe, sem rota nem call site externo | Não | **REGISTERED BUT UNUSED** |
| `bitrix-guardian` | Bitrix — CRM Guardian | `NOVO_SOBRE_SERVICO_REAL` | `bitrixGuardian.agent.ts` (78 linhas) existe, sem rota nem call site externo | Não | **REGISTERED BUT UNUSED** |
| `billing-revenue` | Receita & Faturamento | `NOVO_FONTE_PARCIAL` | `billingRevenue.agent.ts` (77 linhas) existe; o próprio registry documenta que **não há fonte real de faturamento** (`src/features/billing/**` é custo de token de IA, não venda) — sempre retorna `billedAmount=null` + `missingData`. Sem rota HTTP encontrada | Não | **PLACEHOLDER** (implementado mas estruturalmente incapaz de produzir dado real até existir integração de faturamento) |

**Achado de auditoria:** 5 dos 12 agentes da Célula Comercial (`ldr-intelligence`,
`coordinator-commercial`, `manager-commercial`, `executive-director`, `bitrix-guardian`) têm código
completo, estão no catálogo estático, têm `agentModule` preenchido, mas **não são alcançáveis por
nenhuma rota HTTP nem chamados por nenhum outro serviço** — só aparecem no próprio arquivo de
definição e no comentário de `commercialAgentTypes.ts`. São candidatos reais a
`REGISTERED BUT UNUSED`, não a bug de execução (o código roda se instanciado manualmente), mas a
gap de exposição: o catálogo (`GET /api/agent/commercial-cell`) os lista para o frontend, criando
risco de UI que anuncia uma capacidade sem endpoint de execução por trás. Recomendação: handoff ao
Agente 07 (dono de `src/features/intelligence/agents/`) para decidir se cada um ganha rota própria
(mesmo padrão dos 3 já wired) ou é reclassificado como `MAPEADO_NAO_IMPLEMENTADO` no próprio
registry.

### A.3 — Job Roles / Agent Runtime genérico — `src/features/job-roles/`

Sistema **separado e mais recente** (comentários citam "PROMPT 1" a "PROMPT 10", sugerindo
implementação sequencial numa única onda grande), orientado a dados via Prisma
(`JobRole`, `UserJobRole`, `AgentDefinition`, `AgentVersion`, `RoleAgentGrant`,
`AgentCapabilityGrant`, `RoleCapabilityGrant`, `AgentExecution`, `AgentHandoffMessage`,
`AgentMemoryRecord`, `RoleMemoryRecord`, `OrganizationMemoryRecord`, `AgentBuildProposal` — 13
models dedicados em `prisma/schema.prisma`). Fluxo de execução documentado no próprio código
(`agentRuntime.service.ts`): `actor autenticado → JobRole → AgentDefinition → AgentVersion ativa →
requestedCapability → CapabilityAuthorizationService → ToolBinding VERIFIED → executor real →
facts/evidence → result → audit`. Regra dura: **fail-closed** — um `AgentDefinition` sem executor
registrado nunca executa, mesmo com capability autorizada.

| Componente | Arquivo | Papel | Rota registrada em `src/bootstrap/routes.ts` | Status |
| --- | --- | --- | --- | --- |
| Catálogo de cargos | `jobRole.service.ts` + `jobRole.routes.ts` | CRUD de `JobRole`/atribuição a usuário | `/api/job-roles` | **ACTIVE** |
| Catálogo de agentes (PROMPT 2) | `agentCatalog.service.ts` (309 linhas) + `agentCatalog.routes.ts` | `AgentDefinition`/`AgentVersion`/`RoleAgentGrant` — CRUD versionado, upsert idempotente por `code`, usado para popular o catálogo a partir dos 12 agentes de A.2 e de um catálogo maior (ver abaixo) | `/api/agents` | **ACTIVE** |
| Capability Engine (PROMPT 3) | `capabilityAuthorization.service.ts` (439 linhas) + `capability.service.ts` + `capability.routes.ts` | Motor único de autorização — todo Agent Runtime e Agent Bus reusam este, nunca um segundo motor paralelo | `/api/capabilities` | **ACTIVE** |
| Agent Runtime genérico (PROMPT 4) | `agentRuntime.service.ts` (281 linhas) | Executa uma capability autorizada via `toolExecutors.ts`, persiste `AgentExecution` (auditoria completa) | Exposto indiretamente via `agentCatalog.routes.ts`/`roleSupervisor.routes.ts` (não confirmado um endpoint dedicado "run" nesta leitura — checar em auditoria de API-contracts) | **PARTIALLY ACTIVE** (motor real e wired ao catálogo/autorização, mas sem confirmação nesta auditoria de qual rota HTTP dispara `runAgentExecution` diretamente para um agente arbitrário do catálogo de 392) |
| Tool Executors | `toolExecutors.ts` (699 linhas) | Implementações reais por capability — nunca fabrica dado, chama serviços existentes | interno | **ACTIVE** |
| Role Supervisor (perfis) | `roleSupervisor.service.ts` (304 linhas) + `role-supervisor-profiles.ts` + `roleSupervisor.routes.ts` | Supervisão por cargo (perfis de supervisor por role) | `/api/role-supervisor` | **ACTIVE** |
| Workspace por cargo (PROMPT 6) | `workspace.service.ts` + `workspace.routes.ts` | Espaço de trabalho por login/cargo | `/api/workspace` | **ACTIVE** |
| Cross-Role Authorization (PROMPT 7) | `accessRequest.service.ts` (589 linhas) + `access-request-policy.ts` + `accessRequest.routes.ts` | Aprovações de acesso cruzado entre cargos, `TemporaryCapabilityGrant` | `/api/access-requests` | **ACTIVE** |
| Agent Bus + Handoffs (PROMPT 8) | `agentBus.service.ts` (729 linhas) + `agent-bus-policy.ts` + `agentBus.routes.ts` | Comunicação agente↔agente e cargo↔cargo estruturada (`AgentHandoffMessage`); nunca decide negócio, só transporta/autoriza/audita; entrega ao Agent Runtime (reusa idempotência via `correlationId: handoffId`); guarda contra loop (`isHandoffLoop`, `MAX_HANDOFF_DEPTH`, `MAX_HANDOFF_STEPS_PER_MISSION`) | `/api/agent-bus` | **ACTIVE** |
| Memória + Aprendizado (PROMPT 9) | `memory.service.ts` (618 linhas) + `memory-policy.ts` + `memory.routes.ts` | `AgentMemoryRecord`/`RoleMemoryRecord`/`OrganizationMemoryRecord` — memória governada em 3 escopos | `/api/memory` | **ACTIVE** |
| Agent Builder / Fábrica de Agentes (PROMPT 10) | `agentBuilder.service.ts` (648 linhas) + `agent-builder-policy.ts` + `agentBuilder.routes.ts` | Pipeline Need→Capability Search→Agent Search→Service Search→Gap Analysis→AgentSpec→...→Risk Review→**revisão humana**. Documentado explicitamente para **nunca publicar nada sozinho** (só lê, nunca ativa `AgentDefinition`/`AgentVersion`/`ToolBinding` reais, nunca aprova a própria proposta) | `/api/agent-builder` | **ACTIVE** como ferramenta de proposta; a publicação real de um agente novo é sempre manual — não confundir "rota ativa" com "agente se autocria" |
| Catálogo normalizado de 392 agentes | `src/features/job-roles/catalog/agents.normalized.json` (8001 linhas) + `agentCapabilities.normalized.json` (2315), `capabilities.normalized.json` (457), `roleCapabilities.normalized.json` (572) | Dados de importação em massa ("392 do PROMPT 2", citado em comentário de `agentCatalog.service.ts`) para popular `AgentDefinition` via `scripts/seed-multi-cargo.ts` (120 linhas) | Seed script, não uma rota | **UNKNOWN — requer verificação dedicada**: não confirmado nesta auditoria se os 392 agentes deste JSON já foram de fato semeados no banco de produção/homologação, quantos têm `AgentVersion` ativa com executor real em `toolExecutors.ts`, e quantos são só metadado sem capability implementada. Handoff recomendado a uma auditoria de `functional-completeness` dedicada a este catálogo especificamente — o risco central é catálogo de 392 "agentes" onde a maioria pode ser placeholder de dado (nome/descrição) sem `ToolBinding VERIFIED`, o que o próprio `agentRuntime.service.ts` trataria como fail-closed (não executa), mas que uma UI de catálogo mal informada poderia apresentar como disponível |

---

## B. Agentes de desenvolvimento (enxame que edita este repositório) — `AGENTS.md` + `.agents/`

Não são agentes de IA em runtime do produto — são o protocolo de trabalho para sessões de Claude
Code que desenvolvem este repositório. Listados aqui porque a tarefa pediu inventário de todo
orquestrador/agente encontrado, e porque "Coordenador"/especialistas usam linguagem idêntica
("supervisor", "handoff") à camada A, criando risco real de confusão em relatórios futuros — o
próprio `AGENTS.md` já alerta para isso na definição do Agente 13.

| Nome | Fonte | Papel | Status |
| --- | --- | --- | --- |
| 00 — Coordenador | `AGENTS.md`, `.agents/prompts/00-coordenador.md` | Orquestra ondas, cria worktrees/branches, faz merge em levas, roda gate de integração | **ACTIVE** (papel processual, sem código — reinstanciado a cada sessão que assume o papel) |
| 01 — Plataforma, Segurança e Dados | `.agents/prompts/01-plataforma-dados.md` | Dono exclusivo de `prisma/schema.prisma` e migrations | ACTIVE (processual) |
| 01A — Confiabilidade de Dados, RLS e Retenção | `.agents/prompts/01A-dados-rls-retencao.md` | Especialista interno do 01, mesmo slot (nunca roda simultâneo a 01) | ACTIVE (processual) |
| 02 — Produto e UX | `.agents/prompts/02-produto-ux.md` | Dono de `src/App.tsx`, navegação, Sidebar | ACTIVE |
| 03 — Design e Acessibilidade | `.agents/prompts/03-design-a11y.md` | Ver `.claude/CLAUDE.md` para a constituição visual que este papel segue | ACTIVE |
| 04 — CRM e BI | `.agents/prompts/04-crm-bi.md` | — | ACTIVE |
| 05 — Prospecção | `.agents/prompts/05-prospeccao.md` | — | ACTIVE |
| 06 / 06A — Integrações e Bitrix / Extrações Bitrix | `.agents/prompts/06-*.md` | Mesmo-slot entre si | ACTIVE |
| 07 — IA e Automações | `.agents/prompts/07-ia-automacoes.md` | Dono de `src/features/intelligence/agents/` (camada A.1/A.2 acima) | ACTIVE |
| 08 — QA e Release | `.agents/prompts/08-qa-release.md` | Dono de `.github/workflows/**`, `Dockerfile`, `docker-compose.yml` da raiz; co-dono do "gate técnico completo" (papel do extinto "Agente 19") | ACTIVE |
| 09 — Mobile | `.agents/prompts/09-mobile.md` | Dono de `android/**`, `capacitor.config.ts` | ACTIVE |
| 10 — Infraestrutura, Observabilidade e SRE | `.agents/prompts/10-infraestrutura-sre.md` | Dono de `k8s/**`, `argocd/**`, `charts/**`, `infrastructure/**` | ACTIVE |
| 11 — Marca e Ativos Institucionais | `.agents/prompts/11-marca-institucional.md` | Dono de `identidade-visual/**`, `documentacao-aplicacao/**` | ACTIVE |
| 12 — Voz e Telefonia (Birthub Voices) | `.agents/prompts/12-voz-telefonia.md` | — | ACTIVE |
| 13 — Enxame Autônomo e Governança de Agentes de Runtime | `.agents/prompts/13-enxame-governanca-agentes.md` | **É o dono meta que instalou/audita a camada A inteira deste inventário** — nomenclatura explicitamente distinta dos agentes de dev 00-18 | ACTIVE |
| 14 — Ambiente de Execução e Test Harness | `.agents/prompts/14-ambiente-execucao-harness.md` | Co-dono do gate técnico completo | ACTIVE |
| 15 — Segurança Aplicada e Rotação de Segredos | `.agents/prompts/15-seguranca-aplicada.md` | — | ACTIVE |
| 16 — Runtime, Workers e Escala | `.agents/prompts/16-runtime-workers-escala.md` | Dono de filas BullMQ, cron, `worker.ts` | ACTIVE |
| 17 — Cadência Multicanal e Ciclo de Receita | `.agents/prompts/17-cadencia-ciclo-receita.md` | — | ACTIVE |
| 18 — Contratos, API e Documentação Viva | `.agents/prompts/18-contratos-api-docs.md` | OpenAPI, paridade de tipos | ACTIVE |
| "Agente 19 — Verificação Contínua" | citado em `.agents/runs/final-fase-0.md` a `final-fase-4.md` | — | **LEGACY / não existe mais no roster** — `AGENTS.md` reatribui explicitamente a responsabilidade a 14+08. Não referenciar como agente ativo |
| "Agente 20 — Experiência Real/smoke" | idem | — | **LEGACY / não existe mais no roster** — reatribuído a 02+03+08+14, com ressalva registrada e não totalmente resolvida (persistência em banco e sanitização de PII ponta a ponta ainda sem dono explícito único) |

---

## C. Subagentes/skills do Claude Code (ferramental de construção, não produto)

### C.1 — `.claude/agents/` (subagentes reais no formato Claude Code, front-matter `name:`/`tools:`/`model:`)

| Nome | Arquivo | Papel | Registrado | Invocado | Status |
| --- | --- | --- | --- | --- | --- |
| `impeccable-asset-producer` | `.claude/agents/impeccable-asset-producer.md` | Produz assets raster reutilizáveis a partir de referências aprovadas, sem redesenhar direção | Sim (front-matter válido) | Referenciado por `.claude/skills/impeccable/reference/live.md` e `new-work.md` | **ACTIVE** |
| `impeccable-documenter` | `.claude/agents/impeccable-documenter.md` | Registra `DESIGN.md` a partir do artefato construído (não da intenção) | Sim | Referenciado pelos mesmos dois arquivos de referência | **ACTIVE** |
| `impeccable-finish-reviewer` | `.claude/agents/impeccable-finish-reviewer.md` | Revisor de acabamento contra contrato de direção/comp aprovado; nunca renderiza, só lê arquivos | Sim | Idem | **ACTIVE** |
| `impeccable-manual-edit-applier` | `.claude/agents/impeccable-manual-edit-applier.md` | Aplica lotes de edição manual arrendados (`manual_edit_apply`) a source real | Sim | Idem | **ACTIVE** |

Todos os 4 pertencem exclusivamente ao fluxo da skill `impeccable` (design/crítica de UI) — não têm
relação com os agentes de runtime do produto (camada A) nem com o enxame de desenvolvimento
(camada B).

### C.2 — `.agents/skills/mantis-*` (18 skills, campanha de revisão de segurança autônoma)

Conjunto de skills (`mantis-meta-agent`, `mantis-plan`, `mantis-researcher`, `mantis-critic`,
`mantis-patch`, `mantis-review`, `mantis-reproduce`, `mantis-threat-model`,
`mantis-structural-index`, `mantis-dedupe`, `mantis-summarize`, `mantis-report`,
`mantis-reflect`, `mantis-history`, `mantis-chain`, `mantis-calibrate`, `mantis-advise`,
`mantis-architecture`, `mantis-pipeline-adapter`) que implementam uma campanha contínua e autônoma
de revisão de segurança, com `mantis-meta-agent` explicitamente descrito como "supervisor
persistente" que lança e monitora a campanha (opt-in de sincronização/snapshot via `--sync`,
retenção de snapshots via `--snapshot_keep`). Duplicado também em `.agents/skills/mantis-*` (mesma
árvore aparece em `.agents/skills/` e não em `.claude/skills/` — os dois diretórios de skills têm
conjuntos parcialmente sobrepostos e parcialmente distintos; ver observação abaixo).

**Status:** **UNKNOWN quanto a uso real** — esta auditoria não encontrou evidência de que a
campanha mantis já rodou neste repositório (nenhum diretório `.mantis_snapshots/` nem
`workspace/mantis` encontrado na exploração superficial feita aqui). Tratar como
**REGISTERED BUT UNUSED** até uma auditoria dedicada confirmar execuções passadas em
`.agents/runs/` ou histórico de commits.

**Achado de auditoria (duplicação de diretórios de skills):** `.agents/skills/` e `.claude/skills/`
contêm, cada um, uma cópia de `accessibility`, `api-contracts`, `design-system`,
`end-to-end-flow-validator`, `error-resilience`, `frontend-design`, `functional-completeness`,
`integration-audit`, `motion-design`, `performance`, `release-readiness`, `ui-ux`, `visual-qa` —
13 skills presentes nos dois lugares. `.claude/CLAUDE.md` seção 3 documenta a tabela de skills
como vivendo em `.claude/skills/`; `.agents/skills/` parece ser a cópia usada pelo protocolo de
`AGENTS.md`/enxame de desenvolvimento (mais os 18 `mantis-*` exclusivos e `database-integrity`,
que não está em `.claude/skills/`). Não foi verificado nesta auditoria se as duas cópias de cada
skill duplicada estão sincronizadas (mesmo conteúdo) ou já divergiram — risco real de
inconsistência de regra entre os dois protocolos. Recomenda-se handoff para o Agente 13 (dono da
governança de agentes) decidir se uma das árvores deveria ser apenas um link/referência para a
outra.

---

## Resumo por status (contagem)

| Status | Quantidade | Onde |
| --- | --- | --- |
| ACTIVE | 6 agentes do Swarm (A.1) + 3 agentes wired da Célula Comercial (A.2) + 10 componentes do Agent Runtime genérico (A.3) + 19 papéis processuais de dev (B, excluindo 19/20 legacy) + 4 subagentes Impeccable (C.1) = **42** |
| PARTIALLY ACTIVE | 1 (`agentRuntime.service.ts` — motor real, rota de disparo direto não confirmada nesta leitura) |
| REGISTERED BUT UNUSED | 5 agentes da Célula Comercial sem rota (`ldr-intelligence`, `coordinator-commercial`, `manager-commercial`, `executive-director`, `bitrix-guardian`) + 18 skills `mantis-*` (sem evidência de execução) |
| PLACEHOLDER | 1 (`billing-revenue` — implementado mas sem fonte real de dado por design) |
| LEGACY | 2 ("Agente 19", "Agente 20" — explicitamente descontinuados em `AGENTS.md`) |
| UNKNOWN | 1 grande item — catálogo de 392 agentes normalizados (`agents.normalized.json`) quanto a quantos têm `ToolBinding VERIFIED` real |

## Recomendações de handoff para outras auditorias especializadas

1. **functional-completeness / api-contracts:** confirmar se `agentRuntime.service.ts` tem uma rota
   HTTP que aceite `agentCode` arbitrário do catálogo de 392, e testar o caminho fail-closed
   descrito no próprio código (agente sem executor → nunca executa) com um agente real do JSON de
   392 que não tenha `ToolBinding`.
2. **integration-audit:** os 5 agentes `REGISTERED BUT UNUSED` da Célula Comercial — decidir com o
   Agente 07 se ganham rota ou são reclassificados no registry.
3. **design-system / release-readiness:** duplicação `.agents/skills/` vs `.claude/skills/` —
   confirmar se divergiram e propor fonte única.
4. **release-readiness:** catálogo de 392 agentes pode estar sendo exibido em UI de catálogo
   (`GET /api/agents`) sem garantia de executabilidade — checar `AgentDefinitionDto.isActive` vs
   existência real de `ToolBinding VERIFIED` antes de qualquer superfície de produto anunciar esses
   392 como "disponíveis".
