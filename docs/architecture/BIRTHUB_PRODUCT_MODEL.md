# Birthub 360 Product Model — BIRTHUB-BRAIN-REORG / Onda C0

- **Agente responsável:** 02 — Produto e UX.
- **Data:** 2026-09-10.
- **Regra seguida:** não alterar `src/App.tsx` nesta missão. Este documento é só o modelo
  conceitual que a navegação futura (`NAVIGATION_TARGET.md`) deverá refletir — nenhuma rota foi
  movida, nenhum componente foi tocado.

## 1. Produto-alvo

**Birthub 360 = Intelligent Business Command Platform**, seguindo o fluxo
`Dados → Contexto → Inteligência → Decisão → Execução → Resultado → Aprendizado` definido pelo
programa (`AGENTS.md` do BIRTHUB-BRAIN-REORG).

O domínio Comercial/Revenue continua sendo, de longe, o mais profundo e maduro do produto hoje
(ver `BRAIN_TRUTH_MAP.md` §2.1-2.3) — isso **não muda** nesta onda. O que muda é o papel dele na
arquitetura: de identidade estrutural do produto inteiro para **um workspace entre outros**,
tecnicamente equivalente aos demais.

## 2. Achado central desta missão

**O produto já começou essa transição, antes deste programa existir.** Evidência encontrada nesta
rodada (não catalogada em nenhuma auditoria anterior lida):

- `src/features/workspace/` (`WorkspaceHome.tsx`, `workspace.api.ts`) + `/api/workspace` já
  implementam um conceito real de "workspace por cargo": um usuário tem um `JobRole`, o `JobRole`
  resolve para um conjunto de KPIs/agentes/ferramentas com status individual
  (`WorkspaceCapabilityStatus`: `AVAILABLE | APPROVAL_REQUIRED | REQUEST | DISCOVER_ONLY |
  SOURCE_REQUIRED | FUTURE_TOOL | TOOL_UNAVAILABLE | NOT_GRANTED`), servido por
  `src/features/job-roles/services/workspace.service.ts`.
- A Sidebar já organiza a navegação por **jornada comercial** (`Captar → Qualificar → Relacionar →
  Fechar → Analisar → IA & Capacitação → Administração`) com ordem de grupo **reordenável por
  papel** (`GROUP_ORDER_BY_ROLE` em `Sidebar.tsx`, 4 papéis: `CLOSER`, `GESTOR`, `ADMIN`,
  `VISUALIZADOR`) — ou seja, já existe navegação adaptativa por perfil, só que hoje ela reordena
  grupos dentro de um único produto, não troca de workspace.
- `prisma/schema.prisma` documenta explicitamente, em comentário, que `RoleWorkspaceDefinition` (e
  os padrões irmãos `ToolBinding`/`RoleSupervisorProfile`/`ApprovalPolicy`) são **política fixa em
  código**, não tabela — decisão de arquitetura já tomada: *"política fixa de governança do
  produto, sem necessidade real de customização por organização em runtime"*.

**Implicação para o programa:** o North Star de `AGENTS.md` fala em "workspaces **configuráveis**".
A decisão de arquitetura já registrada no schema é o oposto — workspace fixo por papel, definido em
código. Isso não é um erro a corrigir nesta onda; é uma **decisão de produto pré-existente que
precisa ser confirmada ou revista explicitamente pelo Coordenador antes da Onda C2**, porque
qualquer `WorkspaceDefinition` novo desenhado sem essa informação corre o risco de duplicar (ou
contradizer) uma arquitetura que já existe e já está em produção. Handoff aberto em §5.

## 3. Core horizontal — mapeado ao que já existe (não construção do zero)

Cruzando o modelo-alvo do programa com `BRAIN_TRUTH_MAP.md` §2 e §4.1:

