# BIRTH HUB 360° | DESIGN SYSTEM MASTER SPECIFICATION
**Linguagem Visual, Arquitetura de Tokens, Engenharia de Componentes e Governança UX/UI**
*Documento Canônico — Versão 2.0 (Auditado e Validado — Setembro de 2026)*

---

# 1. EXECUTIVE SUMMARY

O **Birth Hub 360°** é uma plataforma corporativa B2B SaaS de missão crítica estruturada em torno do ciclo de inteligência executiva:

$$\mathbf{DATA} \longrightarrow \mathbf{INTELLIGENCE} \longrightarrow \mathbf{DECISION} \longrightarrow \mathbf{EXECUTION}$$

Esta **Master Specification** converte os achados diagnósticos da auditoria forense do código-fonte (1.168 arquivos varridos, 258 cores brutas, 75.1% de evasão de botões, 85.4% de evasão de inputs, 786 classes arbitrárias de tipografia e z-indexes desgovernados) em uma **constituição técnica e visual definitiva**, matemática, inequívoca e auditável.

### 1.1 Objetivo Arquitetural
Eliminar em definitivo o desenvolvimento discricionário. Nenhum desenvolvedor, designer ou agente de IA poderá introduzir variações arbitrárias de cor, espaçamento, tipografia, elevação ou estados interativos. O design system passa a ser a única autoridade permitida para renderização na camada de apresentação da plataforma.

### 1.2 Separação de Estados
Cada decisão normativa neste documento obedece estritamente ao framework de quatro estados:
- **[CURRENT]**: O que existe hoje no código-fonte do repositório.
- **[AUDIT FINDING]**: O que a auditoria forense diagnosticou como patologia ou desvio.
- **[TARGET]**: O padrão canônico e imutável que o Design System estabelece.
- **[MIGRATION]**: A estratégia determinística para conduzir o código ao estado alvo.

---

# 2. BIRTH HUB 360° DESIGN DNA

O Design DNA estabelece o conjunto imutável de valores perceptivos e comportamentais do produto.

### 2.1 Visual Personality
A interface do Birth Hub 360° é **corporativa, cirúrgica, sofisticada, hiperprecisa e desprovida de ruído decorativo**. Não busca entreter; busca capacitar executivos, diretores comerciais, SDRs e gestores de receita a processar grandes volumes de dados complexos com zero sobrecarga cognitiva e latência perceptual mínima.

### 2.2 Atributos Essenciais

| Dimensão | Atributo Primário | Expressão Visual & Funcional no Produto |
|---|---|---|
| **Emotional** | Confiança & Controle | Telas previsíveis, sem saltos de layout (CLS zero), feedback tátil sutil, sensação de solidez financeira. |
| **Functional** | Precisão & Orquestração | Alinhamentos em grid matemático de 4px, números tabulares (tabular-nums), ausência de aproximações ou valores "mágicos". |
| **Enterprise** | Governança & Maturidade | Tratamento de estados vazios (Empty States) acionáveis, rastreabilidade visual de tenant, indicação clara de dados reais vs simulados. |
| **Brand** | Inteligência Estratégica | Contraste refinado entre Deep Navy (`#0B132B`), Sunset Orange (`#FF5841`) e Red-Violet (`#C53678`), ancorados em superfícies Base (`#FFFFFF` / `#0B132B`). |

### 2.3 Matriz de Identidade: O que o produto DEVE e NUNCA DEVE parecer

| Deve Transmitir (MUST FEEL LIKE) | Nunca Deve Transmitir (MUST NEVER FEEL LIKE) |
|---|---|
| **Precisão Cirúrgica** (dados tabulares, grids limpos, microespaçamento rigoroso) | **Improviso** (espaçamentos soltos como `gap-[6px]`, bordas desalinhadas) |
| **Controle Executivo** (visão 360°, painéis densos com alta legibilidade) | **Caos Informacional** (cards aninhados em 4 níveis sem hierarquia) |
| **Inteligência Acionável** (insights contextuais, IA integrada ao fluxo) | **Gimmick / Falso Brilho** (efeitos de glow exagerados sem função semântica) |
| **Sofisticação Corporativa** (equilíbrio tonal, acabamentos sóbrios) | **Luxo Artificial / Cafona** (gradientes dourados espalhados sem critério) |
| **Tecnologia Enterprise** (alta performance, resposta instantânea, arquitetura limpa) | **Cyberpunk / Gamer** (neons saturados, fundos pretos absolutos desprovidos de contraste) |
| **Maturidade de Plataforma** (resiliência a falhas, feedback de rede, acessibilidade) | **Template SaaS Genérico / AI Slop** (layouts vazios com ilustrações 3D flutuantes clichês) |
| **Clareza Operacional** (botões evidentes, navegação unificada) | **Excesso Visual** (múltiplas cores concorrendo pelo foco visual primário) |
| **Autoridade de Mercado** (posicionamento de comando estratégico) | **Agressividade Gráfica** (alertas vermelhos estridentes para ações rotineiras) |

---

# 3. BRAND PRINCIPLES & ARCHITECTURAL IDENTITY

A identidade visual alvo do Birth Hub 360° unifica o ecossistema em uma assinatura corporativa de alta autoridade.

### 3.1 Pilares Cromáticos Oficiais da Marca
1. **BASE (`#FFFFFF` / Neutro Mestre)**: Pureza e clareza estrutural em temas claros e referência absoluta de neutralidade.
2. **SUNSET ORANGE (`#FF5841`)**: Vetor de ação, urgência calculada, prospecção e execução comercial.
3. **RED-VIOLET (`#C53678`)**: Vetor de inteligência profunda, orquestração de IA, tomada de decisão e relacionamentos de alto valor.
4. **DEEP NAVY (`#0B132B`)**: Âncora de dados, estabilidade, solidez institucional e soberania técnica. É o fundo primordial do Dark Mode e a cor primária de texto no Light Mode.

---

# 4. COLOR SYSTEM

O sistema de cores do Birth Hub 360° é construído matematicamente sob o espaço de cor **sRGB**, mapeado com coordenadas precisas de **Hexadecimal**, **RGB**, **HSL** e **OKLCH** para garantir fidelidade perceptual absoluta entre navegadores web, monitores profissionais e a WebView do aplicativo móvel Capacitor (Android/iOS).

## 4.1 Primitive Colors (Paleta Primitiva)

### A. Âncoras Estruturais de Marca

