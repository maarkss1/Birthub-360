# V4 Master Roadmap

## P0 — SECURITY FREEZE

Nenhuma nova capability de produto entra como prioridade de crescimento enquanto os riscos P0 não forem tratados ou formalmente excepcionados.

Obrigatórios:

1. webhook replay protection;
2. CSRF dedicado;
3. BullBoard tenant data isolation;
4. decisão sobre rewrite de Git history/PII;
5. customer-specific URLs;
6. OPA enforcement real;
7. SECURITY_GUIDE alinhado aos 5 roles.

Gate: SECURITY_P0_CLOSED.

## P1 — PRODUCT CONVERGENCE

Definir oficialmente:

### Pillar 01 — CRM Comercial
- contas;
- contatos;
- oportunidades;
- pipeline;
- atividades;
- forecast;
- gestão de equipe.

### Pillar 02 — Prospecção Inteligente
- ICP;
- listas;
- enriquecimento;
- qualificação;
- cadências;
- priorização;
- execução SDR.

### Pillar 03 — Copiloto Comercial IA
- perguntas;
- recomendações;
- geração;
- análise;
- próximas ações;
- automações;
- agentes contextuais.

Todo novo módulo precisa declarar se pertence a um desses pilares ou se é Engine/Infrastructure.

Gate: PRODUCT_CONVERGENCE_GREEN.

## P2 — CONSOLIDATION

Consolidar antes de expandir:

- 4 interfaces de IA;
- componentes duplicados;
- placeholders;
- orphan capabilities;
- Novu;
- serviços duplicados;
- rotas redundantes;
- capabilities sem consumidor.

Gate: CONSOLIDATION_BASELINE_STABLE.

## P3 — CLEAN ARCHITECTURE

Reduzir 101 violações conhecidas.

Prioridade:

1. intelligence;
2. job-roles;
3. prospecting;
4. reports;
5. roleplay;
6. settings;
7. team;
8. gamification.

Gate: ARCHITECTURE_BOUNDARIES_GREEN.

## P4 — BRAIN REORG / WORKSPACES

Target:

Organization
→ RoleWorkspaceDefinition
→ WorkspaceLayout
→ Sections
→ Widgets
→ Permissions.

O Workspace vira o orquestrador da experiência por persona, não apenas um dashboard configurável.

Gate: WORKSPACE_SOURCE_OF_TRUTH_GREEN.

## P5 — UNIFIED INTELLIGENCE

Canonical route:

`/app/intelligence`

Mas a IA também deve existir contextualizada em CRM e Prospecção.

Gate: INTELLIGENCE_SURFACE_GREEN.

## P6 — SWARM OBSERVABILITY

Transformar a telemetria já existente em produto operacional para administradores e operadores.

Gate: SWARM_OBSERVABILITY_GREEN.

## P7 — INTEGRATION RESILIENCE

WhatsApp, opt-out, 3CX/Birth Voices, retries, idempotency, circuit breakers e failover.

Gate: INTEGRATION_RESILIENCE_GREEN.

## P8 — PRODUCTION / CLOUD SAAS

Managed PostgreSQL + pgvector, Redis, workers, CI/CD, observability, secrets, backup, restore, DR, SLO/SLI.

Não introduzir Kubernetes como pré-requisito.

Gate: PRODUCTION_READINESS_GREEN.

## P9 — CONTRACTS / DOCS

OpenAPI tags, security guide, runbooks, ownership, contracts, release evidence.

Gate: CONTRACTS_DOCS_GREEN.

## P10 — ML

Somente se:

`ML_DATA_GATE_GREEN`

Caso contrário:

`ML_BLOCKED_DATA_INSUFFICIENT`.

Gate: ML_READY ou ML_BLOCKED_DATA_INSUFFICIENT.
