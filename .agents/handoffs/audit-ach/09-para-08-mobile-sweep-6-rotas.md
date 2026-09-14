- De: 09 (auditoria ACH-09-02)
- Para: 08
- Onda: audit-ach
- Status: aberto
- Prioridade: media (P2)

## Problema

`tests/e2e/mobile-sweep.spec.ts` mantém um array `MODULES` (linhas 6-37) usado para varrer, em
viewport mobile (393×851), todas as rotas navegáveis de `/app/*` em busca de overflow horizontal
ou tela branca. Esse array nunca foi atualizado com as mesmas 6 rotas que ACH-09-01 já havia
identificado como ausentes das allowlists nativas de deep link (Android/iOS):

- `workspace`
- `copiloto_ia`
- `daily-plan`
- `sdr-diagnostic-joao`
- `module-access`
- `commercial_intelligence` (a 6ª rota — não fazia parte do escopo de ACH-09-01, mas também está
  ausente aqui)

Confirmado em `origin/main` nesta data (2026-09-11): nenhuma das 6 strings aparece no array
`MODULES`. Enquanto isso não for corrigido, uma regressão de layout mobile (overflow horizontal,
tela branca) em qualquer uma dessas 6 telas não seria pega pelo gate de CI — o sweep simplesmente
não visita essas rotas.

Todas as 6 rotas são reais e montadas em `src/App.tsx`:
- `workspace` → linha 284 (`<Route path="workspace" element={<WorkspaceHome />} />`)
- `commercial_intelligence` → linha 325
- `copiloto_ia` → linha 336
- `daily-plan` → linha 343
- `sdr-diagnostic-joao` → linha 344
- `module-access` → linha 370

(ACH-09-01, que cobria as 5 primeiras nas allowlists nativas `VALID_TABS`/`validTabs`, já foi
corrigido — ver commit `a9f74f59 fix(deep-links): sincroniza VALID_TABS/validTabs nativos com
TAB_ROUTE_SET (ACH-09-01)`. Este item, ACH-09-02, é sobre a suíte Playwright de paridade mobile,
arquivo diferente.)

## Arquivo(s) envolvido(s)

- `/tests/e2e/mobile-sweep.spec.ts`

## Alteração necessária

`tests/` (e todas as subpastas, incluindo `tests/e2e/`) é propriedade exclusiva do Agente 08 —
"QA e Release" — por `tests/AGENTS.md` ("Dono: Agente 08 — QA e Release. Este arquivo governa
esta pasta e todas as subpastas."). Este handoff é um pedido de execução, não uma edição direta.

Ação proposta (idêntica ao que a auditoria ACH-09-02 já descreveu):

1. Adicionar `'workspace'`, `'copiloto_ia'`, `'daily-plan'`, `'sdr-diagnostic-joao'`,
   `'module-access'` e `'commercial_intelligence'` ao array `MODULES` de
   `tests/e2e/mobile-sweep.spec.ts` (mantendo o padrão de string simples já usado pelas outras 30
   entradas).
2. Rodar a suíte (`npm run test:e2e` ou o comando equivalente do gate local de `tests/AGENTS.md`)
   para confirmar que as 6 rotas novas passam sem overflow horizontal ou tela branca.

## Teste esperado

- `tests/e2e/mobile-sweep.spec.ts` → array `MODULES` passa a conter as 6 entradas novas (36 no
  total).
- `npm run test:e2e` (ou o alvo específico do arquivo) executa o teste "todos os módulos
  navegáveis ficam utilizáveis sem overflow horizontal ou tela branca" cobrindo as 6 rotas novas,
  sem falha nelas.

## Contexto adicional

Item de auditoria ACH-09-02 (P2, effort PP) do relatório `report-atualizado.html`. Levantado numa
worktree isolada (`fix/ach-09-02`, a partir de `origin/main`), sem alteração direta em
`tests/e2e/mobile-sweep.spec.ts` conforme a regra de propriedade exclusiva de arquivo por
`AGENTS.md`.

Não foi possível rodar `npm run test:e2e` nesta sessão mesmo que a alteração tivesse sido feita:
o daemon do Docker Desktop está completamente inacessível neste ambiente (`failed to connect to
the docker API`), e a suíte e2e depende da stack local (Postgres/Redis/Meilisearch) subida via
`docker compose`. Isso não muda a recomendação — é só uma limitação de ambiente desta execução,
não do item em si.