| Domínio-alvo (`AGENTS.md`) | Já existe como código real hoje | Onde |
|---|---|---|
| `Identity/Tenant` | sim — auth, `Team`, `Settings`, RLS por `organizationId` | `src/features/auth`, `src/lib/auth.ts` |
| `Capabilities` | sim, literalmente com esse nome | `CapabilityDefinition`, `/api/capabilities`, `src/features/job-roles/` |
| `Intelligence` | sim, mas fragmentado em 4 interfaces (achado já registrado, `INVENTARIO_FUNCIONAL_COMPLETO.md` #10) | Hub de IA, Copiloto, AI Studio, Central AI Suite |
| `Decisions` | sim, parcial | `AIPendingAction` + Central de Decisões (aba do Hub de IA) |
| `Automation` | sim, mas estreito (3×3) | `automation.engine.ts` |
| `Agents` | sim — é o Enxame (Supervisor/SDR/BDR/Closer/CRM/Ops/Learning) | `src/features/intelligence/agents/` |
| `Knowledge` | sim — RAG completo | `src/features/knowledge/` |
| `Connections` | sim — 6 conectores diretos + Chatwoot não catalogado (ver `BRAIN_API_CONTRACT_MAP.md` C0-API-1) | `src/features/integrations/*` |
| `Signals` | parcial — notificações/SSE existem; "sinal de negócio" como conceito horizontal (ex. WhatsApp de alta intenção) só existe dentro do Enxame | `notification.service.ts`, `ConversationSignal` |
| `Analytics` | sim | `analytics.service.ts`, `commercial-intelligence` |
| `Governance` | sim — LGPD, module-access, access-requests, feature-flags | `src/features/job-roles/`, `src/features/lgpd/` |
| `Observability` | sim, motor real (OTel/Prometheus/Langfuse/Loki) mas sem tela de produto (é operacional, não voltado ao usuário final) | `02-mapa-plataforma.md` §3.5 |
| `Workspaces` (não é domínio core, é o outro eixo) | sim — ver §2 acima | `src/features/workspace/` |

**Nenhum destes 13 domínios precisa ser criado do zero na Onda C1.** O trabalho de C1 é
**extração e nomeação** de código que já existe e já funciona, espalhado dentro de
`intelligence`/`job-roles`/`automations`/`integrations` — não construção nova. Isso muda
significativamente o risco e o esforço estimado da Onda C1 em relação ao que o North Star sozinho
sugere.

## 4. Domínio comercial — o que precisa ser preservado integralmente ao virar workspace

Lista de capacidades que `AGENTS.md` do programa já exige preservar, cruzada com
`BRAIN_TRUTH_MAP.md` (todas confirmadas como código real, não a criar):

CRM · companies/contacts · prospecting · activities · calendar · cadence · proposals ·
commercial/revenue intelligence · analytics/win-loss · playbooks · roleplay · SDR desk (Mesa de
Tratamento) · daily plan (`/app/daily-plan`, não detalhado em `BRAIN_TRUTH_MAP.md` — módulo
existe em `App.tsx` mas não foi coberto por nenhuma auditoria anterior; **achado C0-PM-1**,
handoff em §5 para o próprio Agente 02 investigar em C1, não bloqueador de C0).

## 5. Handoffs abertos por este documento

- `.agents/handoffs/onda-c0/02-para-00-workspace-fixo-vs-configuravel.md` (**alto/bloqueador para
  C2**) — o North Star do programa pede "workspaces configuráveis"; a arquitetura já implementada
  (`RoleWorkspaceDefinition`, comentário em `prisma/schema.prisma`) é deliberadamente fixa por
  papel, em código. O Coordenador precisa decidir, antes da Onda C2: (a) manter fixo por papel e
  redefinir o que "configurável" significa no North Star, ou (b) tornar de fato configurável — o
  que é uma mudança de arquitetura de dados (schema), não só de UI, e portanto teria dono no
  Agente 01/01A, não no 02.
- `.agents/handoffs/onda-c0/02-para-00-daily-plan-nao-auditado.md` (normal) — `/app/daily-plan`
  existe em `App.tsx` sem cobertura em nenhuma auditoria funcional lida; investigar antes de C2
  para não perder a capacidade ao mover rotas.

Ver o desenho de contratos conceituais em `WORKSPACE_MODEL.md` e o plano de navegação em
`NAVIGATION_TARGET.md`.
