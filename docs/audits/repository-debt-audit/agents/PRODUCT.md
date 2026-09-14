# PRODUCT — Repository Debt Audit

## Agent

PRODUCT — product-reality specialist (docs/roadmap/menu vs. what is actually wired and working).

## Mission

Sweep README/roadmap/backlog/ADR/internal audit docs against the real codebase and classify every
feature touched as PRODUCTION READY, FUNCTIONAL, PARTIALLY FUNCTIONAL/IMPLEMENTED, FRONTEND ONLY,
BACKEND ONLY, MOCKED, PLACEHOLDER, DISCONNECTED, BROKEN, ORPHANED, LEGACY, NOT IMPLEMENTED, or
UNKNOWN — with concrete repo evidence for every claim, never a stylistic opinion treated as debt.

## Scope

Whole repo, but weighted toward: root-level product/roadmap docs (`README.md`,
`PRODUCT_EXPERIENCE.md`, `AUTONOMIA_COMERCIAL_24X7.md`, `CHANGELOG-MELHORIAS.md`,
`ROADMAP_FINALIZACAO_PLATAFORMA.html`, `EXECUCAO-ONDAS.md`), `.claude/PILOTS.md` (3541 lines of
already-completed, empirically-verified fixes — read in full to avoid re-reporting resolved
issues), `.agents/completion/01-bloqueadores.md`, menu/navigation wiring
(`src/components/layout/tabMeta.ts`, `App.tsx`, `Sidebar.tsx`, `ExecutiveHeader.tsx`), the
`src/features/*` module list against what is actually routed, the `commercialAgentRegistry.ts` /
12-agent Commercial Cell, the `job-roles` 392-agent catalog, `prisma/schema.prisma` models with no
application-layer consumer, and the `cadence` module's channel options vs. its real dispatchers.
This audit deliberately avoids re-litigating findings already owned in depth by sibling reports in
this same folder (`AIAGENT.md` on agent-execution mechanics, `BILLING.md` on billing/consumption,
`DATA.md` on schema/RLS integrity) — where this report touches the same file, it is corroborating
from the product-navigation/feature-completeness angle and says so explicitly, not duplicating.

## Areas inspected

- Root product/roadmap documentation vs. code (README, PRODUCT_EXPERIENCE.md,
  AUTONOMIA_COMERCIAL_24X7.md, CHANGELOG-MELHORIAS.md, ROADMAP_FINALIZACAO_PLATAFORMA.html).
- `.claude/PILOTS.md` full read — cross-checked a sample of its "already fixed" claims against
  current `HEAD` (IntelligenceHub tabs, CommandPalette, Bitrix guide naming, Settings routing,
  Empresas/Contatos search) to confirm no regression, and a sample of `PRODUCT_EXPERIENCE.md`'s
  2026-08-07 claims that turned out to be **stale** (already fixed by later work, confirmed via
  current schema/code — see Needs verification / Executive summary).
- Menu/navigation wiring: `tabMeta.ts`, `App.tsx` route table, `Sidebar.tsx`, `ExecutiveHeader.tsx`,
  `RequireModuleAccess`/`ModuleAccessGrant`.
- `src/features/intelligence/agents/commercialAgentRegistry.ts` and
  `src/features/intelligence/routes/agent.routes.ts` (which of the 12 Commercial Cell agents are
  actually reachable).
- `src/features/job-roles/catalog/agents.normalized.json` (parsed programmatically for its own
  summary block and binding-type distribution).
- `prisma/schema.prisma` models cross-referenced against `grep` for real usage in `src/`,
  `scripts/`, `tests/` (`Prospect`, and the RAG models `PRODUCT_EXPERIENCE.md` flagged as orphaned
  in August, since removed from schema).
- `src/features/cadence/components/CadenceHub.tsx` vs.
  `src/features/cadence/infra/dispatchers/CadenceDispatchers.ts`.
- Five "Hub Executivo standalone" modules gated by `ModuleAccessGrant`:
  `social-selling`, `hub-inteligencia-marketing`, `propostas`, `treinamento-atlasgr`,
  `portal-comercial` (two read in full, three corroborated by directory/naming pattern only).

## Files inspected

Approx. 45 files read or grepped in full/targeted fashion, plus 5 documentation files read in full
(README.md, PRODUCT_EXPERIENCE.md, CHANGELOG-MELHORIAS.md, AUTONOMIA_COMERCIAL_24X7.md,
`.claude/PILOTS.md` in full at 3541 lines), plus one JSON catalog (8001 lines) parsed
programmatically, plus targeted `grep`/`find` sweeps across `src/features/**`, `prisma/schema.prisma`,
and `docs/audits/repository-debt-audit/agents/*.md` (sibling reports, to avoid duplication).

## Executive summary

