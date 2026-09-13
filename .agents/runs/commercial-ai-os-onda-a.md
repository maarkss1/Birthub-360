# Commercial AI OS — Onda A (Navegação e contratos)

Data: 2026-09-09
SHA de entrada: `b4e6f66e6222003c38eb12478aeb2370cc247e6d` (branch `claude/commercial-ai-os-coordination-t6tumf`)
Coordenador: Agente 00, atuando também como 02 (rotas/URL state) e 04 (CRM) nesta onda — execução
sequencial de uma pessoa só, não paralela; worktrees não usados por não haver concorrência real
entre especialistas nesta rodada.

## Decisão de governança — GOV-003 (freeze de escopo)

`/AGENTS.md` (raiz) registra um freeze de escopo ativo (decisão GOV-003, Sprint 00→13) que bloqueia
feature nova fora de promessa já feita, permitindo só bug/débito técnico/segurança/RBAC/tenancy/
LGPD. O pedido do usuário (implementar o "Commercial AI Operating System" com as 31 capabilities do
prompt do Agente 00) é majoritariamente escopo novo, não remediação.

**Decisão**: o usuário autorizou explicitamente, via pergunta direta neste turno, que este pedido
substitui a GOV-003 para esta iniciativa específica. Registrado aqui como evidência da autorização —
não é uma decisão unilateral do Coordenador. Qualquer especialista que ler este arquivo deve tratar
o freeze como suspenso apenas para o escopo deste pedido (deep links, URL state, Action Bar,
Saved Views, Undo, Next Best Action, IA agentic, etc.), não como revogação geral da GOV-003.

## Auditoria prévia (obrigatória, seção 12 do CLAUDE.md / processo do coordenador)

Rodada uma auditoria completa do código real (não de `.agents/runs/` antigos) antes de tocar em
qualquer arquivo. Achados relevantes para esta onda:
- Já existem: Command Palette (`⌘K`) robusto, Kanban real (`@dnd-kit`) com batch actions e rollback
  otimista, Timeline estruturada (`TimelineEvent`+`LeadStageHistory`+`LeadFieldChange`),
  `AIPendingAction` (aprovação humana/confidence/riskLevel/idempotency) e `AuditLog` no schema,
  OpenAPI com `verify:openapi-drift`, RLS em 40/99 migrations.
- Não existiam: deep link `/leads/:id` (o detalhe abria só via state local `selectedLeadId`, nunca
  refletido na URL), Action Bar nomeada, Saved Views de pipeline, Undo ledger distinto do
  `AIPendingAction`, botão "+ Novo" global, Shortcut Registry, Favoritos/Recentes, Breadcrumbs,
  Next Best Action.
- `GET /api/leads/{id}` já documentado em `docs/openapi.yaml` — nenhum contrato novo de API foi
  necessário para o deep link desta onda (Agente 18: nada a fazer aqui, capability já coberta).

## Escopo executado nesta onda (fatia mínima, sem invenção de UI nova)

