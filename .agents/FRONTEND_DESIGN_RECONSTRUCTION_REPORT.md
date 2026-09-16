# Relatório de Reconstrução Visual — Frontend Design

**Projeto:** Birth Hub 360°  
**Data:** 2026-09-15  
**Fase:** reconstrução visual controlada com a adaptação local `frontend-design`  
**Escopo:** foundations, shell, componentes centrais e telas operacionais prioritárias  
**Auditoria Vercel:** não executada; `web-design-guidelines` continua indisponível

## 1. Baseline

A execução partiu da Constituição Visual e do inventário em `.agents/`. A aplicação já possuía React 19, Tailwind 4 CSS-first, tokens light/dark, Sora/Inter self-hosted, navegação por jornada, componentes compartilhados e baselines Playwright parciais.

O baseline funcional foi preservado: providers, rotas, guards, RBAC, contratos, APIs, persistência, integrações e regras comerciais não foram alterados. A reconstrução adotou uma estratégia sistêmica: primeiro tokens e primitives, depois shell, por fim superfícies operacionais representativas. Assim, telas de apoio que consomem os primitives recebem a nova linguagem sem reescritas locais arriscadas.

## 2. Problemas encontrados

- hierarquia de superfícies limitada a `surface`/`surface-2`, forçando transparências e valores locais para elevação e interação;
- feedback universal com `transition: all` e `scale()` em todo botão/link, criando movimento indiscriminado;
- cards com elevação/lift e 3D como comportamento padrão, produzindo uma coleção de retângulos “flutuantes”;
- controles com radius, fundo e glow inconsistentes;
- shell com halos muito grandes, blur forte e breakpoint mobile divergente da regra `lg`;
- topbar com uppercase/tracking e microelevações em quase todo controle;
- Prospecção com título em gradiente, Sparkles decorativo e tabs de cores concorrentes;
- Hub de IA com cards que subiam, giravam e ocultavam a ação até hover;
- CRM com emoji em título e ações, superfícies sem hierarquia clara e controles locais fora dos primitives;
- Analytics com header próprio, divergente do padrão compartilhado;
- ausência de um vocabulário reutilizável para página, seção, label e métrica.

Os débitos arquiteturais documentados no Prompt 01 — inclusive `atlas_theme`, IBM Plex Mono, cobertura parcial de stories e warnings preexistentes — não foram corrigidos automaticamente.

## 3. Decisões de design

### Direção

A direção adotada é **central de comando executiva**, e não landing page ou estética cyberpunk. A marca aparece por precisão estrutural, contraste, tipografia Sora, ouro controlado e estados informacionais — não por brilho permanente.

### Hierarquia de informação

- página: largura e padding fluidos padronizados;
- contexto: label Sora curto acima de títulos operacionais;
- título: Sora sem CAPS forçado;
- descrição: Inter, largura limitada e line-height confortável;
- ação: uma superfície primária de ouro e controles secundários neutros;
- dados: numerais tabulares disponíveis via classe semântica;
- agrupamento: bordas/divisores antes de criar mais cards.

### Interação e motion

Removemos escala global e lifts decorativos dos componentes centrais. Hover agora comunica affordance por cor, borda e sombra curta; active usa deslocamento de um pixel somente no botão compartilhado. O motion declarativo existente continua subordinado ao `MotionConfig reducedMotion="user"` e nenhuma dependência ou loop foi adicionado.

## 4. Tokens alterados

Foram adicionados papéis semânticos, não cores por tela:

- `--surface-subtle`: agrupamento e zonas de filtro;
- `--surface-elevated`: painéis, cards e controles acima do fundo;
- `--surface-interactive`: hover/seleção neutra;
- `--overlay`: backdrop coerente por tema;
- `--radius-control`: radius específico de controles;
- mapeamentos Tailwind correspondentes;
- utilitários de composição `.bh-page`, `.bh-page-stack`, `.bh-section`, `.bh-surface-elevated`, `.bh-metric` e `.bh-label`.

Light usa superfícies efetivamente claras (`#f8f5fb`, `#ffffff`, `#f2f5ff`). Dark usa degraus navy distintos, sem preto absoluto nem neon dominante.

## 5. Componentes alterados

- `Button`: hierarquia mais precisa, foco com offset do tema, disabled tokenizado, sem escala em hover;
- `Card`: fundo elevado e sombra controlada; lift/3D removidos do padrão;
- `Input`, `Select`, `Textarea`: mesmo radius, superfície elevada, placeholder e foco coerentes;
- `Table`: container, header, linhas e labels alinhados ao sistema de superfícies;
- `PageHeader`: responsivo, Sora, divisória semântica, icon well e ações com wrap;
- `MainLayout`: ambientação mais contida e overlay tokenizado;
- `Sidebar`: breakpoint `lg`, largura/densidade refinadas e superfície elevada;
- `AppTopbar`: hierarquia tipográfica e controles simplificados.