| Token Primitivo | HEX | RGB | HSL | OKLCH | Finalidade Arquitetural |
|---|---|---|---|---|---|
| `primitive.color.white` | `#FFFFFF` | rgb(255, 255, 255) | hsl(0, 0%, 100%) | oklch(1 0 0) | Superfície Base Light; texto claro estritamente validado em superfícies escuras. |
| `primitive.color.navy.950` | `#070B14` | rgb(7, 11, 20) | hsl(222, 48%, 5%) | oklch(0.14 0.02 260) | Fundo profundo (Deep Background) em Dark Mode. |
| `primitive.color.navy.900` | `#0B132B` | rgb(11, 19, 43) | hsl(225, 59%, 11%) | oklch(0.18 0.05 262) | **Deep Navy Oficial** — Fundo de superfície Dark Mode / Texto H1 Light Mode / **Texto de Botão Sunset Orange**. |
| `primitive.color.navy.800` | `#111C38` | rgb(17, 28, 56) | hsl(223, 53%, 14%) | oklch(0.23 0.06 261) | Superfície de Card Dark Mode. |
| `primitive.color.navy.700` | `#162447` | rgb(22, 36, 71) | hsl(223, 53%, 18%) | oklch(0.28 0.07 261) | Superfície Elevada / Hover de Card Dark Mode. |
| `primitive.color.navy.600` | `#1E2C4F` | rgb(30, 44, 79) | hsl(223, 45%, 21%) | oklch(0.33 0.07 260) | Bordas estruturais em Dark Mode. |
| `primitive.color.orange.500` | `#FF5841` | rgb(255, 88, 65) | hsl(7, 100%, 63%) | oklch(0.68 0.22 34) | **Sunset Orange Oficial** — Ação primária, conversão, destaque de execução. |
| `primitive.color.orange.600` | `#E64A32` | rgb(230, 74, 50) | hsl(7, 79%, 55%) | oklch(0.63 0.21 34) | **Sunset Orange Hover Calibrado** — Contraste 4.72:1 com Deep Navy (#0B132B). |
| `primitive.color.orange.700` | `#C0321F` | rgb(192, 50, 31) | hsl(7, 72%, 44%) | oklch(0.53 0.20 34) | Active / Pressed de Sunset Orange. |
| `primitive.color.orange.100` | `#FFF0ED` | rgb(255, 240, 237) | hsl(9, 100%, 96%) | oklch(0.96 0.02 35) | Fundo suave de alerta / Badge Orange Light. |
| `primitive.color.redviolet.500` | `#C53678` | rgb(197, 54, 120) | hsl(332, 57%, 49%) | oklch(0.55 0.21 356) | **Red-Violet Oficial** — Inteligência, Orquestração de IA, Decisão. |
| `primitive.color.redviolet.600` | `#A82662` | rgb(168, 38, 98) | hsl(332, 63%, 40%) | oklch(0.48 0.20 356) | Hover de Red-Violet. |
| `primitive.color.redviolet.700` | `#8B1A4F` | rgb(139, 26, 79) | hsl(332, 68%, 32%) | oklch(0.41 0.18 356) | Active / Pressed de Red-Violet. |
| `primitive.color.redviolet.100` | `#FDF2F7` | rgb(253, 242, 247) | hsl(330, 79%, 97%) | oklch(0.97 0.02 356) | Fundo suave de badge Red-Violet Light. |

### B. Neutros Corporativos e Grayscale (Escala Slate Racionalizada)

| Token Primitivo | HEX | RGB | HSL | Função Primária |
|---|---|---|---|---|
| `primitive.color.gray.50` | `#F8FAFC` | rgb(248, 250, 252) | hsl(210, 40%, 98%) | Fundo de página Light Mode / Texto primário Dark Mode. |
| `primitive.color.gray.100` | `#F1F5F9` | rgb(241, 245, 249) | hsl(210, 40%, 96%) | Superfície sutil / Inputs Light Mode. |
| `primitive.color.gray.200` | `#E2E8F0` | rgb(226, 232, 240) | hsl(214, 32%, 91%) | Borda padrão Light Mode / Estado Disabled Light. |
| `primitive.color.gray.300` | `#CBD5E1` | rgb(203, 213, 225) | hsl(216, 34%, 84%) | Borda de foco desativado / Divisores. |
| `primitive.color.gray.400` | `#94A3B8` | rgb(148, 163, 184) | hsl(215, 20%, 65%) | Texto terciário / Ícones neutros. |
| `primitive.color.gray.500` | `#64748B` | rgb(100, 116, 139) | hsl(215, 16%, 47%) | Texto secundário Light Mode / Disabled text Dark. |
| `primitive.color.gray.600` | `#475569` | rgb(71, 85, 105) | hsl(215, 19%, 35%) | Texto secundário de alto contraste. |
| `primitive.color.gray.700` | `#334155` | rgb(51, 65, 85) | hsl(217, 33%, 17%) | Bordas ativas Dark Mode. |
| `primitive.color.gray.800` | `#1E293B` | rgb(30, 41, 59) | hsl(215, 28%, 17%) | Superfície elevada alternativa Dark Mode. |
| `primitive.color.gray.900` | `#0F172A` | rgb(15, 23, 42) | hsl(222, 47%, 11%) | Fundo de menus e dropdowns escuros. |

### C. Cores Semânticas de Estado (Status & Feedback)

| Token Primitivo | HEX | RGB | HSL | Papel de Negócio no CRM/BI |
|---|---|---|---|---|
| `primitive.color.emerald.500` | `#10B981` | rgb(16, 185, 129) | hsl(160, 84%, 39%) | **Sucesso**: Lead Ganho, Bitrix Conectado, Ação Concluída. |
| `primitive.color.emerald.600` | `#059669` | rgb(5, 150, 105) | hsl(161, 94%, 30%) | Hover de botão de sucesso. |
| `primitive.color.amber.500` | `#F59E0B` | rgb(245, 158, 11) | hsl(38, 92%, 50%) | **Aviso**: Quota Próxima, Lead Estagnado, Token Expirando. |
| `primitive.color.rose.500` | `#F43F5E` | rgb(244, 63, 94) | hsl(350, 89%, 60%) | **Erro/Destrutivo**: Lead Perdido, Falha de Sync, Excluir. |
| `primitive.color.rose.600` | `#E11D48` | rgb(225, 29, 72) | hsl(348, 83%, 47%) | Hover de botão destrutivo. |
| `primitive.color.cyan.500` | `#06B6D4` | rgb(6, 182, 212) | hsl(189, 94%, 43%) | **Informativo / Telemetria**: Agente Ativo, Chamada em Curso. |

---

# 5. REGRA CRÍTICA: POLÍTICA DE CONTRASTE E PROIBIÇÃO DE TEXTO BRANCO DISCRICIONÁRIO

### 5.1 A Diretriz Constitucional
> **É TERMINANTEMENTE PROIBIDO O USO DE TEXTO BRANCO (`#FFFFFF` OU `text-white`) COMO PADRÃO ESTÉTICO, DECORATIVO OU POR MERA COMODIDADE DE CODIFICAÇÃO.**

### 5.2 Recalibração Matemática Rigorosa do Contraste (Algoritmo WCAG 2.1)
Uma auditoria matemática rigorosa demonstrou que o texto branco sobre o Sunset Orange (`#FF5841`) e sobre o Rose-500 (`#F43F5E`) **reprova no critério WCAG AA para texto normal**:

$$\text{Contraste}(L_1, L_2) = \frac{L_1 + 0.05}{L_2 + 0.05}$$

- **`#FF5841` (Sunset Orange) + `#FFFFFF` (Branco)**: Razão real de **3.12:1** $\longrightarrow$ **REPROVADO PARA TEXTO NORMAL (< 18px)**.
- **`#FF5841` (Sunset Orange) + `#0B132B` (Deep Navy)**: Razão real de **5.89:1** $\longrightarrow$ **APROVADO COM FOLGA (WCAG AA)**.
- **`#F43F5E` (Rose-500 Destrutivo) + `#FFFFFF` (Branco)**: Razão real de **3.67:1** $\longrightarrow$ **REPROVADO PARA TEXTO NORMAL (< 18px)**.
- **`#F43F5E` (Rose-500 Destrutivo) + `#0B132B` (Deep Navy)**: Razão real de **5.01:1** $\longrightarrow$ **APROVADO COM FOLGA (WCAG AA)**.
- **`#C53678` (Red-Violet) + `#FFFFFF` (Branco)**: Razão real de **5.03:1** $\longrightarrow$ **APROVADO (WCAG AA)**.

### 5.3 Matriz Canônica de Superfície vs. Cor de Texto Obrigatória

| Superfície de Fundo | Cor do Fundo | Cor de Texto OBRIGATÓRIA | Ratio WCAG 2.1 | Veredito Normativo |
|---|---|---|---|---|
| **Base Light** | `#FFFFFF` | `#0B132B` (Deep Navy) ou `#334155` (Slate-700) | **16.2:1 / 9.8:1** | APROVA AAA |
| **Surface Light** | `#F8FAFC` | `#0B132B` (Deep Navy) | **15.4:1** | APROVA AAA |
| **Deep Navy (Dark Mode)** | `#0B132B` | `#F8FAFC` (Slate-50) ou `#94A3B8` (Slate-400) | **15.4:1 / 6.8:1** | APROVA AAA / AA |
| **Card Dark** | `#111C38` | `#F8FAFC` (Slate-50) ou `#CBD5E1` (Slate-300) | **13.8:1 / 8.5:1** | APROVA AAA |
| **Botão Sunset Orange** | `#FF5841` | **`#0B132B` (Deep Navy) — NUNCA BRANCO** | **5.89:1** | APROVA AA (Texto Normal e Bold) |
| **Botão Destrutivo** | `#F43F5E` | **`#0B132B` (Deep Navy) — NUNCA BRANCO** | **5.01:1** | APROVA AA (Texto Normal e Bold) |
| **Botão Red-Violet** | `#C53678` | `#FFFFFF` (Branco) | **5.03:1** | APROVA AA |
| **Badge Amarelo/Aviso** | `#F59E0B` | **`#0B132B` (Deep Navy) — NUNCA BRANCO** | **8.92:1** | APROVA AAA |
| **Badge Sucesso Emerald (Sólido)** | `#10B981` | **`#0B132B` (Deep Navy)** | **7.25:1** | APROVA AAA (Texto Navy Obrigatório em fundo sólido) |
| **Badge Sucesso Emerald (Sutil)** | `#D1FAE5` (Emerald-100) | `#065F46` (Emerald-800) | **6.78:1** | APROVA AA (Variante suave recomendada) |

---

# 6. SEMANTIC COLOR TOKENS (LIGHT MODE & DARK MODE)

A camada semântica desacopla a intenção de design das cores brutas. Todos os componentes devem consumir exclusivamente os tokens desta tabela, agora completa e simétrica em todas as ações e estados:

```text
Primitive Token (ex: primitive.color.orange.500)
       ↓
Semantic Token (ex: semantic.color.action.primary.bg)
       ↓
Component Token (ex: component.button.primary.background)
```

### 6.1 Tokens Semânticos de Superfície e Conteúdo

| Token Semântico Oficial | Valor em Light Mode | Valor em Dark Mode | Papel Arquitetural |
|---|---|---|---|
| `semantic.color.bg.canvas` | `#F8FAFC` (Gray-50) | `#070B14` (Navy-950) | Fundo mestre da janela da aplicação. |
| `semantic.color.bg.surface` | `#FFFFFF` (White) | `#0B132B` (Navy-900) | Fundo da Sidebar, Topbar e áreas de trabalho. |
| `semantic.color.bg.card` | `#FFFFFF` (White) | `#111C38` (Navy-800) | Containers de conteúdo, painéis e cards. |
| `semantic.color.bg.card.hover` | `#F1F5F9` (Gray-100) | `#162447` (Navy-700) | Feedback de mouse sobre cartões interativos. |
| `semantic.color.bg.elevated` | `#FFFFFF` (White) | `#1B2D5D` (Navy-elevated) | Modais, Popovers, Menus de contexto. |
| `semantic.color.bg.subtle` | `#F1F5F9` (Gray-100) | `#0E1836` (Navy-subtle) | Fundo de inputs, tabelas zebradas, tags. |
| `semantic.color.text.primary` | `#0B132B` (Navy-900) | `#F8FAFC` (Gray-50) | Títulos, rótulos de dados críticos, cabeçalhos. |
| `semantic.color.text.secondary` | `#475569` (Gray-600) | `#94A3B8` (Gray-400) | Texto de apoio, descrições, subtítulos. |
| `semantic.color.text.muted` | `#64748B` (Gray-500) | `#64748B` (Gray-500) | Placeholders, timestamps, microlegendas. |
| `semantic.color.border.default` | `#E2E8F0` (Gray-200) | `#1E2C4F` (Navy-600) | Bordas de separação estrutural e cards. |
| `semantic.color.border.subtle` | `rgba(11, 19, 43, 0.08)` | `rgba(255, 255, 255, 0.08)` | Linhas de grade de tabela e divisores discretos. |
| `semantic.color.border.focus` | `#FF5841` (Sunset Orange) | `#FF5841` (Sunset Orange) | Anel visível de foco de teclado (:focus-visible). |
| `semantic.color.border.danger` | `#F43F5E` (Rose-500) | `#F43F5E` (Rose-500) | Borda de estado de erro em inputs, botões e cards. |
| `semantic.color.border.strong` | `#94A3B8` (Gray-400) | `#334155` (Gray-700) | Borda reforçada em hover de inputs e cards selecionados. |
| `semantic.color.ring.focus` | `rgba(255, 88, 65, 0.35)` | `rgba(255, 88, 65, 0.35)` | Anel difuso externo de foco primário (:focus-visible). |
| `semantic.color.ring.danger` | `rgba(244, 63, 94, 0.35)` | `rgba(244, 63, 94, 0.35)` | Anel difuso externo de foco em estado de erro crítico. |

### 6.2 Tokens Semânticos de Ação (Ações, Hover, Active e Texto Específico)

| Token Semântico Oficial | Valor em Light Mode | Valor em Dark Mode | Papel de Ação |
|---|---|---|---|
| `semantic.color.action.primary.bg` | `#FF5841` (Sunset Orange) | `#FF5841` (Sunset Orange) | Botão primário oficial de conversão/execução. |
| `semantic.color.action.primary.hover` | `#E64A32` (Sunset-Hover) | `#E64A32` (Sunset-Hover) | Hover primário calibrado (Contraste 4.72:1 com Deep Navy). |
| `semantic.color.action.primary.active` | `#C0321F` (Orange-700) | `#C0321F` (Orange-700) | Active primário (Inversão para texto #FFFFFF atinge 5.65:1 ou via scale(0.98)). |
| `semantic.color.action.primary.text` | **`#0B132B` (Deep Navy)** | **`#0B132B` (Deep Navy)** | **Texto primário em repouso e hover (5.89:1 / 4.72:1)**. |
| `semantic.color.action.intelligence.bg` | `#C53678` (Red-Violet) | `#C53678` (Red-Violet) | Botão de inteligência artificial / sugestões. |
| `semantic.color.action.intelligence.hover` | `#A82662` (RedViolet-600) | `#A82662` (RedViolet-600) | Hover do botão de inteligência. |
| `semantic.color.action.intelligence.active` | `#8B1A4F` (RedViolet-700) | `#8B1A4F` (RedViolet-700) | Active do botão de inteligência. |
| `semantic.color.action.intelligence.text` | `#FFFFFF` (White) | `#FFFFFF` (White) | Texto do botão de inteligência (Contraste 5.03:1). |
| `semantic.color.action.destructive.bg` | `#F43F5E` (Rose-500) | `#F43F5E` (Rose-500) | Botão de ação destrutiva / exclusão. |
| `semantic.color.action.destructive.hover` | `#E11D48` (Rose-600) | `#E11D48` (Rose-600) | Hover destrutivo (Texto #FFFFFF atinge 4.70:1, Aprovado AA). |
| `semantic.color.action.destructive.active`| `#BE123C` (Rose-700) | `#BE123C` (Rose-700) | Active destrutivo (Texto #FFFFFF atinge 6.29:1, Aprovado AA). |
| `semantic.color.action.destructive.text` | **`#0B132B` (Repouso) / `#FFFFFF` (Hover/Active)** | **`#0B132B` (Repouso) / `#FFFFFF` (Hover/Active)** | **Texto de ação destrutiva dinamicamente calibrado para WCAG AA**. |
| `semantic.color.state.disabled.bg` | `#E2E8F0` (Gray-200) | `#1E293B` (Gray-800) | Fundo de controle desabilitado. |
| `semantic.color.state.disabled.text` | `#94A3B8` (Gray-400) | `#64748B` (Gray-500) | Texto de controle desabilitado (Opacidade 60%). |

---

# 7. COLOR USAGE MATRIX

Matriz mandatória com resolução estrita de todos os tokens de estado:

| Elemento | Background | Text | Border | Hover State | Active / Press | Focus Ring | Disabled State |
|---|---|---|---|---|---|---|---|
| **Button Primary** | `action.primary.bg` | `action.primary.text` (`#0B132B`) | `transparent` | `action.primary.hover` | `action.primary.active` | `border.focus` (2px offset 2px) | `state.disabled.bg` + `state.disabled.text` |
| **Button Intelligence** | `action.intelligence.bg` | `action.intelligence.text` (`#FFFFFF`) | `transparent` | `action.intelligence.hover` | `action.intelligence.active` | `border.focus` (2px offset 2px) | `state.disabled.bg` + `state.disabled.text` |
| **Button Secondary** | `bg.surface` | `text.primary` | `border.default` | `bg.card.hover` + `border.default` | `bg.subtle` | `border.focus` (2px) | `state.disabled.bg` + `border.subtle` |
| **Button Ghost** | `transparent` | `text.secondary` | `transparent` | `bg.card.hover` + `text.primary` | `bg.subtle` | `border.focus` (2px) | `transparent` + `state.disabled.text` |
| **Button Destructive** | `action.destructive.bg` | `action.destructive.text` (`#0B132B`) | `transparent` | `action.destructive.hover` | `action.destructive.active` | `action.destructive.bg` (2px) | `state.disabled.bg` + `state.disabled.text` |
| **Input / Textarea** | `bg.surface` | `text.primary` | `border.default` | `border.strong` | N/A | `border.focus` + shadow 0 0 0 1px | `bg.subtle` + `state.disabled.text` |
| **Card Container** | `bg.card` | `text.primary` | `border.default` | (Se clicável) `bg.card.hover` | (Se clicável) `scale(0.995)` | `border.focus` (2px) | Opacity 0.5 |
| **Table Header** | `bg.subtle` | `text.secondary` | `border.subtle` | N/A | N/A | N/A | N/A |
| **Table Row** | `bg.surface` | `text.primary` | `border.subtle` | `bg.card.hover` | `bg.subtle` | N/A | Opacity 0.6 |
| **Badge (Neutro)** | `bg.subtle` | `text.secondary` | `border.default` | N/A | N/A | N/A | N/A |
| **Badge (Success)** | `emerald.100` / 15% (Dark) | `emerald.600` / `emerald.400` | `emerald.500/20` | N/A | N/A | N/A | N/A |
| **Modal Container** | `bg.elevated` | `text.primary` | `border.default` | N/A | N/A | Focus Trap ativado | N/A |


---

# 8. TYPOGRAPHY SYSTEM

A tipografia do Birth Hub 360° é um instrumento de **precisão cognitiva e autoridade executiva**. Ela deve guiar a leitura veloz em painéis de alta densidade sem causar fadiga visual.

### 8.1 Auditoria das Famílias Encontradas vs. Decisão Oficial

| Família Tipográfica | Ocorrência no Código Atual | Decisão Arquitetural | Justificativa Técnica & Alinhamento de Marca |
|---|---|---|---|
| **Sora** | Declarada em `@font-face`, mas não mapeada em `--font-brand-display`. | **OFICIAL — DISPLAY & TÍTULOS** | Fonte geométrica contemporânea com alta personalidade institucional. O Brandbook oficial e o redesenho "Strategic Command Center" exigem Sora como assinatura de autoridade executiva para todos os cabeçalhos. |
| **Inter** | Utilizada em dezenas de componentes UI (`font-sans`). | **OFICIAL — UI, TEXTO & TABELAS** | Padrão ouro para interfaces complexas. Possui altura-x (x-height) otimizada, excelente legibilidade em tamanhos pequenos (12px-14px) e suporte nativo a números tabulares. |
| **IBM Plex Mono** | Importada via Google Fonts em `globals.css`. | **OFICIAL — DADOS, NÚMEROS & CÓDIGO** | Essencial para tabelas financeiras, métricas monetárias (R$), logs técnicos, coordenadas de telemetria e KPIs. Os dígitos têm largura idêntica, evitando que valores tremam durante atualizações em tempo real. |
| **Plus Jakarta Sans** | Mapeada em `--font-brand-sans` e `--font-brand-display`. | **DEPRECATED / SUBSTITUÍDA** | Foi adotada como paliativo no código. Deve ser descontinuada em favor do par canônico **Sora (Display) + Inter (UI)**. |
| **Cinzel** | Usada pontualmente em cabeçalhos de luxo. | **FORBIDDEN (PROIBIDA)** | Fonte serifada clássica/editorial incompatível com o posicionamento tecnológico e operacional de uma central de comando de dados B2B. |
| **Bodoni Moda** | Presente em arquivos físicos de fonte em `public/fonts/`. | **REMOÇÃO DO PACOTE** | Didone puramente editorial que polui o bundle sem qualquer utilidade no fluxo corporativo. |

---

# 9. TYPOGRAPHY SCALE (ESCALA PRAGMÁTICA DE ALTA DENSIDADE)

A escala tipográfica do Birth Hub 360° é uma **escala proprietária e pragmática, calibrada especificamente para plataformas SaaS B2B de alta densidade informacional**. Em vez de forçar uma progressão matemática teórica cega (como Major Second 1.125), ela atende às necessidades reais de legibilidade de dados complexos:

| Nível | Token | Font-Family | Tamanho (rem / px) | Weight | Line-Height | Letter-Spacing | Uso Permitido | Uso Proibido |
|---|---|---|---|---|---|---|---|---|
| **Display** | `font.display` | Sora | `2.5rem` (40px) | 700 Bold | 1.15 (46px) | `-0.025em` | Telas de boas-vindas, Hero institucional. | Tabelas, formulários, modais. |
| **H1** | `font.h1` | Sora | `2.0rem` (32px) | 700 Bold | 1.20 (38px) | `-0.02em` | Título da página no Topbar/PageHeader. | Subitens, widgets de cards. |
| **H2** | `font.h2` | Sora | `1.5rem` (24px) | 600 SemiBold | 1.25 (30px) | `-0.015em` | Título de seções maiores e painéis. | Itens de lista, badges. |
| **H3** | `font.h3` | Sora | `1.25rem` (20px) | 600 SemiBold | 1.30 (26px) | `-0.01em` | Cabeçalho de Cards e Modais. | Texto corrido. |
| **H4** | `font.h4` | Sora | `1.0rem` (16px) | 600 SemiBold | 1.40 (22px) | `0em` | Subtítulo de grupos em formulários. | Títulos principais. |
| **Body Large** | `font.body.lg` | Inter | `1.0rem` (16px) | 400 Regular | 1.50 (24px) | `0em` | Artigos explicativos, resumos de IA. | Tabelas densas de CRM. |
| **Body** | `font.body` | Inter | `0.875rem` (14px) | 400 Regular | 1.50 (21px) | `0em` | **Padrão geral de interface**, inputs, cards. | Títulos de destaque. |
| **Body Control** | `font.body.control` | Inter | `0.875rem` (14px) | 600 SemiBold | 1.4285 (20px) | `0em` | **Botões, inputs e controles de 36px** (combina com py-2 = 8px para fechar 36px exatos). | Parágrafos longos. |
| **Body SemiBold** | `font.body.semibold` | Inter | `0.875rem` (14px) | 600 SemiBold | 1.50 (21px) | `0em` | Botões, itens de menu ativos, nomes de colunas. | Texto corrido longo. |
| **Body Small** | `font.body.sm` | Inter | `0.75rem` (12px) | 400 Regular | 1.45 (17.5px) | `+0.01em` | Textos secundários, ajuda de campos, toasts. | Dados primários. |
| **Caption** | `font.caption` | Inter | `0.6875rem` (11px) | 500 Medium | 1.40 (15.5px) | `+0.02em` | Timestamps, tags, legendas de status. | Texto principal de leitura. |
| **Micro** | `font.micro` | Inter | `0.625rem` (10px) | 600 SemiBold | 1.30 (13px) | `+0.04em` (UPPERCASE) | Badges compactas, contadores de abas. | Parágrafos ou mensagens de erro. |
| **Numeric Data** | `font.numeric` | IBM Plex Mono | `0.875rem` (14px) | 600 SemiBold | 1.0 (14px) | `-0.01em` | Valores monetários, métricas de KPI, taxas. | Texto não-numérico. |
| **Code** | `font.code` | IBM Plex Mono | `0.75rem` (12px) | 500 Medium | 1.45 (17.5px) | `0em` | IDs de transação, webhooks, JSON, snippets. | Interface geral de usuário. |

### 9.1 Proibições e Eliminação de Valores Arbitrários
- **[AUDIT FINDING]**: 786 ocorrências de fontes quebradas (`text-[10px]` 423x, `text-[11px]` 296x, `text-[9px]` 39x, e `text-[7.5px]` 3x).
- **[TARGET]**: Fica expressamente **PROIBIDO** o uso de tamanhos menores que 10px (`0.625rem`). Qualquer elemento que usava 7.5px ou 9px deve migrar compulsoriamente para `font.micro` (10px, 600 SemiBold, Uppercase) com rastreamento (`tracking-wider`) para garantir legibilidade.

---

# 10. SPACING SYSTEM (MACRO GRID 4PX & MICRO OPTICAL SPACING)

Para eliminar ambiguidades conceituais e garantir rigor matemático sem engessamento óptico, o sistema de espaçamento é formalmente dividido em **duas camadas distintas**:

### 10.1 Escala Principal de Macro Spacing (Múltiplos Estritos de 4px)
Mandatória para 100% de layouts de página, distâncias entre cards, containers, margens e padding de componentes estruturais:

| Token Macro | Valor em px | Valor em rem | Aplicação Recomendada no Design System |
|---|---|---|---|
| `space.0` | 0px | 0rem | Reset de margem / padding. |
| `space.1` | 4px | 0.25rem | Gap entre ícone e texto compacto, padding interno de badges. |
| `space.2` | 8px | 0.5rem | Padding vertical padrão de inputs e botões, gap entre formulários. |
| `space.3` | 12px | 0.75rem | Padding horizontal de inputs e botões, gap entre cards pequenos. |
| `space.4` | 16px | 1.0rem | **Módulo Padrão**: Padding interno de cards padrão, gap de grids de dashboards. |
| `space.5` | 20px | 1.25rem | Padding de cartões destacados e painéis laterais. |
| `space.6` | 24px | 1.5rem | Padding interno de modais e cabeçalhos de página. |
| `space.8` | 32px | 2.0rem | Espaçamento entre grandes blocos de conteúdo e seções de dashboard. |
| `space.10` | 40px | 2.5rem | Respiro superior de páginas de autenticação. |
| `space.12` | 48px | 3.0rem | Margem entre seções institucionais. |
| `space.16` | 64px | 4.0rem | Padding máximo de páginas de entrada (Welcome / Landing). |

### 10.2 Exceções Formais: Micro Optical Spacing (2px e 6px)
Permitidas **exclusivamente como exceções formais governadas** para casos onde o múltiplo de 4px causa desequilíbrio visual comprovado:
- **`space.0.5` (2px / 0.125rem)**: Reservado exclusivamente para compensação óptica de alinhamento vertical de ícones inline e espessura de anéis de foco.
- **`space.1.5` (6px / 0.375rem)**: Reservado exclusivamente para padding vertical de botões ultra-compactos (tamanho SM 32px) e células de tabela de densidade máxima.

### 10.3 Extinção de Valores Arbitrários Encontrados na Auditoria
- `gap-[6px]` → **NORMALIZAR** formalmente na exceção `space.1.5` (`gap-1.5`).
- `p-[10px]` → **ELIMINAR**: normalizar para `space.3` (12px) ou `space.2` (8px). Proibido criar tokens intermediários discricionários.
- `p-[14px]` → **ELIMINAR**: normalizar para `space.4` (16px) ou `space.3` (12px).
- `py-[5px]` e `mt-[7px]` → **PROIBIDOS**: hacks de alinhamento manual que devem ser substituídos por flexbox (`items-center`).

---

# 11. SIZING SYSTEM (DIMENSÕES E LIMITES)

Padronização de alturas de componentes interativos e larguras estruturais:

### 11.1 Alturas de Controles Interativos (Height Tokens)

| Componente | Tamanho SM | Tamanho MD (Padrão) | Tamanho LG |
|---|---|---|---|
| **Botão (`size.control.button`)** | `32px` (`h-8`) | `36px` (`h-9`) | `44px` (`h-11`) |
| **Input / Select (`size.control.input`)** | `32px` (`h-8`) | `36px` (`h-9`) | `44px` (`h-11`) |
| **Badge (`size.control.badge`)** | `20px` (`h-5`) | `24px` (`h-6`) | `28px` (`h-7`) |
| **Linha de Tabela (`size.table.row`)** | `36px` (Alta Densidade) | `44px` (Padrão CRM) | `56px` (Expansiva) |

### 11.2 Larguras e Alturas Estruturais (Layout Sizing)

| Elemento Estrutural | Token Oficial | Dimensão Canônica | Comportamento Responsivo |
|---|---|---|---|
| **Sidebar Expandida** | `size.layout.sidebar.expanded` | `260px` | Fixa em desktop (≥1024px). |
| **Sidebar Recolhida** | `size.layout.sidebar.collapsed` | `64px` | Ícones centralizados com tooltips flutuantes. |
| **Topbar / Header** | `size.layout.header.height` | `56px` | Fixo no topo (`sticky top-0`), z-index governado. |
| **Container Dashboard** | `size.container.dashboard` | `1440px` máx | Centralizado com respiro lateral dinâmico. |
| **Container CRM Kanban** | `size.container.kanban` | `100%` (Fluido) | Rolagem horizontal assistida em viewport restrita. |
| **Modal Pequeno (Confirmação)** | `size.modal.sm` | `400px` máx | Centralizado na tela com overlay escuro. |
| **Modal Médio (Formulário)** | `size.modal.md` | `560px` máx | Altura máxima de `85vh` com rolagem interna. |
| **Modal Grande (Visão 360°)** | `size.modal.lg` | `840px` máx | Grade interna de duas colunas responsivas. |
| **Drawer Lateral (Sheet)** | `size.drawer.width` | `480px` máx | Desliza da direita para detalhes de Lead/Deal. |

---

# 12. BORDER RADIUS SYSTEM

O raio de curvatura estabelece a "linguagem tátil" da plataforma:

| Token Oficial | Valor em px | Elementos Autorizados | Elementos ESTRITAMENTE PROIBIDOS |
|---|---|---|---|
| `radius.none` | 0px | Gráficos retangulares, divisores de tela, tabelas de borda dura. | Botões, inputs, cards. |
| `radius.sm` | 4px | Badges compactas, tooltips, tags de tabela, checkboxes. | Cards, modais, botões principais. |
| `radius.md` | 6px | **Inputs, selects, textareas, botões secundários, dropdowns**. | Containers de página, modais grandes. |
| `radius.lg` | 8px | **Botões primários (Sunset Orange / Red-Violet), cards pequenos**. | Janela inteira, badges. |
| `radius.xl` | 12px | **Cards principais de dados, painéis de KPI, containers de lista**. | Inputs, botões de ação comum. |
| `radius.2xl` | 16px | **Modais (Dialog), Drawers, painéis flutuantes, containers de IA**. | Inputs e botões de tabela. |
| `radius.full` | 9999px | **Avatares de usuário, chips arredondados, toggles (Switch)**. | **Botões de ação retangulares de CRM**. |

---

# 13. BORDER & STROKE SYSTEM

Em interfaces analíticas escuras e claras, as bordas são essenciais para separar planos de dados sem depender exclusivamente de sombras pesadas:

| Token de Borda | Espessura | Estilo | Aplicação Oficial |
|---|---|---|---|
| `border.subtle` | `1px` | Solid | Linhas divisórias internas de tabela (`border-border-subtle`). |
| `border.default` | `1px` | Solid | Contorno de cards, inputs em repouso, painéis. |
| `border.strong` | `1px` | Solid | Hover de inputs e cards selecionados. |
| `border.focus` | `2px` | Solid | Anel de foco acessível (`outline: 2px solid #FF5841; offset: 2px`). |
| `border.active` | `2px` | Solid | Borda indicadora de coluna ativa no Kanban ou aba selecionada. |
| `border.drag` | `2px` | Dashed | Área de soltura de arquivo ou arrasto de oportunidade comercial. |

---

# 14. SHADOW & ELEVATION SYSTEM

A elevação no Birth Hub 360° é puramente funcional e estruturada em cinco camadas de profundidade:

| Nível de Elevação | Token Oficial | Sombra em Light Mode | Sombra em Dark Mode (Glow Suave) | Finalidade do Nível |
|---|---|---|---|---|
| **Nível 0** | `elevation.0` | `none` | `none` | Elementos no mesmo plano da página (Canvas/Background). |
| **Nível 1** | `elevation.1` | `0 1px 2px rgba(0,0,0,0.05)` | `0 1px 3px rgba(0,0,0,0.4)` | Cards de dados estáticos, painéis de informação. |
| **Nível 2** | `elevation.2` | `0 4px 6px -1px rgba(0,0,0,0.08)` | `0 4px 12px rgba(0,0,0,0.5)` | Cards no estado Hover, botões elevados. |
| **Nível 3** | `elevation.3` | `0 10px 15px -3px rgba(0,0,0,0.1)` | `0 10px 24px rgba(0,0,0,0.65)` | Dropdowns, Popovers, Menus de seleção suspensos. |
| **Nível 4** | `elevation.4` | `0 20px 25px -5px rgba(0,0,0,0.15)` | `0 20px 40px rgba(0,0,0,0.85)` | **Modais (Dialog), Drawers laterais**. |
| **Overlay** | `elevation.overlay`| `0 0 0 100vmax rgba(11,19,43,0.4)` | `0 0 0 100vmax rgba(7,11,20,0.75)` | Bloqueio de fundo para foco exclusivo em modais. |

---

# 15. GRADIENT SYSTEM

O uso de gradientes é restrito e pontual para preservar o rigor executivo da interface:

### 15.1 Gradientes Oficiais Autorizados

| Identificador do Gradiente | Fórmula CSS Oficial | Aplicação Oficial Autorizada |
|---|---|---|
| **Gradient Sunset-to-Violet** | `linear-gradient(135deg, #FF5841 0%, #C53678 100%)` | Assinatura visual de inteligência, botão de IA, orbes de comando. |
| **Gradient Navy Depth** | `linear-gradient(180deg, #0B132B 0%, #070B14 100%)` | Fundo estrutural do Dark Mode em páginas executivas. |
| **Gradient Card Surface** | `linear-gradient(135deg, rgba(255,255,255,0.03) 0%, transparent 100%)` | Brilho sutil de superfície em cartões de destaque no Dark Mode. |

---

# 16. EFFECT SYSTEM (BLUR, BACKDROP & CAPACITOR OPTIMIZATION)

Os efeitos de vidro (Glassmorphism) e desfoque devem ter custo de processamento previsível:

### 16.1 Governança de Backdrop Blur
- **Topbar e Modais**: Permitido exclusivamente **`backdrop-blur-md` (12px)**.
- **Proibição de Blur Profundo**: O uso de `backdrop-blur-xl` (24px) ou superior fica banido de tabelas e listas longas.

### 16.2 Regra Mandatória para Mobile (Capacitor Android)
```css
/* Fallback de alta performance para Capacitor */
.is-capacitor .glass-panel {
  backdrop-filter: none !important;
  background-color: var(--semantic-color-bg-surface) !important;
}
```


---

# 17. ICON SYSTEM

A biblioteca oficial de iconografia do Birth Hub 360° é a **Lucide React**. Fica terminantemente vedada a importação de SVGs inline aleatórios, FontAwesome ou pacotes paralelos.

### 17.1 Governança de Dimensões de Ícone

| Nível de Escala | Token Oficial | Dimensão Canônica | Classe Tailwind Oficial | Contexto Permitido |
|---|---|---|---|---|
| **Extra Small (XS)** | `icon.size.xs` | `14px x 14px` | `w-3.5 h-3.5` | Badges compactas, setas de paginação, tags de tabela. |
| **Small (SM)** | `icon.size.sm` | `16px x 16px` | `w-4 h-4` | **Padrão em botões**, inputs com ícone (prefix/suffix), tabs. |
| **Medium (MD)** | `icon.size.md` | `20px x 20px` | `w-5 h-5` | Itens de navegação da Sidebar, cabeçalhos de cards secundários. |
| **Large (LG)** | `icon.size.lg` | `24px x 24px` | `w-6 h-6` | Cabeçalhos de página (PageHeader), botões de ação flutuantes. |
| **Extra Large (XL)** | `icon.size.xl` | `32px x 32px` | `w-8 h-8` | Ilustrações de Empty States, modais de confirmação. |

### 17.2 Regras de Traço e Acessibilidade (SVG & Tooltip Rules)
1. **Espessura do Traço (Stroke Width)**: Padronizado em **`strokeWidth={1.75}`** para tamanhos 16px a 24px, e **`strokeWidth={2.0}`** para tamanho 14px.
2. **Ícones Decorativos**: Todo ícone renderizado ao lado de um texto legível **DEVE conter `aria-hidden="true"`** para não poluir leitores de tela.
3. **Controles Interativos Exclusivamente com Ícone (Icon-Only Buttons)**:
   - **Nome Acessível Obrigatório**: Devem obrigatoriamente possuir propriedade **`aria-label="..."`** descritiva (ex: `aria-label="Exportar relatório em CSV"`).
   - **Diretriz de Tooltip**: O componente **`<Tooltip>`** é **mandatório quando a ação não for universalmente autoevidente**, e altamente recomendado em desktop para reforço cognitivo. Tooltips são camadas de apoio de UX e **nunca substituem o `aria-label`**.

---

# 18. MOTION SYSTEM

O movimento no Birth Hub 360° obedece aos princípios de **funcionalidade, física crível e ausência de distração**. O motion existe para informar que uma ação foi processada e para orientar o olhar espacialmente pelo funil de vendas.

### 18.1 Curvas de Aceleração (Easing Scale)
Baseadas no módulo `src/lib/motion.ts`:
- **`EASE_PREMIUM`**: `cubic-bezier(0.22, 1, 0.36, 1)` — Curva de desaceleração suave para transições de páginas, abertura de modais e expansão de cards.
- **`EASE_OUT_EXPO`**: `cubic-bezier(0.16, 1, 0.3, 1)` — Para animações de entrada rápidas (toasts, menus suspensos).
- **`EASE_IN_OUT_SMOOTH`**: `cubic-bezier(0.4, 0, 0.2, 1)` — Para alterações de largura da Sidebar e abas.

### 18.2 Escala de Duração (Duration Scale)

| Token de Duração | Tempo em ms | Uso Recomendado no Design System |
|---|---|---|
| `motion.duration.instant` | `100ms` | Feedback de clique (Press / Active) em botões e checkboxes. |
| `motion.duration.fast` | `180ms` | Transição de cores em Hover, tooltips, troca de abas. |
| `motion.duration.base` | `280ms` | Abertura de Dropdowns, colapso/expansão de acordions de IA. |
| `motion.duration.deliberate` | `420ms` | Entrada de Modais (Dialog) e transição de Drawer lateral. |
| `motion.duration.gentle` | `600ms` | Carregamento suave de esqueletos de gráficos complexos. |

### 18.3 Salvaguarda Mandatória: Acessibilidade Vestibular
Em observância estrita ao WCAG 2.3.3:
```typescript
import { useReducedMotion } from 'framer-motion';

export function useAppMotion() {
  const shouldReduce = useReducedMotion();
  return {
    transition: shouldReduce ? { duration: 0 } : { duration: 0.28, ease: EASE_PREMIUM },
    animate: shouldReduce ? { opacity: 1, y: 0, scale: 1 } : undefined,
  };
}
```

### 18.4 Escala de Deformação Mecânica (Scale Tokens)

| Token de Escala | Valor CSS | Aplicação Oficial |
|---|---|---|
| `motion.scale.press` | `scale(0.98)` | Feedback tátil imediato no clique de botões de ação e checkboxes. |
| `motion.scale.subtle` | `scale(0.995)` | Feedback tátil leve no clique de cards analíticos elevados. |

---

# 19. Z-INDEX SYSTEM (HIERARQUIA DE CAMADAS)

O caos de valores mágicos (`z-[9999]`, `z-[1000]`, `z-[900]`) é sumariamente abolido. Fica instituída a escala canônica de camadas:

| Token Oficial | Valor Numérico | Classe Tailwind | Componentes Autorizados Exclusivos | Resolução de Hierarquia |
|---|---|---|---|---|
| `z.base` | `0` | `z-0` | Conteúdo padrão da página, canvas, grids. | Nível zero. |
| `z.card` | `1` | `z-1` | Cards interativos com elevação relativa. | Local stacking context. |
| `z.sticky` | `10` | `z-sticky` | Cabeçalhos de tabela fixos (Sticky Table Headers). | **Rebaixado de 200 para 10**. |
| `z.header` | `50` | `z-header` | Barra superior da aplicação (Topbar / AppTopbar). | Fixo no topo do shell. |
| `z.dropdown` | `100` | `z-dropdown` | Menus suspensos de seleção, autocomplete de busca. | **Sobrepõe sticky headers (100 > 10)**. |
| `z.drawer` | `400` | `z-drawer` | Painéis laterais deslizantes (Sheet / Drawer). | Sobrepõe tabelas e topbar. |
| `z.modal` | `500` | `z-modal` | Diálogos modais (Dialog / Modal) e seu overlay. | Bloqueio de contexto de página. |
| `z.popover` | `600` | `z-popover` | Popovers, tooltips em modais, selects em modais. | **Sobrepõe modais (600 > 500)**. |
| `z.toast` | `700` | `z-toast` | Notificações do sistema (Sonner Toasts). | Visível sobre janelas modais. |
| `z.tools` | `800` | `z-tools` | Ferramentas flutuantes (VoiceWidget, CopilotTrigger). | **Normaliza z-[900] legados**. |
| `z.tooltip` | `900` | `z-tooltip` | Dicas flutuantes rápidas de atalho e ícone. | Sobrepõe ferramentas e modais. |
| `z.system` | `1000` | `z-system` | Bloqueio global, CommandPalette, telas de emergência. | **Normaliza z-[999] e z-[9999]**. |

---

# 20. RESPONSIVE SYSTEM & BREAKPOINTS

O dimensionamento de tela no Birth Hub 360° obedece à equação exata de área útil:

$$\mathbf{contentWidth} = \mathbf{viewportWidth} - \mathbf{sidebarWidth} - \mathbf{gutters}$$

### 20.1 Resolução Matemática em Tablets e Dispositivos Intermediários

| Viewport Real | Sidebar State & Width | Gutters (Margens) | Área Útil Real (`contentWidth`) | Comportamento de Interface |
|---|---|---|---|---|
| **768px** (iPad Portrait) | Recolhida: `64px` | `32px` (px-4 cada lado) | **672px úteis** | Grid de 2 colunas; tabelas ativam scroll horizontal. |
| **820px** (iPad Air) | Recolhida: `64px` | `32px` | **724px úteis** | Visualização limpa de Kanban com 2 colunas visíveis. |
| **912px** (Surface Pro) | Recolhida: `64px` | `32px` | **816px úteis** | 3 colunas de cards de KPI ativas. |
| **1024px** (Desktop Base) | Expandida: `260px` | `32px` | **732px úteis** | Sidebar expande; densidade otimizada. |
| **1280px** (Laptop Padrão) | Expandida: `260px` | `48px` (px-6 cada lado) | **972px úteis** | 4 colunas de KPI Cards simultâneas no Dashboard. |
| **1440px** (Full Desktop) | Expandida: `260px` | `48px` | **1132px úteis** | Largura padrão máxima de produtividade. |
| **1920px+** (Ultrawide) | Expandida: `260px` | Fluido / Centralizado | **1440px máx** | Container centralizado para evitar dispersão ocular. |

---

# 21. LAYOUT SYSTEM & VISUAL DENSITY

A alta densidade de informação é uma premissa de valor em plataformas de inteligência de receita, desde que governada por hierarquia ótica.

### 21.1 A Estrutura Canônica do App Shell
```text
+-------------------------------------------------------------------------+
| TOPBAR (56px fixo, z-300): Logo | Search Central | Tenant Selector | User |
+-------------+-----------------------------------------------------------+
| SIDEBAR     | PAGE HEADER: Título (Sora H1) | Breadcrumb | Ações (CTA)   |
| (64px/260px |-----------------------------------------------------------+
| z-200)      | ÁREA DE CONTEÚDO PRINCIPAL (max-w-[1440px] px-6 py-6)      |
|             | - Grid de Métricas (KPI Cards 4 colunas)                   |
|             | - Tabela de Dados com Cabeçalho Sticky                     |
|             | - Painel Lateral de Detalhes (Drawer deslizante)           |
+-------------+-----------------------------------------------------------+
```

---

# 22. COMPONENT GOVERNANCE & CORE INVENTORY

Inventário normativo de componentes oficiais:

### 22.1 Button (Botão de Ação)
- **Anatomia**: Container `inline-flex` + Ícone opcional à esquerda (16px) + Rótulo em Inter SemiBold + Ícone opcional à direita (16px) + Feedback de Loading (Loader2 animado).
- **Variantes Oficiais**:
  1. `primary` (Sunset Orange `#FF5841`, **texto Deep Navy `#0B132B`**) — Para salvar, converter, disparar.
  2. `intelligence` (Red-Violet `#C53678`, texto `#FFFFFF`) — Para ações com agentes de IA.
  3. `secondary` (Fundo `bg.surface`, borda `border.default`, texto `text.primary`) — Ações de apoio.
  4. `ghost` (Fundo transparente, hover sutil) — Ações discretas em tabelas e menus.
  5. `destructive` (Rose `#F43F5E`, **texto Deep Navy `#0B132B`**) — Para excluir ou cancelar irreversivelmente.
- **Tamanhos**:
  - `sm`: Altura 32px, padding horizontal 12px, texto 12px (`text-xs`).
  - `default`: Altura 36px, padding horizontal 16px, texto 14px (`text-sm`).
  - `lg`: Altura 44px, padding horizontal 24px, texto 16px (`text-base`).

### 22.2 Protocolo de Prevenção de Ações Duplicadas (Interaction Lock)
Em substituição a um debounce estático de 500ms, o sistema adota o **Protocolo de Trava de Interação e Idempotência**:
1. Ao acionar mutação assíncrona, o controle entra imediatamente em estado pendente (`isPending = true`).
2. Eventos de clique são imediatamente bloqueados (`pointer-events: none`), e o ícone de ação é substituído por `<Loader2 className="animate-spin" />`.
3. Para mutações críticas (geração de lote, disparo de webhook, cobrança), o cliente gera e transmite um cabeçalho de idempotência (`X-Idempotency-Key`).

---

# 23. COMPONENT STATE MATRIX (RESOLUÇÃO 100% EM TOKENS)

Matriz canônica de estados, desprovida de classes cruas ou valores literais:

| Componente | Default | Hover | Focus-Visible | Active (Press) | Disabled | Loading | Error |
|---|---|---|---|---|---|---|---|
| **Button Primary** | `action.primary.bg` + `action.primary.text` | `action.primary.hover` | `border.focus` (2px offset 2px) | `action.primary.active` + `motion.press` | `state.disabled.bg` + `state.disabled.text` | Spinner ativo + `interaction.lock` | `border.danger` |
| **Button Secondary** | `bg.surface` + `border.default` | `bg.card.hover` + `border.strong` | `border.focus` (2px offset 2px) | `bg.subtle` | `state.disabled.bg` + `border.subtle` | Spinner ativo + `interaction.lock` | N/A |
| **Input** | `bg.surface` + `border.default` | `border.strong` | `border.focus` + `ring.focus` | N/A | `state.disabled.bg` + `cursor.not-allowed` | Spinner no canto direito | `border.danger` + `ring.danger` |
| **Checkbox** | `bg.transparent` + `border.default` | `border.focus` | `border.focus` (2px offset 2px) | `motion.scale.active` | `state.disabled.bg` + Opacity 40% | Pulso sutil | `border.danger` |
| **Card (Clicável)** | `bg.card` + `border.default` + `elevation.1`| `border.strong` + `elevation.2` | `border.focus` (2px offset 2px) | `motion.scale.active` | Opacity 50% + `pointer-events-none` | Esqueleto pulsante | N/A |


---

# 24. FORM GOVERNANCE

A integridade operacional do CRM e dos motores de prospecção depende da precisão dos formulários.

### 24.1 Regras de Estruturação de Formulários
1. **Labels Obrigatórios**: Fica **terminantemente proibido** utilizar apenas o `placeholder` como identificador de campo. Todo input deve possuir um elemento `<label>` visível ou, em casos estritamente justificados de economia espacial, `aria-label` com tooltip de foco.
2. **Indicação de Obrigatoriedade**: Campos mandatórios devem exibir asterisco vermelho discreto (`<span className="text-rose-500">*</span>`) acompanhado de `aria-required="true"`.
3. **Mensagens de Erro em Tempo Real**: O erro de validação deve ser renderizado imediatamente abaixo do campo com ícone de alerta de 14px (`<AlertCircle size={14} />`) em cor destrutiva (`text-rose-500`), conectado ao input via `aria-describedby`.
4. **Persistência de Rascunho (Draft Auto-Save & LGPD)**: Formulários de prospecção com mais de 5 campos devem salvar o rascunho em `sessionStorage` para evitar perda de dados caso a página seja recarregada involuntariamente. **Salvaguarda Mandatória de Tenancy e LGPD**: As chaves em `sessionStorage` devem ser estritamente particionadas no formato `birthhub:draft:${tenantId}:${userId}:${formId}`, possuir TTL de expiração automática de 24 horas e expurgo mandatório no evento de logout ou chaveamento de organização (atendimento aos Bloqueadores 10 e 13 de `/AGENTS.md`).

---

# 25. DATA VISUALIZATION SYSTEM

O Birth Hub 360° transforma dados dispersos em decisões estratégicas. O sistema de visualização de dados não permite cores arbitrárias em gráficos:

### 25.1 Paleta Semântica para Gráficos (ECharts / Canvas)

| Tipo de Dado no Gráfico | Cor Oficial do Design System | Token Semântico |
|---|---|---|
| **Pipeline / Oportunidade Primária** | `#FF5841` (Sunset Orange) | `chart.series.primary` |
| **Inteligência / Previsão de IA** | `#C53678` (Red-Violet) | `chart.series.intelligence` |
| **Execução Concluída / Metas Batidas** | `#10B981` (Emerald Green) | `chart.series.success` |
| **Linha de Base / Período Anterior** | `#94A3B8` (Slate-400) | `chart.series.baseline` |
| **Telemetria / Volume de Contatos** | `#06B6D4` (Cyan) | `chart.series.telemetry` |
| **Oportunidades em Risco / Estagnação**| `#F59E0B` (Amber) | `chart.series.warning` |

### 25.2 Regras Mandatórias para Visualização
1. **Independência de Cor (WCAG 1.4.1)**: Gráficos de linha devem utilizar marcadores distintos (círculo, quadrado, triângulo) ou estilos de traço (sólido, tracejado) para que usuários daltônicos consigam diferenciar séries sem depender exclusivamente da cor.
2. **Números Tabulares em Tooltips**: Todo valor exibido em tooltips flutuantes de gráficos deve utilizar a fonte **IBM Plex Mono** (`font.numeric`) para garantir alinhamento vertical dos dígitos e leitura precisa de quantias financeiras.

---

# 26. TABLE & DATA-DENSE SYSTEM

As tabelas representam o principal instrumento de trabalho dos operadores de prospecção e vendas.

### 26.1 Especificação Arquitetural de Tabela de Alta Densidade
- **Cabeçalho Fixo (Sticky Header)**: Posicionado em `sticky top-0`, com fundo sólido (`bg-surface` em light, `bg-surface-elevated` em dark), borda inferior de 1px e `z-sticky` (`z-200`).
- **Altura de Linha (Row Height)**:
  - **Densidade Alta**: `36px` (para listagens com mais de 100 itens simultâneos).
  - **Densidade Normal**: `44px` (padrão oficial de Leads e Contatos).
- **Rolagem Horizontal Sem Quebra**: O container de tabela deve ser encapsulado obrigatoriamente em:
```tsx
<div className="w-full overflow-x-auto rounded-lg border border-border-default shadow-sm custom-scrollbar">
  <table className="w-full caption-bottom text-sm">{/* ... */}</table>
</div>
```
- **Ordenação Acessível (Sorting)**: Colunas ordenáveis devem declarar `aria-sort="ascending"`, `aria-sort="descending"` ou `aria-sort="none"`, exibindo ícone sutil de seta bidirecional que acende na ordenação ativa.

---

# 27. ACCESSIBILITY SYSTEM (WCAG 2.1 AA CALIBRADO)

O Birth Hub 360° adota o nível **WCAG 2.1 AA** como parâmetro mínimo e não-negociável de qualidade de engenharia, calibrando os requisitos de acordo com a dimensão do elemento:

| Critério WCAG | Requisito Normativo Preciso | Implementação no Birth Hub 360° |
|---|---|---|
| **1.4.3 Contraste de Texto Normal** | **Mínimo de 4.5:1** para texto menor que 18px regular ou menor que 14px bold. | Sunset Orange (`#FF5841`) consome exclusivamente texto Deep Navy (`#0B132B`, 5.89:1). |
| **1.4.3 Contraste de Texto Grande** | **Mínimo de 3.0:1** para texto $ge 18px$ regular ou $ge 14px$ bold. | Cabeçalhos e títulos atingem $ge 5.0:1$ em todos os contextos de tema. |
| **1.4.11 Elementos Gráficos** | **Mínimo de 3.0:1** para componentes de interface e bordas de controle. | Bordas de inputs ativos e ícones essenciais calibrados em $ge 3.0:1$. |
| **2.4.7 Foco Visível** | Indicador evidente com contraste $ge 3.0:1$ contra fundo e adjacências. | Regra global: `:focus-visible { outline: 2px solid #FF5841; outline-offset: 2px; }`. |
| **2.1.1 Acessível por Teclado** | Todas as funcionalidades acessíveis via mouse devem ser acionáveis por teclado. | Suporte a atalhos globais, navegação por <kbd>Tab</kbd>, fechamento no <kbd>Esc</kbd>. |
| **2.4.3 Ordem do Foco** | A ordem de tabulação deve preservar significado e operabilidade. | Focus Trap ativado em Modais e Drawers; retorno do foco ao botão disparador no fechamento. |
| **3.3.2 Rótulos ou Instruções** | Rótulos claros para entradas de dados. | Todos os inputs encapsulados com rótulos semânticos e identificação de campo obrigatório. |

---

# 28. UX GOVERNANCE & ERGONOMIA COGNITIVA

A interface deve ser autoexplicativa e responder em tempo real às quatro perguntas fundamentais do usuário:

### 28.1 As Quatro Respostas Cognitivas Obrigatórias
1. **O que aconteceu?** Notificação precisa via toast ou banner (ex: *"50 leads exportados com sucesso para o Bitrix24"*).
2. **O que está acontecendo?** Indicadores de carregamento determinísticos (barra de progresso percentual para extrações longas; skeletons com forma idêntica à do dado final para chamadas rápidas).
3. **O que posso fazer agora?** Botões de Call-to-Action (CTA) com hierarquia óbvia — exatamente um botão primário destacado por bloco visual.
4. **O que acontecerá se eu clicar?** Rótulos verbais precisos (ex: *"Excluir Campanha Definitivamente"*, e nunca apenas *"OK"* ou *"Sim"*).

### 28.2 Persistência e Resiliência de Estado
- **Filtros Sincronizados na URL**: Em todas as telas analíticas (Leads, Deals, Extrações), os filtros aplicados devem ser serializados como parâmetros de busca na URL (`?status=qualified&owner=marcelo`). Ao pressionar <kbd>F5</kbd> ou compartilhar o link, o contexto do usuário é 100% preservado.
- **Prevenção de Ações Duplicadas**: Ativação imediata de Interaction Lock em botões disparadores de mutação assíncrona.

---

# 29. PAGE GOVERNANCE (AS 8 TELAS CRÍTICAS)

Especificação prescritiva para as rotas centrais da aplicação:

### 1. Dashboard Executivo (`/dashboard`)
- **[CURRENT]**: Visual de alto impacto com ouro, porém com dados estáticos fictícios em `fallbackDeals` (`SinglePageDashboard.tsx:197`) e z-index `z-[1000]`.
- **[TARGET]**: Fundo em Deep Navy (`#0B132B`), 4 colunas de KPI Cards no topo (`h-28`), gráfico de tendências de receita com paleta Sunset Orange/Red-Violet, e remoção imediata do array mockado. Quando a API estiver vazia ou em erro, renderizar `<EmptyState>` oficial com botão de recarregar.

### 2. Pipeline CRM / Kanban (`/crm/deals`)
- **[CURRENT]**: Colunas bem estruturadas, mas badges com cores colidindo entre telas e falta de scroll horizontal suave.
- **[TARGET]**: Colunas fluidas com `min-w-[280px]`, contadores de leads com fonte `IBM Plex Mono`, badges de estágio unificadas por token semântico, e indicador visual claro da área de soltura (`border-dashed border-2 border-orange-500`).

### 3. Gestão de Leads (`/leads`)
- **[CURRENT]**: 95% de evasão de botões (`<button>` crus) e excesso de microtipografia de 10px.
- **[TARGET]**: Tabela com cabeçalho sticky permanente (`h-11`), botões de ação em lote encapsulados no componente oficial `<Button>` com texto Deep Navy sobre Sunset Orange, fonte de células em Inter 14px (`font.body`), e paginação com suporte a navegação por teclado.

### 4. Extração B2B / Prospector (`/prospector/extraction`)
- **[CURRENT]**: Filtros sem rótulos acessíveis e largura máxima diferente do restante do produto.
- **[TARGET]**: Container alinhado em `max-w-[1440px]`, todos os campos de busca por CNAE e região com `<Label>` formal, e barra de progresso determinística durante a extração de lotes.

### 5. Voice & Telefonia (`/voice`)
- **[CURRENT]**: Botão flutuante com sombra laranja legada (`rgba(255,86,24,0.4)`) e `z-[9999]`.
- **[TARGET]**: Z-index normalizado para `z-modal` (`z-500`), botão com sombra `elevation.2` e pulso suave em Sunset Orange oficial (`#FF5841`) somente durante gravação ativa.

### 6. Hub de Inteligência Artificial (`/ai`)
- **[CURRENT]**: Conflito de gradientes com roxos elétricos e laranja residual de versões antigas.
- **[TARGET]**: Cartões de agentes autônomos padronizados com o gradiente oficial **Sunset-to-Violet** (`#FF5841` a `#C53678`), e tempo estimado de resposta da IA em IBM Plex Mono.

### 7. Central de Integrações (`/integrations`)
- **[CURRENT]**: Modais de autenticação (Bitrix, WhatsApp) cortando o rodapé em telas de 768px de altura.
- **[TARGET]**: Todos os diálogos configurados com `max-h-[85vh] overflow-y-auto`, garantindo que botões de autenticação e confirmação de chaves de API nunca fiquem escondidos.

### 8. Configurações & Tenants (`/settings`)
- **[CURRENT]**: Formulários onde o Chrome Autofill estraga o contraste de fundo no tema escuro.
- **[TARGET]**: Aplicação do pseudo-elemento `:-webkit-autofill` no CSS global, abas de navegação vertical com indicador de foco visível, e seções de RBAC com badges de perfil padronizadas.


---

# 30. LEGACY GOVERNANCE

Catálogo prescritivo para saneamento de débito técnico e higienização do repositório:

| Elemento / Padrão | Classificação | Ação de Engenharia Mandatória |
|---|---|---|
| **Laranja Prospector (`#FF5618` / `#EA580C`)** | **FORBIDDEN (PROIBIDO)** | Substituir por **Sunset Orange (`#FF5841`)**. |
| **Sombra fixa `rgba(255,86,24,0.4)`** | **FORBIDDEN (PROIBIDO)** | Substituir por elevação canônica `elevation.2`. |
| **Gradiente `to-sunset` em Sidebar.tsx** | **MIGRATION REQUIRED** | Substituir por tokens canônicos do Design System in-place pelo Agente 02. |
| **Arquivo `src/components/layout/Sidebar.tsx`** | **OFFICIAL (CANÔNICO)** | Barra lateral canônica oficial; manter e refatorar in-place pelo Agente 02 sem qualquer deleção. |
| **Tipografia Cinzel e Bodoni Moda** | **FORBIDDEN (PROIBIDO)** | Eliminar referências e remover arquivos não utilizados de `public/fonts/`. |
| **Classes de fonte arbitrárias (`text-[10px]` etc.)** | **FORBIDDEN (PROIBIDO)** | Migrar para os tokens `font.caption` (11px) e `font.micro` (10px). |
| **Z-indexes mágicos (`z-[9999]`, `z-[1000]`)** | **FORBIDDEN (PROIBIDO)** | Substituir pelos tokens da tabela oficial de Z-Index (`z-500`, `z-300`). |
| **Estilos inline forçados (`style={{ ... }}`)** | **MIGRATION REQUIRED** | Converter os 1.842 usos em classes utilitárias ou tokens de CSS. |
| **Tags HTML `<button>` e `<input>` cruas em telas** | **MIGRATION REQUIRED** | Encapsular nos componentes `<Button>` e `<Input>` do Design System. |
| **Dados mockados em `SinglePageDashboard.tsx`** | **FORBIDDEN (PROIBIDO)** | Remover array hardcoded; exibir `<EmptyState>` formal. |
| **Fonte Sora + Inter + IBM Plex Mono** | **OFFICIAL (APROVADO)** | Padrão canônico imutável de tipografia da plataforma. |
| **Tokens Semânticos W3C DTCG** | **OFFICIAL (APROVADO)** | Padrão obrigatório para declaração de variáveis de design. |

---

# 31. DESIGN TOKEN ARCHITECTURE (3 CAMADAS)

O Birth Hub 360° estrutura seus tokens em estrita conformidade com a especificação internacional **W3C Design Tokens Community Group (DTCG)**:

```text
+-----------------------------------------------------------------------+
| CAMADA 1: TOKENS PRIMITIVOS (Raw Global Primitives)                   |
| Valores absolutos semânticos neutros (hex, px, ms, ratios).          |
| Ex: primitive.color.orange.500: #FF5841; primitive.space.4: 16px;    |
+-----------------------------------+-----------------------------------+
                                    |
                                    v
+-----------------------------------------------------------------------+
| CAMADA 2: TOKENS SEMÂNTICOS (Contextual & Theme Tokens)               |
| Traduzem a intenção de design e reagem ao tema (Light vs Dark).       |
| Ex: semantic.color.action.primary.bg: var(--primitive-color-orange-500)|
+-----------------------------------+-----------------------------------+
                                    |
                                    v
+-----------------------------------------------------------------------+
| CAMADA 3: TOKENS DE COMPONENTE (Scoped Component Tokens)              |
| Propriedades específicas consumidas por uma variante de controle.     |
| Ex: component.button.primary.bg: var(--semantic-color-action-primary) |
+-----------------------------------------------------------------------+
```

---

# 32. CSS ARCHITECTURE (TAILWIND V4 & GOVERNANCE)

O projeto adota **Tailwind CSS v4** com motor compilado via Vite:
- **Permitido**: Utilizar classes de utilidade semânticas mapeadas em `@theme` (`bg-brand`, `text-primary`, `border-line`, `rounded-control`).
- **Evitar**: Classes literais de cores brutas do Tailwind padrão (como `bg-blue-600` ou `text-gray-400`) em novas telas.
- **Proibido**:
  1. Uso de colchetes arbitrários com valores mágicos (ex: `w-[347px]`, `h-[19px]`, `z-[9999]`, `bg-[#FF5618]`).
  2. Uso de estilos inline em componentes React (`style={{ color: 'red' }}`) para propriedades cobertas pelo Design System.

---

# 33. DESIGN SYSTEM DIRECTORY STRUCTURE

Estrutura canônica de diretórios a ser estabelecida em `src/design-system/`:

```text
src/
  design-system/
    tokens/
      primitives.json       # Cores brutas, escalas de tempo, grids
      semantic.light.json   # Tokens semânticos para o modo claro
      semantic.dark.json    # Tokens semânticos para o modo escuro
      components.json       # Tokens específicos de componentes
    components/
      button/
        Button.tsx          # Componente oficial com debounce e variantes
        Button.types.ts     # Contratos e props
        Button.test.tsx     # Testes unitários com Vitest
      input/
        Input.tsx           # Input com label, helperText e autofill seguro
        Input.types.ts
      card/
        Card.tsx            # Card com elevação e bordas padronizadas
      table/
        DataTable.tsx       # Tabela de dados de alta densidade com sticky
      badge/
        Badge.tsx           # Badges sincronizadas por status
      feedback/
        Toast.tsx           # Wrapper para Sonner
        EmptyState.tsx      # Estado vazio com CTA
    motion/
      animations.ts         # Curvas e variantes de animação
      useReducedMotion.ts   # Hook de acessibilidade vestibular
    themes/
      tailwind-theme.css    # Diretivas @theme para Tailwind v4
    exceptions/             # Registro formal de exceções governadas
      exceptions.json       # Protocolo DSEP
    index.ts                # Ponto único de exportação pública
```

---

# 34. QUANTITATIVE DESIGN DEBT (MÉTRICAS AUDITÁVEIS POR CAMADA)

O inventário de débito técnico é formalmente estruturado pelas quatro camadas de resolução:

| Camada Arquitetural | Contagem Atual [AUDIT] | Contagem Alvo [TARGET] | Relação de Redução |
|---|---|---|---|
| **Valores Brutos no Código (Raw Values)** | 258 cores hex/rgb distintas | **0 valores soltos** | **Eliminação de 100% dos literais** |
| **Camada 1: Tokens Primitivos (Primitives)** | N/A (fragmentado) | **24 tokens primitivos** | Escala controlada de cores e escalas |
| **Camada 2: Tokens Semânticos (Semantics)** | N/A (inconsistente) | **26 papéis semânticos** | Cobertura total de ações, fundos e textos |
| **Camada 3: Tokens de Componente (Components)**| N/A | **45 tokens específicos** | Mapeamento 1:1 com controles oficiais |
| **Evasão de Botões em Telas** | 561 tags &lt;button&gt; cruas | **0 tags cruas** | **100% via componente oficial** |
| **Evasão de Inputs em Telas** | 194 tags &lt;input&gt; cruas | **0 tags cruas** | **100% via componente oficial** |
| **Classes Arbitrárias de Fonte** | 786 ocorrências | **0 ocorrências** | **-100% de anomalias** |
| **Z-Indexes Mágicos** | 13 valores arbitrários | **10 camadas escalonadas** | **-100% de conflito** |

---

# 35. MIGRATION MAP (10 WAVES DE MIGRAÇÃO)

Roteiro sequencial e ordenado para implantar o Design System sem interrupção operacional:

```text
[WAVE 0: Foundation] -> [WAVE 1: Tokens] -> [WAVE 2: Typography] -> [WAVE 3: Colors]
        ↓
[WAVE 4: Base Components] -> [WAVE 5: Layouts] -> [WAVE 6: Critical Pages]
        ↓
[WAVE 7: Accessibility] -> [WAVE 8: Motion & Perf] -> [WAVE 9: Code Cleanup]
```

---

# 36. DESIGN SYSTEM GOVERNANCE RULES (AS 35 REGRAS DE OURO RECALIBRADAS)

1. **R1**: Nenhum valor hexadecimal cru pode ser inserido em arquivos `.tsx`; utilize exclusivamente tokens de classe.
2. **R2**: Nenhuma nova cor pode ser introduzida no ecossistema sem aprovação do Design Systems Architect.
3. **R3**: Toda ação primária de conversão deve utilizar obrigatoriamente a cor **Sunset Orange (`#FF5841`)**.
4. **R4**: Toda ação associada a inteligência artificial deve utilizar obrigatoriamente **Red-Violet (`#C53678`)**.
5. **R5**: É terminantemente proibido o uso de texto branco (`text-white`) por conveniência estética em fundos sem contraste comprovado.
6. **R6**: Todo texto deve atingir contraste mínimo de **4.5:1 para texto normal** (< 18px regular / < 14px bold) e **3.0:1 para texto grande** contra sua superfície de fundo.
7. **R7**: Cabeçalhos e títulos institucionais devem utilizar a fonte **Sora**.
8. **R8**: A interface de usuário, menus e corpo de texto devem utilizar a fonte **Inter**.
9. **R9**: Valores monetários, métricas financeiras e dados tabulares devem utilizar **IBM Plex Mono**.
10. **R10**: É proibido o uso de fontes menores que 10px (`0.625rem`).
11. **R11**: É proibido o uso de fontes serifadas (Cinzel, Bodoni) em novos componentes.
12. **R12**: Todo espaçamento (padding, margin, gap) de layout deve ser múltiplo exato de 4px da escala Macro Spacing.
13. **R13**: Valores intermediários de 2px e 6px são exceções formais restritas a microalinhamento óptico de ícones e badges.
14. **R14**: Botões e inputs devem possuir alturas padronizadas (32px para SM, 36px para MD, 44px para LG).
15. **R15**: Botões de formulário e tabelas devem utilizar raio de borda `rounded-md` (6px) ou `rounded-lg` (8px).
16. **R16**: O raio de borda `rounded-full` é restrito a avatares, chips e botões circulares de ícone.
17. **R17**: É proibido criar z-indexes arbitrários superiores a `z-999` ou com colchetes (`z-[9999]`).
18. **R18**: Toda sobreposição de camada deve consumir a tabela oficial de Z-Index (`z.base` a `z.system`).
19. **R19**: Toda tag interativa deve possuir indicador visível de foco de teclado (`:focus-visible`).
20. **R20**: É proibido utilizar `focus:outline-none` sem fornecer `focus-visible:ring-2` como substituto.
21. **R21**: Nenhuma feature, página ou tela consumirá a tag HTML `<button>` diretamente fora dos componentes interativos oficiais do Design System (`<Button>`, `<IconButton>`). Os componentes do Design System devem utilizar elementos HTML semanticamente corretos internamente.
22. **R22**: Todo botão com mutação assíncrona deve integrar o Protocolo de Trava de Interação (`interaction.lock`).
23. **R23**: Nenhum campo de entrada pode ser criado via tag `<input>` crua em telas; utilize o componente oficial `<Input>`.
24. **R24**: Todo input deve possuir um elemento `<label>` formal associado via `htmlFor`.
25. **R25**: Nenhum formulário pode utilizar apenas o `placeholder` como única instrução de preenchimento.
26. **R26**: Cards não podem ser aninhados em mais de 2 níveis de profundidade de borda.
27. **R27**: Toda tabela de dados analíticos deve possuir cabeçalho fixo (`sticky top-0`) com `z-sticky`.
28. **R28**: Toda tabela deve estar envolvida em container com `overflow-x-auto` para evitar estouro de tela.
29. **R29**: Controles interativos compostos exclusivamente por ícone exigem obrigatoriamente nome acessível (`aria-label`); tooltips são mandatórios quando a ação não for autoevidente.
30. **R30**: Ícones ao lado de texto visível devem declarar obrigatoriamente `aria-hidden="true"`.
31. **R31**: Todas as animações devem respeitar a preferência do usuário por movimento reduzido (`prefers-reduced-motion`).
32. **R32**: O aplicativo Android Capacitor deve desabilitar `backdrop-filter` em favor de cores de fundo sólidas.
33. **R33**: Em viewports de 768px a 1023px (tablets), a Sidebar deve recolher automaticamente para 64px.
34. **R34**: Em páginas analíticas, os filtros de busca devem ser sincronizados obrigatoriamente com a URL.
35. **R35**: Fica expressamente vedada a renderização de dados mockados em ambiente de produção.

---

# 37. DESIGN SYSTEM EXCEPTION PROTOCOL (DSEP)

Para impedir que a rigidez necessária do Design System se transforme em uma barreira para casos de uso legítimos de engenharia, fica instituído o **Protocolo Formal de Exceções**.

Nenhuma exceção pode ser implementada silenciosamente no código. Toda e qualquer violação temporária ou permanente das 35 Regras de Ouro deve ser registrada em `src/design-system/exceptions/exceptions.json` contendo o seguinte schema obrigatório:

```json
{
  "exceptionId": "DSX-001",
  "owner": "marcelo.nascimento",
  "file": "src/features/crm/components/VirtualKanbanBoard.tsx",
  "component": "VirtualKanbanBoard",
  "ruleViolated": "R12 (Macro Spacing 4px)",
  "justification": "Restrição matemática da biblioteca de virtualização @tanstack/react-virtual que exige altura fracionada de 42px por linha para cálculo dinâmico de scroll.",
  "alternativesConsidered": "Tentativa com 44px provocou estouro de buffer de renderização no Safari móvel.",
  "businessUxReason": "Preservação da taxa de 60 FPS durante rolagem de mais de 2.000 oportunidades comerciais.",
  "type": "TEMPORARY",
  "expirationDate": "2026-12-31",
  "approver": "Principal Design Systems Architect",
  "migrationPlan": "Migração para @tanstack/react-virtual v4 que suporta dynamic measurement sem altura fixa."
}
```

---

# 38. DEFINITION OF DONE (CHECKLIST TÉCNICO DO DESIGN SYSTEM)

Um componente ou tela só é considerado **"Concluído (DONE)"** quando cumpre 100% dos critérios:
- [ ] Consome exclusivamente tokens semânticos oficiais (zero cores hexadecimais soltas).
- [ ] Utiliza a tipografia canônica (Sora para títulos, Inter para UI, IBM Plex Mono para métricas).
- [ ] Espaçamentos aderentes à escala Macro Spacing de 4px ou justificados via Protocolo DSEP.
- [ ] Todos os estados interativos implementados via tokens oficiais.
- [ ] Anel de foco visível por teclado (`:focus-visible`) testado e aprovado.
- [ ] Contraste verificado e aprovado ($ge 4.5:1$ para texto normal, $ge 3.0:1$ para texto grande).
- [ ] Botão Sunset Orange consome exclusivamente texto Deep Navy (`#0B132B`).
- [ ] Proteção de Interaction Lock ativada em mutações assíncronas.
- [ ] Responsividade testada matematicamente em 768px (tablet), 1024px, 1366px e 1920px.
- [ ] Respeito a `prefers-reduced-motion` sem animações forçadas.
- [ ] Zero erros no linter de arquitetura (`npm run test:architecture`).

---

# 39. EVIDENCE APPENDIX (REGISTRO FORENSE DE EVIDÊNCIAS REAIS)

| Item de Evidência | Arquivo Fonte no Repositório | Linha | Seletor / Código Encontrado | Valor Atual [CURRENT] | Valor Alvo [TARGET] | Justificativa Técnica |
|---|---|---|---|---|---|---|
| **E1** | `src/components/ui/VoiceCommandWidget.tsx` | 155 | `style={{ boxShadow: ... }}` | `rgba(255, 86, 24, 0.4)` | `elevation.2` / Sunset Orange | Eliminar sombra residual do antigo Prospector. |
| **E2** | `src/features/dashboard/components/SinglePageDashboard.tsx` | 197 | `const fallbackDeals = [...]` | Dados fictícios mockados | `<EmptyState>` oficial | Atendimento ao Bloqueador 6 do AGENTS.md. |
| **E3** | `src/components/layout/Sidebar.tsx` | 253 | `bg-gradient-to-tr ... to-sunset` | `to-sunset` (`#FF5618`) | Refatorar in-place com tokens canônicos | Eliminar gradiente legado sem alterar montagem em MainLayout. |
| **E4** | `src/styles/globals.css` | 247 | `--font-brand-display` | `"Plus Jakarta Sans"` | `"Sora"` | Alinhamento 100% com o Brandbook oficial. |
| **E5** | `src/components/ui/dialog.tsx` | 42 | `<DialogPrimitive.Content>` | Sem `max-h` relativo | `max-h-[85vh] overflow-y-auto` | Prevenir corte de rodapé em laptops de 768px. |
| **E6** | `src/components/ui/VoiceCommandWidget.tsx` | 146 | `className="... z-[900]"` | `z-[900]` (`ClickSpark` usa `z-[9999]`) | `z.tools` (`z-800`) | Normalizar z-index solto para a escala canônica do sistema. |

---

# 40. CONFLICT REGISTER (REGISTRO FORMAL DE CONFLITOS)

| ID | Conflito Identificado | Evidência no Código | Impacto no Produto | Decisão Oficial Adotada | Justificativa Técnica |
|---|---|---|---|---|---|
| **CR-01** | **Marca Dourada vs. Nova Identidade Alvo** | `globals.css` usa `#D4AF37` em abundância, enquanto a nova diretriz foca em Sunset Orange (`#FF5841`) e Red-Violet (`#C53678`). | Dissonância visual entre marketing institucional e produto operacional. | **Consolidar o Ouro como acento nobre secundário e adotar Sunset Orange como cor primária de ação.** | O Sunset Orange entrega maior urgência e contraste executivo em CTAs de conversão. |
| **CR-02** | **Status e Sanidade da Barra Lateral (Sidebar.tsx)** | Inexistência de `AppSidebar.tsx` no repositório; `Sidebar.tsx` é o único arquivo ativo montado em `MainLayout.tsx` | Risco de quebra fatal de build e tela branca caso `Sidebar.tsx` fosse deletado. | **Preservar `Sidebar.tsx` como componente canônico oficial e refatorar in-place.** | A suposição anterior de `AppSidebar.tsx` era infundada. `Sidebar.tsx` será higienizado in-place pelo Agente 02, mantendo compatibilidade total com `MainLayout.tsx`. |
| **CR-03** | **Sora vs Plus Jakarta Sans** | Arquivos de fonte de Sora existem no disco, mas globals.css apontava para Plus Jakarta Sans. | Quebra da diretriz de tipografia do Brandbook. | **Mapear Sora oficialmente em `--font-brand-display`.** | Sora entrega a geometria e modernidade esperadas de um Strategic Command Center. |

---

# 41. DESIGN DECISION REGISTER (ARCHITECTURAL DECISION RECORDS)

### ADR-001: Adoção do Sistema de Três Camadas de Tokens W3C
- **Contexto**: Desenvolvedores misturavam classes brutas com variáveis locais em `globals.css`.
- **Decisão**: Adotar a arquitetura W3C DTCG: *Primitives → Semantics → Components*.
- **Impacto**: Nenhuma tela consome valores primitivos diretamente; facilidade total para alternar temas.

### ADR-002: Extinção do Texto Branco no Botão Primário Sunset Orange
- **Contexto**: `#FF5841` sobre `#FFFFFF` gera ratio de apenas 3.12:1 (reprovando no WCAG AA) e colide com a regra "não quero fonte branca".
- **Decisão**: O texto oficial sobre Sunset Orange é obrigatoriamente **Deep Navy (`#0B132B`)**, atingindo ratio de **5.89:1**.
- **Impacto**: Acessibilidade impecável e fidelidade total ao DNA de autoridade e sofisticação corporativa.

### ADR-003: Governança Rígida de Z-Index
- **Contexto**: Presença de `z-[9999]`, `z-[1000]` e `z-[900]` provocando conflitos de clique.
- **Decisão**: Tabela fechada de Z-Index em 10 níveis (`z-0` a `z-999`). Classes arbitrárias serão bloqueadas no CI.
- **Impacto**: Eliminação definitiva de sobreposições acidentais de diálogos e tooltips.

### ADR-004: Instituição do Protocolo de Exceções (DSEP)
- **Contexto**: Sistemas de design ultra-rígidos tendem a ser burlados via hacks se não houver um caminho formal para casos de borda.
- **Decisão**: Criar o schema `DSEP` em `exceptions.json` com proprietário, justificativa e data de expiração obrigatórios.
- **Impacto**: Governança transparente e rastreável sem engessamento de engenharia.

---
*Fim da Master Specification — Aprovada para publicação e governança do ecossistema Birth Hub 360°.*
