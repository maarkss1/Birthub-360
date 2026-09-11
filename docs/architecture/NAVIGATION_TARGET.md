# Navigation Target — BIRTHUB-BRAIN-REORG / Onda C0

- **Agente responsável:** 02 — Produto e UX.
- **Data:** 2026-09-10.
- **Regra seguida:** nenhuma rota foi movida. `src/App.tsx`, `Sidebar.tsx` e `tabMeta.ts` não foram
  alterados — este documento descreve o alvo, para execução na Onda C2.

## 1. Inventário da navegação atual (evidência)

| Peça | Arquivo | O que faz hoje |
|---|---|---|
| Definição de rotas | `src/App.tsx` | 39 rotas sob `/app/*` + `/design-lab/*` + 5 rotas públicas (`/`, `/welcome`, `/login`, `/reset-password`, `/select-brand`, `/book/:slug`) |
| Metadados de aba | `src/components/layout/tabMeta.ts` | `TAB_META`: label + ícone por chave de rota, ~35 entradas |
| Agrupamento/ordem | `src/components/layout/Sidebar.tsx` | 7 grupos de jornada + `GROUP_ORDER_BY_ROLE` (4 papéis) |
| Command Palette | (não lido em detalhe nesta rodada — ver achado C0-NAV-1) | busca global, ⌘K |
| Home adaptativa | `src/features/dashboard` (`AdaptiveDashboard.tsx`, citado em `FEATURE-CLASSIFICATION.md`) | compõe `WorkspaceReadySection` + widgets de outras features reais |
| Workspace dedicado | `src/features/workspace/WorkspaceHome.tsx` | `/app/workspace`, mesma seção da home adaptativa, com estados de loading/erro/bloqueio próprios |
| Module Catalog | **não encontrado nesta rodada** — achado C0-NAV-2 | a missão original menciona "Module Catalog" como algo a analisar; nenhuma pasta/arquivo com esse nome foi localizado por grep. Pode ser um nome do North Star ainda não implementado, ou um sinônimo de `module-access`/`job-roles` catalog já existente (`CapabilityDefinition`). Não resolvido nesta rodada — handoff em §4. |

**Achado C0-NAV-1:** o Command Palette (citado como peça a analisar na missão) não foi lido a fundo
nesta rodada por tempo — só confirmado que existe (`src/components/ui/CommandPalette.tsx`, mesmo
padrão do catálogo visual produzido em sessão anterior deste mesmo Claude Code para o repositório
irmão). Fica como pendência explícita da Onda C2, não como "analisado e aprovado".

## 2. Modelo de navegação-alvo (proposta, não implementada)

Dado o achado de `WORKSPACE_MODEL.md` §2 (três eixos de agrupamento coexistindo), a navegação-alvo
proposta para avaliação do Coordenador é **hierárquica em 2 níveis**, não uma lista plana:

```
Nível 1 — Seletor de Workspace (novo)
  Commercial / Revenue · Executive / Management · Enablement · Operations
  (+ "Meu Workspace" por papel, se a decisão do handoff workspace-fixo-vs-configuravel mantiver
  esse conceito como complementar, não substituto)

Nível 2 — Dentro de cada Workspace: os grupos de jornada JÁ EXISTENTES em Sidebar.tsx
  (Captar, Qualificar, Relacionar, Fechar, Analisar, IA & Capacitação, Administração)
  — não recriar; o Workspace "Commercial/Revenue" herda os 7 grupos como estão hoje.
```

Isto **preserva** a reordenação por papel (`GROUP_ORDER_BY_ROLE`) dentro do Workspace comercial,
sem forçar um redesenho de UI que a missão explicitamente proíbe ("não fazer rewrite big-bang").

## 3. Rotas legadas — plano de alias/deprecation (exigido pela missão antes de qualquer remoção)

A missão exige que nenhuma rota pública/deep link seja removida sem alias. Levantamento nesta
rodada (não uma lista exaustiva — aprofundar na Onda C2):

| Rota | Situação | Plano proposto |
|---|---|---|
| `/select-brand` | Já é só redirecionamento (confirmado em `.claude/CLAUDE.md` do repositório: "`/select-brand` sobrevive só como redirecionamento") | Manter como alias permanente para `/welcome` — zero custo, já é o padrão adotado quando a marca dupla foi descontinuada. Nenhuma ação nova necessária. |
| `crm360` (`/app/crm360`) | Nome "Cockpit CRM" na UI, rota ainda `crm360` | Se a Onda C2 mover para dentro do Workspace Commercial, manter `crm360` como caminho técnico (não usuário-visível) — só o rótulo já divergiu do slug e isso não quebrou nada, é o padrão seguro. |
| Qualquer rota de `/app/*` movida para dentro de um Workspace | — | Regra geral proposta: manter o slug atual como sufixo dentro do novo prefixo de workspace (ex.: `/app/crm` → `/workspace/commercial/crm`, nunca `/app/crm` apontando para 404), com redirect 301/client-side do caminho antigo pelo prazo que o Agente 00 decidir. |

## 4. Handoffs abertos por este documento

- `.agents/handoffs/onda-c0/02-para-00-module-catalog-nao-encontrado.md` (normal) — "Module
  Catalog", citado na missão original como peça a analisar, não foi localizado no código. Precisa
  de esclarecimento do Coordenador: é uma peça nova a construir, ou um sinônimo de algo que já
  existe sob outro nome (C0-NAV-2)?
- Command Palette (C0-NAV-1) fica como item a auditar na Onda C2, não handoff bloqueador agora.

## 5. O que este documento não decide

- Não decide se o seletor de Workspace do §2 é uma tela nova, um dropdown na topbar, ou uma
  troca de contexto sem UI própria (herda o padrão antigo `BrandContext`, hoje removido). Isso é
  decisão de composição visual da Onda C2/C4 (Agente 03 — Design/A11y), não desta missão de
  arquitetura de informação.
- Não move nenhuma rota. Este documento é o plano; a execução é da Onda C2.
