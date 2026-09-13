# Commercial AI OS — Onda B2b (Saved Views)

Data: 2026-09-09
SHA de entrada: base local em cima do commit da Onda B2a (PR #407, ainda em CI no momento desta
implementação — ver seção "Empacotamento" abaixo).
Coordenador: Agente 00, atuando também como 01/01A (schema/migration) e 04 (CRM) nesta fatia.

## Escopo

Fecha P0-8 (Saved Views) — decisões de escopo já confirmadas com o usuário antes de implementar
(ver Onda B2a): (1) view **pessoal**, não compartilhada; (2) construída **depois** de existirem
filtros reais no Kanban (busca + dono, já entregues na B2a) para não salvar um estado vazio.

## Achado real que mudou a execução da migration (não o desenho)

Ao gerar a migration via `prisma migrate dev --create-only`, o diff trouxe um volume grande de
mudanças **não relacionadas e destrutivas** já latentes entre `prisma/schema.prisma` e o histórico
de migrations aplicado — entre elas `DROP TABLE "KnowledgeChunk"`, colunas novas em `Prospect`
(`companyId`/`leadId`), um novo valor de enum `AutomationTrigger` e renomeações de índice. `prisma
migrate status` confirma que o BANCO está em dia com todas as migrations comitadas — ou seja, o
drift é entre o arquivo `schema.prisma` (editado por outra onda/PR sem gerar a migration
correspondente, algo que o próprio skill `database-integrity` deste projeto proíbe) e o histórico
real de migrations, não um problema introduzido por mim.

Não incluí nada disso na minha migration: descartei o arquivo gerado automaticamente e escrevi à
mão uma migration mínima (`20260909131444_saved_view`) só com `CREATE TABLE "SavedView"` + índices
+ FKs + RLS, extraídos do SQL que o Prisma já tinha calculado corretamente para essa parte
específica. Aplicada com sucesso via `prisma migrate deploy` (não `db execute` manual — mesmo
caminho que CI usa) contra o banco de teste.

**Isto é um achado a reportar, não algo que resolvi**: existe drift de schema real neste
repositório, fora do escopo desta fatia (não é meu de decidir se `KnowledgeChunk` deve mesmo ser
removido, nem revisei as mudanças de `Prospect`/`AutomationTrigger` de quem as fez). Sinalizado ao
usuário nesta sessão.

## O que foi implementado

**Schema** (`prisma/schema.prisma` + migration `20260909131444_saved_view`):
- Model `SavedView` — `id`, `name`, `organizationId`, `userId`, `funnel` ('Lead'|'Negocio'),
  `filters` (Json, `{owner?, q?}` — formato livre e versionável, um filtro novo não pede migration),
  `isDefault`, timestamps. `@@unique([userId, name])` evita duas views com o mesmo nome pro mesmo
  usuário. RLS habilitada por tenant (`organizationId`, mesmo padrão de toda tabela multi-tenant do
  projeto — ver `20260902130000_copiloto_ia_rls`); o isolamento "pessoal" (só o dono vê) é reforçado
  na camada de aplicação (`userId` no `where` de toda query do service), não confiado ao frontend.
- Distinto de propósito de `SavedSearch` (existente, é sobre prospecção/descoberta) — reaproveitá-lo
  misturaria dois conceitos de produto diferentes (ver comentário no schema).

**Backend**:
- `src/features/crm/services/savedView.service.ts` — `listSavedViews`/`createSavedView`/
  `deleteSavedView`, sempre escopados por `organizationId` E `userId`. Conflito de nome duplicado e
  "não encontrado" reaproveitam o tratamento global de erro do Prisma já existente em
  `errorHandler.ts` (P2002→409, e aqui um `deleteMany` com count 0 vira 404 explícito) — sem
  try/catch redundante.
- `src/features/crm/routes/savedView.routes.ts` — `GET/POST /api/crm/saved-views`,
  `DELETE /api/crm/saved-views/:id`, montado em `src/bootstrap/routes.ts` atrás de
  `authenticateToken`+`requireTenant` (mesmo padrão de `/api/leads`).
- `docs/openapi.yaml` — nova tag "Saved Views" + os 3 endpoints documentados. `npm run
  verify:openapi-drift` confirmando 0 drift estrutural depois.

**Frontend**:
- `src/features/crm/components/SavedViewsPanel.tsx` — mesmo padrão visual/estrutural de
  `SavedSearchesModal.tsx` (prospecção, já existente): `Dialog` + formulário de criação inline +
  lista com Aplicar/Excluir. Sem conceito de agendamento/execução (não existe aqui) — "Aplicar" só
  navega para a URL com o funil+filtros salvos.
