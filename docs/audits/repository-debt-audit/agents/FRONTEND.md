# FRONTEND Domain Audit — Birth Hub 360º

## Agent

FRONTEND specialist (domain code: `FRONTEND`), part of the multi-domain repository debt audit.

## Mission

Walk the frontend route tree (`src/App.tsx` and every screen it mounts) and, for each
screen/module, determine whether it exists, renders, is wired to a real API, uses real data,
has loading/error/empty states, permission checks, is responsive/accessible/tenant-aware, and is
tested — hunting specifically for dead buttons/links, decorative cards, fake data, broken
downloads, and content that a role/module gate is supposed to protect but doesn't actually
protect. This is an audit only; no application source file was modified.

## Scope

Not limited to a folder named after the domain. Primary surface: `src/App.tsx` (full route
tree), `src/features/**/components` for every one of the 41 feature modules, `src/components/ui`
(shared design-system primitives), `src/components/layout` (`ProtectedRoute`, `RequireRole`,
`RequireModuleAccess`, `MainLayout`), `.claude/CLAUDE.md` and `eslint.config.mjs` (as living
documentation of frontend architecture), `tests/unit/**/*.tsx` and `tests/e2e/**/*.spec.ts` (as
the actual evidence of what is verified), `public/tools/**` and `public/design-lab/**` (the static
assets several "hub" screens iframe/link to), and `src/bootstrap/frontend.ts` + `server.ts` (to
verify how those static assets are actually served, since that determines whether a client-side
gate is meaningful). Domains already covered in depth by sibling agents (CRM core wiring →
`CRM.md`; Revenue Intelligence/Analytics/Billing metrics → `REVOPS.md`; external integrations →
`INTEGRATION.md`; multi-tenancy → `TENANT.md`) were read first and not re-litigated except where a
frontend-specific angle (UI gate vs. real enforcement) was missing from them.

## Areas inspected

- Full route tree in `src/App.tsx`: which routes are public, which are behind `ProtectedRoute`,
  `RequireRole`, or `RequireModuleAccess`, and whether that gate is actually enforced end-to-end.
- The "legacy tool hub" pattern used by 5 modules (`social-selling`, `treinamento` (treinamento-
  atlasgr), `propostas`/portal-comercial, `hub-inteligencia-marketing`, `design-lab`): a thin React
  shell (tabs, KPI strip, download links) wrapping an `<iframe>`/`<a>` that points at a static
  HTML/PDF/PPTX/Markdown file under `public/tools/**` or `public/design-lab/**`.
- Whether every file referenced by those iframes/links actually exists on disk.
- `src/components/ui/**`: cross-referenced every exported component against the rest of `src/` to
  find primitives with zero real consumers (dead design-system surface).
- Consistency between `.claude/CLAUDE.md` §1 (documented 3D/`@react-three/fiber` usage) and
  `eslint.config.mjs`'s per-file override list vs. the files that actually exist today.
- Test coverage shape: `tests/unit/**/*.tsx` (component/integration tests run under `jsdom`) and
  `tests/e2e/**/*.spec.ts` (Playwright), mapped against the 41 feature modules to find modules with
  zero coverage of either kind.
