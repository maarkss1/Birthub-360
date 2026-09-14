# REVOPS — Revenue Intelligence Audit

## Agent
REVOPS (domain code: `REVOPS`)

## Mission
Audit Revenue Intelligence: Forecast, Commit, Best Case, Upside, Pipeline Coverage, Weighted
Pipeline, Win Rate, Conversion, Sales Cycle, Aging, Ticket Médio, MRR/ARR, Churn, Velocity,
Pipeline Creation, Goal Attainment, Health Scores, Forecast Accuracy. For every metric shown on a
dashboard, trace where the number actually comes from and classify the real wiring end-to-end.

## Scope
Not limited to a folder named after the domain. Inspected `src/features/commercial-intelligence/**`
(the primary Revenue Intelligence module), `src/features/analytics/**`, `src/features/billing/**`,
`src/features/intelligence/agents/**` (Commercial Agent Cell narrators touching revenue/churn/
billing), the routes/DI wiring that exposes all of the above, and the BullMQ workers that populate
persisted revenue snapshots. Excluded from deep review (covered better by sibling domain agents):
Bitrix sync internals, CRM Kanban UI mechanics unrelated to metrics, AI gateway internals, and the
392-agent job-roles catalog (only checked for revenue-relevant entries).

## Areas inspected
- `application/forecastEngine.ts`, `predictiveForecast.ts`, `forecastAccuracy.ts`,
  `forecastSnapshot.ts`, `coverageProtection.ts`, `pipelineEligibility.ts`, `healthScore.ts`,
  `goalCommands.ts`, `dataReadiness.ts`, `metricsDictionary.ts`
- `application/queries/*` (aging, pipeline creation, performance, executive overview, forecast
  accuracy, historical trends, journey, close-date intelligence, losses, leading indicators,
  alerts, CRM quality)
- `infra/PrismaCommercialIntelligenceRepository.ts`, `infra/PrismaForecastSnapshotStore.ts`,
  `infra/InMemoryForecastSnapshotStore.ts`, `infra/CommercialIntelligenceAiService.ts`
- `jobs/forecastSnapshotWeekly.worker.ts` + its bootstrap wiring (`src/bootstrap/workers.ts`,
  `worker.ts`, `src/shared/di/setup.ts`)
- `routes/commercialIntelligence.routes.ts`, `presentation/CommercialIntelligenceController.ts`
- Frontend: `ExecutiveOverviewTab.tsx`, `PerformanceTab.tsx`, `PipelineForecastTab.tsx`,
  `AgingTab.tsx`, `HealthScoreCard.tsx`, `ForecastAccuracyCard.tsx`, `ForecastRangeCard.tsx`,
  `FunnelConversionCard.tsx`, `DealDrillDownDrawer.tsx`, `CommercialIntelligenceHub.tsx`
- `src/features/analytics/**` (Cohort Analysis, Win/Loss Analysis, Analytics dashboard/use cases)
- `src/features/billing/**` (Usage/AI-cost tracking, confirmed NOT a billing module)
- `src/features/intelligence/agents/{revenueIntelligence,churnRetention,billingRevenue,
  ldrIntelligence,coordinatorCommercial,managerCommercial,executiveDirector,bitrixGuardian}.agent.ts`
  and `commercialAgentRegistry.ts`
- `src/features/analytics/services/churn-prediction.service.ts` and its callers
  (`ai-suite.routes.ts`, `agent.routes.ts`, `AISuiteHub.tsx`)
- `src/features/intelligence/services/winLossAnalysis.worker.ts` vs. the manual
  `POST /api/intelligence/win-loss-analysis` handler
- Test suites: `src/features/commercial-intelligence/__tests__/*.unit.test.ts` (ran a representative
  subset live via `npx vitest run -c vitest.unit.config.ts` — 47/47 passing)
- `vitest.config.ts` / `vitest.unit.config.ts` / `vitest.integration.config.ts` (test-inclusion
  wiring, to confirm the `__tests__` suites are actually executed by `npm run test:unit`, not only
  present in the tree)

