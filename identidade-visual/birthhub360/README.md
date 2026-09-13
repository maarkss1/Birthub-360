# Birth Hub 360º — Identidade Visual

Fonte de verdade da marca da plataforma. Substitui `atlasgr/` e `totaltrac/`, que
descreviam as duas marcas do arranjo anterior (ver `../README.md`).

> **Sua central de comando inteligente: integrando dados, potencializando decisões
> e acelerando a execução.**

Origem: `Birth Hub 360 Brand Book Cinematic`, V2.0 (edição reformulada), 12 páginas.
Tudo aqui foi **medido** do brand book, não estimado — inclusive a geometria do
emblema (ver "Logo" abaixo).

## Paleta

| Cor            | Hex       | Papel                                           |
| -------------- | --------- | ----------------------------------------------- |
| Obsidian Black | `#0B132B` | Profundidade. Base institucional escura.        |
| Deep Iris      | `#5B21B6` | Inteligência em movimento. Apoio da órbita.     |
| Antique Gold   | `#D4AF37` | **Cor primária.** Valor, foco e assinatura.     |
| Snow White     | `#F8FAFC` | Respiro. Texto sobre superfície escura.         |
| Orbit Blue     | `#0065D2` | Terceira cor da órbita.                         |
| Parchment      | `#E9E4D9` | Superfície clara institucional.                 |
| Midnight       | `#08090F` | Fundo de página (um degrau abaixo do Obsidian). |

`Orbit Blue` aparece no brand book como `oklch(52% 0.19 255)`. O hex acima é a
conversão exata para sRGB — existe porque assets de marca (SVG, e-mail, impresso)
precisam de hex; no produto, use o token, não o valor cru.

### Regras do sistema cromático 360º (brand book, p. 08)

1. **USE** — halos, bordas, indicadores e hero sections.
2. **LIMIT** — um gradiente dominante por composição.
3. **ANCHOR** — base sempre Obsidian ou Snow White.
4. **GOLD** — reservar para valor, foco e assinatura.

> "O gradiente é movimento, não decoração."

## Tipografia

| Família                   | Uso                                                                                       |
| ------------------------- | ----------------------------------------------------------------------------------------- |
| **Bodoni Moda**           | Headlines, títulos, chamadas institucionais.                                              |
| **Inter**                 | UI, menus, textos, tabelas, dashboards, relatórios.                                       |
| Playfair Display _italic_ | Exclusivamente o "B" do emblema — já vetorizado nos SVGs, **não** é carregada em runtime. |

Escala do brand book: Display 44–72 · Título 28–36 · Subtítulo 16–20 · Corpo 10–14 ·
Label 8–10.

Os `.woff2` (latin + latin-ext, variáveis) vivem em `public/fonts/` porque são
servidos pela aplicação — não duplicados aqui. São os arquivos originais do brand
book, self-hosted: nenhuma requisição a CDN de terceiros.

## Logo

| Arquivo                                 | Uso                                                     |
| --------------------------------------- | ------------------------------------------------------- |
| `logos/birthhub360-simbolo.svg`         | Emblema completo. ≥ 96 px.                              |
| `logos/birthhub360-icone.svg`           | Redução estrutural para ícone/favicon/avatar. 32–96 px. |
| `logos/birthhub360-logo-horizontal.svg` | Emblema + logotipo. Assinatura institucional.           |

Os três são **arquivos-mestre vetoriais** (brand book, p. 05): sem dependência de
fonte instalada — o "B" e o logotipo são contornos, não `<text>`.

Anatomia (brand book, p. 04): núcleo = **B geométrico**; anel dourado = **precisão,
valor e confiança**; órbita 360º = **conexão, movimento e continuidade**; azul + roxo
= **tecnologia, inteligência e profundidade**.

O `birthhub360-icone.svg` não é o símbolo escalado: abaixo de ~96 px a coroa de
traços (0,7° de largura) vira ruído cinza e o "B" perde legibilidade. O ícone
remove a coroa, engrossa a órbita e amplia o "B" em 16%, preservando núcleo, anel
e barra. Regenerar os três a partir do mesmo gerador mantém os dois em sincronia.

### Área de proteção e tamanho mínimo (brand book, p. 05)

`X` = 1/4 do raio externo do emblema. Mantenha ao menos `X` livre em todo o
perímetro. Mínimos: **32 px** ícone/favicon, **96 px** símbolo completo.

### Não faça (brand book, p. 06)

- distorcer proporções
- girar o símbolo
- trocar as cores do anel
- adicionar sombras externas aleatórias
- inserir texto dentro da órbita
- usar sobre fundos sem contraste

## Como usar no produto

`tokens/birthhub360.css|.ts|.json` descrevem a **marca**. Os tokens de **produto**
(`--bg`, `--surface`, `--ink`, `--brand` …) vivem em `src/styles/globals.css` e
consomem estes valores. Em componentes React use `bg-brand`, `text-ink`,
`border-line` — nunca um hex de marca cru (`.claude/CLAUDE.md`, §7.7).

Abra `preview.html` antes de supor uma cor, um tamanho de logo ou um par
tipográfico.

## Voz da marca (brand book, p. 10)

Profissional · Tecnológica · Direta · Empowering.

Reduz complexidade, revela contexto e orienta a próxima ação — sem exagero
promocional. Valores: Innovation · Data Intelligence · Efficiency · Scalability.
