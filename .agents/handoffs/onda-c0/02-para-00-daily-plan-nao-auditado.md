- De: 02
- Para: 00
- Onda: c0
- Status: aberto
- Prioridade: normal

## Problema
`/app/daily-plan` existe como rota em `src/App.tsx` mas não foi coberto por nenhuma das três
auditorias funcionais lidas nesta rodada (`02-mapa-plataforma.md`,
`INVENTARIO_FUNCIONAL_COMPLETO.md`, `product-truth-wave-1.md`). Sem status conhecido
(real/parcial/mock), risco de perder a capacidade se for movido sem entender o que ela faz na
Onda C2.

## Arquivo(s) envolvido(s)
Módulo correspondente a `/app/daily-plan` em `src/features/**` (não identificado nesta rodada).

## Alteração necessária
Investigar e classificar o módulo (status real/parcial/mock, backend, dados) antes da Onda C2
mover qualquer rota do domínio comercial.

## Teste esperado
Não aplicável nesta etapa.

## Contexto adicional
Citado em `docs/architecture/BIRTHUB_PRODUCT_MODEL.md` §4 como achado C0-PM-1.
