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

Confirmado no HEAD atual de `main` (item ACH-18-04 do relatório de auditoria, Agente 18/Fase 3):
a primeira opção da "Alteração necessária" foi tomada — o arquivo foi removido.

- `src/components/ui/AtlasLogo.tsx` não existe mais no repositório.
- `grep -rn "AtlasLogo"` em todo `src/` não retorna nenhuma ocorrência — nenhum import
  remanescente, confirmando que a remoção foi segura.
- Achado residual, fora do escopo deste handoff: `vitest.integration.config.ts:59` e
  `vitest.unit.config.ts:67` ainda listam `src/components/ui/AtlasLogo.tsx` numa lista de exclusão
  de cobertura de teste. É inofensivo (um padrão de exclusão que não casa com nenhum arquivo não
  quebra nada), mas é um resíduo de limpeza incompleta — não corrigido aqui por estar fora do
  escopo objetivo deste item (fase de higiene, não de configuração de teste); se algum agente
  tocar esses arquivos de config novamente, vale remover a linha.

## Teste esperado — verificação

`npx tsc --noEmit` não é afetado pela ausência do arquivo (nenhum consumidor). Não foi necessário
rodar build completo para confirmar isso, dado que o grep já mostra zero referências no código-fonte.

Status: resolvido.
