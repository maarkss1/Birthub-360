# Inventário da Arquitetura Visual — Birth Hub 360°

**Data da inspeção:** 2026-09-15  
**Escopo:** preparação do pipeline visual; nenhum redesign foi iniciado.

## 1. Stack e versões observadas

| Camada | Tecnologia | Versão declarada |
| --- | --- | --- |
| UI | React / React DOM | `^19.0.1` |
| Linguagem | TypeScript | `^7.0.2` |
| Bundler/dev server | Vite | `^6.2.3` |
| Rotas | React Router DOM | `^7.18.1` |
| CSS/utilitários | Tailwind CSS CSS-first + plugin Vite | `^4.1.14` |
| Animação | Framer Motion | `^13.1.1` |
| Ícones | Lucide React + ícones próprios | `^1.38.0` |
| Formulários/validação | React Hook Form + Zod | `^7.85.0` / `^4.4.3` |
| Gráficos | Recharts + ECharts | `^3.10.1` / `^6.1.0` |
| Component variants | class-variance-authority | `^0.7.1` |
| Teste unitário/integrado | Vitest | `^4.1.11` |
| E2E/visual/a11y | Playwright + axe-core | `^1.63.0` / `^4.12.0` |
| Component workshop | Storybook React/Vite | `^10.5.10` |
| Lint/format | Biome (principal) + ESLint disponível | `^2.5.11` / `^9.39.5` |
| Mobile | Capacitor Android/iOS | `^8.5.0` |

As versões acima são as faixas declaradas em `package.json`; o lockfile npm é a fonte do grafo efetivamente resolvido.

## 2. Arquitetura frontend

- SPA React montada por `src/main.tsx`, com `BrowserRouter` e carregamento de estilos globais.
- `src/App.tsx` concentra providers, proteção de autenticação/RBAC, lazy loading e rotas.
- Organização predominante por feature em `src/features/<domínio>/`, com componentes, hooks, API e serviços próximos ao domínio.
- Shell compartilhado em `src/components/layout/`: `MainLayout`, `Sidebar`, `AppTopbar`, `ExecutiveHeader`, `FloatingDock`, banners, guards e transição de página.
- Primitivos transversais em `src/components/ui/`; componentes de marca, charts, CRM, editor, PDF e workspace têm pastas próprias.
- Serviços/contextos globais em `src/contexts/`, `src/hooks/`, `src/lib/`, `src/shared/` e `src/bootstrap/`.
- Módulos de rota são carregados com `React.lazy`, reduzindo o custo inicial; o onboarding 3D possui carregamento condicionado.

## 3. CSS, Design System e temas

- Tailwind 4 opera em modo **CSS-first** a partir de `src/styles/globals.css`; não existe `tailwind.config.*`.
- Tokens base vivem em `:root`, overrides escuros em `.dark` e mapeamentos/utilitários em `@theme`.
- Famílias efetivamente configuradas: `Sora` para `--font-brand-display` e `Inter` para `--font-brand-sans`; ambas self-hosted em `public/fonts/`.
- Bodoni Moda permanece como ativo legado carregado, mas não é a família atual do token display.
- `ThemeContext` alterna classes `.light`/`.dark` no elemento raiz e persiste a seleção em `localStorage`.
- Tokens principais localizados: fundos (`--bg`, `--surface`, `--surface-2`), conteúdo (`--ink`, `--ink-2`), linha (`--line`), marca (`--brand`, `--brand-2`, `--on-brand`, `--iris`, `--orbit-blue`, `--red`, `--pink`), semânticos, sombras, radii, tipografia e motion.
- As fontes de marca estruturadas também existem em `identidade-visual/birthhub360/tokens/` nos formatos CSS, JSON e TypeScript.

## 4. Brandbook e ativos

Fonte de verdade localizada em:

- `identidade-visual/birthhub360/README.md` — Brandbook textual vigente;
- `identidade-visual/birthhub360/preview.html` — preview da marca;
- `identidade-visual/birthhub360/logos/` — SVGs-mestre de símbolo, ícone e assinatura horizontal;
- `identidade-visual/birthhub360/tokens/` — tokens transportáveis;
- `public/brand/` — ativos servidos pela aplicação;
- `src/components/brand/BirthHubLogo.tsx` — abstrações React da marca;
- `birthub-360-assets/` — pacote adicional de distribuição;
- `identidade-visual/MANUAL_UI_UX_PLATAFORMA.*` — material histórico da arquitetura de duas marcas, não especificação vigente.

## 5. Componentes compartilhados encontrados

