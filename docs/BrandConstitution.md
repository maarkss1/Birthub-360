# Constituição da Marca — Birth Hub 360º

Diretrizes institucionais, identidade visual, paleta, tipografia e princípios de
experiência da **Birth Hub 360º**.

> Este arquivo é o resumo em texto. A fonte de verdade operacional é
> **`identidade-visual/birthhub360/`** (logos vetoriais mestre, tokens e
> `preview.html`) e **`src/config/brand.ts`** (a mesma identidade em código).
> Em caso de divergência, valem aqueles.
>
> Substituiu a constituição da marca anterior (laranja `#FF5618`, Montserrat /
> Space Grotesk), aposentada em 09/2026.

---

## 1. Essência da Marca

- **Propósito:** dar à inteligência uma forma em que se pode confiar.
- **Posicionamento:** ecossistema inteligente e unificado que atua como central de
  comando 360º para negócios — conectando dados, IA, automações e processos, e
  transformando o que está disperso em direção clara.
- **Tagline:** _"Sua central de comando inteligente: integrando dados,
  potencializando decisões e acelerando a execução."_
- **Ideia central:** Dados → Decisões → Execução (conectar · potencializar · acelerar).
- **Valores:** Innovation · Data Intelligence · Efficiency · Scalability.
- **ICP:** qualquer empresa com área comercial que queira automatizar ponta a ponta.
- **Persona:** papéis mapeados da área comercial — SDR, closer, gestão.

---

## 2. Paleta Oficial de Cores

| Nome da Cor        | Hex       | Papel no sistema                                                     |
| ------------------ | --------- | -------------------------------------------------------------------- |
| **Antique Gold**   | `#D4AF37` | **Primária.** Valor, foco e assinatura: ação principal, KPI, realce. |
| **Deep Iris**      | `#5B21B6` | Inteligência em movimento: halos, indicadores, órbita.               |
| **Orbit Blue**     | `#0065D2` | Terceira cor da órbita 360º.                                         |
| **Obsidian Black** | `#0B132B` | Profundidade. Superfície escura e **texto sobre marca**.             |
| **Snow White**     | `#F8FAFC` | Respiro. Texto sobre superfície escura.                              |
| **Midnight**       | `#08090F` | Fundo de página do tema escuro.                                      |
| **Parchment**      | `#E9E4D9` | Superfície clara institucional.                                      |

**A regra de contraste que mais importa:** ouro é uma cor **clara**. Texto branco
sobre `#D4AF37` mede 2.10:1 e nunca é aceitável. O par correto é Obsidian sobre
ouro — 8.74:1 — que é o mesmo par do CTA do brand book. No produto isso é o token
`text-on-brand`; para a cor de marca usada como **texto** sobre fundo claro, use
`text-brand-ink`.

### Sistema Cromático 360º

O gradiente é movimento, não decoração.

1. **USE** — halos, bordas, indicadores e hero sections.
2. **LIMIT** — um gradiente dominante por composição.
3. **ANCHOR** — base sempre Obsidian ou Snow White.
4. **GOLD** — reservar para valor, foco e assinatura.

---

## 3. Tipografia

- **Display (H1–H3):** _Bodoni Moda_ — headlines, títulos, chamadas institucionais.
- **Interface (H4–H6, corpo, tabelas):** _Inter_ — menus, textos, dashboards, relatórios.
- **Números tabulares:** _IBM Plex Mono_.

Escala do brand book: Display 44–72 · Título 28–36 · Subtítulo 16–20 · Corpo 10–14
· Label 8–10.

Bodoni é um Didone de contraste alto: suas hastes finas somem abaixo de ~20px, por
isso títulos pequenos usam Inter. Em interface a prioridade é legibilidade; em
comunicação, presença.

As duas famílias são **self-hosted** em `public/fonts/` (arquivos variáveis, latin
e latin-ext) — nenhuma requisição a CDN de fonte.

---

## 4. Logotipo e Grafismos

O emblema concentra a tese da marca em um traço: um **B** de leitura geométrica
como núcleo, cercado por um **anel dourado** e por uma **órbita cromática 360º**.

| Elemento     | Significado                              |
| ------------ | ---------------------------------------- |
| B geométrico | Núcleo proprietário e memorável.         |
| Anel dourado | Precisão, valor e confiança.             |
| Órbita 360º  | Conexão, movimento e continuidade.       |
| Azul + roxo  | Tecnologia, inteligência e profundidade. |

Arquivos-mestre em `identidade-visual/birthhub360/logos/` (símbolo, ícone reduzido
e assinatura horizontal). Área de proteção: `X` = 1/4 do raio externo, livre em
todo o perímetro. Mínimos: 32 px ícone/favicon, 96 px símbolo completo.

**Não faça:** distorcer proporções · girar o símbolo · trocar as cores do anel ·
adicionar sombras externas aleatórias · inserir texto dentro da órbita · usar
sobre fundos sem contraste.

---

## 5. Voz da Marca

Profissional · Tecnológica · Direta · Empowering.

A voz acompanha o produto: reduz complexidade, revela contexto e orienta a próxima
ação — sem exagero promocional, sempre orientada a inteligência, decisão e execução.

---

## 6. Diretrizes para Agentes de IA e Desenvolvedores

- Estética: modular e estruturada, clean data minimalist, sofisticada e premium,
  moderna e high-tech. Nada é decorativo.
- Use **tokens**, não hex cru (`bg-brand`, `text-ink`, `border-line`). Hex só onde
  não existe CSS — three.js, canvas, PDF, e-mail — e mesmo aí vindo de
  `BRAND.colors`.
- Imagens devem parecer capturadas de dentro do próprio sistema: composições
  limpas, fundos escuros, luz pontual dourada, órbitas azul/roxo. Nada de banco de
  imagens genérico.
- Antes de criar token, variante ou padrão visual novo, leia
  `.claude/CLAUDE.md` e a skill `design-system`.