## Files inspected
Approximately 65 files read in full or in significant part, plus targeted greps across the whole
`src/` tree for MRR/ARR, velocity, goal attainment, sales cycle, aging, ticket médio, churn, health
score, mock/random-data generators, and forecast-related keywords.

## Executive summary
`src/features/commercial-intelligence/` is, by a wide margin, the most mature and honestly-engineered
module found in this audit pass. Every core metric in the mission brief — Forecast, Commit, Best
Case, Pipeline Coverage, Weighted Pipeline, Win Rate, Sales Cycle, Aging, Ticket Médio, Pipeline
Creation/Pace, Goal Attainment (`% da Meta`), Health Score, and Forecast Accuracy — is a real,
tested, Prisma-backed computation with an explicit, versioned formula (`metricsDictionary.ts` is a
self-documenting single source of truth already wired to the UI tooltips). Unavailable data
consistently degrades to an explicit "não disponível" rather than a fabricated 0 or guess, and this
discipline is enforced by the module's own `AGENTS.md` ("não fabricar KPI"). The forecast snapshot
pipeline (weekly cron → Postgres → historical accuracy backtest → Health Score "Confiabilidade de
Forecast" pillar) is fully wired end-to-end and confirmed present in `src/bootstrap/workers.ts`.
Several previously-fake metrics found by this repo's own past pilots (a hardcoded cohort table, a
100%-prose Win/Loss screen) have already been fixed and are now real.

That said, the mission's full metric list surfaces four genuine gaps outside this otherwise strong
core: **Pipeline Velocity is not implemented anywhere** despite every one of its input metrics
(win rate, average deal size, sales cycle, open opportunity count) already existing; **true MRR/ARR
recurring-revenue tracking does not exist** (the in-app "MRR" is a manually-typed new-business sales
target, not a subscription/contract revenue book, and the one agent designed to reconcile
sold-vs-billed revenue is both a self-documented placeholder and unreachable — no HTTP route);
**account-level Churn/Health Score is a manual-entry AI form**, not a metric computed from real
support/usage/billing data, despite living under the same "Health Score" name as the real,
deterministic composite score in the Cockpit; and the **weekly automated Win/Loss analysis job
computes a real result that is never persisted or surfaced anywhere**, which the frontend itself
already documents as a known gap. None of these four are the module's own bugs so much as scope
boundaries and orphaned side-features — but they are exactly the kind of "a feature existing is not
a feature working" gap this audit is meant to catch.

## Critical
None found in the Revenue Intelligence domain.

## High
- **REVOPS-001** — Pipeline Velocity is requested in the mission's metric list and is a standard
  RevOps composite (opportunities × win rate × average deal size ÷ sales cycle length), but no code
  path anywhere in the repository computes it, even though every one of its inputs already exists
  and is tested (`win_rate`, `ticket_medio`, `sales_cycle`, pipeline counts). This is a real gap in
  an otherwise complete metrics dictionary — a manager asking "how fast is revenue actually moving
  through the pipeline" has no answer today. NOT_IMPLEMENTED.

