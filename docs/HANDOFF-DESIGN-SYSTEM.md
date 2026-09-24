# Handoff — Birth Hub 360° Design System Bible

Branch: `design-system/handoff` · Criado em 24/09/2026 · Sessão de origem: "Birth Hub 360 Design System documentation".

**Objetivo do trabalho:** documentação visual e técnica do Design System _como ele realmente é renderizado_ (código-fonte + aplicação executando + screenshots reais + medidas do DOM), entregue em um HTML único com assets ao lado. Regra do pedido original: nada de screenshots inventados, nada de dimensões estimadas, nada de análise só estática.

Entrega final esperada (fora do repo, no Desktop do usuário):

- `C:\Users\Marks\Desktop\BIRTH-HUB-360-DESIGN-SYSTEM-GUIDE.html`
- `C:\Users\Marks\Desktop\BIRTH-HUB-360-DESIGN-SYSTEM-GUIDE-assets\`

Dentro do repo, tudo está em `design-system-guide/` com a mesma estrutura (HTML + pasta `-assets` lado a lado). Os scripts foram portados para caminhos relativos ao próprio arquivo; **o HTML é gerado em `design-system-guide/` e, no fim, deve ser copiado para o Desktop** (ver passo 10).

---

## 1. O que está pronto

### 1.1 Scripts (`design-system-guide/BIRTH-HUB-360-DESIGN-SYSTEM-GUIDE-assets/_tools/`)

| Arquivo | Função | Status |
| --- | --- | --- |
| `login.mjs` | Abre Edge visível para o **usuário** logar manualmente e salva só a sessão em `_tools/auth.json` (gitignored). | Pronto, testado. |
| `capture.mjs` | Percorre todas as rotas × 7 viewports (1440×900, 1280×800, 1024×768, 768×1024, 430×932, 390×844, 375×812). Salva `screens/*.png` e `data/<rota>__<W>x<H>.json` (landmarks com `getBoundingClientRect`, estilos computados de botões/inputs/cards/badges/headings/tabelas/dialogs, tipografia, cores, radius, sombras, gradientes, SVGs, a11y, alvos de toque, overflow, árvore de componentes React via fibras). Em 1440 também recorta elementos em `components/`. Retoma de onde parou (pula `data/*.json` já válidos; use `FORCE=1` para refazer). `NOAUTH=1` roda só as rotas públicas sem sessão. | Pronto; captura **parcial** (ver 2). |
| `states.mjs` | hover / focus / active / default de componentes reais de `/app`, tema claro↔escuro, overlays (paleta de comandos, Novo Negócio, notificações, menu do usuário, assistente), menu mobile 390px, login (estados + erro de e-mail inválido). Grava `states/*.png` e `data/states.json`. | Escrito; **nunca completou** (ver 2). |
| `compshots.mjs` | Um screenshot real por componente React definido em `src/` (primeira instância visível) + props reais, em `comp/*.png` e `data/compshots.json`. | Escrito; **nunca executado**. |
| `compindex.mjs` | Índice `Componente → arquivo:linha` (465 componentes em 288 arquivos) → `data/compindex.json`. | Pronto. |
| `tokens.mjs` | Extrai tokens de `src/styles/globals.css` (linha, valores `:root`/`.dark`/`@theme`, contagem de usos, hex hardcoded, paleta Tailwind padrão, keyframes) → `data/tokens.json`. | Pronto (166 tokens; 233 hex; 512 classes Tailwind). |
| `icons.mts` | Renderiza com `react-dom/server` os ícones reais (BrandIcons, HubIcons, Github/Linkedin/Youtube, lucide usados) + SVGs inline → `data/icons.json`. Rodar com `npx tsx` (ver passo 7). | Pronto (82 próprios, 227 lucide, 16 inline). |
| `lib.mjs`, `ctx.mjs`, `chA.mjs`, `chB.mjs`, `chC.mjs`, `build.mjs` | Gerador do HTML. `build.mjs` monta os 28 capítulos + 1 página por tela + 1 página por componente; tem busca, filtros de tabela, expandir/recolher, lightbox, copiar código, tema. Valida se todo asset referenciado existe (checklist no capítulo Appendix). | Pronto; roda sem erro. |

### 1.2 Dados e imagens já gerados (`.../-assets/`)

- `screens/` — 263 PNGs reais (23 MB). Cobertura por viewport: **1440: 46 · 1280: 46 · 1024: 46 · 768: 46 · 390: 46 · 430: 21 · 375: 12** (46 rotas).
- `data/*__*.json` — medições correspondentes a cada screenshot.
- `data/tokens.json`, `data/icons.json`, `data/compindex.json`.
- `components/` — 24 recortes de elementos reais (botões, headings, card…) de 1440.
- `brand/` — cópia dos 3 SVGs de `identidade-visual/birthhub360/logos/`.
- `states/` — quase vazio (só um PNG parcial).

### 1.3 HTML

`design-system-guide/BIRTH-HUB-360-DESIGN-SYSTEM-GUIDE.html` (2,2 MB, gerado com os dados acima; `missing 0, warnings 0`). Capítulos: Overview, Brand, Design Tokens, Colors, Typography, Spacing, Grid, Layout, Components, Buttons, Inputs, Cards, Navigation, Tables, Charts, Icons, Modals, Feedback, States, Responsive, Accessibility, Motion, Consistency Audit, Component Matrix, Route Matrix, Source Files, Screenshots, Appendix. Os capítulos **States**, **Modals** e as páginas de componente ficam pobres enquanto `states.json` e `compshots.json` não existirem.

### 1.4 Achados já verificados em runtime (entram no capítulo Consistency Audit)

- **Fontes reais ≠ `CLAUDE.md`.** Medido no navegador: **Cabin** (títulos de UI), **IBM Plex Mono** (corpo/interface inteira) e **Playfair Display** (H1 do dashboard, 48 px). `CLAUDE.md` diz Sora + Inter e "nenhuma requisição a CDN de fonte", mas `src/styles/globals.css:10` importa Playfair do Google Fonts. Sora/Inter/Bodoni estão declaradas e não são referenciadas por token.
- **Cores fora dos tokens:** 233 hex distintos e 512 classes de paleta padrão do Tailwind digitados em `src/`.
- **Mais de um `<h1>` por tela** (ex.: `/app` tem 3 — Sidebar, Topbar e hero).
- Redirecionamentos: `/`, `/login`, `/hub` e o catch-all levam a `/app` **quando logado** (ver passo 3).
- Rota inexistente não tem tela 404: o catch-all redireciona.

---

## 2. O que falta (estado real)

1. **Captura incompleta:** faltam 25 rotas em 430×932 e 34 em 375×812 (`capture.mjs` retoma sozinho).
2. **`root`, `login`, `reset-password` e `book/demo` foram capturados _logado_** → `/` e `/login` mostram o dashboard (redirect), não as telas públicas. Precisam ser refeitos **sem sessão** (`NOAUTH=1`), inclusive `/welcome` (ainda não capturada).
3. **`compshots.mjs` nunca rodou** → `comp/` vazio e `data/compshots.json` inexistente (sem isso, as páginas de componente e vários capítulos não têm screenshot do componente).
4. **`states.mjs` nunca terminou.** A 1ª execução travou no clique de "Alternar tema" (já trocado por `evaluate(e => e.click())`), e os overlays usam clique com timeout de 30 s — adicionar `page.setDefaultTimeout(6000)` logo depois de criar cada `page`.
5. **Storybook não sobe** (`Broken build`, log em `debug-storybook.log`); só existem 4 stories (Badge, Button, Card, Input). Não é bloqueante: os componentes reais estão sendo capturados dentro do app. Só investigar se houver tempo.
6. **Revisão visual do HTML no navegador** ainda não foi feita (só o build sem erros). Conferir capítulo por capítulo.
7. Sem dados no banco local → telas em estado vazio (documentado no Overview). Sem tabelas/inputs autenticados visíveis; disabled/loading só onde existirem.

---

## 3. Passo a passo para finalizar

Rodar tudo a partir da raiz do repo (`C:\Github\Birthub-360`). Abreviação: `T=design-system-guide/BIRTH-HUB-360-DESIGN-SYSTEM-GUIDE-assets/_tools`.

### Passo 0 — Ambiente

1. **Docker:** o projeto usa os containers `birthhub_*`. Outro projeto ("atlasgr", containers `atlas_*`) ocupa as mesmas portas 5434/6379 e já derrubou o stack durante este trabalho. Confirme antes de começar:
   ```bash
   docker ps --format "{{.Names}} {{.Status}}"
   ```
   Se aparecerem `atlas_*` e não `birthhub_*`, **pergunte ao usuário** antes de parar os `atlas_*`; depois:
   ```bash
   docker compose -f docker-compose.yml -f docker-compose.postgres-local.yml -f docker-compose.opensource.yml up -d
   ```
   Espere `birthhub_postgres` ficar `healthy`.
2. **Servidor** (não use `preview_start`; ele reportou sucesso sem escutar a porta). Suba em background e espere `curl http://localhost:3024/app` responder (leva alguns minutos na 1ª vez; Vite compila sob demanda):
   ```bash
   NODE_ENV=development PORT=3024 REDIS_URL="redis://:prospector_redis_pass@localhost:6379" BETTER_AUTH_URL=http://localhost:3024 OTEL_SDK_DISABLED=true DISABLE_HMR=true npx tsx server.ts
   ```
   (mesmas variáveis de `.claude/launch.json`, config `prospector-dev-nowatch`).
3. **Login (só o usuário pode fazer):** não crie conta nem digite senha — é proibido. Rode:
   ```bash
   node $T/login.mjs
   ```
   Uma janela do Edge abre em `/login`; **peça ao usuário** para logar. A sessão é salva em `$T/auth.json` (gitignored — **nunca comitar**). Validação: `GET /api/auth/get-session` com o cookie `better-auth.session_token` deve retornar `session`, não `FAILED_TO_GET_SESSION`.

### Passo 1 — Completar a captura autenticada

```bash
node $T/capture.mjs
```
Roda em background (uns 20–40 min; 3 páginas em paralelo). Log com `OK/SKIP/FAIL` por rota; ao final imprime `DONE`. Reexecute até não haver `FAIL`. Rotas com timeout viram `data/*.json` com `"error"` e são refeitas na próxima execução.

### Passo 2 — Refazer as telas públicas sem sessão

```bash
rm design-system-guide/BIRTH-HUB-360-DESIGN-SYSTEM-GUIDE-assets/data/{root,login,reset-password}__*.json
NOAUTH=1 node $T/capture.mjs
```
Isso captura `/`, `/login`, `/reset-password` e `/welcome` deslogado nos 7 viewports. Confirme visualmente que `screens/login__1440x900.png` é a tela de login (não o dashboard). `book/demo` (slug inexistente) e `rota-inexistente-404` podem ficar como estão (mostram o comportamento real com sessão).

### Passo 3 — Screenshot por componente

```bash
node $T/compshots.mjs
```
Gera `comp/<Componente>.png` e `data/compshots.json`. Confira que ao menos `Sidebar`, `AppTopbar`, `Button`/`Card` (se renderizados), `BirthHubLogo` aparecem.

### Passo 4 — Estados e overlays

Antes: em `$T/states.mjs`, depois de cada `const page = await ctx.newPage();` adicione `page.setDefaultTimeout(6000);`. Então:
```bash
node $T/states.mjs
```
Espera-se `states/*__{default,hover,focus,active}.png`, `states/theme__A/B.png`, `states/overlay-*.png`, `states/mobile-app-*.png`, `states/login-*.png` e `data/states.json`. Alvos que falharem ficam registrados em `states.json` (`ok:false`) e o capítulo States os lista — ajuste o seletor só se for barato; senão documente a falha.

### Passo 5 — Regenerar dados estáticos (se `src/` mudou)

```bash
node $T/compindex.mjs
node $T/tokens.mjs
cp $T/icons.mts ./.ds-icons.tmp.mts && npx tsx ./.ds-icons.tmp.mts; rm ./.ds-icons.tmp.mts
```
O `icons.mts` precisa rodar de dentro do repo (resolve `react`, `lucide-react` e `src/`); a cópia temporária na raiz evita problema de resolução — apague-a depois. Se já funcionar direto com `npx tsx $T/icons.mts`, use assim.

### Passo 6 — Gerar o HTML

```bash
node $T/build.mjs
```
Saída esperada: `HTML …MB pages N missing 0 warnings 0`. Qualquer `missing` (asset referenciado que não existe) ou `WARN` deve ser corrigido antes de seguir.

### Passo 7 — QA visual do guia (obrigatório antes de dizer "pronto")

Abra `design-system-guide/BIRTH-HUB-360-DESIGN-SYSTEM-GUIDE.html` no navegador (Playwright ou pane) e percorra: Overview, Brand (logos claro/escuro), Colors (swatches claro/escuro), Typography, Buttons/Inputs/Cards (screenshot + medidas + código), Icons (busca), Modals, States, Responsive (matriz + galeria), Accessibility (recortes), Consistency Audit, Route Matrix (thumbs + links), uma página de tela (`#screen//app`) e uma de componente (`#comp/Sidebar`). Verifique: imagens carregando, lightbox, botão "copiar", busca `/`, filtros de tabela, layout em largura de celular. Corrija `chA/chB/chC.mjs` conforme necessário. Não invente conteúdo para preencher lacunas: se algo não foi capturado, o documento deve dizer isso.

### Passo 8 — Lacunas da lista original que ainda podem ser cobertas (se sobrar tempo)

- Estados `disabled`/`loading`/`error` de botões e inputs em telas com formulário real (ex.: login com e-mail inválido — sem senha, sem credencial; drawers "Novo Negócio"/"Nova empresa" se abrirem).
- Dark mode por tela (só há o par A/B do dashboard).
- Screenshot de cada tela em estado com dados (exigiria seed; só faça se o usuário autorizar — `seed_users.ts` cria contas e não deve ser executado sem pedido explícito).

### Passo 9 — Checklist de aceitação (Appendix do HTML)

O capítulo Appendix já imprime o checklist com evidências. Todos os itens devem estar ✔; itens ✘ precisam de justificativa escrita no relatório final.

### Passo 10 — Entrega no Desktop

```bash
cp design-system-guide/BIRTH-HUB-360-DESIGN-SYSTEM-GUIDE.html "C:/Users/Marks/Desktop/"
rm -rf "C:/Users/Marks/Desktop/BIRTH-HUB-360-DESIGN-SYSTEM-GUIDE-assets"
cp -r design-system-guide/BIRTH-HUB-360-DESIGN-SYSTEM-GUIDE-assets "C:/Users/Marks/Desktop/"
rm -f "C:/Users/Marks/Desktop/BIRTH-HUB-360-DESIGN-SYSTEM-GUIDE-assets/_tools/auth.json"
```
(No Desktop já existe uma cópia antiga/parcial dessas pastas; a versão do repo, mais nova, a substitui. Confira antes de apagar.)

### Passo 11 — Limpeza

- `auth.json` deve ser **apagado** (contém o cookie de sessão do usuário): `rm $T/auth.json` (e no Desktop).
- Encerrar o servidor `tsx server.ts` (porta 3024), o Storybook (6006, se subiu) e quaisquer `msedge` headless órfãos.
- **Não** derrubar os containers Docker do usuário.
- Commitar os assets/HTML atualizados nesta branch e informar o usuário. Se `screens/` ficar grande demais (>100 MB) considere não versionar `screens/` e manter só no Desktop.

---

## 4. Notas e cuidados

- **Permissões:** o login e qualquer credencial são exclusivos do usuário. Não crie contas, não rode `seed_users.ts`.
- **Não mexer** nos arquivos que já estavam sujos/untracked do usuário e que **não fazem parte** desta branch: `src/features/auth/components/LandingLoginSplitScreen.tsx` (modificado), `--out`, `deep-design-bible.mjs`, `generate-design-bible.mjs` (tentativas antigas de análise só estática; não usar como base).
- **Contagem de tokens** é por regex (`var(--x)` e utilidades Tailwind); classes montadas dinamicamente não são detectadas — o Appendix já declara isso.
- **Nomes de componentes** vêm das fibras do React em modo dev; componentes anônimos ou de biblioteca não entram.
- A tela da 1ª execução mostrava dados pessoais do usuário (nome "Marcelin Mark" na saudação do dashboard) nos screenshots e no JSON de `/app`. Esses arquivos estão no repo nesta branch; se o repositório for público ou compartilhado, avaliar antes de dar merge.
- O HTML e os PNGs em `design-system-guide/` foram adicionados só para o handoff; decidir depois se ficam versionados ou vão para `.gitignore`.