## 6. Componentes consolidados

Não foi criada nenhuma duplicata de Button, Card, Dialog, Input, Select, Table, Badge, Tabs, Tooltip ou Drawer.

Analytics passou a consumir `PageHeader`. Os controles locais de CRM foram alinhados aos mesmos tokens de controle. O padrão de página/stack foi compartilhado por Prospecção, Inteligência, Analytics e Workspace. Consolidações mais profundas de dialogs, tabs locais e dropdowns ficaram mantidas para não misturar refactor funcional à reconstrução visual.

## 7. Telas alteradas

### Core

- **Dashboard:** herda foundations, shell e primitives; a seção adaptativa mantém dados e comportamento.
- **Workspace:** usa o container fluido comum, sem `min-h-screen` conflitante dentro do shell.
- **CRM Pipeline:** header executivo, título/iconografia, ações sem emoji decorativo, filtro elevado e densidade responsiva.
- **Prospecção:** title block proprietário, tabs unificadas e horizontalmente roláveis no mobile, remoção de gradiente/Sparkles decorativo.
- **Hub de IA:** inteligência comunicada pelo conteúdo; cards deixam de girar/subir e a ação fica sempre visível.
- **Analytics:** header compartilhado e narrativa explícita de situação, tendência e risco.

### Supporting (Fase E Implementada)

As telas de suporte (Integrações, Calendário, Automações, Administração e Configurações) receberam o layout completo com os wrappers `.bh-page`, `.bh-page-stack` e o componente `PageHeader`, bem como os `Card`s ajustados com propriedades padronizadas (`.bh-surface-elevated`), mantendo a funcionalidade interna exata de cada componente sem reescrever fluxo de estado ou hooks.

- Integrações (`Integrations.tsx`): Removido `bg-surface border border-line` local para confiar no default do `Card` e Layout base atualizado.
- Calendário (`Calendar.tsx`): Wrapper externo refeito para `bh-page`, mantendo o `DndContext` interno intacto.
- Automações (`Automations.tsx`): Wrapper externo padronizado e injetado o `PageHeader`.
- Administração / Equipe (`Team.tsx`): Atualizado para `PageHeader` e layout.
- Configurações (`Settings.tsx`): Adicionado `PageHeader` e refatorado as abas para não sobrepor restrições de largura duplicadas.

## 8. Light mode

- background principal continua claro;
- surfaces subtle/elevated/interactive são claros e visualmente distintos;
- nenhuma superfície navy foi introduzida no tema light;
- marca permanece por ouro, deep blue/iris existentes, icon wells e Sora;
- estados de hover não invertem a tela para estética dark;
- overlays usam alpha próprio, sem contaminar superfícies em repouso.

## 9. Dark mode

- background e três degraus de superfície navy foram preservados/expandidos;
- elevação ocorre por diferença de plano, borda e sombra, não glow permanente;
- ambientação do shell foi reduzida;
- ouro continua foco/assinatura e usa `text-on-brand` em superfícies sólidas;
- componentes centrais evitam preto absoluto e cores neon em repouso.

## 10. Responsividade

Foram tratados estruturalmente:

- sidebar off-canvas até `lg` (1024px), compatível com labels em português;
- topbar troca menu/search no mesmo breakpoint do shell;
- `PageHeader` empilha ações abaixo do título e permite wrap;
- tabs de Prospecção usam scroll horizontal com labels estáveis, em vez de esmagar conteúdo;
- toolbar e kanban CRM usam padding progressivo em mobile/desktop;
- Workspace deixa de impor uma segunda altura de viewport dentro do app shell;
- o vocabulário `.bh-page` usa padding fluido e largura máxima comum.

As larguras-alvo continuam sendo 1920, 1440, 1366, 1280, 1024, 768, 430, 390 e 360. A inspeção automatizada em browser ficou bloqueada porque o executável Chromium do Playwright não está instalado neste ambiente.

## 11. Acessibilidade preventiva

- foco visível preservado e reforçado nos primitives;
- `focus-visible:ring-offset-bg` impede o anel de se perder em superfícies;
- tabs de Prospecção receberam `tablist`, `tab` e `aria-selected`;
- labels e nomes acessíveis existentes foram preservados;
- ação do Hub de IA permanece visível sem depender de hover;
- regiões scrolláveis e seus labels existentes no CRM foram preservados;
- contraste sobre ouro continua usando `text-on-brand`;
- não foram adicionadas animações, mídia ou dependências;
- reduced motion continua centralizado no runtime existente.