## Medium
- **REVOPS-002** — No true MRR/ARR (recurring revenue) tracking exists. `CommercialGoal` (metric
  `NEW_MRR`) is a manually-typed monthly *target* for new business, and `Fechado` is the sum of
  Closed-Won deal amounts in the month — both are New Business Bookings concepts, not a recurring
  revenue book (no contract-value/subscription model, no $-churn, no expansion/contraction, no ARR
  anywhere). `BillingRevenueAgent` was built specifically to reconcile "vendido x faturado" but (a)
  self-documents that no real billing data source exists in the repo (`src/features/billing/**` is
  AI token-usage cost tracking, explicitly commented "deliberadamente NÃO é um módulo de
  faturamento") and (b) has zero HTTP route — it is fully coded, registered in
  `commercialAgentRegistry.ts`, but unreachable by any user action. PARTIALLY IMPLEMENTED /
  PLACEHOLDER, compounded by ORPHANED wiring.
- **REVOPS-003** — The only "Churn"/"Health Score" feature that ingests account-specific indicators
  (`ChurnPredictionService.analyzeChurnRisk`, exposed at
  `POST /api/intelligence/commercial-cell/churn-retention/run` and
  `POST /api/intelligence/suite/churn/predict`) takes `monthlyRecurringRevenue`,
  `openSupportTickets`, `unresolvedComplaints`, `paymentDelaysLast90Days`, and
  `platformUsageDropPercentage` directly from the HTTP request body — i.e., whatever a human types
  into a form (the frontend `AISuiteHub.tsx` even ships a hardcoded `samplePayload` with
  `monthlyRecurringRevenue: 8500` as a placeholder example). None of these fields are queried from
  a real support-ticket table, a real usage-telemetry source, or a real billing/payment table. The
  LLM then produces a `healthScore` (0-100) from these caller-supplied numbers. This is a
  legitimate ad hoc analysis tool, but it is materially different from — and confusingly named the
  same as — the deterministic, data-grounded "Health Score composto" in
  `application/healthScore.ts` that the Cockpit actually displays. Any consumer of this endpoint who
  assumes the numbers are pulled automatically from the CRM would be wrong. MOCKED (input layer).
- **REVOPS-004** — The weekly automated Win/Loss Analysis job (`winLossAnalysis.worker.ts`, cron
  `0 19 * * 5`, confirmed scheduled via `src/bootstrap/workers.ts`) runs a real per-organization AI
  analysis over closed leads' WhatsApp/timeline history and returns `WinLossOrgAnalysis[]` — but
  this return value is never written to any table, cache, or notification; it only exists as the
  BullMQ job's internal result (not exposed by any endpoint). The frontend
  (`src/features/analytics/components/WinLossAnalysis.tsx`, lines ~243-249) already carries a
  developer comment acknowledging this: the automatic Friday run's output "ainda não aparece nesta
  tela — o que você está vendo é sempre da última vez que alguém rodou manualmente". Additionally,
  the manual endpoint (`POST /api/intelligence/win-loss-analysis` in `intelligence.routes.ts`)
  duplicates the query and prompt logic instead of calling `runWinLossAnalysis`, which is exactly
  how the two paths drifted once already (per the code comment about `WIN_LOSS_STATUSES` missing
  `Negocios_Ganhos` in the cron for a period). DISCONNECTED (automation runs, output is discarded)
  + TD-DEAD (duplicated logic).

## Low
- **REVOPS-005** — Five of the nine "Commercial Agent Cell" narrator agents are fully implemented
  but have zero HTTP route anywhere in the codebase (confirmed by grep — each class name only
  appears in its own file): `LdrIntelligenceAgent`, `CoordinatorCommercialAgent`,
  `ManagerCommercialAgent`, `ExecutiveDirectorAgent`, `BitrixGuardianAgent`. Two of these are
  directly Revenue-Intelligence-relevant and therefore in scope for this audit:
  `ManagerCommercialAgent` (forecast/pipeline/team performance review) and `ExecutiveDirectorAgent`
  (executive summary/scenario analysis) duplicate ground already covered by the real, wired
  `RevenueIntelligenceAgent` and the Cockpit's own AI executive summary, so their absence from
  routing may be intentional rather than an oversight — but as shipped they are ORPHANED/dead code
  that increases the surface area without any user-reachable benefit.
- **REVOPS-006** — `GoalMetric` is typed as a single-value union (`'NEW_MRR'`), and every goal
  read/write path (`goalCommands.ts`, `CommercialGoalDTO`, the Prisma composite key
  `organizationId_period_metric`) is built around exactly one metric. This is honestly scoped (not
  fabricated), but it means Goal Attainment tracking cannot represent any other commercial target
  (e.g., number of new logos, expansion revenue, activation) without a schema/type change — worth
  flagging as a structural constraint if Goal Attainment is expected to generalize.

## Technical debt
- TD-FEAT: Pipeline Velocity absent (REVOPS-001).
- TD-BILLING / TD-FEAT: No real recurring-revenue (MRR/ARR) book; only a new-business sales target
  shares the "MRR" name (REVOPS-002).
- TD-DEAD: `BillingRevenueAgent`, `LdrIntelligenceAgent`, `CoordinatorCommercialAgent`,
  `ManagerCommercialAgent`, `ExecutiveDirectorAgent`, `BitrixGuardianAgent` are registered but
  unreachable (REVOPS-002, REVOPS-005).
- TD-DATA: Weekly Win/Loss analysis output is computed then discarded (REVOPS-004).
- TD-DEAD (duplication): manual vs. scheduled Win/Loss analysis reimplement the same query/prompt
  independently instead of sharing `runWinLossAnalysis` (REVOPS-004).

## Implementation debt
- Pipeline Velocity: no implementation exists to audit — a genuine "not built yet" gap, not a
  broken one.
- MRR/ARR: the billing reconciliation agent's own system prompt (`billingRevenue.agent.ts`) is a
  model of honest degrade-to-"não disponível" design; the debt is entirely in the missing data
  source it depends on, not in the agent's logic.

## Feature debt
- Goal Attainment cannot be tracked on any metric other than New MRR (REVOPS-006).
- No aggregate "Upside" tile at the Cockpit level — `Upside` tier is only visible per-deal in
  `DealDrillDownDrawer.tsx`, never rolled up as a headline KPI the way Commit/Best Case are. Minor,
  but worth a product decision since the mission lists Upside as a first-class metric.

## Bugs
None found that produce incorrect numbers in the currently-wired Revenue Intelligence paths — the
module's test suite (unit tests covering forecast engine, health score, forecast accuracy,
predictive forecast, coverage protection, pipeline eligibility, etc.) passes (spot-checked 47/47
live). The issues found in this audit are scope/wiring gaps (features that don't exist or aren't
reachable), not incorrect computations of features that do exist.

