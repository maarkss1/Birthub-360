# Histórico consolidado V0 → V4

## V0 — Baseline

A V0 representa o entendimento inicial do sistema e a preocupação de transformar a plataforma em uma execução governada.

Elementos preservados:

- inventário de produto e arquitetura;
- CRM;
- prospecção;
- BI;
- IA;
- agentes;
- automações;
- telefonia;
- WhatsApp;
- playbooks/treinamento;
- integrações;
- multi-tenancy;
- RBAC/RLS;
- filas/workers;
- RAG;
- observabilidade;
- CI/CD;
- testes;
- infraestrutura;
- riscos e dívida.

## V1 — Execution Foundation

Elementos preservados:

- backlog executável;
- definição de agentes;
- ownership;
- gates;
- critérios de aceite;
- segurança;
- integrações;
- qualidade;
- release;
- arquitetura;
- produção.

## V2 — Capability Expansion with Gates

Elementos preservados:

### ML
- dataset histórico;
- feature engineering;
- leakage prevention;
- train/test;
- XGBoost/Random Forest;
- Precision/Recall/F1/ROC-AUC;
- feature importance;
- model registry;
- scoring API;
- drift monitoring.

### Workspaces
- RoleWorkspaceDefinition;
- WorkspaceLayout;
- Sections;
- Widgets;
- Permissions;
- GET /api/workspaces/current.

### AI
- uma superfície Intelligence;
- Copilot;
- Agents;
- AI Studio;
- RAG/Knowledge;
- Swarm;
- Scoring;
- AI Activity;
- Governance.

### Security
- webhook replay;
- CSRF;
- BullBoard tenant isolation;
- Git history/PII;
- legacy leakage;
- OPA enforcement.

### Integrations
- Redis para estado efêmero do WhatsApp;
- Postgres para configuração durável;
- retry/circuit breaker/idempotency;
- unified opt-out.

### Production
- managed Postgres + pgvector;
- Redis/BullMQ;
- CI/CD;
- observability;
- backup/restore;
- DR;
- RPO/RTO.

## V3 — Convergence

A V3 reorganizou a execução em:

Security → Consolidation → Clean Architecture → Workspaces → Unified Intelligence → Swarm → Integrations → Production → Contracts → ML.

## V4 — Product Convergence

A V4 adiciona a conclusão estratégica da análise:

O maior risco não é somente dívida técnica. É **excesso de superfície de produto**.

Portanto, o plano passa a ter dois eixos:

### Experience Layer
CRM + Prospecção + Copiloto

### Engine Layer
Intelligence + Agents + Capabilities + Automation + Governance + RAG + Workers + Integrations + Infrastructure

O Engine continua crescendo somente quando isso melhora ou sustenta o Experience Layer.