- `CrmBoard.tsx`: botão "Views Salvas" no header, `handleApplySavedView` (reconstrói a URL inteira
  de uma vez — funnel+owner+q — e fecha qualquer drawer aberto, mesma lógica de
  `handleFunnelChange`).

## Testes escritos e EXECUTADOS de verdade

Novo arquivo `tests/e2e/saved-views.spec.ts` (nome já antecipado na lista de specs do prompt do
Agente 00 para a Onda H):
- `salvar a view atual e aplicá-la restaura o filtro de busca na URL` — fluxo completo pela UI:
  aplica filtro de busca, salva como view, limpa o filtro manualmente (prova que "Aplicar" restaura
  de verdade, não que a URL nunca mudou), reabre o painel, aplica a view salva, confirma a URL e o
  card visível de novo.
- `views salvas são pessoais — outro usuário não vê a view de ninguém mais` — dois usuários
  (`signUp()` duas vezes, `clearCookies()` entre eles porque `LoginScreen` redireciona quem já está
  autenticado antes de mostrar o formulário de cadastro de novo) — o segundo usuário não vê a view
  criada pelo primeiro via `GET /api/crm/saved-views` (lista vazia). Cobre isolamento real
  (RLS de tenant + filtro de `userId` na aplicação), não só a intenção de design.

Achados reais durante a escrita dos testes (não regressões, ajustes de locator):
- `Dialog.tsx` tem DOIS controles com nome acessível "Fechar" (X do cabeçalho via `aria-label`, e o
  botão do rodapé via texto visível) — `getByRole('button', {name:'Fechar'})` é ambíguo;
  `getByText('Fechar', {exact:true})` resolve porque só o botão do rodapé tem texto visível.
- `URLSearchParams` codifica espaço como `+`, não `%20` — comparar a URL bruta contra
  `encodeURIComponent` de um valor com espaço falha; lendo `new URL(...).searchParams.get('q')`
  evita depender do encoding exato.

Resultado real de execução (Chromium, banco de teste isolado, migration aplicada):
- `npx tsc --noEmit` → limpo.
- `npm run lint` → exit 0 (1 warning pré-existente, fora dos arquivos desta onda).
- `npm run format:check` / `npx prisma format` → limpo.
- `npm run verify:openapi-drift` → 0 drift estrutural.
- `npm run test:architecture` → 0 violações.
- `npm run build` → build de produção ok.
- `test:e2e` — **29/29 passando**: `crm-kanban.spec.ts` (18), `crm.spec.ts` (9),
  `crm-board.spec.ts` (2), `saved-views.spec.ts` (2, novos).

**Não executado nesta fatia**: `test:integration` completo (63+ arquivos, risco baixo dado que a
mudança é aditiva — nova tabela, novas rotas, nenhum comportamento existente alterado além do fix
de `owner` já coberto por teste próprio na B2a) e `accessibility.spec.ts` completo.

## Definition of Done — capability desta fatia

| # | Capability | Estado | Evidência |
|---|---|---|---|
| P0-8 | Saved Views (pessoal, funil+filtros) | **VERIFIED** | 2 testes novos (fluxo completo + isolamento por usuário), 29/29 E2E passando, migration aditiva aplicada e com RLS |

## Empacotamento / próximo passo

Implementado sobre a base local da Onda B2a (PR #407), que ainda estava em CI no momento desta
implementação. Ao fechar: se #407 já tiver sido mergeado, reinicio o branch a partir do `main`
atualizado (mesma disciplina das ondas anteriores — `git stash` + `checkout -B` + `stash pop`) antes
de commitar/empurrar esta fatia como PR novo.

Onda B concluída (B1 Action Bar/Timeline + B2a filtros + B2b Saved Views). Próximo passo real:
Onda C (Undo e persistência) ou Onda D (Copiloto) do plano original do Agente 00 — ambas exigem
decisão do usuário sobre qual seguir, e a primeira toca ledger/schema novamente (Agente 01/01A).

**Achado a comunicar ao usuário, fora do escopo desta fatia**: drift real entre `prisma/schema.prisma`
e o histórico de migrations aplicado (`KnowledgeChunk`, `Prospect.companyId/leadId`,
`AutomationTrigger` novo valor) — alguém editou o schema sem gerar a migration correspondente.
Recomendo investigar/gerar essa migration separadamente antes que outra onda tente `prisma migrate
dev` sem saber disso e acabe incluindo um `DROP TABLE` destrutivo sem perceber.