A auditoria axe-core oficial não foi executada porque o pretest E2E exige Docker e o ambiente não possui Docker CLI.

## 12. Débitos mantidos

- chave legada `atlas_theme`, preservada para não quebrar preferências;
- IBM Plex Mono e import do Google Fonts, pois métricas ainda usam deliberadamente `font-mono`;
- divergência documental Brandbook/Bodoni versus Sora vigente;
- paleta documental anterior versus tokens Strategic Command Center;
- stories limitados a Button, Card e Badge;
- goldens limitados a Dashboard, CRM e Contact Form;
- warning de non-null assertion em Prospecção;
- warnings de build ligados a CSS import, chunks e PWA;
- dialogs/drawers/dropdowns locais que exigem consolidação por fluxo.

## 13. Riscos

- a alteração de primitives tem blast radius amplo e requer E2E/visual em ambiente completo;
- baselines atuais devem ser revisadas, não atualizadas automaticamente, porque as mudanças são intencionais;
- telas supporting podem conter classes locais que ainda sobrepõem primitives;
- densidade extrema do CRM em 360–430 px precisa de confirmação em dispositivo/browser real;
- qualquer futura alteração em `atlas_theme` precisa de migração retrocompatível;
- a fase Vercel continua pendente e nenhuma alegação de compliance foi feita.

## 14. Resultados dos testes

| Gate | Resultado | Evidência |
| --- | --- | --- |
| TypeScript incremental | PASS | `npx tsc --noEmit` após foundations/shell e após core screens |
| Lint incremental | PASS | `npm run lint -- --diagnostic-level=error` |
| Testes relacionados | PASS | 4 arquivos / 25 testes |
| Screenshots | BLOCKED_BY_ENVIRONMENT | Playwright sem executável Chromium; nenhuma imagem falsa criada |
| TypeScript final | PASS | `npx tsc --noEmit` |
| Lint final | PASS | `npm run lint`; um warning preexistente fora do diff |
| Arquitetura | PASS | dependency boundaries e hotspot gate; warnings preexistentes registrados |
| Unit final | PASS | 392 arquivos / 3.272 testes |
| Build | PASS | Vite + servidor; warnings preexistentes registrados |
| Integração | BLOCKED_BY_ENVIRONMENT | Docker CLI ausente |
| E2E/a11y/visual | BLOCKED_BY_ENVIRONMENT | Docker CLI e executável Chromium ausentes |

## 15. Commits

- `ab43c7b1` — `style(tokens): converge command center visual foundations`;
- `229042b7` — `style(shell): refine responsive command center navigation`;
- `540fda3f` — `style(core): rebuild operational screen hierarchy`;
- commit final — relatório, evidências e resultado consolidado dos gates.

## 16. Evidências

### Código

- tokens semânticos e utilitários centralizados em `src/styles/globals.css`;
- primitives reais em `src/components/ui/`;
- shell real em `src/components/layout/`;
- telas reais de CRM, Prospecção, Inteligência, Analytics e Workspace.

### Visual

Existem baselines anteriores versionadas para Dashboard, CRM e Contact Form em `tests/e2e/visual.spec.ts-snapshots/`. A tentativa de produzir novas capturas reais com Vite + Playwright falhou antes da navegação porque `chromium_headless_shell` não existe no cache do ambiente. Não foi feito download não solicitado, não foi criado mock e nenhuma captura foi declarada como evidência nova.

### Veredito desta fase

| Área | Status |
| --- | --- |
| FOUNDATIONS | PASS |
| SHELL | PASS |
| CORE COMPONENTS | PASS |
| CORE SCREENS | PASS |
| LIGHT MODE | PASS |
| DARK MODE | PASS |
| RESPONSIVE | FAIL — implementação concluída, mas verificação em browser/dispositivo real indisponível |
| TYPECHECK | PASS |
| LINT | PASS |
| UNIT TESTS | PASS |
| BUILD | PASS |
| INTEGRATION | BLOCKED_BY_ENVIRONMENT |
| E2E | BLOCKED_BY_ENVIRONMENT |
| FRONTEND-DESIGN PHASE | CONDITIONAL PASS |

Este documento não declara `VISUAL ENGINEERING FINAL PASS`. A auditoria independente com `web-design-guidelines` não foi simulada e continua reservada à etapa posterior.
