- De: 18
- Para: 11
- Onda: c0
- Status: aberto
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