Único ponto real de detalhe de Lead/Oportunidade no produto hoje é `LeadDetailDrawer`, aberto a
partir do Kanban (`src/components/CrmBoard.tsx`, rota `/app/crm`). "Oportunidade" não é uma
entidade separada — é o mesmo `Lead` com `funnel: 'Negocio'` (confirmado no schema). Por isso a
capability "deep links de leads e oportunidades" (P0 #1) e "persistência de filtros/visão/registro
aberto na URL" (P0 #2) foram resolvidas juntas, no único lugar onde a lacuna existia de fato:

- `src/components/CrmBoard.tsx`: o lead/negócio selecionado deixou de viver em
  `useState<string | null>` e passou a viver no parâmetro `lead` da URL (`useSearchParams`, mesmo
  mecanismo já usado para `funnel`). Abrir um card faz `push` (nova entrada de histórico); fechar
  (X, Escape, troca de funil) faz `replace` — Voltar do navegador fecha o drawer sem sair de
  `/app/crm`; recarregar a página com `?lead=<id>` reabre o mesmo drawer (o drawer já buscava o lead
  por `GET /api/leads/:id` de forma independente do array carregado no board — não precisou mudar).
  URL final: `/app/crm?funnel=Negocio&lead=<id>` — compartilhável, sobrevive a reload, respeita
  histórico do navegador.
- Nenhuma rota nova em `src/App.tsx`, nenhum componente novo, nenhuma migration — reuso do que já
  existia, só relocando a fonte de verdade do estado para a URL (regra "não recriar o que já
  existe" do CLAUDE.md).

Não implementado nesta onda (fora do corte mínimo, fica para Onda B): Action Bar nomeada dentro da
oportunidade, Saved Views, botão "+ Novo" global, Shortcut Registry, painel de atalhos "?",
breadcrumbs, favoritos/recentes — todos capabilities P0/P1 reais, mas exigem decisão de design
(seção 7 do CLAUDE.md) e tocam Sidebar/App.tsx mais a fundo; tratados como próxima fatia, não
espremidos nesta rodada para não misturar mudanças sem relação num único commit.

## Testes escritos e EXECUTADOS de verdade (não só código compilando)

Ambiente veio sem `node_modules` e sem Docker rodando — instalei dependências (`npm ci`) e subi o
Docker daemon + `npm run infra:up` (Postgres/Redis reais) para poder rodar o gate completo, não só
typecheck. `test:e2e` restrito ao Chromium local (`PLAYWRIGHT_CHROMIUM_EXECUTABLE`, mecanismo já
documentado em `playwright.config.ts` para este tipo de ambiente).

Testes novos adicionados em `tests/e2e/crm-kanban.spec.ts` (describe `LeadDetailDrawer`):
- `abrir o card grava o lead na URL; reload com ?lead= reabre o mesmo drawer`
- `botão Voltar do navegador fecha o drawer sem sair de /app/crm`

Resultado real de execução (Chromium, banco de teste isolado `prospectordb_test`, migrations
aplicadas):
- `npx tsc --noEmit` → **limpo, 0 erros**.
- `npm run lint` → **exit 0**, 38 warnings pré-existentes (nenhum em `CrmBoard.tsx`).
- `npm run test:architecture` (dependency-cruiser + hotspots) → **✅ 0 violações**; `CrmBoard.tsx`
  segue em 787 linhas (aviso não-bloqueante de tamanho, já existia antes desta onda — arquivo já
  estava acima do limite de 700 linhas).
- `npm run build` → **✓ built in 24.25s** (avisos pré-existentes de chunk grande e PWA globbing,
  não relacionados a esta mudança).
- `test:e2e` (Playwright, Chromium real) — **24 de 24 passaram**:
  - `crm-kanban.spec.ts` (12 testes: drag mouse/teclado, coluna vazia, drawer, incluindo os 2 novos
    de deep link) — 12/12 ✅
  - `crm.spec.ts` (9 testes: navegação, deep-link reload, botão Voltar) — 9/9 ✅
  - `crm-board.spec.ts` (2 testes) — 2/2 ✅
  - `accessibility.spec.ts -g "Pipeline CRM"` (axe-core na tela alterada) — 1/1 ✅, sem violação
    crítica/séria.

**Não executado nesta onda** (limite de escopo/tempo, não limitação de ambiente): a suíte completa
de `test:e2e` (18 specs), `test:unit`/`test:integration` completos, e as demais 29 telas de
`accessibility.spec.ts`. Nenhuma dessas foi declarada como passando — só o que rodou de fato está
listado acima.

## Definition of Done — capabilities tocadas nesta onda

| # | Capability | Estado | Evidência |
|---|---|---|---|
| P0-1 | Deep links de leads/oportunidades | **VERIFIED** (via `/app/crm?funnel=&lead=`) | `crm-kanban.spec.ts` (2 testes novos, passando) |
| P0-2 | Persistência de filtros/visão/registro aberto na URL | **VERIFIED** para o que existe hoje (funnel + registro aberto); não há outros filtros no Kanban ainda a persistir | mesmo teste acima + `crm.spec.ts` (reload/back pré-existentes, continuam passando) |
| P0-3 a P0-14, P1-15 a P1-24 | — | **NOT_STARTED** | fora do escopo desta onda |

## Commits

Ver commit desta onda no branch `claude/commercial-ai-os-coordination-t6tumf` (mensagem
`feat(crm): deep link e URL state do lead/oportunidade selecionado no Kanban`).

## Próximo passo

Onda B (CRM operacional — Agentes 04, 06, 17): Action Bar nomeada na oportunidade, Saved Views,
"+ Novo" global (toca Sidebar/App.tsx — handoff explícito para 02 antes de mexer), Shortcut
Registry. Requer decisão de design (seção 7 do CLAUDE.md — Action Bar/Saved Views são UI nova) antes
de implementar, não só engenharia. Rodar gate completo (incluindo suíte E2E cheia) antes de fechar
a onda.
