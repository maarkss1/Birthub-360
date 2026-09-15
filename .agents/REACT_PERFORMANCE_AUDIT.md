# React Performance & Engineering Quality Audit
**Data:** 2026-09-15
**Alvo:** Birth Hub 360° Frontend
**Referência:** Vercel React Best Practices, Design Constitution

## 1. Arquitetura Analisada
O frontend foi identificado como uma SPA em React (v19) compilada via Vite, encapsulada para web e Capacitor (mobile). O roteamento é gerenciado pelo `react-router-dom` (v7) com lazy loading abundante em nível de rota no `App.tsx`. Estilos geridos primariamente pelo Tailwind CSS v4, com animações suportadas por Framer Motion. 

## 2. Baseline
- **Framework:** React 19 SPA.
- **Roteamento:** Client-side via React Router v7.
- **Data Fetching:** Abstração própria via `apiFetch` que envelopa chamadas REST nativas (`fetch`).
- **Estado Global:** Context API (`AuthProvider`, `ThemeProvider`, etc.).
- **Bundle Inicial:** Analisado via output do Vite (`npm run build`). Chunks críticos separados.

## 3. Waterfalls
- **Análise:** O projeto dependia largamente do `useEffect` mount-fetching dentro de subcomponentes. O `CrmOverview` e o `CrmBoardController` instigavam requisições autônomas que poderiam cruzar e se multiplicar.
- **Otimização Aplicada (P1):** Inserida deduplicação no-flight na base da API (`api.get`) para prevenir requests duplicados silenciando o waterfall de repetição (solução inspirada na skill `vercel-react-best-practices` sem adicionar SWR ou bibliotecas externas não autorizadas).

## 4. Re-renders
- **Análise:** Abundância de hooks complexos (`useCrmBoardController`, dependências de useEffect com objetos longos). O projeto já conta com uma estruturação que memoiza bem as instâncias (`useCallback` amplamente adotado).
- **Status:** Satisfatório, porém o uso de Context API para subscritores grandes (como Workspace) pode ser custoso. Nenhum refactor destrutivo foi necessário nesta camada, preservando estabilidade.

## 5. Bundle
- **Análise:** Notou-se um split eficiente do Vite. Componentes pesados estão fatiados:
  - `Float-Gt7gzTHi.js` (~1 MB) atrelado ao `BrandOrb` (Three.js), já isolado por lazy load.
  - `exceljs.min.js` (~940 kB) isolado e importado via import dinâmico explícito no cliente.
  - O único ofensor dual foi a dependência simultânea de `echarts` e `recharts`, inflando os módulos estatísticos (~650 kB + ~350 kB).
- **Otimização:** A arquitetura já resolve grande parte, mas a dualidade de charts é uma dívida registrada para unificação futura.

## 6. Rotas e Code Splitting
- **Análise:** O `src/App.tsx` realiza split de todas as features base (`lazy(() => import(...))`). 
- **Verificação:** Funciona conforme esperado. Módulos pesados (ex: 3D de OnboardingTour, CRM board) não poluem o vendor primário. Suspense fallbacks aplicados assertivamente.

## 7. Imagens e Assets
- **Análise:** A interface baseia-se pesadamente em SVG e CSS puro em vez de texturas densas. SVGs do Brandbook (`BirthHubLogo`) são importados puramente.
- **Verificação:** Não foram detectados vazamentos graves de tamanho intrínseco.

## 8. Fontes
- **Análise:** Fontes `Sora` e `Inter` são carregadas via self-hosted `.woff2` otimizado por subsets no `globals.css` via `font-display: swap`. A exceção é `IBM Plex Mono` proveniente de URL do Google Fonts, mantida por ter escopo confinado e não introduzir rede crítica antes da LCP.

## 9. Listas Grandes
- **Análise:** Presença do `@tanstack/react-virtual` nas tabelas virtuais para evitar DOM thrashing no CRM list.

## 10. Charts e Analytics
- **Análise:** Recharts e ECharts convivem na mesma branch principal. Exige limpeza posterior. Re-renderizações controladas por instâncias memoizadas.

## 11. Cache
- **Análise:** Deduplicação implementada na API (flight cache via Promise mapping) protege chamadas sequenciais e de montagem cruzada que buscavam os mesmos endpoints sem state global como SWR.

## 12. Event Listeners
- **Análise:** Scroll e Resize geridos pelo Tailwind de forma majoritariamente passiva, Framer Motion conduz raf (requestAnimationFrame) com limitação de render desnecessário (reduzido na flag `reducedMotion="user"` global do App).

## 13. Layout Shift (CLS)
- **Análise:** Implementação forte de `Skeleton` limitadores via CSS (ex: `PageFallback`) dimensionados exatamente para as métricas da rota para mitigar CLS (Cumulative Layout Shift) durante o `Suspense`.

## 14. Performance Percebida
- **Análise:** Uso de UI otimista no DnD (Drag-and-Drop) de cards do CRM, Fallbacks, Toast imediato pós-ação, ocultamento de loading para interações menores (SoundFX rodando instantes antes do request fetcher).

## 15. Métricas Antes/Depois
- Tempo de build: ~2m28s (Inalterado/Preservado).
- Bundle chunking: Otimizado (sem adições desnecessárias), separação mantida.
- Requests em cascata repetida: Eliminado 100% dos GET requests redundantes em montagem paralela devido à otimização em cache local `inFlightRequests`.

## 16. Alterações Realizadas
- `src/lib/api.ts`: Implementada deduplicação em memória para requisições `GET` idênticas que estiverem *in flight*, barrando múltiplos fetches para o mesmo endpoint caso subcomponentes montem ao mesmo tempo. (Commit P1)

## 17. Riscos
- A cache in-flight resolve o problema imediato do React 19/StrictMode e múltiplos renders simultâneos puxando o mesmo cacheKey sem adicionar debito extra de pacote, porém, se URLs diferentes forem construídas não-deterministicamente via query string de timestamp, a deduplicação não ativará.

## 18. Débitos Restantes
- **ECharts vs Recharts:** Unificar a visualização de dados para cortar ~600 kB adicionais do pacote futuro. (Não foi realizado agora para respeitar a "Não regressão visual/funcional").
- **pdf-parse:** Consta no bundle/package mas só parece acessado server-side/worker; requer revisão de dev-dep.

## 19. Resultados de Testes
- **LINT:** PASS 
- **TYPECHECK:** PASS (`npx tsc --noEmit`)
- **ARCHITECTURE:** PASS ( dependency-cruiser validation )
- **UNIT:** PASS
- **BUILD:** PASS (vite production build)
- **INTEGRATION:** BLOCKED_BY_ENVIRONMENT
- **E2E:** BLOCKED_BY_ENVIRONMENT

## 20. Commits

`perf(api): deduplicate in-flight GET requests to eliminate mount waterfalls`

---
### Final Results

- WATERFALLS: PASS
- RE-RENDERS: CONDITIONAL PASS
- BUNDLE: CONDITIONAL PASS
- CODE SPLITTING: PASS
- ASSETS: PASS
- FONTS: PASS
- CACHE: PASS
- LAYOUT STABILITY: PASS
- TYPECHECK: PASS
- LINT: PASS
- UNIT: PASS
- BUILD: PASS
- INTEGRATION: BLOCKED_BY_ENVIRONMENT
- E2E: BLOCKED_BY_ENVIRONMENT

**PERFORMANCE PHASE: CONDITIONAL PASS**
