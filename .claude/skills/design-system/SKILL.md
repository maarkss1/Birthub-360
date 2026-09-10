---
name: design-system
description: Use antes de criar um token de cor/espaçamento/radius, uma variante de componente, ou qualquer padrão visual reutilizável. Evita duplicar o sistema de tokens já existente (Tailwind 4 CSS-first em globals.css) e documenta as duplicações intencionais que não devem ser "consolidadas" ingenuamente.
---

# Design System — Birth Hub 360º

## Onde os tokens vivem

Tailwind 4, **CSS-first** — não existe `tailwind.config.*`. Todo token é definido em
`src/styles/globals.css`, dentro de `:root` (valores base), `.dark` (overrides de dark mode) e
`@theme` (mapeamento pro Tailwind: `--color-*`, `--radius-*`, `--shadow-*`, `--animate-*`).

Antes de adicionar um token novo, procure primeiro se ele já existe:

| Categoria | Tokens existentes |
|---|---|
| Superfície | `--bg`, `--surface`, `--surface-2` |
| Texto | `--ink`, `--ink-2` |
| Borda | `--line` |
| Marca | `--brand` (Antique Gold), `--brand-2` (Gold Soft), `--on-brand` (Obsidian, texto sobre marca), `--color-brand-active` (hover da superfície), `--color-brand-ink` (marca como texto sobre fundo claro), `--iris`, `--orbit-blue` |
| Semântico | `--warn`, `--ok`, `--color-success/warning/danger/info` |
| Radius | `--radius-card` (1.25rem), `--radius-card-lg` (1.75rem) |
| Sombra | `--shadow-card` (elevação neutra, reage a tema); `--shadow-brand-sm`/`--shadow-glow-brand`/`--shadow-glow-brand-strong` (glow reativo à marca via `color-mix(var(--brand))` — usar em vez de `rgba(255,86,24,...)` cru) |
| Fonte | `--font-brand-sans` (Inter, interface) e `--font-brand-display` (Bodoni Moda, H1-H3) — self-hosted em `public/fonts/` |
| Tipografia | `--text-h1`..`--text-h6` (escala responsiva `clamp()`, gera utilitários `text-h1`..`text-h6`; já aplicada por padrão em `<h1>`-`<h6>` via `@layer base`) |

## Os três tokens de marca não são intercambiáveis

Com o Antique Gold, cor de marca e cor de texto deixaram de poder ser a mesma coisa. São três
papéis distintos, e trocar um pelo outro produz falha de contraste silenciosa:

| Token | Papel | Par obrigatório |
|---|---|---|
| `--color-brand` | superfície de marca (botão, chip ativo) | `text-on-brand` (Obsidian, 8.74:1) |
| `--color-brand-active` | **hover/pressed** dessa superfície | `text-on-brand` (6.37:1) |
| `--color-brand-ink` | cor de marca usada como **texto** sobre fundo claro | superfície clara (4.6:1+) |

`text-white` sobre `bg-brand` mede **2.10:1** e nunca é aceitável — é o erro mais provável ao
portar um componente antigo, porque com a marca anterior (laranja escuro) esse era o par correto.

O gradiente `from-brand to-brand-2` fica dentro da família do ouro de propósito: é fundo de botão
com um único texto em cima, e um gradiente ouro→roxo não teria cor de texto que passasse nas duas
pontas. O gradiente 360º completo (ouro → íris → azul) existe para halo/borda/hero, nunca para
superfície com texto.

Se uma tarefa pedir "consolidar tokens de cor", trate como uma decisão de arquitetura de branding,
não uma limpeza de CSS — a nota original sobre isso
(`DESIGN_QA_CENTRAL_ATLASGR.md`, DQA-10) foi removida do controle de versão em 22/08/2026 (ver
`docs/REMOVED-DOCS.md`); o raciocínio que importa está resumido no parágrafo acima.

## Radius — convergir, não fragmentar mais

Histórico: `Button`, `Card`, `Dialog`, `Skeleton`, `EmptyState`, `Badge` tinham 5 valores de radius
diferentes sem escala compartilhada. Já convergido parcialmente para `rounded-card`/
`rounded-card-lg` em `Card`/`Dialog`/`EmptyState`. Ao criar um componente novo com cantos
arredondados, use esses dois tokens em vez de um valor `rounded-*` arbitrário do Tailwind — exceto
onde o radius é semanticamente diferente por design (pill de `Badge`, painel edge-to-edge de
`Drawer`).

## Primitivos de UI existentes (`src/components/ui/`)

Componha a partir daqui antes de criar algo novo: `Button` (cva, variantes), `Card` (cva),
`Badge` (cva), `Dialog`, `Drawer`, `Skeleton`, `EmptyState`, `Pagination`, `Timeline`, `Toaster`.
`Button`/`Card`/`Badge` usam `class-variance-authority` (`cva`) para variantes — siga esse padrão
ao adicionar uma variante nova em vez de criar classes condicionais soltas.

## Marca única — o que mudou na verificação

Até 09/2026 a plataforma trocava de marca em runtime (`data-brand` no `<html>`, `--brand` reescrito
por JS) e toda decisão de cor precisava ser conferida em 4 combinações (2 marcas × 2 temas). Não
mais: a marca é uma só e a cor vive inteiramente em CSS. **Restam 2 combinações: claro e escuro.**