## Architecture
- The separation between the deterministic Forecast Ponderado Explicável
  (`forecastEngine.ts`, versioned via `FORECAST_RULES_VERSION`) and the AI narration layer
  (`CommercialIntelligenceAiService.ts`) is a genuinely good pattern: the AI layer is contractually
  forbidden from inventing numbers and only narrates pre-computed, tested values, with a
  deterministic fallback (`buildFallbackRecommendations`) when the AI call fails or returns
  unparseable output.
- `dependency-cruiser`'s `no-cross-feature-imports` rule forced `ChurnRetentionAgent` and
  `ContractSignatureAgent` to receive pre-computed results via narrow interface contracts
  (`ChurnPredictionSourceContract`, `SignatureStatusSourceContract`) instead of importing the real
  service directly — a real architectural boundary being enforced, not just documented.
- Append-only `ForecastSnapshot` (no unique constraint on organization+period) is a deliberate
  design choice to preserve forecast-revision history for backtesting — confirmed by both the
  schema comment and `PrismaForecastSnapshotStore.ts`.

## Security
- No cross-tenant leak found in the Revenue Intelligence paths reviewed. The weekly forecast
  snapshot worker and the weekly Win/Loss worker both use `requestContext.run({ bypassRls: true })`
  only to discover the list of organization IDs (a documented, allowlisted pattern —
  `BYPASS_RLS_ALLOWED_MODELS` — reused consistently across several workers in this repo), then
  immediately re-scope every real read/write inside `requestContext.run({ tenantId })`.
  `/api/commercial-intelligence/**` has its own `requireRole([...COMMERCIAL_INTELLIGENCE_ROLES])`
  defense-in-depth check in addition to the router-mount-level `authenticateToken`/`requireTenant`.
- The manual `POST /api/intelligence/win-loss-analysis` handler has a defensive
  `...(organizationId ? { organizationId } : {})` spread that looks like it could scope-to-all-orgs
  if `organizationId` were ever falsy — but `requireTenant` (mounted before this router) already
  returns 403 whenever `req.user.organizationId` is missing, so this path is unreachable in
  practice. Noting as INFO only: the conditional is misleading dead code, not an active
  vulnerability.