### Shell e layout

`AppTopbar`, `ExecutiveHeader`, `FloatingDock`, `MainLayout`, `OfflineBanner`, `PageTransition`, `ProtectedRoute`, `RequireModuleAccess`, `RequireRole`, `Sidebar` e metadados de tabs.

### Primitivos e padrões de UI

- Base/interação: `Button`, `Input`, `Label`, `Select`, `Textarea`, `Toggle`, `Badge`, `Card`, `Table`, `VirtualTable`;
- overlays: `Dialog`, `ConfirmDialog`, `Drawer`, `BottomSheet`, `CommandPalette`, `AIContextPopover`, `ToolTechPopover`;
- estados/feedback: `Skeleton`, `EmptyState`, `BlockedState`, `Toaster`, `ContextualTip`, `Pagination`, `Timeline`, `Checklist`;
- dados: `KpiCard`, `FunnelBars`, `ChannelDonut`, `CompareBar`, `CompareTable`, `DealsGrid`, `CalendarHeatmap`, `LiveStatsWidget`, `GamificationWidget`, `FindingsList`, `ActionPlanSteps`;
- IA/voz: `AIEmailGenerator`, `CopilotTrigger`, `VoiceCommandWidget`;
- experiência/motion: `BrandOrb`, `Carousel`, `ClickSpark`, `Magnetic`, `TiltCard`;
- marca/ícones: `BirthHubLogo`, `BrandIcons`, `TechToolLogo`.

Há stories somente para `Badge`, `Button` e `Card`.

## 6. Telas e rotas encontradas

### Públicas e entrada

- `/` e `/welcome` — Welcome;
- `/login` — Login;
- `/reset-password` — redefinição de senha;
- `/book/:slug` — agendamento público;
- `/ldr` e rotas públicas adicionais protegidas por flags/condições em `App.tsx`;
- `/select-brand` — alias legado redirecionado para Welcome.

### Shell autenticado `/app/*`

- Painel: `/app`, `/app/dashboard`;
- workspace e hub: `/app/workspace` e rota do Hub definida no bloco protegido;
- prospecção e social selling: `/app/prospect` e rota social correspondente;
- CRM: `/app/crm`, `/app/crm360`, `/app/propostas`;
- cadastros/atividade: `/app/companies`, `/app/contacts`, `/app/activities`, `/app/cadence`;
- inteligência e enablement: `/app/intelligence`, `/app/chatbook`, `/app/roleplay`, `/app/qualification_matrix`, `/app/objections_matrix`, `/app/topic_training`, `/app/bitrix`, `/app/reports`;
- operação/dados: `/app/integrations`, `/app/knowledge`, `/app/analytics`, `/app/winloss`;
- inteligência de mercado: `/app/market-intelligence`, `/app/market-intelligence/accounts/:id`, `/app/market-intelligence/deck`;
- inteligência comercial: rota protegida do hub, `/app/daily-plan`, `/app/sdr-diagnostic-joao`;
- agenda/operação: `/app/calendar`, rota protegida da Mesa de Tratamento, `/app/notifications`, `/app/automations`;
- administração: rota protegida de consumo, `/app/editor`, rotas protegidas de equipe e acesso a módulos, `/app/settings`.

Componentes de detalhe, formulários, dialogs, drawers e subpainéis vivem dentro das features e não necessariamente têm rota própria. O inventário foi baseado nas rotas reais de `src/App.tsx`, não apenas em nomes de arquivos.

## 7. Testes, lint, Storybook e referências visuais

- Unitários: `tests/unit/` (217 arquivos encontrados na inspeção).
- Integração: `tests/integration/` (75 arquivos).
- E2E: `tests/e2e/` (29 arquivos), incluindo acessibilidade e `visual.spec.ts`.
- Container: `tests/container/` (1 arquivo).
- Goldens Playwright existem para Dashboard (light/dark), CRM board (light/dark) e Contact Form (light), em Linux e Windows.
- Screenshots de documentação existem em `documentacao-aplicacao/imagens/`; são evidência histórica/documental, não baseline automaticamente atual.
- Storybook configurado em `.storybook/` com scripts `storybook` e `build-storybook`; cobertura atual de stories é limitada a três primitivos.
- Lint principal: `biome lint src`; ESLint e `eslint-plugin-jsx-a11y` também estão configurados, mas não são o comando principal do script `lint`.
- Gate arquitetural: dependency-cruiser e verificação de hotspots.

## 8. Status das skills solicitadas

