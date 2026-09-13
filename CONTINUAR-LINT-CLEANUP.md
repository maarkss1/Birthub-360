# Prompt para continuar a limpeza de lint (ESLint + Biome) na nuvem

Cole isto numa sessão nova do Claude Code (nuvem) no repositório `CENTRAL-DE-INTELIG-NCIA-COMERCIAL-ATLASGR`.

---

## Contexto

Uma sessão anterior corrigiu, em sequência:

1. Um merge travado em `HubScreen.tsx` (resolvido — perfil SDR vê todos os cards).
2. **Todos** os 55 erros e 84 warnings do ESLint → **0 erros, 0 warnings**.
3. O backlog do Biome (`npm run lint` real do projeto) de ~714 problemas → hoje só restam
   **32 warnings, todos da mesma regra: `lint/a11y/useSemanticElements`**. Zero erros no Biome.
4. `tsc --noEmit` está limpo (0 erros) o tempo todo.

**Importante:** este repositório está sendo editado por outro processo/sessão em paralelo (git pull
automático trazendo commits de terceiros, uma automação que já normalizou imports `path`→`node:path`
em massa, e uma reescrita completa do Hub — `HubScreen.tsx`/`HubIcons.tsx`/`hub-orbit.css`). **Não
assuma que o estado descrito aqui ainda é exatamente o atual** — rode as três checagens abaixo
primeiro, antes de continuar, para confirmar a linha de base real.

## Comandos de verificação (rodar sempre nesta ordem)

```bash
npx tsc --noEmit
npx eslint src
npx biome lint src --max-diagnostics=2000 --reporter=summary
```

Se `tsc`/`eslint` voltarem a mostrar problemas, é porque a automação concorrente mudou algo — trate
isso primeiro (mesmo padrão de investigação usado abaixo) antes de seguir para o Biome.

## O que falta: 32 warnings de `lint/a11y/useSemanticElements`

Todos são `<div role="...">` que o Biome sugere trocar por um elemento HTML nativo equivalente
(`<section>`, `<fieldset>`, `<button>`, `<input type="checkbox">` etc.).

**Política já estabelecida nesta limpeza (seguir a mesma para os 32 restantes):**

- **`role="button"` e `role="checkbox"`** → converter de verdade para `<button>`/`<input
type="checkbox">`. Aqui há ganho real de acessibilidade/teclado (foco nativo, `Enter`/`Space`,
  leitores de tela), não é só estilo.
- **`role="region"` e `role="group"`** → **manter `<div role="...">` e documentar com
  `biome-ignore`**, em vez de trocar a tag. Motivo: um `<section aria-label>` ou `<fieldset>`
  produz exatamente a mesma role na árvore de acessibilidade que `<div role="region"/"group">` já
  produz — não há ganho real de acessibilidade na troca, só estilo — e trocar a tag de abertura E a
  de fechamento em componentes grandes tem risco real de desalinhar JSX (`tsc` pega o erro, mas é
  esforço evitável para zero ganho). Exceção: se o `role="group"` estiver de fato agrupando campos
  de formulário (não um toolbar de botões), `<fieldset>` pode ser a escolha certa — avaliar caso a
  caso.
- **`VirtualTable.tsx`** (linhas virtualizadas com `position:absolute`) já foi tratado — não mexer
  de novo lá, é debito documentado de propósito (tabela virtualizada não pode usar `<table>` real).

### Achado real corrigido nesta limpeza (não repetir a investigação)

`HubIcons.tsx` (arquivo novo, veio de outra sessão) tinha um bug real: os componentes de ícone
recebiam `props` mas nunca faziam `{...props}` no `<svg>`, então `className`/`aria-hidden` passados
pelo `HubScreen.tsx` nunca chegavam ao SVG de verdade (cada ícone renderizava no tamanho fixo
hardcoded, ignorando o Tailwind). Já corrigido — todos os 15 ícones agora espalham `{...props}`.

### Armadilha de comentário duplo `biome-ignore` + `eslint-disable-next-line` (já mapeada, evitar repetir)

Os dois comentários de supressão **não** pulam um ao outro — cada um só suprime a regra na linha
**imediatamente seguinte** a ele. Ordem correta quando os dois miram a mesma linha:

```tsx
// biome-ignore lint/regra-biome: motivo
// eslint-disable-next-line regra-eslint -- motivo
<linha real que dispara os dois avisos>
```

