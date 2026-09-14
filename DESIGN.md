# DESIGN.md — Strategy Playbook (Birth Hub 360, o livro da marca)

<!-- impeccable:design-schema 1 -->

Escopo: `docs/strategy/BIRTH_HUB_360_BRAND_PRODUCT_MARKET_PLAYBOOK.html` apenas — um documento
autocontido de comunicação estratégica, não uma tela do produto Birth Hub 360 (CRM). As regras de
design do produto real vivem em `.claude/CLAUDE.md` e não se aplicam 1:1 aqui; este arquivo
documenta o mundo visual *deste artefato específico*.

## Mundo visual

Livro digital editorial, página por página (não dashboard de scroll único). Tom: autoridade
executiva discreta — mais "livro de marca premium" que "landing page de SaaS". Modo: Experience na
abertura (capítulos 1–8), convergindo para Persuade no capítulo 8 e voltando a Read no apêndice.

## Paleta (tokens reais da marca — `src/config/brand.ts`, não inventados para esta peça)

| Token | Hex | Papel |
|---|---|---|
| `--gold` | `#D4AF37` | Antique Gold — cor de marca primária, protagonista |
| `--gold-soft` | `#EBD689` | Gold Soft — texto/acento sobre fundo escuro |
| `--iris` / `--iris-soft` | `#5B21B6` / `#8B5CF6` | Deep Iris — segunda cor da órbita |
| `--orbit` / `--orbit-soft` | `#0065D2` / `#4FA3FF` | Orbit Blue — terceira cor da órbita |
| `--obsidian` | `#0B132B` | Fundo base do livro inteiro |
| `--snow` | `#F8FAFC` | Branco/texto primário |

Único gradiente multicolorido usado: a órbita autorizada (ouro→íris→azul), como *background* no
anel do emblema — nunca como preenchimento de texto (ver nota abaixo). Status: `--st-confirmed`
`#4ADE9C`, `--st-hypothesis` `#9CB0FF`, `--st-recommendation` `#E8C468`, `--st-validate` `#F5A742`,
`--st-open` `#FB7185` — usados só como cor de texto de badges curtos, nunca como fundo sólido.

## Tipografia

- **Bodoni Moda** (`--font-display`) — títulos de capítulo, monograma do emblema, `chapter-tag`,
  labels em itálico. Peso 600 como base, 700–800 para o "Birth Hub 360" da capa.
- **Inter** (`--font-body`) — corpo de texto, tabelas, UI de navegação.
- Nenhuma outra família. O catálogo de referência que inspirou esta peça usava Cinzel/Sora/Outfit/
  Space Grotesk — deliberadamente não adotado; os tokens reais da marca têm precedência sobre a
  referência visual (ver `PRODUCT.md`, seção Brand Commitments).

## Componente assinatura — o emblema/halo

`.emblem`: anel externo em `conic-gradient` (ouro→íris→azul, autorizado pelo brand book para
"halos, bordas, indicadores e hero sections"), anel médio fino, núcleo com `radial-gradient` +
monograma "B" em Bodoni Moda itálico, cor sólida `--gold-soft` (**não** gradiente de texto — ver
Decisões abaixo). Usado na capa (grande, com leve rotação contínua `@keyframes emblemspin`, 40s,
respeitando `prefers-reduced-motion`), no botão "voltar à capa" (pequeno) e na contracapa.

## Estrutura / paginação

Cada `<article class="page">` é uma página completa (26 no total: capa, 8 capítulos narrativos,
introdução de apêndice + 15 capítulos de apêndice lettered A–O, contracapa). Navegação: clique nas
bordas (`.tapzone`), botões `‹›`, setas do teclado, swipe (mobile), e um drawer de Sumário
(`#toc-drawer`) com as duas partes do livro. Transição de página via `transform: translateX + 
rotateY` (leve efeito de "virar página"), com fallback instantâneo sob `prefers-reduced-motion`.

Modo alternativo `.continuous` (botão "Ler como documento"): remove a paginação absoluta e
renderiza todas as páginas em fluxo normal, com scroll nativo — usado para leitura assistiva,
impressão (`@media print` reaproveita esse layout) e como saída de emergência para quem não quer a
mecânica de livro.

## Decisões de craft (o que foi recusado e por quê)

- **Sem eyebrow/kicker acima dos títulos de capítulo** — o antigo "pill" com versão/data foi
  removido; virou um masthead editorial de régua fina (linha `.masthead`, já removida nesta versão
  já que a capa não usa mais nem essa variante — o único metadado de versão vive no rodapé/
  contracapa).
- **Gradiente de texto removido** — a primeira versão usava `background-clip:text` no "B" do
  emblema e no "Birth Hub 360" da capa. Corrigido para cor sólida (`--gold-soft`) após o detector
  de design apontar o padrão como "AI tell"; o brilho fica só no *anel* do emblema (que é, de fato,
  o halo autorizado pelo brand book), não na tipografia.
- **Sem `box-shadow` de brilho colorido** — o núcleo do emblema tinha um `inset box-shadow` dourado
  de offset zero; removido. A sensação de luz vem só do `radial-gradient` de fundo.
- **Sem borda lateral colorida em callouts** — `.callout` usa um ícone circular "i" inset em vez de
  `border-left` grosso.
- **Números de página são intencionais aqui** — diferente de uma tela de produto comum, a sequência
  literalmente é um livro; "Página X de 26" e a rotulagem "Capítulo N" / "Apêndice X" carregam
  informação real de progresso, não são o clichê de seção numerada gratuita.

## Débito conhecido / próxima rodada

- Revisão formal via `impeccable-finish-reviewer` **não foi executada** nesta sessão — o ambiente
  não expôs um jeito de persistir os screenshots do Browser pane em arquivo para o pacote do
  revisor. A verificação que substituiu essa etapa foi manual, via JS no console do navegador:
  contraste (cálculo WCAG), overflow horizontal, hierarquia de heading, varredura por
  "undefined"/"NaN" vazando de dado ausente, responsividade mobile e teste de interações
  (paginação, sumário, abas, acordeões, modo contínuo). Recomenda-se rodar a revisão formal com
  screenshots reais na próxima sessão que tiver esse caminho disponível.
- `.impeccable/mocks/decision/` não foi populado (build code-led, sem geração de imagem
  disponível neste ambiente) — não há comp aprovado para auditar contra.