## Tests
- `src/features/commercial-intelligence/__tests__/*.unit.test.ts` (15 files: forecast engine,
  health score, forecast accuracy, forecast snapshot, predictive forecast, coverage protection,
  pipeline eligibility, data readiness, loss taxonomy, metrics dictionary, scoring, close-date/
  journey, executive calendar/export, controller parsing) are real, non-trivial unit tests, not
  mocked-into-passing stubs. Confirmed they are actually included in `npm run test:unit`
  (`vitest.unit.config.ts` → `include: ['tests/unit/**/*.test.ts', 'src/**/__tests__/**/*.test.ts',
  ...]`) — a plain `npx vitest run` (default `vitest.config.ts`) does NOT pick these up, which could
  mislead a developer running vitest directly without `-c vitest.unit.config.ts` into believing no
  tests exist for this module. Ran a representative subset live (forecastEngine, healthScore,
  forecastAccuracy, predictiveForecast — 47 tests) with the correct config: all passing.
- No unit/integration test found for `winLossAnalysis.worker.ts`'s actual persistence behavior
  (there isn't any to test) or for the churn-prediction manual-input endpoints' data-grounding
  claims.

## Integration
- Forecast snapshot → forecast accuracy → Health Score "Confiabilidade de Forecast" pillar is a
  real, working integration chain, confirmed wired from cron (`worker.ts` /
  `src/bootstrap/workers.ts`) through Prisma persistence (`PrismaForecastSnapshotStore`) to the
  read side (`forecastAccuracyReport.ts`, `GET /commercial-intelligence/forecast-accuracy`).
  `InMemoryForecastSnapshotStore` is correctly relegated to tests only (confirmed via
  `src/shared/di/setup.ts` wiring the Prisma implementation in production DI).
  See REVOPS-004 for the one automation (Win/Loss) whose integration chain is broken at the
  persistence step.

## Product
- The metrics dictionary (`metricsDictionary.ts`) served at
  `GET /api/commercial-intelligence/metrics-dictionary` and consumed by `MetricInfo.tsx` tooltips is
  a strong product pattern other domains in this repo should copy — it makes "where does this number
  come from" a first-class, testable, user-facing answer instead of tribal knowledge.
- Two different features are both called "Health Score" for the end user (the Cockpit's composite,
  data-grounded score vs. the AI Suite's manual-input churn tool) — a naming collision worth a
  product decision, since a user could reasonably confuse the two.

## Mock/Fake/Placeholder
- `ChurnPredictionService`/AI Suite "Detector de Churn & Health Score" — manual-input-driven, not
  connected to real support/usage/billing data (REVOPS-003).
- `BillingRevenueAgent` — explicit `SOURCE_REQUIRED` placeholder, self-documented as having no real
  billing data source (REVOPS-002).
- Previously-fake metrics already fixed by this repo's own past work (confirmed via code comments,
  not re-flagging as new debt): the Cohort Analysis table used to return hardcoded numbers
  ("Fake data just for the prototype") and is now a real `Lead.createdAt`/`closedAt` aggregation; the
  Win/Loss Analysis screen used to be "100% prosa gerada, zero número real visível" and now shows a
  real numeric snapshot (`closedThisMonth`/`lostThisMonth`/top loss reason) alongside the AI
  narrative.

## Dead/Orphan code
- `BillingRevenueAgent`, `LdrIntelligenceAgent`, `CoordinatorCommercialAgent`,
  `ManagerCommercialAgent`, `ExecutiveDirectorAgent`, `BitrixGuardianAgent` — registered in
  `commercialAgentRegistry.ts`, fully coded, zero HTTP route (REVOPS-002, REVOPS-005).
- `InMemoryForecastSnapshotStore` — intentionally kept for tests only, correctly not used in
  production DI (not debt, documented by design).

## Quick wins
- Persist the weekly Win/Loss Analysis result (even a simple append-only table keyed by
  organization+week, mirroring the `ForecastSnapshot` pattern already proven in this same codebase)
  and surface "last automated run" in `WinLossAnalysis.tsx` instead of only showing manual runs —
  closes REVOPS-004 with a small, low-risk change that reuses an existing pattern.
  Low effort, no schema redesign needed, and the frontend already has the exact spot for it.
- Wire `ManagerCommercialAgent`/`ExecutiveDirectorAgent` to an HTTP route (or explicitly delete them
  if superseded by `RevenueIntelligenceAgent`) — either resolves REVOPS-005 cheaply, since both
  agents are already fully coded and just need a route + DI resolution, mirroring the existing
  `churn-retention`/`contract-signature` route pattern.
- Rename or re-scope the AI Suite's "Detector de Churn & Health Score" tool label to make clear it
  is a manual what-if analysis (e.g., "Simulador de Risco de Conta") rather than an automatic score,
  reducing the naming collision with the Cockpit's real Health Score — a copy-only change.

## Structural problems
- The absence of any subscription/contract-value data model means MRR/ARR as commonly understood in
  RevOps (a recurring revenue book with churn/expansion in dollars) cannot be built without a new
  domain concept (e.g., a `Subscription`/`Contract` entity with recurring amount and term) — this is
  a product/data-model decision, not a quick fix, and is called out here so it isn't mistaken for a
  simple wiring gap in a future audit.

## Needs verification
- Whether product intends the Commercial Agent Cell's 5 unreachable agents (REVOPS-005) to ship in a
  future wave or were deliberately shelved — could not confirm from code alone; flagged as
  NEEDS_VERIFICATION rather than asserted as an oversight.
- Whether any external consumer (dashboard, notification, report) reads the BullMQ job result of
  `winLossAnalysis.worker.ts` via a mechanism not found in this pass (e.g., a BullMQ Board/Arena
  admin UI) — the audit found no such consumer in `src/`, but could not rule out an
  operations-only view outside the application code.

## Complete findings list
| ID | Title | Category | Severity | Priority | Confidence | Status |
|---|---|---|---|---|---|---|
| REVOPS-001 | Pipeline Velocity metric never implemented | TD-FEAT | HIGH | P2 | HIGH | CONFIRMED |
| REVOPS-002 | No real MRR/ARR recurring-revenue tracking; billing reconciliation agent is a placeholder with no route | TD-BILLING, TD-FEAT, TD-DEAD | MEDIUM | P2 | HIGH | CONFIRMED |
| REVOPS-003 | Churn/Health Score AI tool driven entirely by manually-typed inputs, not real support/usage/billing data | TD-AI, TD-MOCK | MEDIUM | P3 | HIGH | CONFIRMED |
| REVOPS-004 | Weekly automated Win/Loss analysis result is computed then discarded (never persisted/surfaced); duplicated logic vs. manual endpoint | TD-DATA, TD-DEAD | MEDIUM | P2 | HIGH | CONFIRMED |
| REVOPS-005 | 5 of 9 Commercial Agent Cell narrator agents fully coded but unreachable (no HTTP route) | TD-DEAD, TD-AGENT | LOW | P3 | HIGH | CONFIRMED |
| REVOPS-006 | GoalMetric type/schema hardcoded to a single metric (NEW_MRR), limiting Goal Attainment to one target type | TD-ARCH | LOW | P4 | HIGH | CONFIRMED |

## Positive findings (for calibration)
Recorded here so the severity/priority above is read in context, not as a signal this module needs
urgent rework: Forecast, Commit, Best Case, Pipeline Coverage (including the 90-day M/M+1/M+2/M+3
protection window), Weighted Pipeline, Win Rate, Sales Cycle (mean+median), Ticket Médio, Aging
(bucketed + by-stage with measured-vs-estimated data-quality flag), Pipeline Creation/Pace, Goal
Attainment (`% da Meta`), the composite Health Score (6 named pillars, each independently
degradable to "não disponível"), and Forecast Accuracy (real append-only snapshots + backtest) are
all CONFIRMED PRODUCTION READY: real Prisma queries over `Lead`/`LeadStageHistory`/
`LeadFieldChange`/`CrmPipelineStage`/`CommercialGoal`, versioned deterministic formulas, unit-tested,
routed behind role-based authorization, and rendered in the Cockpit UI from the same computed
objects (no separate/duplicated display-side calculation found).