This is an unusually self-audited codebase: `PRODUCT_EXPERIENCE.md` (2026-08-07) and
`.claude/PILOTS.md` (33+ pilots through 2026-09-12) already document, with file+line evidence, a
long list of product-reality bugs that were found and **fixed** — dead navigation, a decorative
command palette, an unreachable 9-tab AI hub, a broken search filter, missing dashboard error
states, RBAC gaps. Spot-checking a sample of those claims against current `HEAD` confirms they are
still fixed (IntelligenceHub's internal tab bar, `CommandPalette.tsx`, the "🎓 Guia Prático
Bitrix24" rename all present today) — and, notably, two of `PRODUCT_EXPERIENCE.md`'s own
still-open claims from August (`User.role` as a free string; 3 overlapping orphaned RAG models:
`KnowledgeDocument`/`KnowledgeChunk`) are **also already resolved**: `User.role` is now a real
`UserRole` enum (`prisma/schema.prisma:763`), and `KnowledgeDocument`/`KnowledgeChunk` no longer
exist in the schema at all. This is good news, but it also means these two historical docs are
partially stale as a map of *current* debt and should not be read as up to date without
re-verification — which is exactly what this pass did before reporting anything below as current.

What is still genuinely open, verified against the current tree:

1. **`Prospect` is a fully-designed, tenant-scoped, indexed Prisma model with relations to
   `Company`/`Lead`/`Organization` and inline business-rule documentation (CNPJ normalization) —
   and precisely **zero** references anywhere in `src/`, `scripts/`, or `tests/`.** It is not a
   duplicate-in-use pipeline (as an August doc suggested); it is unused schema, full stop. Nobody
   can create, read, update, or delete a `Prospect` through the product today.
2. **The "12-agent Commercial Cell" is a 3-agent product from a navigation standpoint.** Only
   `revenue-intelligence`, `churn-retention`, and `contract-signature` have HTTP routes. Five fully
   coded narrator agents (`ldrIntelligence`, `coordinatorCommercial`, `managerCommercial`,
   `executiveDirector`, `bitrixGuardian`) and the deliberately-placeholder `billingRevenue` agent
   have no route and are unreachable by any user, script, or scheduled job. (Mechanically the same
   fact as `AIAGENT-004` in this audit's AI-agent report; this entry corroborates from the
   product/navigation side — a marketed 12-capability catalog is a 3-capability product.)
3. **The 392-source / 379-canonical "agent catalog" (`job-roles`) is a taxonomy, not a working
   agent roster**, by its own generated summary: only 28 agents (7%) are bound to a real existing
   service, only 27 (7%) carry actual system-prompt text, 40 are `SOURCE_REQUIRED` (no real data
   source exists), 13 are explicit `FUTURE_TOOL` stubs, and the remaining ~284 are typed
   `LLM_PROMPT` yet ship with `hasPrompt: false` / `systemPrompt: null` — i.e., they cannot run.
   The runtime fails closed for anything not `VERIFIED` (no illusion of working agents), which is
   good engineering discipline, but the product claim implied by "392 agents" does not match a
   product that can actually execute ~93% of that catalog. (Same underlying fact independently
   confirmed by `AIAGENT-001`/`002`/`003`; this entry is the product-catalog-completeness framing.)
4. **Five gated "Hub Executivo" modules ship one specific customer's vertical-locked, branded
   collateral as if it were a generic Birth Hub 360 feature.** `SocialSellingHub.tsx` and
   `HubInteligenciaMarketingHub.tsx` (read in full) are pure iframe/download shells around static
   legacy HTML/PDF/PPTX files under `public/tools/**`, hardcoded to freight/cargo-insurance risk
   management ("Gerenciamento de Risco", "sinistralidade", "MDF-e", "RNTRC") and to the "Atlas GR"
   brand by filename and on-screen copy — not to Birth Hub 360's own single-brand identity, and
   with zero dynamic/CRM data. `ModuleAccessGrant` (`src/features/module-access/`) is a real
   per-organization, per-user grant mechanism, so any tenant admin who is granted (or mistakenly
   grants) one of these modules sees Atlas GR's own proprietary competitive-intelligence documents
   and sales collateral, not their own organization's content. This directly contradicts this
   repo's own product constitution (`.claude/CLAUDE.md` §1: "ICP: qualquer empresa... Nenhum texto
   novo deve amarrar o produto a um vertical específico").
5. **The cadence sequence builder's own UI silently offers a channel that is guaranteed to fail.**
   `CadenceHub.tsx`'s touch-channel `<select>` lists "Voz" with no `disabled`, no tooltip, no
   warning, while `CadenceDispatchers.ts` unconditionally returns `failed` for that channel today
   (`CYC-004` pending). The backend is honest (never fakes success); the UI is not — a user has no
   way to learn, before building a sequence, that any voice touch they add will always fail.
6. A stale, pre-rebrand roadmap artifact (`ROADMAP_FINALIZACAO_PLATAFORMA.html`, 2242 lines, old
   AtlasGR orange palette, corrupted title encoding) sits at the repo root, unreferenced by the app
   or by `README.md`'s doc index — low product impact, but exactly the class of "roadmap that no
   longer matches reality" this audit exists to catch.

No CRITICAL-severity product finding was found: nothing here silently corrupts data or fakes a
result to the user in the modules inspected. The highest-impact issues are a fully-designed but
unused data model (#1), a large, self-described agent catalog whose executable surface is far
smaller than its size implies (#2/#3), and a genuine multi-tenant content-leak risk in the
Hub Executivo modules (#4).

## Critical

None found in this domain's scope for this pass.

## High

- PRODUCT-001 — `Prospect` Prisma model: fully designed, zero application usage anywhere in the
  codebase.
- PRODUCT-002 — 5 of 12 Commercial-Cell agents (+ BillingRevenueAgent) have no HTTP route; product
  markets a 12-agent cell that is a 3-agent product.
- PRODUCT-003 — 392-source / 379-canonical job-roles agent catalog: ~93% of catalog entries cannot
  execute (no prompt, no service binding, or explicit future/source-required stub).

## Medium

- PRODUCT-004 — Five gated "Hub Executivo" modules serve one customer's vertical-locked, branded
  static collateral as a generic product feature; real per-tenant grant mechanism means cross-
  tenant content exposure risk.
- PRODUCT-005 — Cadence builder UI offers "Voz" as a touch channel with no indication it always
  fails.

## Low

- PRODUCT-006 — Stale pre-rebrand `ROADMAP_FINALIZACAO_PLATAFORMA.html` at repo root, unreferenced,
  wrong palette, corrupted title.
- PRODUCT-007 — "Editor de Documentos" menu label still promises a general document editor while
  the underlying screen is the Knowledge Base's own editor (re-vectorizes on save) — first flagged
  in `PRODUCT_EXPERIENCE.md` §3.3 (2026-08-07), still true today (`tabMeta.ts:132`,
  `document-editor` feature = Knowledge Base domain). Naming-only; functionality itself works.

## Technical debt

- The Commercial Cell (PRODUCT-002) and job-roles catalog (PRODUCT-003) both represent a broader
  pattern in this codebase: ambitious catalogs/registries are built and versioned before the routes
  or bindings that make them reachable/executable exist. This is a reasonable incremental-build
  strategy, but nothing in the product surface (menus, docs) currently distinguishes "shipped and
  reachable" from "cataloged for later" for an end user or a stakeholder skimming `AGENTS.md`'s
  agent-count claims.

## Implementation debt

- PRODUCT-001 (`Prospect`) is the clearest case: the schema-level implementation (relations,
  constraints, tenant scoping, inline business rules) is further along than the
  application-level implementation (which is nonexistent). Either finish it (repository +
  service + route + UI) or remove it — right now it is neither.

## Feature debt

- PRODUCT-002, PRODUCT-003: features described in code comments/registries as existing
  ("12-agent cell", "392 agents") are not reachable/executable products today.
- PRODUCT-004: the *positioning* of the 5 Hub Executivo modules ("qualquer empresa com área
  comercial") does not match their actual content (one vertical, one legacy brand).

## Bugs

- PRODUCT-005: cadence builder lets a user configure a touch that is 100% guaranteed to fail,
  with no UI signal — this is a real, currently reproducible product bug (not just a missing
  feature), because the user's mental model ("I configured a voice follow-up") diverges from
  reality ("this step will never fire") with no feedback loop until they dig into run history.

## Architecture

- No new architecture finding beyond what's already captured in `AIAGENT.md`/`DATA.md`. The
  fail-closed binding model in `capabilityAuthorization.service.ts` (PRODUCT-003) is a sound
  architectural choice given how incomplete the underlying catalog is — worth preserving as-is
  even while the catalog itself gets built out.

## Security

- PRODUCT-004 has a security-adjacent dimension (cross-tenant content exposure via
  `ModuleAccessGrant`) but is reported here as a product-positioning/tenancy problem, not a
  broken-auth problem — the grant mechanism itself works as designed; the issue is *what* it grants
  access to.

## Tests

- No dedicated test coverage found for the 5 Hub Executivo static modules (PRODUCT-004) — they are
  iframe/link shells, so there is little to unit-test, but there is also no test asserting the
  `ModuleAccessGrant` gate actually blocks ungranted tenants from these specific module keys
  (general `moduleAccess.service.test.ts` exists but wasn't traced end-to-end against these 5
  keys in this pass — flagged as NEEDS_VERIFICATION below).
- No test found (nor claimed) covering `Prospect` at any layer — consistent with PRODUCT-001.

## Integration

- Not this report's focus (see `INTEGRATION.md`); the only integration-shaped item here is
  PRODUCT-005's dependency on the still-pending `CYC-004` voice dispatcher, already tracked in
  depth elsewhere in this audit (VOICE/REVOPS/WORKFLOW reports) and in
  `AUTONOMIA_COMERCIAL_24X7.md`'s own "Limitações conhecidas" section.

## Product

See Executive summary and Complete findings list — this section's substance is the whole report.

## Mock/Fake/Placeholder

- `BillingRevenueAgent` (`src/features/intelligence/agents/billingRevenue.agent.ts`) is a
  deliberate, well-documented placeholder: it refuses to ever report a fabricated "faturado" value
  and always answers `SOURCE_REQUIRED` absent a real billing source — this is the *opposite* of
  faked data, and is called out here only to note it's also unreachable by route (PRODUCT-002),
  compounding "not wired" on top of "intentionally incomplete." Full billing-domain treatment is in
  `BILLING.md`.

## Dead/Orphan code

- PRODUCT-001: `Prospect` Prisma model — zero application-layer references (repository, service,
  controller, route, script, or test) found via repo-wide grep.

## Quick wins

- Add a disabled state + tooltip ("Envio por voz ainda não é suportado em cadências automáticas —
  use ligação manual") to the "Voz" option in `CadenceHub.tsx`'s channel `<select>` — a few lines,
  directly prevents users from building sequences that silently fail (PRODUCT-005).
- Either delete `ROADMAP_FINALIZACAO_PLATAFORMA.html` or move it under `docs/archive/` with a
  header noting it predates the single-brand rebrand — trivial, removes a stale doc that could
  mislead a future contributor or stakeholder (PRODUCT-006).
- Rename the `document-editor` menu label away from "Editor de Documentos" to something scoped to
  Knowledge Base (e.g. "Editor da Base de Conhecimento") — one string change, removes a naming
  mismatch already flagged internally over a month ago (PRODUCT-007).

## Structural problems

- The repeated pattern across PRODUCT-002/003 (registry/catalog built ahead of the routes/bindings
  that make entries reachable) suggests this codebase would benefit from a lightweight, versioned
  "reachability manifest" — a single place that says, for every agent/module the code defines,
  whether it has a live route, a real binding, and a UI entry point — so that "documented" and
  "operational" don't have to be independently re-derived by grep in every audit.

## Needs verification

- PRODUCT-004: `propostas`, `treinamento-atlasgr`, and `portal-comercial` were confirmed to follow
  the same `public/tools/<slug>/*.html` + `ModuleAccessGrant` gating pattern by directory structure
  and naming only — their component source was not read in full in this pass (time-boxed), unlike
  `social-selling` and `hub-inteligencia-marketing`, which were fully verified. Recommend reading
  `PropostaComercialHub.tsx` and `TreinamentoHub.tsx` before treating them as CONFIRMED identical
  cases rather than PLAUSIBLE.
- Whether any automated test currently asserts that a tenant without a grant for
  `social-selling`/`hub-inteligencia-marketing`/etc. cannot reach `/social-selling` etc. by direct
  URL — not traced end-to-end in this pass.
- `ROADMAP_FINALIZACAO_PLATAFORMA.html` and `FILME_HERO_01_30S.md`/`CREATIVE_SYSTEM_01.md` (not
  read in this pass) may contain further stale-vs-reality claims; only the roadmap file was
  spot-checked given time constraints.

## Complete findings list

### PRODUCT-001 — `Prospect` Prisma model is fully designed but has zero application-layer usage

- **Category:** TD-FEAT, TD-DATA
- **Severity:** HIGH | **Priority:** P2 | **Effort:** L | **Confidence:** HIGH
- **Status:** CONFIRMED
- **Evidence:** `prisma/schema.prisma:2964-3002` defines `model Prospect` with `cnpj`,
  `companyName`, `confidenceScore`, `enrichedData`/`intelligence` JSON, `leadScore`, `status`,
  `bitrixId`, relations to `Company`/`Lead`/`Organization`, a tenant-scoped
  `@@unique([organizationId, cnpj])`, and 4 indexes — plus an inline code comment documenting a
  real historical bug fix (global-unique → tenant-scoped CNPJ uniqueness) as if this were an
  actively maintained, in-use model. `grep -rl "prisma\.prospect\b" src --include=*.ts` across the
  entire `src/` tree returns **zero files**; the same is true for `scripts/` and `tests/`. No
  repository, service, controller, route, or component references this model.
- **Expected:** Either a real "Prospect" pipeline (distinct pre-CRM enrichment stage, per the
  model's own field names) reachable from the product, or the model should not exist.
- **Actual:** The model is fully schema-designed (further along than a stub) but entirely
  unreachable — no create/read/update/delete path exists anywhere in the application.
- **Root cause:** Schema-first design work (possibly for a planned "Prospecting" pipeline separate
  from `Company`/`Lead`) that was never followed by the application-layer implementation, and never
  removed when the plan changed. Note this is a narrower, more precise finding than
  `PRODUCT_EXPERIENCE.md`'s 2026-08-07 claim that `Prospect` "duplica Company/Lead... como pipeline
  paralelo não relacionado" — the model has since gained real FK relations to `Company`/`Lead`, but
  gaining relations changed nothing about there being zero code that uses it.
- **User/business impact:** None today (nobody can reach it), but it is a maintenance and
  onboarding cost: every future schema change, migration, or Prisma-client type generation carries
  this model's weight for zero product value, and a new contributor reading the schema will
  reasonably assume a working feature exists.
- **Suggested resolution:** Product decision needed — either scope and build the missing
  application layer (if this pipeline is still wanted) or drop the model in a dedicated migration
  (with a data check first, in case it was ever seeded via a one-off script outside `src/`).

### PRODUCT-002 — 5 of 12 Commercial-Cell agents (+ BillingRevenueAgent) are unreachable: no route exists

- **Category:** TD-FEAT, TD-AGENT
- **Severity:** HIGH | **Priority:** P2 | **Effort:** M | **Confidence:** HIGH
- **Status:** CONFIRMED
- **Evidence:** `src/features/intelligence/agents/commercialAgentRegistry.ts` registers 12
  Commercial-Cell agent entries; `grep -n "commercial-cell" src/features/intelligence/routes/agent.routes.ts`
  finds exactly 3 mounted routes: `/commercial-cell/revenue-intelligence/run`,
  `/commercial-cell/churn-retention/run`, `/commercial-cell/contract-signature/run`. No route
  exists (in that file or elsewhere under `src/features/intelligence/routes/`) for
  `ldr-intelligence`, `coordinator-commercial`, `manager-commercial`, `executive-director`,
  `bitrix-guardian`, or `billing-revenue`, even though their corresponding agent classes
  (`ldrIntelligence.agent.ts`, `coordinatorCommercial.agent.ts`, `managerCommercial.agent.ts`,
  `executiveDirector.agent.ts`, `bitrixGuardian.agent.ts`, `billingRevenue.agent.ts`) exist,
  compile, and are exported.
- **Expected:** A "Commercial Agent Cell" described (in registry comments and prior discovery) as a
  12-agent catalog should have 12 ways to actually invoke an agent.
- **Actual:** Only 3 of 12 are invokable via HTTP; the other 9 (5 fully-built narrators +
  BillingRevenue, which is additionally a deliberate placeholder, + 3 more per the registry not
  independently re-verified here) have no caller in the product.
- **Root cause:** Agents were built and registered ahead of route wiring/UI surfacing, and no
  tracking mechanism flags "registered but unrouted" as a release blocker.
- **User/business impact:** Any stakeholder or document describing "12 commercial agents" overstates
  the shipped surface by 4x; a Gestor/RevOps user cannot access LDR intelligence, daily commercial
  rhythm, forecast/pipeline review, or executive summary narration through any UI or API today.
- **Cross-reference:** The same underlying mechanical fact (registered classes, no route) is
  reported independently and in more implementation depth as `AIAGENT-004` in `AIAGENT.md` — this
  entry is retained here because it changes the *product* framing (navigable feature count), not
  just the AI-execution framing.
- **Suggested resolution:** Either route + surface the 5 narrator agents (low effort per agent,
  same pattern as the 3 already-routed ones) or explicitly demote them to an internal/未released
  status in any roadmap or agent-count documentation until routed.

### PRODUCT-003 — 392-source job-roles agent catalog: ~93% of catalog entries cannot execute

- **Category:** TD-FEAT, TD-AI
- **Severity:** HIGH | **Priority:** P1 | **Effort:** XL | **Confidence:** HIGH
- **Status:** CONFIRMED
- **Evidence:** `src/features/job-roles/catalog/agents.normalized.json`'s own `summary` block:
  `{"totalSourceRecords": 392, "totalCanonicalAgents": 379, "withPrompt": 27, "byBinding":
  {"EXISTING_SERVICE": 28, "LLM_PROMPT": 298, "SOURCE_REQUIRED": 40, "FUTURE_TOOL": 13}}`. A direct
  programmatic pass over all 379 agent entries confirms: only 28 have `binding.type ===
  'EXISTING_SERVICE'` (a real wired capability); only 27 have `hasPrompt: true`; 284 of the 298
  `LLM_PROMPT`-typed agents have `hasPrompt: false` and `systemPrompt: null` (sample entry
  `ab-test-automator`: `"binding": {"type": "LLM_PROMPT"}, "hasPrompt": false, "systemPrompt":
  null`); 40 are `SOURCE_REQUIRED` and 13 are `FUTURE_TOOL`, both of which
  `capabilityAuthorization.service.ts` and `toolExecutors.ts` explicitly block from ever reaching
  execution (`// Fail closed também aqui: um binding VERIFIED sem executor real registrado nunca
  executa`). Route surface is real and large (45 registered routes across
  `src/features/job-roles/routes/*.ts`), but routes existing does not make the underlying agents
  functional if their binding can never resolve to `VERIFIED`.
- **Expected:** A catalog described (in prior discovery and in the repo's own naming) as "392
  agents" implies 392 (or at least a large majority) of usable, invokable commercial capabilities.
- **Actual:** ~93% of the canonical 379 agents are either empty catalog rows (no prompt, no
  binding) or explicitly gated stubs that can never execute under the current
  capability-authorization rules.
- **Root cause:** Bulk import/normalization of a large external agent-name list
  (`scripts/seed-multi-cargo.ts` + `agents.normalized.json`) produced correct taxonomy/metadata
  (domain, risk, job-role mapping) far ahead of the actual authoring work (system prompts) or
  integration work (service bindings) needed to make each entry operational.
- **User/business impact:** Anyone sizing this platform's AI capability by catalog count (392, or
  even 379) will be off by roughly an order of magnitude relative to what a user can actually
  invoke and get a real result from today. This is the single largest gap between "documented/
  cataloged" and "actually working" found in this audit.
- **Cross-reference:** Same underlying facts independently reported with execution-mechanics depth
  as `AIAGENT-001`/`AIAGENT-002`/`AIAGENT-003` in `AIAGENT.md` — retained here for the
  catalog-completeness/product-sizing framing, not duplicated in full.
- **Suggested resolution:** Re-baseline any external-facing or internal roadmap claim about "392
  agents" to reflect the ~28-97 currently operational (EXISTING_SERVICE + the 27 with real
  prompts, once cross-checked for overlap), and treat closing the `SOURCE_REQUIRED`/no-prompt gap
  as a scoped, trackable backlog rather than an already-shipped catalog.

### PRODUCT-004 — Gated "Hub Executivo" modules ship one customer's vertical-locked, branded content as a generic feature

- **Category:** TD-PRODUCT, TD-BRAND, TD-TENANT
- **Severity:** MEDIUM | **Priority:** P2 | **Effort:** M | **Confidence:** HIGH (for the 2
  fully-read modules), MEDIUM (for the 3 corroborated-by-pattern modules)
- **Status:** CONFIRMED (social-selling, hub-inteligencia-marketing) / NEEDS_VERIFICATION
  (propostas, treinamento-atlasgr, portal-comercial)
- **Evidence:** `src/features/social-selling/components/SocialSellingHub.tsx` (340 lines, read in
  full) renders `<iframe src="/tools/social-selling/Motor de Social Selling Atlas GR.html">`,
  `.../Atlas GR Pipeline.html`, `.../AtlasGR Kit Campanha LinkedIn Completo.html` (all 3 files
  confirmed present under `public/tools/social-selling/`, up to 1.69MB), plus a hardcoded array of
  5 "weekly LinkedIn post" copies about "sinistros no transporte de carga", "transportadora",
  "score preditivo de motoristas" (freight/cargo-risk-insurance vertical, not the generalized
  "qualquer empresa com área comercial" ICP), plus direct download links to
  "Manual de Identidade Visual – Atlas_compressed (1).pdf" and "Social Selling Atlas.pptx".
  `src/features/hub-inteligencia-marketing/components/HubInteligenciaMarketingHub.tsx` (267 lines,
  read in full) is the same pattern: iframes to `dashboard_oportunidade_gr.html`,
  `lacuna-gr-hub.html`, and 8 hardcoded `.md` documents named `CENSO_COMPETITIVO_GR_...md`,
  `DATA_LINEAGE.md` ("Rastreabilidade de CNPJ, MDF-e e RNTRC" — Brazilian freight-transport
  regulatory documents), `PLANO_EXPANSAO_ATLAS.md`. Both modules are routed top-level in `App.tsx`
  (`/social-selling`, `/hub-inteligencia-marketing`) behind `<RequireModuleAccess
  moduleKey="...">`, and `tabMeta.ts`'s own comment confirms these were deliberately pulled out of
  the CRM's tab system into standalone, `ModuleAccessGrant`-gated routes. `ModuleAccessGrant` is a
  real per-organization, per-user grant (`src/features/module-access/services/moduleAccess.service.ts`:
  `getModuleAccessMatrix(organizationId)`, `listGrantedModulesForUser(organizationId, userId,
  role)`) — i.e., any tenant's ADMIN can grant these module keys to their own users, and nothing in
  the code branches the *content* by organization/vertical. `propostas`, `treinamento-atlasgr`, and
  `portal-comercial` were confirmed (via `find`) to share the same `public/tools/<slug>/` static-
  asset directory structure and were seen to reference `iframe`/`Atlas` strings in their
  components, but their component source was not read in full this pass.
- **Expected:** A module ships in a generalized multi-tenant CRM either as (a) genuinely
  tenant-agnostic functionality, or (b) is scoped/branded per-tenant if it carries one customer's
  own materials.
- **Actual:** The content is neither — it is one company's (Atlas GR's) own vertical-specific sales
  enablement material and branded collateral, wrapped in a generic-looking module inside a
  multi-tenant product, reachable by any organization an admin grants the module key to.
- **Root cause:** These appear to be legacy standalone tools/decks built for Atlas GR specifically
  (pre-dating, or alongside, the single-brand consolidation described in `.claude/CLAUDE.md` §1)
  that were wrapped in iframe shells and kept reachable via a grant system, rather than either being
  removed, genuinely productized, or scoped to be visible only to the Atlas GR organization itself.
- **User/business impact:** If any organization other than Atlas GR is ever granted one of these
  module keys (accidentally, by a support agent replicating a permission set, or by a future sales
  motion that grants "all modules" to a demo tenant), that organization's users see Atlas GR's own
  proprietary competitive-intelligence research and branded collateral — a real cross-tenant
  information-exposure risk, not merely a cosmetic mismatch. It also means "Birth Hub 360" cannot
  honestly claim these 5 modules as vertical-agnostic product features today.
- **Suggested resolution:** Product decision required (per `.claude/CLAUDE.md` §13, this class of
  legacy asset needs discussion, not silent removal): either (a) restrict `ModuleAccessGrant` for
  these 5 keys to the Atlas GR organization specifically (own-account internal tooling, not a
  product feature), with that constraint enforced in code, not just by not mentioning it in sales
  material, or (b) genuinely productize them (per-tenant content, no hardcoded Atlas GR branding)
  if they're meant to be a real cross-customer feature, or (c) retire them if they're pure legacy.

### PRODUCT-005 — Cadence sequence builder lets users pick "Voz" as a touch channel with no indication it always fails

- **Category:** TD-UX, TD-FEAT
- **Severity:** MEDIUM | **Priority:** P2 | **Effort:** XS | **Confidence:** HIGH
- **Status:** CONFIRMED
- **Evidence:** `src/features/cadence/components/CadenceHub.tsx:973`:
  `const CHANNEL_OPTIONS: CadenceChannel[] = ['email', 'whatsapp', 'voice'];`, rendered at line
  ~1141 as a plain `<select>` with no `disabled` attribute and no conditional warning text anywhere
  in the surrounding JSX (confirmed by reading lines 1125-1170 and grepping the whole file for
  `CYC-004`/"não tem dispatcher"/"disabled" near the channel selector — none found tied to the
  voice option). Meanwhile `src/features/cadence/infra/dispatchers/CadenceDispatchers.ts:109-120`:
  `/** Roteia pelo canal do toque. Voz (CYC-004) não tem dispatcher real ainda — falha de forma
  honesta em vez de fingir envio. */` ... `error: 'Canal de voz ainda não tem dispatcher real de
  cadência (CYC-004 pendente).'` — i.e., every `voice`-channel touch, in every sequence, on every
  run, unconditionally returns `failed`. This limitation is honestly documented in
  `AUTONOMIA_COMERCIAL_24X7.md`'s "Limitações conhecidas" section and in a real handoff file
  (`.agents/handoffs/audit-ach/17-para-06-12-voz-cadencia-dispatcher-pendente.md`), but none of that
  documentation reaches the person actually building a sequence in the UI.
  labels).
- **Expected:** A channel that is known, at the backend level, to always fail should either not be
  offered in the builder, or should be visibly disabled/annotated so the user understands the
  consequence before they invest time configuring a sequence with a voice touch.
  Not implemented.
- **Actual:** The option is presented identically to `email`/`whatsapp` (which do send for real via
  `productionCadenceDispatcher`), with zero visual or textual distinction.
- **Root cause:** The dispatcher-level honesty fix (fail loudly, never fake success) was
  implemented at the infra layer, but the corresponding UI-layer guard (disable the option, or
  surface the limitation at configuration time rather than only in post-hoc run-history failures)
  was not carried through to `CadenceHub.tsx`.
- **User/business impact:** A SDR/RevOps user configuring a multichannel cadence with a voice
  follow-up believes they've set up an autonomous voice touch; in reality that step will exhaust
  its retries and be marked failed every single time, discoverable only by digging into per-run
  attempt history after the fact — a real trust/expectation gap in an "autonomia comercial 24/7"
  product whose entire pitch is that these things happen reliably without supervision.
- **Suggested resolution:** Disable the "Voz" `<option>` (or add a `title`/inline note next to it:
  "Envio automático por voz ainda não está disponível — use ligação manual/3CX") until `CYC-004` is
  resolved. Very low effort, directly closes the gap between backend honesty and UI honesty.

### PRODUCT-006 — Stale, pre-rebrand roadmap artifact at repo root

- **Category:** TD-DOC
- **Severity:** LOW | **Priority:** P3 | **Effort:** XS | **Confidence:** HIGH
- **Status:** CONFIRMED
- **Evidence:** `ROADMAP_FINALIZACAO_PLATAFORMA.html` (2242 lines, read directly): uses
  `--atlas: #ff5618` / `--atlas2: #ff6b10` / `--atlas3: #ff8008` orange palette (the old AtlasGR
  identity `.claude/CLAUDE.md` §1 explicitly says no longer exists — "Até 09/2026 a plataforma
  trocava de marca em runtime... Isso não existe mais"), and its own `<title>` is mojibake-corrupted
  (`Roadmap Definitivo de Finaliza��o – Birth Hub 360�`), indicating a character-encoding
  regression at some point in its history that was never caught because nothing renders/tests this
  file. Not referenced from `README.md`'s doc index, not linked from any in-app route.
- **Expected:** Either kept current and correctly encoded, archived with a clear "historical"
  marker, or removed.
- **Actual:** Sits at repo root looking like a live document, with a broken palette and a broken
  title.
- **Root cause:** Root-level static HTML artifacts in this repo (there are several — see
  `DIVIDA_TECNICA_MULTIAGENTE_ATLASGR_2026-09-08.html` too, not inspected in this pass) are not
  covered by any lint/build/CI gate for encoding or brand-token drift, unlike `src/`.
- **User/business impact:** Low — nobody reaches this through the product. Risk is a human
  (contributor, stakeholder, or a future audit) mistaking it for current guidance.
- **Suggested resolution:** Move to `docs/archive/` with a one-line "historical, superseded by
  single-brand rebrand" header, or delete if no longer useful; fix or drop the encoding issue
  either way.

### PRODUCT-007 — "Editor de Documentos" menu label overstates scope (naming-only, functionality intact)

- **Category:** TD-UX, TD-DOC
- **Severity:** LOW | **Priority:** P3 | **Effort:** XS | **Confidence:** HIGH
- **Status:** CONFIRMED
- **Evidence:** `src/components/layout/tabMeta.ts:132`: `editor: { label: 'Editor de Documentos',
  icon: FileText }`. `PRODUCT_EXPERIENCE.md` (2026-08-07) already documented that this screen "é o
  mesmo domínio da Base de Conhecimento, não um editor geral" — re-verified: the label is unchanged
  more than a month later, while `document-editor`'s actual feature (re-vectorizing on save) is
  still Knowledge-Base-specific behavior, not a general-purpose document editor.
- **Expected:** A menu label whose scope matches the feature behind it.
- **Actual:** The label promises general document editing; the feature is scoped to the Knowledge
  Base's own documents.
- **Root cause:** Naming chosen before (or independent of) the realization that this is a
  Knowledge-Base-specific tool, never revisited.
- **User/business impact:** Low — the feature itself works as designed; a user opening "Editor de
  Documentos" expecting a general editor for any document type will be confused about scope, not
  blocked.
- **Suggested resolution:** Rename the label (e.g. "Editor da Base de Conhecimento") — one string,
  zero behavior change, zero risk.

## Capability rows

| capability | frontend | backend | database | integration | ai | automation | tests | security | tenancy | observability | documentation | status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Prospect pipeline (schema-level) | MISSING | MISSING | COMPLETE | NOT_APPLICABLE | NOT_APPLICABLE | NOT_APPLICABLE | MISSING | NOT_APPLICABLE | PARTIAL | NOT_APPLICABLE | UNKNOWN | MISSING |
| Commercial Cell (12-agent catalog) | MISSING (9/12) | PARTIAL (3/12 routed) | FUNCTIONAL | NOT_APPLICABLE | PARTIAL | FUNCTIONAL (routed 3) | UNKNOWN | NOT_APPLICABLE | FUNCTIONAL | UNKNOWN | PARTIAL | PARTIAL |
| Job-roles 392-agent catalog | PARTIAL | PARTIAL (45 routes, ~7% agents executable) | COMPLETE | NOT_APPLICABLE | MOCKED (93% no real binding/prompt) | PARTIAL | UNKNOWN | NOT_APPLICABLE | FUNCTIONAL | UNKNOWN | PARTIAL (overclaims size) | PARTIAL |
| Hub Executivo standalone modules (5) | FUNCTIONAL (as static viewer) | MISSING (no dynamic backend) | NOT_APPLICABLE | NOT_APPLICABLE | NOT_APPLICABLE | NOT_APPLICABLE | MISSING | NOT_APPLICABLE | BROKEN (content not tenant-scoped despite tenant-scoped grant) | NOT_APPLICABLE | PARTIAL | LEGACY |
| Cadence — voice channel option | BROKEN (no warning) | FUNCTIONAL (honest fail) | NOT_APPLICABLE | MISSING (CYC-004) | NOT_APPLICABLE | PARTIAL | UNKNOWN | NOT_APPLICABLE | NOT_APPLICABLE | FUNCTIONAL (logged) | FUNCTIONAL (AUTONOMIA doc) | PARTIAL |

## Maturity score

**58/100** for the PRODUCT domain (feature-reality/navigation completeness specifically — not a
whole-repo score).

## Maturity justification

The core, day-to-day CRM surface (CRM/Kanban, Companies, Contacts, Activities, Automations,
Prospecting, Analytics, Cadence's email/WhatsApp channels, Command Palette, Intelligence Hub's 9
tabs) is genuinely mature, empirically QA'd across dozens of documented pilots, and self-correcting
— that pulls the score up substantially from a naive "lots of debt found" read. What holds the
score at 58 rather than 75+: two large, prominently-named capability surfaces (the 12-agent
Commercial Cell and the 392-agent job-roles catalog) are each roughly 3-7x smaller in *actually
executable* terms than their names/counts suggest, one fully-designed data model (`Prospect`) has
no application layer at all, and a real multi-tenant grant system can expose one specific
customer's own branded, vertical-locked materials to unrelated tenants (Hub Executivo modules) —
none of which are visible from reading the product's own top-line docs, only from tracing catalog
JSON, route files, and grant code directly. These are exactly the kind of "looks bigger than it is"
gaps that erode trust in a product's roadmap/capability claims once discovered, even though the
parts that do work, work well.
