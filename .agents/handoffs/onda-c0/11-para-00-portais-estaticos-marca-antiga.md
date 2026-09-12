- De: 11
- Para: 00
- Onda: c0
- Status: aberto
- Prioridade: normal

## Problema

Quatro portais estáticos em `public/tools/` estão **ativos** (roteados em `App.tsx`, servidos via
iframe) e ainda exibem a marca/conteúdo antigo ao usuário final:

- `public/tools/treinamento-atlasgr/` (portal de treinamento completo, >200 arquivos, inclui kit de
  marca antigo `brand/atlas-logo*.svg`)
- `public/tools/propostas/`, `public/tools/social-selling/`, `public/tools/hub-inteligencia-marketing/`
  (mesma situação em menor escala)

Adicionalmente, `public/tools/portal-comercial/` (arquivos `totaltrac-*.html`) **não teve uso
confirmado nem descartado** nesta rodada — sem referência encontrada em `src/`, mas sem garantia
de que não há link direto fora do roteador React.

## Arquivo(s) envolvido(s)

`public/tools/treinamento-atlasgr/**`, `public/tools/propostas/**`,
`public/tools/social-selling/**`, `public/tools/hub-inteligencia-marketing/**`,
`public/tools/portal-comercial/**`.

## Alteração necessária

Para os 4 portais ativos: decidir se a atualização de marca é prioridade agora (Sprint 00→13 tem
freeze de escopo — isso conta como "correção de drift entre o que o produto diz que faz e o que o
código realmente faz", permitido pelo freeze) ou fica registrado para depois. Para
`portal-comercial/`: confirmar ausência total de referência (inclusive fora de `src/`, ex. e-mail
salvo, bookmark, link em documento) antes de decidir remoção.

## Teste esperado

Não aplicável nesta etapa — é decisão de priorização, não implementação.

## Contexto adicional

Detalhado em `docs/architecture/LEGACY_BRAND_CONTENT_MAP.md` §2.5. Nenhum destes é código morto —
são conteúdo de negócio real em rota ativa, o que muda o risco de "cosmético" para "inconsistência
institucional visível".