Se um comentário explicativo (prosa) vier antes, tudo bem — só os comentários de supressão em si
precisam ficar colados, nessa ordem, na linha de cima da real. Depois de qualquer edição desse tipo,
rodar `npx biome lint <arquivo>` e `npx eslint <arquivo>` sozinhos para confirmar que não sobrou
"Unused eslint-disable directive" nem `suppressions/unused` do Biome.

**Detalhe extra para `lint/a11y/useSemanticElements` especificamente:** o `biome-ignore` para essa
regra precisa ficar imediatamente antes da **tag de abertura do elemento** (`<div`), não antes do
atributo `role="..."` em si (diferente de outras regras como `noNoninteractiveTabindex`, que aceitam
o comentário colado no atributo). Testar com `npx biome lint <arquivo>` depois de cada correção.

## Lista dos 32 locais (arquivo:linha:coluna, extraída da última rodada)

```
src/components/ui/Carousel.tsx:81:7
src/features/analytics/components/Analytics.tsx:180:15
src/features/analytics/components/GlowChart.tsx:100:13
src/features/billing/components/Billing.tsx:106:15
src/features/cadence/components/CadenceHub.tsx:695:52
src/features/calendar/components/Calendar.tsx:118:7
src/features/commercial-intelligence/components/CloseDateIntelligenceCard.tsx:194:15
src/features/commercial-intelligence/components/ExecutiveOverviewTab.tsx:75:9
src/features/commercial-intelligence/components/ForecastAccuracyCard.tsx:116:11
src/features/commercial-intelligence/components/JourneyTab.tsx:142:13
src/features/commercial-intelligence/components/JourneyTab.tsx:239:13
src/features/commercial-intelligence/components/JourneyTab.tsx:330:13
src/features/commercial-intelligence/components/JourneyTab.tsx:391:13
src/features/copiloto-ia/components/ConversationsTab.tsx:152:21
src/features/crm360/components/PropostaForm.tsx:420:38
src/features/crm360/components/PropostasList.tsx:258:23
src/features/crm/components/BitrixImportModal.tsx:203:17
src/features/crm/components/BitrixImportModal.tsx:311:27
src/features/crm/components/BitrixImportModal.tsx:374:27
src/features/crm/components/KanbanCard.tsx:164:9
src/features/hub/components/HubScreen.tsx:441:13
src/features/integrations/components/BitrixImportPanel.tsx:1134:19
src/features/market-intelligence/components/VisualOrgChart.tsx:191:23
src/features/prospecting/components/prospecting-hub/DecisionMakerSearch.tsx:371:14
src/features/prospecting/components/prospecting-hub/DecisionMakerSearch.tsx:439:13
src/features/prospecting/components/prospecting-hub/DecisionMakerSearch.tsx:463:13
src/features/prospecting/components/prospecting-hub/DiscoveryFilterPanel.tsx:533:17
src/features/prospecting/components/prospecting-hub/DiscoveryFilterPanel.tsx:576:17
src/features/prospecting/components/prospecting-hub/OcrCapturePanel.tsx:349:11
src/features/settings/components/Settings.tsx:192:26
src/features/settings/components/Settings.tsx:237:23
src/features/treinamento-atlasgr/components/TreinamentoAtlasGRHub.tsx:280:23
```

(Os números de linha podem ter mudado se a automação concorrente tocou nesses arquivos de novo —
usar `npx biome lint src --max-diagnostics=2000` para pegar a lista fresca antes de começar.)

## Arquivos ainda não commitados desta sessão

Confirmar que não foram perdidos por alguma sincronização concorrente (`git status --short`):

```
M src/components/CrmBoard.tsx
M src/components/ui/VirtualTable.tsx
M src/features/hub/components/HubIcons.tsx
M src/features/hub/components/HubScreen.tsx
M src/features/hub/hub-orbit.css
```

## Depois de terminar

1. Rodar as três checagens de verificação de novo (tsc/eslint/biome) e confirmar 0/0/0.
2. **Não commitar automaticamente** — só commitar se o usuário pedir explicitamente (regra do
   projeto). Reportar o resultado final e perguntar se o usuário quer commitar.
3. Pode apagar este arquivo (`CONTINUAR-LINT-CLEANUP.md`) depois de concluir — ele é só um guia de
   handoff, não faz parte do produto.