- `Math.random()` / fake-data / `TODO`/`FIXME`/mock greps across `src/features` and
  `src/components`, followed by manual triage of each hit (most were IDs, confetti celebration
  animation, or backend code out of this domain's scope).
- `RequireModuleAccess.tsx` / `RequireRole.tsx` implementation, and how the content they gate is
  actually served (`src/bootstrap/frontend.ts`, `server.ts` middleware order).
- Spot checks of `Notifications`, `GoalCountdownOverlay`, `RevenueSignalOrb` (3D orb visibility/tab
  gating), `SwarmDashboard`, and the gamification frontend (`GamificationWidget.tsx`,
  `TeamRankingWidget.tsx`, `SellerCoachingCard.tsx`) — all found correctly wired, included here for
  completeness even though they produced no findings.

## Files inspected (representative, ~140)

`src/App.tsx` · `src/bootstrap/frontend.ts` · `server.ts` · `src/components/layout/
RequireModuleAccess.tsx` · `src/components/layout/RequireRole.tsx` · `src/components/layout/
ProtectedRoute.tsx` · `src/features/hub-inteligencia-marketing/components/
HubInteligenciaMarketingHub.tsx` · `src/features/social-selling/components/SocialSellingHub.tsx` ·
`src/features/treinamento/components/TreinamentoHub.tsx` · `src/features/propostas/components/
PropostaComercialHub.tsx` · `src/features/design-lab/DesignLabPage.tsx` + `public/design-lab/
README.md` · all 66 files under `src/components/ui/*.tsx` (cross-referenced for consumers) ·
`src/features/gamification/**` (all 6 files) · `src/features/commercial-intelligence/components/
GoalCountdownOverlay.tsx` · `src/features/dashboard/components/RealtimeFeed.tsx` ·
`src/features/dashboard/components/RevenueSignalOrb.tsx` · `src/features/intelligence/components/
SwarmDashboard.tsx` · `src/features/notifications/**` · `eslint.config.mjs` · `.claude/CLAUDE.md` ·
`.claude/PILOTS.md` · `vitest.config.ts` · all 41 `find tests/unit -iname "*.tsx"` results (41
files) · `tests/e2e/*.spec.ts` (17 files, names only, for coverage mapping) ·
`docs/audits/repository-debt-audit/agents/{CRM,REVOPS,INTEGRATION,TENANT}.md` (read for scope
overlap avoidance).

## Executive summary

This is a mature, heavily self-audited codebase (43+ documented "waves", 30+ recorded pilots in
`.claude/PILOTS.md`, jsx-a11y rules already at `error`, a real design constitution). Most of the
low-hanging "AI slop" / obvious-bug debt a first pass usually finds has already been fixed by prior
sessions, and is correctly *not* re-reported here. The debt that remains and was newly confirmed in
this pass clusters around one specific, repeated architectural pattern: **five "hub" screens
(`social-selling`, `treinamento-atlasgr`, `propostas`/portal-comercial,
`hub-inteligencia-marketing`, `design-lab`) wrap a React shell around static HTML/PDF/PPTX/Markdown
files served from `public/tools/**` and `public/design-lab/**` via plain `express.static`, mounted
in `server.ts` with no authentication middleware in front of it at all.** For four of those five
modules the React shell *is* gated (`ProtectedRoute` + `RequireModuleAccess`, backed by a real
per-user grant in the database), but the gate only controls whether the SPA renders the iframe
wrapper — the actual document behind the iframe is reachable by anyone who has or guesses the URL,
with zero session check, in both dev and production (confirmed by reading the exact Express
mount order in `server.ts` / `src/bootstrap/frontend.ts`). The same five modules are also the ones
with the weakest test coverage (zero component tests, zero Playwright specs), which plausibly
explains why two of them ship broken content today: `HubInteligenciaMarketingHub.tsx` lists 8
"Metodologias" documents that all point to files that do not exist anywhere in the repository, and
`SocialSellingHub.tsx` has two prominent "Download" buttons pointing to a PDF and a PPTX that were
never added to `public/tools/social-selling/`. Separately, the shared UI library
(`src/components/ui/`) carries ~930 lines across 10 fully-built, exported components with zero
consumers anywhere in the app, and both `eslint.config.mjs` and `.claude/CLAUDE.md` §1 still
reference two `@react-three/fiber` component files (`SpaceGame.tsx`, `GameWidget.tsx`) and one more
(`AtlasOrb.tsx`) that no longer exist in the repository — harmless today, but stale guidance that
could misdirect a future session working on 3D/performance rules.

## Critical

None found and confirmed at CRITICAL in this pass. The access-control gap below is scored HIGH,
not CRITICAL, because the exposed content is internal business/training/brand material rather than
credentials, PII, or tenant-scoped customer data (those paths are protected by real backend
`requireRole`/session checks per `CRM.md`/`TENANT.md`, which this pass spot-checked and did not
contradict).

## High

- **FRONTEND-001** — Module/role-gated "hub" screens actually serve their real content as
  unauthenticated static files; the React gate is UI-only. See Complete findings list.
- **FRONTEND-002** — `HubInteligenciaMarketingHub.tsx`'s entire "Metodologias & Documentação" tab
  (8 of 8 listed documents) is broken: every iframe/link target is a file that does not exist.

## Medium

- **FRONTEND-003** — `SocialSellingHub.tsx`: two dead "Download" buttons (PDF manual, PPTX deck)
  pointing to files absent from `public/tools/social-selling/`.
- **FRONTEND-004** — 10 fully-implemented, exported components in `src/components/ui/` have zero
  JSX consumers anywhere in the app (~930 lines of dead design-system code).
- **FRONTEND-006** — Component/E2E test coverage is real but uneven; the exact modules found broken
  in this pass (FRONTEND-001/002/003) are also the ones with zero test coverage of any kind.

## Low

- **FRONTEND-005** — `eslint.config.mjs`'s `react/no-unknown-property` override list and
  `.claude/CLAUDE.md` §1 both reference component files that no longer exist
  (`SpaceGame.tsx`, `GameWidget.tsx`, `AtlasOrb.tsx`); `.claude/CLAUDE.md` also omits the real third
  `@react-three/fiber` consumer (`RevenueSignalOrb.tsx`).

## Technical debt

See FRONTEND-004 (dead UI primitives) and FRONTEND-005 (stale eslint/doc references to deleted
files) in the complete findings list.

## Implementation debt

See FRONTEND-002 and FRONTEND-003 — content that was clearly planned/announced in the UI (a
document library, downloadable brand/sales collateral) but never actually delivered to the
matching static path.

## Feature debt

None beyond what is captured above; every route in `src/App.tsx` resolves to a real, importable
component (no route pointing at a component that doesn't exist, no `<Route>` left as a stub).

## Bugs

- FRONTEND-002 (8/8 broken document links + wrong "8 Documentos" count).
- FRONTEND-003 (2 broken download links).

## Architecture

- FRONTEND-001 is fundamentally an architecture issue, not a typo: the "legacy tool hub" pattern
  (React shell + `RequireModuleAccess` + iframe into `public/tools/**`) was designed under the
  assumption that gating the SPA route is sufficient, but `public/tools` and `public/design-lab`
  are mounted with plain `express.static` *before* any auth-aware routing in `server.ts`, so the
  gate never actually reaches the content.
- `src/bootstrap/frontend.ts` already documents (in its own comments) a *different*, previously
  fixed problem in the same file — a CSP relaxation needed because the legacy HTML under
  `public/tools/**` uses inline `onclick=""` — which shows this exact code path has been revisited
  before without the auth-bypass angle being raised.

## Security

- **FRONTEND-001** (see above) — the only new security-relevant frontend finding from this pass.
  Everything else security-relevant in the areas this pass touched (RBAC on `/app/*` routes,
  `RequireRole` for `commercial_intelligence`/`copiloto_ia`/`usage`/`team`/`module-access`,
  `mesa-tratamento`) was already correctly implemented with both a UI gate and a real backend
  `requireRole`/session check, per the extensive comments already in `src/App.tsx` documenting
  prior pilots (022, 026) that fixed exactly this class of bug for those routes. FRONTEND-001 is
  the one place that pattern was never applied because the content isn't behind an API route at
  all — it's a static file.

## Tests

- FRONTEND-006: quantified test-coverage shape (41 `tests/unit/**/*.tsx` component tests + 17
  `tests/e2e/*.spec.ts`), and the specific modules with zero coverage of either kind:
  `social-selling`, `treinamento`, `hub-inteligencia-marketing`, `propostas`/
  `PropostaComercialHub.tsx`, `design-lab`, plus (lower risk, not tied to a confirmed bug in this
  pass) `chatbook`, `copiloto-ia`, `feature-flags`, `hub`, `job-roles` (frontend side),
  `market-intelligence`, `mesa-tratamento`, `module-access`, `notes`, `onboarding`, `playbook`,
  `roleplay`, `workspace`.
- Correction/positive note for the aggregate audit: an earlier hypothesis in this pass ("zero
  frontend component tests exist") was **wrong** and was verified and discarded before reporting —
  `tests/unit/**/*.tsx` (41 files, Testing Library + jsdom, configured in `vitest.config.ts`) is a
  real, working component-test suite; it is simply colocated under `tests/unit/` rather than next
  to `src/features/*/components`, which is why a naive `find src -iname "*.test.tsx"` (0 results)
  looks alarming but is not evidence of an actual gap. Flagging this in case a future audit repeats
  the same wrong first read.

## Integration

Not deeply re-audited here (owned by `INTEGRATION.md`). The one integration-adjacent frontend
observation is that the "hub" screens in scope for FRONTEND-001 are the ones described in
`.claude/CLAUDE.md` §13 as embedding "legacy applications via iframe" tied to `EXTERNAL_LINKS`/
third-party systems — the auth-bypass finding is about the frontend/serving layer, not about those
third-party systems themselves.

## Product

- The "Metodologias & Documentação" tab in `HubInteligenciaMarketingHub.tsx` is presented as a
  finished, browsable document library (search box, 8 titled entries with descriptions, a KPI tile
  reading "Metodologias: 8 Documentos") but delivers 0 of the 8 documents — this is a
  product-facing gap for whoever has been granted the `hub-inteligencia-marketing` module.

## Mock/Fake/Placeholder

No fabricated metrics, fake charts, or `Math.random()`-driven business data were found in the
frontend layer during this pass. The `Math.random()`/`crypto.randomUUID()` occurrences found in
`src/features/dashboard/components/RealtimeFeed.tsx` (client-side React `key`/id generation for a
real SSE-driven feed) and `src/features/commercial-intelligence/components/
GoalCountdownOverlay.tsx` (confetti celebration triggered by a real `isGoalHit` computed from real
`closedAmount`/`goalAmount` props, already documented in-code as decorative-only) are legitimate
uses, not disguised fake data, and are not reported as findings.

## Dead/Orphan code

- FRONTEND-004 (10 orphaned `src/components/ui/*.tsx` primitives).
- FRONTEND-005 (3 dead file references in `eslint.config.mjs`, 1 stale reference in
  `.claude/CLAUDE.md`).

## Quick wins

- Add an auth-aware proxy/middleware (or move the sensitive subset of `public/tools/**` behind an
  authenticated route + `res.sendFile`) in front of `/tools` and `/design-lab` in
  `src/bootstrap/frontend.ts` — the `RequireModuleAccess`/`ProtectedRoute` React gates already
  exist and already compute the right authorization decision; they just need to also apply to the
  static asset request, not only the SPA route. (FRONTEND-001)
- Either add the 8 missing `.md` files under `public/tools/hub-inteligencia-marketing/` or trim the
  `docs` array (and the "8 Documentos" KPI tile) in `HubInteligenciaMarketingHub.tsx` down to the 1
  document that actually exists (`METODOLOGIA_RISCO_TERRITORIO.md`). (FRONTEND-002)
- Add the missing PDF/PPTX to `public/tools/social-selling/`, or remove the two dead "Download"
  buttons from `SocialSellingHub.tsx` until the assets exist. (FRONTEND-003)
- Delete (or find a real first use for) the 10 orphaned components in `src/components/ui/`; delete
  the 3 dead file entries from `eslint.config.mjs`'s override array; refresh `.claude/CLAUDE.md` §1
  to name the real 3D consumers (`BrandOrb.tsx`, `RevenueSignalOrb.tsx`) instead of the deleted
  `SpaceGame.tsx`. (FRONTEND-004/005)

## Structural problems

The recurring root cause behind FRONTEND-001/002/003 is the "legacy tool hub" pattern itself:
product content that should live in the authenticated app (or at minimum behind an authenticated
static-file route) instead lives as hand-authored static HTML/PDF/PPTX under `public/`, wrapped by
a thin React shell whose only job is tabs + an iframe. This makes both problems (auth bypass, and
silent content drift/broken links) structurally likely to recur for any *future* file added to one
of these five directories, not just the ones caught in this pass.

## Needs verification

- Whether `/tools/**` and `/design-lab/**` are additionally protected at the infrastructure layer
  in the real production deployment (e.g., a reverse-proxy/WAF rule not visible in this repo) —
  this pass verified only the application-level (`server.ts`/Express) layer, where no such
  protection exists. If no infra-layer protection exists either, FRONTEND-001 should be treated as
  fully exploitable, not just theoretically so.
- Whether any of the 10 orphaned `src/components/ui/` primitives (FRONTEND-004) are consumed by
  code outside `src/` (e.g., a Storybook story added after this pass, or a not-yet-merged branch) —
  checked only against the current working tree.

## Complete findings list

### FRONTEND-001 — RequireModuleAccess/RequireRole gates on "hub" screens do not protect the actual content, which is served as unauthenticated static files

- **Category**: TD-SEC, TD-AUTH
- **Severity**: HIGH
- **Priority**: P1
- **Confidence**: HIGH
- **Status**: CONFIRMED
- **Domain**: FRONTEND (cross-cutting with backend serving layer)
- **Files**:
  - `src/bootstrap/frontend.ts:34,38,61-68,70,73` (`app.use('/tools', express.static(...))` and
    the equivalent production block — no auth middleware anywhere in front of it)
  - `server.ts:44-79` (`mountAuthHandler`/`mountFeatureRoutes` run before `mountFrontend`; nothing
    in `mountFrontend` re-checks session for `/tools` or `/design-lab`)
  - `src/App.tsx:425-433,461-500` (`/design-lab/*` routes have no `ProtectedRoute` wrapper at all;
    `/social-selling`, `/treinamento-atlasgr`, `/proposta-comercial`, `/hub-inteligencia-marketing`
    are wrapped in `ProtectedRoute` + `RequireModuleAccess`)
  - `src/components/layout/RequireModuleAccess.tsx:18-29` (client-side gate only; renders children
    based on `GET /api/module-access/me`, never touches the iframe's own request)
  - Consumers whose real content sits behind this gap: `src/features/social-selling/components/
    SocialSellingHub.tsx`, `src/features/treinamento/components/TreinamentoHub.tsx` (including
    `prova-final.html`, a final exam), `src/features/propostas/components/
    PropostaComercialHub.tsx` (commercial proposal builder/cockpit), `src/features/
    hub-inteligencia-marketing/components/HubInteligenciaMarketingHub.tsx`, and
    `src/features/design-lab/DesignLabPage.tsx` (no gate of any kind, not even login).
- **Evidence**: Reading the exact Express middleware order in `server.ts` shows `mountFrontend`
  (which mounts `express.static` for `/tools` and, in dev, serves `public/design-lab` as part of
  the general static tree) runs after auth/feature routes are mounted but installs no auth check of
  its own; `RequireModuleAccess.tsx` only gates whether the React tree renders the `<iframe>`
  element client-side — it never proxies or authorizes the iframe's own HTTP request to
  `/tools/<path>`, which the browser issues directly to the same origin.
- **Root cause**: The module-access authorization model (`ModuleAccessGrant` in the DB, checked via
  `GET /api/module-access/me`) was built for and correctly protects real API-backed screens
  elsewhere in the app (see the `RequireRole` comments in `src/App.tsx` for `commercial_intelligence`
  /`usage`/`team`, which do have matching backend `requireRole`). It was never extended to the
  static-file "hub" pattern, where there is no API route to attach `requireRole`/session middleware
  to.
- **Expected**: A user without the `hub-inteligencia-marketing` (or `social-selling`,
  `treinamento-atlasgr`, `proposta-comercial`) module grant — or an entirely unauthenticated
  visitor — should not be able to retrieve the underlying documents.
- **Actual**: Any client that requests e.g. `GET /tools/propostas/Selecionar_Proposta_Atlas.html`,
  `GET /tools/treinamento-atlasgr/prova-final.html`, or `GET /design-lab/assets/
  command-language.html` directly receives the file, with no session cookie, no `Authorization`
  header, and no module grant required.
- **User/business impact**: Internal training material (including a final exam), commercial
  proposal tooling, brand assets, and an internal product-audit/roadmap document
  (`public/design-lab/README.md`'s content is not served directly, but the labs it documents are)
  are reachable by anyone with the URL, regardless of login state or module grant — defeating the
  purpose `ModuleAccessAdmin`/`RequireModuleAccess` was built for.
- **Suggested resolution**: Either (a) move the sensitive subset of `public/tools/**` behind an
  authenticated Express route that re-checks the same `ModuleAccessGrant`/role before
  `res.sendFile`, or (b) if these are intended to stay low-sensitivity/public, explicitly document
  that decision in `CLAUDE.md` §13 so a future session does not treat `RequireModuleAccess` as a
  real security boundary for this content.
- **Effort**: M

### FRONTEND-002 — HubInteligenciaMarketingHub's "Metodologias & Documentação" tab is 100% broken (8 of 8 documents missing)

- **Category**: TD-BUG, TD-CONTENT
- **Severity**: HIGH
- **Priority**: P2
- **Confidence**: HIGH
- **Status**: CONFIRMED
- **Domain**: FRONTEND
- **Files**: `src/features/hub-inteligencia-marketing/components/
  HubInteligenciaMarketingHub.tsx:14-55,192-254` (the `docs` array and its rendering); confirmed
  against the actual contents of `public/tools/hub-inteligencia-marketing/` (only
  `METODOLOGIA_RISCO_TERRITORIO.md` exists there, which is not even one of the 8 listed titles).
- **Evidence**: `docs` lists `METODOLOGIA.md`, `CENSO_COMPETITIVO_GR_CONTRIBUICAO_2026_08.md`,
  `RANKING_OPORTUNIDADE_GR_2026_08.md`, `METODOLOGIA_UNIT_ECONOMICS_V1_2.md`,
  `METODOLOGIA_HUB_SUITABILITY_V1.md`, `DATA_LINEAGE.md`, `ARQUITETURA.md`,
  `PLANO_EXPANSAO_ATLAS.md`. A repo-wide filename search (excluding `.claude/worktrees`) found zero
  matches for any of these 8 filenames anywhere in the repository.
- **Root cause**: The document list was authored (or copy-pasted from a planning doc) ahead of the
  actual files being added to `public/tools/hub-inteligencia-marketing/`, and never reconciled.
- **Expected**: Clicking any of the 8 entries in the sidebar shows the document, inline (iframe)
  and via "Abrir Arquivo".
- **Actual**: Every one of the 8 entries points its iframe `src` and its external link `href` at
  `/tools/hub-inteligencia-marketing/<filename>`, which 404s for all 8 — the main content pane
  and the "Abrir Arquivo" link are both broken for 100% of this tab's advertised content. The KPI
  strip above also asserts "Metodologias: 8 Documentos", reinforcing the wrong count.
- **User/business impact**: A user with the `hub-inteligencia-marketing` module grant who opens the
  documentation tab gets a blank/404 iframe no matter which document they pick — the entire tab is
  non-functional.
- **Suggested resolution**: Add the 8 referenced files to `public/tools/hub-inteligencia-marketing/`,
  or reduce `docs` (and the KPI tile) to the document(s) that actually exist.
- **Effort**: S (code fix) / depends on content availability for the full remediation.

### FRONTEND-003 — SocialSellingHub has two dead "Download" buttons

- **Category**: TD-BUG, TD-DEAD
- **Severity**: MEDIUM
- **Priority**: P2
- **Confidence**: HIGH
- **Status**: CONFIRMED
- **Domain**: FRONTEND
- **Files**: `src/features/social-selling/components/SocialSellingHub.tsx:301-309,324-332`.
- **Evidence**: `href="/tools/social-selling/Manual de Identidade Visual – Atlas_compressed
  (1).pdf"` and `href="/tools/social-selling/Social Selling Atlas.pptx"`; `ls
  public/tools/social-selling/` shows only 3 `.html` files present — neither the PDF nor the PPTX
  exists anywhere in the repository.
- **Root cause**: Same pattern as FRONTEND-002 — UI built ahead of the referenced asset being
  committed.
- **Expected**: "Download Manual (PDF)" and "Download Apresentação (PPTX)" download the named
  files.
- **Actual**: Both `download` links 404.
- **User/business impact**: Two prominent, styled CTA buttons in the "Materiais e Ativos
  Institucionais" section do nothing useful for the user (browser-native 404 page/download error,
  no in-app error handling since it's a plain anchor tag).
- **Suggested resolution**: Add the two files under `public/tools/social-selling/`, or remove the
  cards until they exist.
- **Effort**: XS (code) / depends on asset availability.

### FRONTEND-004 — 10 exported UI primitives in the shared design system have zero consumers

- **Category**: TD-DEAD
- **Severity**: MEDIUM
- **Priority**: P3
- **Confidence**: HIGH
- **Status**: CONFIRMED
- **Domain**: FRONTEND
- **Files**: `src/components/ui/AIContextPopover.tsx`, `ActionPlanSteps.tsx`,
  `CalendarHeatmap.tsx`, `Carousel.tsx`, `CompareTable.tsx`, `CopyButton.tsx`, `FindingsList.tsx`,
  `PageHeader.tsx`, `TabNavCards.tsx`, `TiltCard.tsx` (933 lines total).
- **Evidence**: For each file, `grep -rn "<ComponentName"` / `grep -rn "\bComponentName\b"` across
  all of `src/` (excluding the file's own definition) returned zero matches — no JSX usage, no
  import, no Storybook story, no test.
- **Root cause**: Design-system primitives built ahead of adoption (the project's own
  `public/design-lab/README.md` independently flags `TabNavCards`/`FindingsList`/`ActionPlanSteps`
  as "implemented but with no direct JSX usage found in scan" from a prior audit pass — this pass
  confirms that finding still holds and extends it to 7 additional files not previously called
  out).
- **Expected/Actual**: A component library file that exports a component implies it is used
  somewhere, or is a documented work-in-progress; here, 10 files are neither.
- **Business impact**: Low direct impact (no user-facing breakage), but real maintenance cost:
  these components must still pass lint/typecheck/build on every change to the shared `ui/`
  folder, and their presence overstates how "battle-tested" the design system is to a future
  session composing a new screen from `src/components/ui/`.
- **Suggested resolution**: For each, either wire it into a real screen it was built for, add a
  Storybook story if it's meant to be a documented-but-not-yet-adopted pattern, or delete it.
- **Effort**: S (per file, to decide+delete) / M-L if some are meant to be adopted instead.

### FRONTEND-005 — Stale references to deleted 3D components in eslint config and the design constitution

- **Category**: TD-DOC, TD-DEAD
- **Severity**: LOW
- **Priority**: P4
- **Confidence**: HIGH
- **Status**: CONFIRMED
- **Domain**: FRONTEND
- **Files**: `eslint.config.mjs` (the `react/no-unknown-property: off` override's `files` array),
  `.claude/CLAUDE.md` (§1, "Stack" bullet about `@react-three/fiber` usage).
- **Evidence**: The eslint override lists `src/features/gamification/components/SpaceGame.tsx`,
  `src/features/gamification/components/GameWidget.tsx`, and `src/components/ui/AtlasOrb.tsx`;
  none of the three exist anywhere in the repository (`find`/`grep` for both the path and any
  reference to the symbol name return nothing). `src/features/gamification/` today contains only
  backend code (`domain/`, `infra/`, `routes/`, `services/`) — the real frontend gamification
  surface is `src/components/ui/GamificationWidget.tsx`, `src/features/dashboard/components/
  TeamRankingWidget.tsx` and `SellerCoachingCard.tsx`, none of which use `@react-three/fiber`.
  Separately, `.claude/CLAUDE.md` §1 names only `SpaceGame.tsx` and `BrandOrb.tsx` as the two real
  `@react-three/fiber` consumers, omitting the third real one found in this pass,
  `src/features/dashboard/components/RevenueSignalOrb.tsx` (which the eslint override array
  *does* correctly include).
- **Root cause**: The gamification feature's 3D frontend was apparently removed/replaced (likely
  during the single-brand consolidation referenced throughout `CLAUDE.md`/`PILOTS.md`) without a
  matching cleanup pass over `eslint.config.mjs` or the constitution's own inventory of 3D usage.
- **Impact**: None functionally (eslint simply never matches the dead paths); the risk is purely
  that `.claude/CLAUDE.md` is the explicitly-designated "source of truth" a future session is
  instructed to read before touching 3D/motion/performance-sensitive code, and it currently points
  at a file that doesn't exist while omitting a file that does.
- **Suggested resolution**: Remove the 3 dead entries from `eslint.config.mjs`; update
  `.claude/CLAUDE.md` §1 to name `BrandOrb.tsx` and `RevenueSignalOrb.tsx` as the current real
  `@react-three/fiber` consumers.
- **Effort**: XS

### FRONTEND-006 — Uneven test coverage concentrated away from the modules found broken in this pass

- **Category**: TD-TEST
- **Severity**: MEDIUM
- **Priority**: P2
- **Confidence**: HIGH
- **Status**: CONFIRMED
- **Domain**: FRONTEND
- **Files**: `tests/unit/**/*.tsx` (41 files total, enumerated in this pass), `tests/e2e/*.spec.ts`
  (17 files: `accessibility`, `auth`, `cadence`, `command-palette`, `commercial-intelligence-journey`,
  `commercial-intelligence-rbac`, `contact-company-forms`, `crm-board`, `crm-kanban(-mobile)`,
  `crm`, `crm360-proposta`, `leads-crud`, `mobile-sweep`, `saved-views`, `visual`, `workspace`).
- **Evidence**: Cross-referencing the 41 `src/features/*` directories against both lists shows
  `social-selling`, `treinamento`, `hub-inteligencia-marketing`, and `propostas`'s
  `PropostaComercialHub.tsx` (the exact 3 modules with confirmed broken content in FRONTEND-002/003,
  plus `propostas`'s sibling proposal-builder screen) have neither a `tests/unit/**/*.tsx` file nor
  a `tests/e2e/*.spec.ts` covering them; `design-lab` likewise has none (arguably acceptable, since
  it is explicitly labeled experimental/isolated).
- **Root cause**: These 5 modules are the "legacy tool hub" iframe pattern described under
  FRONTEND-001 — because their real content is static HTML outside the React tree, they are easy
  to treat as "not really our UI to test," which is exactly how a missing/renamed file inside
  `public/tools/**` goes unnoticed.
- **Business impact**: Without even a smoke-level test (e.g., "the iframe/link targets referenced
  by this component resolve to files that exist"), regressions like FRONTEND-002/003 will keep
  recurring silently whenever `public/tools/**` content is reorganized.
- **Suggested resolution**: A lightweight test (can be a plain `tests/unit/**/*.test.ts`, no
  rendering needed) that asserts every path referenced by these components' `docs`/`tabs` arrays
  exists under `public/` would have caught both FRONTEND-002 and FRONTEND-003 mechanically, and is
  cheap to maintain going forward.
- **Effort**: S