| Skill | Origem | Versão/commit verificável | Data | Caminho | Status |
| --- | --- | --- | --- | --- | --- |
| `frontend-design` | Adaptação local declaradamente inspirada no plugin oficial Anthropic | commit local `7d6f061d51e3ec5680126a6db0d3feed7f355e7c` (histórico do arquivo); sem campo `version` no frontmatter | 2026-09-08 | `.agents/skills/frontend-design/SKILL.md` (espelho em `.claude/skills/`) | **Disponível e lida; não equivale a uma cópia oficial pinada** |
| `web-design-guidelines` | Esperada: repositório oficial Vercel | não verificável neste ambiente | 2026-09-15 | ausente | **Bloqueada: não instalada** |

Tentativas de consultar os repositórios oficiais Anthropic e Vercel por HTTPS falharam com `CONNECT tunnel failed, response 403`. Por isso nenhum comando ou conteúdo foi inventado, nenhuma dependência flutuante foi adicionada e a skill Vercel não foi simulada. O pipeline está governado e inventariado, porém o estágio de auditoria Vercel só pode ser declarado preparado depois de acesso à origem oficial, leitura do `SKILL.md` e registro de um commit/tag pinado.

## 9. Inconsistências atuais identificadas

1. **Tipografia documental divergente:** o Brandbook textual e o README pai ainda declaram Bodoni Moda, enquanto `globals.css` e a direção explícita atual usam Sora. A constituição fixa Sora para os próximos trabalhos, mas a documentação de marca precisa de atualização pelo Agente 11.
2. **Paleta documental divergente:** o Brandbook descreve a paleta institucional anterior, enquanto `globals.css` registra uma direção “Strategic Command Center” mais recente e novos neutros/accent tokens. Antes de redesenhar, o dono da marca e do Design System deve reconciliar a fonte de verdade.
3. **Resíduo nominal de marca:** `ThemeContext` persiste tema na chave `atlas_theme`, embora o produto agora tenha marca única Birth Hub 360°.
4. **Fonte externa:** IBM Plex Mono é importada do Google Fonts no CSS global, enquanto o restante da tipografia prioriza self-hosting e operação offline no app Capacitor.
5. **Fallback visual fora do sistema:** `PageFallback` usa `bg-white/*` e radii utilitários específicos, em vez dos tokens semânticos descritos pelo Design System.
6. **Cobertura de componentes limitada:** apenas três componentes compartilhados têm stories; não há catálogo completo de estados light/dark e responsivos.
7. **Baselines visuais parciais:** goldens cobrem somente Dashboard, CRM board e Contact Form; a maioria das rotas não possui regressão visual dedicada.
8. **Documentação visual histórica:** screenshots de manual podem não refletir tokens, marca e rotas atuais e não devem ser tratadas como golden sem validação de frescor.

Esses itens são diagnóstico de preparação; nenhum foi “corrigido visualmente” nesta etapa para respeitar o freeze e a separação de donos.

## 10. Riscos antes do redesign

- quebrar RBAC, guards, deep links ou navegação ao tratar `App.tsx` como arquivo apenas visual;
- mascarar estados reais de loading/empty/error/stale com composição cenográfica;
- remover densidade operacional importante em favor de aparência de landing page;
- regressão de contraste ao reutilizar ouro, accent colors ou transparências nos dois temas;
- inconsistência de marca enquanto Brandbook e tokens não forem reconciliados;
- regressão mobile/Capacitor, inclusive overflow, safe areas e custo de chunks 3D;
- quebra de acessibilidade em overlays, foco, navegação por teclado e motion;
- introdução de tokens/componentes duplicados em vez de compor os primitivos atuais;
- auditoria falsa ou não reproduzível enquanto `web-design-guidelines` oficial estiver ausente;
- tratar screenshots documentais antigos como verdade visual atual;
- alterações concorrentes em `src/App.tsx`, layout, tokens ou componentes compartilhados.

## 11. Gate de entrada para o próximo prompt

O redesign completo **não começou**. Antes de iniciá-lo:

1. obter acesso à origem oficial de `web-design-guidelines`, instalar por commit/tag pinado e ler sua documentação;
2. registrar caminho e hash no quadro de skills deste documento;
3. reconciliar Sora/paleta entre Brandbook e Design System pelos donos corretos;
4. escolher superfícies e arquivos com propriedade explícita, sem editores concorrentes;
5. estabelecer baselines light/dark e desktop/mobile da superfície alvo;
6. seguir a sequência constitucional: `frontend-design` cria/refina, depois `web-design-guidelines` audita.
