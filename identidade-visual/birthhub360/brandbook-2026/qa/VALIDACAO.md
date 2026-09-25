# Validação — Brandbook Birth Hub 360º 2026

Reprodução: `node build-brandbook.cjs` e depois `node qa/check.cjs` (resultado em `qa/results.json`).

## Resultado (24/09/2026)

| Verificação | Desktop 1440 | Mobile 390 |
| --- | --- | --- |
| Erros de console/página | 0 | 0 |
| Violações axe-core | 0 | 0 |
| Imagens quebradas | 0 | 0 |
| Scroll horizontal (largura do body) | 1440 | 390 |
| Capítulos | 18 | — |
| Fontes carregadas (Cabin, IBM Plex Mono) | sim | sim |
| Downloads (8 SVG, tokens CSS/JSON, 2 fontes, 2 licenças) | 14 ok | — |
| Cópia de HEX, menu móvel, foco por teclado | ok | ok |

Ajustes desta rodada:

- Piso de texto funcional subiu de 11px para 12px.
- Mobile tinha overflow horizontal (body 437px em viewport 390px) causado por `aspect-ratio` + `min-height` em `.cover-art`. Corrigido e coluna do grid da capa passou a `minmax(0,1fr)`.

## Limitações conhecidas

- `qa/design-detect.json` é de uma rodada anterior ao ajuste de 12px. Alertas remanescentes esperados: `tight-leading` em títulos display (intencional), `clipped-overflow-container` em pôster/slide/cartão (o corte do símbolo é decorativo) e um `box-shadow` no cartão de visita.
- Exemplos de aplicação são demonstrativos (placeholders `@exemplo.com`).
- Validado apenas em Chrome; sem teste em Safari/Firefox.
- Esta pasta é uma proposta, não a identidade implantada em produção.
