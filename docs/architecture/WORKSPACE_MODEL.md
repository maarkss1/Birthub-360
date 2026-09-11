# Workspace Model — BIRTHUB-BRAIN-REORG / Onda C0

- **Agente responsável:** 02 — Produto e UX.
- **Data:** 2026-09-10.
- **Pré-requisito de leitura:** `BIRTHUB_PRODUCT_MODEL.md` §2 — este documento assume o achado de
  que já existe um sistema real de workspace por papel, não construído para este programa.

## 1. Contratos conceituais pedidos pela missão × o que já existe

A missão C0 do Agente 02 pede a definição de: `WorkspaceDefinition`, `WorkspaceModule`,
`WorkspaceWidget`, `WorkspaceAction`, `WorkspaceCapability`, `NavigationGroup`, `PermissionRule`.

Regra do programa: **"não criar uma arquitetura paralela"**. Por isso, cada contrato abaixo é
definido como **mapeamento sobre o que já existe**, não como tipo novo a implementar do zero.

| Contrato pedido pela missão | Equivalente real hoje | Arquivo | Gap identificado |
|---|---|---|---|
| `WorkspaceDefinition` | `RoleWorkspaceDefinition` (política fixa, comentário em schema) + o objeto `Workspace` retornado por `/api/workspace/me` | `prisma/schema.prisma` (comentário), `workspace.api.ts` | Hoje é 1 definição por `JobRole`, não por "workspace nomeado" (Commercial/Executive/Enablement/Operations do North Star). São dois eixos de agrupamento diferentes — ver §2. |
| `WorkspaceCapability` | `WorkspaceKpi` (`capabilityCode`, `label`, `description`, `domain`, `status: WorkspaceCapabilityStatus`) | `workspace.api.ts` | Já tem um campo `domain: string \| null` — candidato natural a carregar o nome do domínio `CORE` (`Intelligence`, `Agents` etc.) definido em `BIRTHUB_PRODUCT_MODEL.md` §3, mas hoje `domain` vem de `catalogEntry?.domain`, uma origem que não foi auditada nesta rodada (achado C0-WM-1, ver §4). |
| `WorkspaceAction` | Não existe um tipo equivalente isolado — ações hoje são implícitas nas telas de cada módulo comercial | — | Gap real. Não inventar agora; primeiro confirmar com o Agente 00 se `WorkspaceAction` é necessário como contrato de dados ou se é só um padrão de UI (`WorkspaceReadySection`) sem persistência própria. |
| `WorkspaceModule` | Aproximação: os 27+ módulos de `src/features/**` listados em `BRAIN_TRUTH_MAP.md` §2 | `src/features/**` | Módulo de pasta ≠ módulo de workspace hoje — não há agrupamento de várias pastas sob um "WorkspaceModule" nomeado. |
| `WorkspaceWidget` | `WorkspaceReadySection` (compartilhado entre `WorkspaceHome.tsx` dedicado e `AdaptiveDashboard.tsx`) | `src/components/workspace/WorkspaceReadySection.tsx` | Existe um único widget guarda-chuva hoje, não uma coleção componível de widgets por workspace. |
| `NavigationGroup` | Os grupos de `Sidebar.tsx` (`Captar`, `Qualificar`, `Relacionar`, `Fechar`, `Analisar`, `IA & Capacitação`, `Administração`) + `GROUP_ORDER_BY_ROLE` | `src/components/layout/Sidebar.tsx` | Já é exatamente esse conceito, só nomeado como "grupo de jornada", não "NavigationGroup" formal. Ver `NAVIGATION_TARGET.md`. |
| `PermissionRule` | `CapabilityDefinition` + `AccessRequest`/`ApprovalDecision`/`TemporaryCapabilityGrant` (Cross-Role Authorization, PROMPT 7) | `prisma/schema.prisma`, `src/features/job-roles/config/access-request-policy.ts` | Já existe, é mais sofisticado que um `PermissionRule` simples (tem aprovação, escopo temporário, matriz categoria→papel mínimo). Não simplificar ao integrar — risco de regressão de segurança. |

## 2. O gap real: dois eixos de agrupamento coexistindo sem contrato único

Hoje o produto tem **dois sistemas de agrupamento independentes**, nenhum ciente do outro:

1. **Por papel** (`JobRole` → `RoleWorkspaceDefinition` → `/api/workspace/me`) — decide *quais
   capacidades* um usuário vê em "Meu Workspace" e na home adaptativa.
2. **Por jornada comercial** (`Sidebar.tsx` → 7 grupos → `GROUP_ORDER_BY_ROLE`) — decide *como a
   navegação lateral inteira* é organizada e ordenada.

O North Star do programa (`Workspaces` no mínimo: Commercial/Revenue, Executive/Management,
Enablement, Operations) propõe um **terceiro eixo**: agrupamento por área de negócio, não por
papel individual nem por etapa de jornada.

**Isso não é um bug — é uma decisão de design ainda não tomada.** Três eixos de agrupamento
(papel, jornada, workspace-de-negócio) podem coexistir de forma consistente (ex.: um
`WorkspaceDefinition` "Commercial/Revenue" contém as 7 etapas de jornada, e um `JobRole` dentro
desse workspace enxerga um subconjunto de capacidades) — mas isso precisa ser desenhado
explicitamente antes da Onda C2, não descoberto durante a implementação.

## 3. Workspaces mínimos do North Star — mapeamento inicial (não decisão final)

| Workspace-alvo | Conteúdo candidato (de `BRAIN_TRUTH_MAP.md`) |
|---|---|
| **Commercial / Revenue** | Todo o §2.1-2.3 do Truth Map: CRM, prospecção, cadência, propostas, playbooks, roleplay, chatbook, comercial inteligente, analytics/win-loss |
| **Executive / Management** | BT-017 (Comercial Inteligente — já bloqueado por papel), BT-018/028 (Analytics/Reports), consumo de IA (BT-040) |
| **Enablement** | BT-022/023/024/025/026 — roleplay, editor, playbooks, chatbook, academy — hoje meio comercial, meio treinamento; fronteira não é nítida (achado C0-WM-2, §4) |
| **Operations** | BT-034 a BT-046 — governança, capabilities, automações, conectores, workspace admin |

Este mapeamento é um **ponto de partida para a Onda C2**, não uma atribuição final — o próprio
Agente 02 da Onda C2 deve revalidar contra o achado do §2 antes de mover qualquer rota.

## 4. Handoffs / achados abertos por este documento

- `.agents/handoffs/onda-c0/02-para-01-origem-domain-workspacekpi.md` (normal) — confirmar a
  origem de `catalogEntry?.domain` em `workspace.service.ts` antes de assumir que já mapeia aos 13
  domínios `CORE` do North Star (C0-WM-1).
- `.agents/handoffs/onda-c0/02-para-00-fronteira-enablement-comercial.md` (normal) — roleplay,
  playbooks, chatbook e academy têm uso tanto de capacitação quanto de execução comercial direta;
  decidir se ficam em `Enablement` ou se são compartilhados entre workspaces antes de mover rotas
  (C0-WM-2).
- Handoff already registrado em `BIRTHUB_PRODUCT_MODEL.md` §5 sobre workspace fixo-por-papel vs.
  configurável é **pré-requisito** deste documento inteiro — se a resposta for "manter fixo por
  papel", o modelo de 4 workspaces do North Star vira um agrupamento de navegação/documentação, não
  uma entidade de dados nova.