Se encontrar `data-brand`, `activeBrand`, `isAtlas`, `atlas-orange` ou `totaltrack-blue` em algum
lugar, é resíduo — não reintroduza o mecanismo, migre para os tokens.

O que aquele seletor de fato controlava no CONTEÚDO virou o **playbook comercial**
(`src/config/playbooks.ts`, `src/hooks/useActivePlaybook.ts`): recorte de objeções, qualificação,
personas e histórico do copiloto. É dado comercial, não cor — nunca o use para decidir estilo.

## Tema (claro/escuro) continua sendo um eixo à parte

"Usar token" não significa automaticamente "reagir a tema". `bg-bg`/`text-ink`/`border-line`
resolvem tema (via a classe `.dark` que `ThemeContext.tsx` aplica em `<html>`); um hex cru ou uma
cor fixa da escala Tailwind não. Antes de aplicar cor num componente, confirme: existe token
semântico para esse papel? Ele já foi calibrado nos dois temas?

Antes de aplicar uma mudança baseada em tema num componente, confirme nesta ordem: o componente
tem uma variante/prop própria para tema, ou você precisa ler `useTheme()` manualmente? Ele já
existe em versão consciente de tema, ou você vai introduzir a primeira? Exemplo real:
`BirthHubLogo`/`BirthHubWordmark` (`src/components/brand/BirthHubLogo.tsx`) já resolvem sozinhos —
a rampa metálica do logotipo só entra no `dark:`, o claro usa Obsidian sólido (ver comentário no
próprio componente e Piloto 033 em `.claude/PILOTS.md`) — não recalcule isso manualmente na tela
que os consome. Verifique sempre as 2 combinações mínimas antes de considerar pronto: light e dark.
(Eram 4 até 09/2026, quando existiam duas marcas trocáveis em runtime — ver Pilotos 001/002 para o
histórico daquele mecanismo, hoje removido.)

## Cor de marca ≠ cor semântica ≠ identidade de terceiro — três eixos diferentes

Achado real do Piloto 002 (`DecisionMakerSearch.tsx`/`CandidateCard.tsx`, ver `.claude/PILOTS.md`):
um selo "HUNTER" usava `bg-neon-purple/20 text-neon-purple` — uma classe Tailwind que nunca existiu
em `globals.css` (`grep` por `--color-neon`/`neon-purple` não encontra nada), então o selo
renderizava sem cor nenhuma, silenciosamente, sem erro no console. Antes de escolher a cor de
qualquer elemento visual, classifique primeiro a qual dos eixos ele pertence — cada um tem sua
própria fonte de verdade, e não são intercambiáveis:

- **Marca** (`--brand`/`--brand-2`/`--on-brand`/`--iris`/`--orbit-blue`) — identidade da
  plataforma. Uma marca só; o que muda é o tema.
- **Semântica de produto** (`--color-success`/`--color-warning`/`--color-danger`/`text-danger`/
  `text-warn`) — sucesso, erro, aviso. Já existe token pronto; não reinvente com Tailwind cru
  (`text-red-600`, `text-amber-300`) nem com uma classe nunca definida.
- **Identidade de terceiro** (ex.: azul do LinkedIn, verde do WhatsApp em `DecisionMakerSearch.tsx`)
  — cor fixa por design, porque representa a marca de outro produto, não a nossa. Legítimo manter
  hardcoded; não "corrija" para um token nosso.
- **Interação/seleção sem significado externo** (ex.: a paleta índigo de todo o
  `DecisionMakerSearch.tsx` hoje) — candidata a virar token, mas migrar isso é decisão de
  design/produto (qual token, ou se vira `--accent-*` novo), não uma troca mecânica de classe.

Ao encontrar uma classe de cor no código, pergunte a qual desses quatro grupos ela pertence antes
de decidir se conserta, mantém ou escala para decisão de produto — e sempre confirme que a classe
usada resolve para uma cor real (`grep` em `globals.css`), não assuma que existe.

## Checklist de saída

- [ ] Nenhum token novo foi criado sem antes confirmar que não existe equivalente em `globals.css`.
- [ ] Cor de marca usa token (`bg-brand`/`text-brand-ink`), nunca hex cru nem classe estática de
      marca antiga (`atlas-orange`/`totaltrack-blue`, que não resolvem mais para cor nenhuma).
- [ ] Toda superfície `bg-brand`/`bg-brand-active`/`from-brand` tem `text-on-brand` em cima —
      nunca `text-white`.
- [ ] Radius novo usa `--radius-card`/`--radius-card-lg`, a menos que haja motivo semântico para
      justificar por que (pill de `Badge`, painel edge-to-edge de `Drawer`).
- [ ] Variante de componente nova segue o padrão `cva` já usado em `Button`/`Card`/`Badge`.
- [ ] Testado (ou revisado mentalmente) em light e dark — 2 combinações mínimas.
- [ ] Marca renderizada por `BirthHubLogo`/`BirthHubSignature`/`BirthHubWordmark`, na variante certa
      para o tamanho (`icon` de 32 a 96px, `symbol` acima disso, `horizontal` só com espaço real).
