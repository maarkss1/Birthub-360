- De: 18
- Para: 11
- Onda: c0
- Status: resolvido
- Prioridade: normal

## Problema
`src/components/ui/AtlasLogo.tsx` não tem nenhum import em todo `src/` (confirmado por grep
exaustivo em sessão anterior de catalogação visual deste mesmo produto). O arquivo exporta uma
função chamada `BirthHubLogo` — mesmo nome do componente oficial em
`src/components/brand/BirthHubLogo.tsx` — mas com geometria SVG antiga e cor laranja `#FF5618`
hardcoded (paleta da marca anterior, não Antique Gold).

## Arquivo(s) envolvido(s)
`src/components/ui/AtlasLogo.tsx`

## Alteração necessária
Remover o arquivo, ou confirmar por que ele deve permanecer (ex.: referência histórica
deliberada). Se removido, confirmar que nenhum build/lint/typecheck referencia o caminho.

## Teste esperado
`npx tsc --noEmit` e `npm run build` continuam verdes após a remoção.

## Contexto adicional
Já catalogado como achado BT-047 em `docs/architecture/BRAIN_TRUTH_MAP.md`. Baixo risco — nenhum
consumidor conhecido.

## Resolução
Verificado em 2026-09-11 (auditoria ACH-11-02, agente 11) em cima de `origin/main` atual: o
arquivo já não existe — foi removido no commit `2e36c92e` ("fix(marca): remove componente orfao e
cor da marca antiga em producao"), anterior a esta verificação. Confirmado:
- `ls src/components/ui/AtlasLogo.tsx` → arquivo inexistente.
- `grep -rn "AtlasLogo" src/` → nenhum resultado; nenhum import/consumidor em `src/`.
- `npx tsc --noEmit` → não referencia `AtlasLogo.tsx` (o único erro atual, `TS2345` em
  `src/shared/security/urlGuard.ts`, é pré-existente em `origin/main`, não relacionado a este
  handoff, e já corrigido numa branch de feature separada não mesclada — fora de escopo aqui).
- `npm run build` → verde (`vite build` + bundle do `server.cjs` via esbuild concluídos sem erro;
  apenas avisos pré-existentes de tamanho de chunk, não relacionados).

Referências residuais não removidas nesta resolução, por estarem fora do escopo do handoff (que
pedia apenas confirmar ausência do arquivo e atualizar o status) e não quebrarem build/lint/tsc:
- `vitest.unit.config.ts` e `vitest.integration.config.ts` ainda listam
  `src/components/ui/AtlasLogo.tsx` num array `coverage.exclude` — entrada agora inofensiva (glob
  sem match), mas tecnicamente obsoleta.
- `public/design-lab/assets/lab.js` e `audit-data.js` citam `AtlasLogo` como dado histórico de
  uma auditoria visual anterior (ativo estático, não código de produção).
- `docs/architecture/BRAIN_TRUTH_MAP.md` (achado BT-047) permanece como registro histórico do
  achado original — não é o handoff em si.

Nenhum desses é consumidor funcional; não bloqueiam a resolução deste item. Status alterado de
`aberto` para `resolvido`.

Confirmado de novo de forma independente (ACH-18-04, Agente 18/Fase 3), mesma conclusão.
