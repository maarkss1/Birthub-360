# BILLING — Repository Debt Audit

## Agent

BILLING specialist agent, part of the multi-domain Birth Hub 360º repository debt audit.

## Mission

Audit billing/metering: plans, subscriptions, usage, metering, credits, quotas, limits, invoices,
payments, entitlements, feature gates, webhooks, reconciliation, tenant ownership of usage events,
AI/voice/storage/API consumption tracking. Determine whether billing is real, partial, schema-only,
UI-only, mocked, or not integrated at all.

## Scope

Everything that could plausibly be "billing" in this repository, not just `src/features/billing/`:
AI usage/cost metering, external payment/ERP connectors (Stripe, Omie), CRM commercial documents
(quotes/proposals/invoices/contracts), per-organization spend caps and prospecting provider budgets,
feature flags / module access grants (as a proxy for plan-based entitlement), the job-roles agent
runtime's own `billing.read`/`billing.reconcile` capability bindings, and the `BillingRevenueAgent`
narrator. Confirmed there is no Stripe/payment-processor subscription model, no plan/tier concept,
and no invoice/dunning email flow anywhere in the codebase.

## Areas inspected

- `src/features/billing/**` (domain/application/infra/presentation/routes/components) — the "Consumo
  de IA" (AI usage) screen, its only real billing-adjacent feature.
- `src/lib/ai/gateway/pricing.ts`, `src/lib/ai/usage-log.ts`, `src/lib/ai/budget.ts`, `src/lib/ai/metrics.ts`
  — AI cost estimation and the real per-organization/global spend circuit breaker.
- `prisma/schema.prisma` — `AILog`, `AIGuardrailEvent`, `Organization.monthlyAiBudgetUsd`,
  `StripeConnection`, `OmieConnection`, `CrmCommercialDocument` (+ `CrmDocumentType`/`CrmDocumentStatus`
  enums, `CrmCommercialDocumentVersion`), `FeatureFlag`, `OrganizationFeatureFlag`, `ModuleAccessGrant`.
- `src/features/integrations/stripe/**` (service, routes, panel, hook) and
  `src/features/integrations/omie/**` (service, routes, panel) — the two payment/ERP connectors added
  in the most recent commit on this branch (`feat(integrations): adiciona conectores Slack, Stripe e
  Omie`, `72f0bd40`).
- `src/features/crm360/**` — `CrmCommercialDocument` status machine (`Rascunho → … → Pago/Cancelado`),
  specifically how the `Pago` (Paid) status is set.
- `src/features/prospecting/services/providerBudget.ts` / `providerCostMetrics.ts` (Apollo/Hunter spend
  caps) — used as a cross-check for how budget governance is implemented elsewhere in the same repo.
- `src/features/integrations/birth-voice/**` and `VoiceCallLog` — telephony consumption tracking.
- `src/features/intelligence/agents/billingRevenue.agent.ts` and
  `src/features/job-roles/config/tool-bindings.ts` (`billing.read`/`billing.reconcile` bindings) — the
  AI-agent layer's own stance on whether a real "faturado" (billed) data source exists.
- `.claude/PILOTS.md` (Pilot 022 — Billing; Pilot 031 — Meu Workspace) — prior findings to avoid
  re-reporting fixed issues.
- Tests: `tests/unit/features/billing/**`, `tests/integration/rbac-e2e-usage.test.ts`,
  `tests/unit/features/integrations/stripe/**`, `tests/unit/features/integrations/omie/**`.
- `src/bootstrap/routes.ts`, `src/shared/di/setup.ts` — route mounting and RBAC/DI wiring.

## Files inspected

Approximately 40 files read in full or in relevant part (listed inline in Complete findings list
below), plus targeted greps across `src/`, `prisma/`, `tests/`, and `.claude/PILOTS.md`.

## Executive summary

**There is no billing system in this product** — no plans, no tiers, no subscriptions, no invoices
issued to Birth Hub 360º's own customers, no checkout, no dunning, and no entitlement/feature-gate
tied to a paid plan. This is not a hidden gap: the codebase is unusually explicit and honest about
it in three independent places (`UsageUseCases.ts` docblock, the info banner in `Billing.tsx`, and
`tool-bindings.ts`'s `billing.read`/`billing.reconcile` = `SOURCE_REQUIRED`), and `.claude/PILOTS.md`
Pilot 022 already documents this as a deliberate scope decision. What exists instead, and is real
and well-built, is a **cost/consumption telemetry and circuit-breaker system for the AI gateway**:
`AILog` records every AI call's tokens/cost/latency/model/promptId, `UsageUseCases`/`Billing.tsx`
aggregate it per organization with correct RBAC (ADMIN/GESTOR) and tenant isolation (verified by a
real end-to-end RBAC+RLS test, `rbac-e2e-usage.test.ts`), and `src/lib/ai/budget.ts` enforces both a
global and a genuine **per-organization** monthly USD spend cap (`Organization.monthlyAiBudgetUsd`)
that actually blocks new AI calls with a 429 when exceeded.

Two payment/ERP connectors (Stripe, Omie) were added in the most recent commit on this branch. Both
are implemented honestly at the service layer — they validate credentials against the real
provider API before persisting, encrypt secrets at rest, never fabricate a payment status, and are
RLS-protected per tenant. However, **both ship with backend routes and business logic for their
core write action (`createStripeCharge`/`getStripeCharge`, `upsertOmieCustomer`) that no frontend
component, hook, or other backend service ever calls** — only connect/disconnect/test are wired to
UI. They are also **completely disconnected from the CRM's own "Fatura" (Invoice) document type**:
`CrmCommercialDocument` has a real `Fatura` type and a `Pago` (Paid) status, but that status is a
free-form manual transition (any `ADMIN/GESTOR/CLOSER/SDR` can set it) with zero linkage to a Stripe
charge, an Omie financial record, or any other reconciliation source — so "Pago" in the CRM proves
nothing about whether money actually moved. This matches, and is explicitly acknowledged by, the
`billing-revenue` agent's `SOURCE_REQUIRED` policy, which still correctly refuses to treat any of
this as a real "faturado" figure even after the new connectors landed.

The AI usage screen itself has one concrete, demonstrable defect worth calling out on its own: a
"Cota Mensal de Tokens (IA & SDR)" widget hardcodes a "contractual limit" of 5,000,000 tokens/month,
identical for every organization, with no backing config field, and disconnected from the one spend
cap that is actually real and enforced (`Organization.monthlyAiBudgetUsd`, denominated in USD, not
tokens). That real cap, in turn, has no admin UI anywhere to configure it — it can only be set by
direct database/SQL access. Finally, telephony (Birth Voice/Bland) consumption is logged
(`VoiceCallLog.durationSeconds`, `providerCallId`) but has no cost estimation and no budget
circuit-breaker at all, unlike the AI gateway and the Apollo/Hunter prospecting providers, which both
have one — an inconsistency across otherwise-comparable paid external integrations in the same
codebase.

## Critical

None found in this domain.

## High

- **BILLING-001** — Real per-organization AI spend cap (`Organization.monthlyAiBudgetUsd`) has no
  admin UI to configure it; only settable via direct database access. See Complete findings list.
- **BILLING-002** — Telephony (Birth Voice/Bland) consumption has zero cost tracking and no budget
  circuit-breaker, unlike every other paid external provider in the codebase (AI gateway, Apollo,
  Hunter). See Complete findings list.
- **BILLING-003** — `CrmCommercialDocument` "Fatura" (Invoice) `Pago` (Paid) status is a free-form
  manual transition with no reconciliation against Stripe, Omie, or any other financial source of
  truth. See Complete findings list.

## Medium

- **BILLING-004** — "Cota Mensal de Tokens" widget in `Billing.tsx` hardcodes a fake per-org
  "contractual limit" of 5,000,000 tokens, unrelated to the real enforced budget field.
- **BILLING-005** — `createStripeCharge`/`getStripeCharge` are fully implemented, tested, RBAC-gated
  backend endpoints with zero UI consumer (BACKEND ONLY / orphaned API surface).
- **BILLING-006** — `upsertOmieCustomer` is a fully implemented, tested, RBAC-gated backend endpoint
  with zero UI consumer (BACKEND ONLY / orphaned API surface).
- **BILLING-007** — No webhook endpoint exists for Stripe (or any payment provider) — asynchronous
  payment-status changes (3-D Secure completion, refunds, disputes) can never reach the application.

## Low

- **BILLING-008** — No E2E (Playwright) coverage for the Stripe/Omie connection panels; only unit
  tests at the service layer.
- **BILLING-009** — `estimateCostUsd` silently falls back to `local-llama3-fast` pricing for any
  unrecognized model name instead of logging/flagging the miss, which could quietly under- or
  over-count spend against the real budget cap if a new model name is introduced without updating
  the pricing table.

## Info

- The absence of a plan/subscription/entitlement system, and the absence of a real "faturado" data
  source, are pre-existing, explicitly-documented, deliberate scope decisions (see `UsageUseCases.ts`
  docblock, `Billing.tsx` info banner, `tool-bindings.ts` `billing.read`/`billing.reconcile` =
  `SOURCE_REQUIRED`, and `.claude/PILOTS.md` Pilot 022/031). Not re-reported as new defects; recorded
  here only as domain-scope confirmation, current as of this audit (post Stripe/Omie connectors).
- Pilot 022 already found and fixed a real RBAC gap on the frontend route for `/app/usage`
  (`App.tsx` was missing `<RequireRole>`) and added the `promptId` cost breakdown. Both fixes are
  present in the current code; not re-reported.
- The `usage.routes.test.ts` gap Pilot 022 flagged ("no test exercises the real `requireRole`
  middleware") has since been closed by `tests/integration/rbac-e2e-usage.test.ts`, which does use
  the real middleware chain and real RLS. Not re-reported as open.

## Technical debt

- TD-BILLING/TD-CONFIG — `Organization.monthlyAiBudgetUsd` (the one real per-tenant billing-adjacent
  control in the schema) has no write path anywhere in the application layer (see BILLING-001).
- TD-MOCK/TD-BILLING — hardcoded 5,000,000-token quota widget on the Billing screen (see BILLING-004).
- TD-INTEGRATION/TD-BILLING — telephony consumption has no cost/budget governance parallel to AI and
  prospecting providers (see BILLING-002).

## Implementation debt

- TD-IMPL — `createStripeCharge`/`getStripeCharge` and `upsertOmieCustomer` are implemented and
  tested but never wired to any consumer (see BILLING-005, BILLING-006).
- TD-IMPL/TD-INTEGRATION — no Stripe webhook receiver exists, so any charge that does not resolve
  synchronously (e.g., requires 3-D Secure) has no way to ever update its status in this system
  short of polling `getStripeCharge` manually, which itself has no caller (see BILLING-007).

## Feature debt

- TD-FEAT/TD-BILLING — no plan/subscription/entitlement model exists anywhere; `FeatureFlag` /
  `OrganizationFeatureFlag` / `ModuleAccessGrant` gate features by organization or user, never by a
  paid tier — there is no monetization enforcement mechanism in the product at all. This is a
  pre-existing, documented scope decision (see Info section), not a defect, but is recorded here as
  the honest current state of the "entitlements" part of this audit's mission.
- TD-FEAT — Stripe (payments) and Omie (customer/ERP sync) exist as standalone connectors but are not
  integrated with the CRM's own commercial-document/invoice lifecycle (`CrmCommercialDocument`) —
  connecting a Stripe charge or an Omie invoice to a `Fatura` record would be the natural next step
  implied by having both a "Fatura" document type and now a real payment connector, but no such link
  exists (see BILLING-003).

## Bugs

None rising to the level of a functional bug (crash, incorrect calculation given available inputs,
wrong data returned) were found in this domain. `estimateCostUsd`'s silent fallback (BILLING-009) is
recorded as a Low finding rather than a bug because it does not crash or block anything.

## Architecture

- The consumption-metering module (`src/features/billing/**`) follows the same clean
  domain/application/infra/presentation layering as the rest of the codebase (`Usage.ts` domain
  interfaces, `UsageUseCases` application service, `PrismaUsageRepository` infra, `UsageController`
  presentation) — no architectural debt found here.
- Two independent, non-unified spend-governance mechanisms exist side by side without a shared
  abstraction: `src/lib/ai/budget.ts` (AI, USD-denominated, per-org + global) and
  `src/features/prospecting/services/providerBudget.ts` (Apollo/Hunter, USD-denominated, per-org +
  per-provider). They are conceptually the same pattern (cache-backed monthly cost aggregate vs. a
  configurable ceiling, fail-open on infra failure, fail-closed on real breach) implemented twice.
  Not necessarily wrong (the domains are genuinely different — LLM tokens vs. paid data-provider
  calls), but a shared `BudgetGuard` abstraction would have prevented Birth Voice from being left out
  entirely (see BILLING-002) and is worth considering if a third paid provider is added.

## Security

- Both new connectors (`StripeConnection.secretKey`, `OmieConnection.appKey`/`appSecret`) are
  correctly registered in `src/lib/crypto/piiFields.ts` and encrypted at rest via the same Prisma
  extension used for all other credential fields, and both tables have real Postgres RLS
  (`ENABLE ROW LEVEL SECURITY` + `FORCE ROW LEVEL SECURITY` + `tenant_isolation_policy`) added in the
  same migration (`20260912130000_slack_stripe_omie_connections`). No cross-tenant leak found.
  `connectStripe`/`connectOmie` both validate the credential against the real provider API (Stripe
  `GET /v1/balance`, Omie `ListarClientes`) before persisting — never accept-and-store blind.
- `createStripeCharge`/`getStripeCharge`/`upsertOmieCustomer` are all behind
  `requireRole(['ADMIN', 'GESTOR'])` at the route level, consistent with the rest of the connector's
  management actions.
- `GET /api/usage` is behind `requireRole(['ADMIN', 'GESTOR'])` and tenant isolation is verified by a
  real Postgres-RLS-backed test (`rbac-e2e-usage.test.ts`) — confirmed org A cannot see org B's usage.
- No injection, SSRF, or secret-leak issues found: Stripe/Omie calls use `fetchWithTimeout` with a
  fixed host allowlist (not user/tenant-controlled URLs), and connection summaries never return the
  full secret (only last 4 chars).

## Tests

- `tests/unit/features/billing/application/UsageUseCases.test.ts` (12 cases) — thorough coverage of
  aggregation, bucketing, per-model/per-prompt breakdown, unattributed-call handling.
- `tests/unit/features/billing/components/Billing.test.tsx` and
  `tests/unit/features/billing/routes/usage.routes.test.ts` exist; the latter was flagged by Pilot
  022 for not exercising the real `requireRole` middleware — since closed by
  `tests/integration/rbac-e2e-usage.test.ts` (real middleware chain, real RLS, real
  cross-tenant-isolation assertion). Good test evolution; nothing to re-flag.
- `tests/unit/features/integrations/stripe/stripe.service.test.ts` and
  `tests/unit/features/integrations/omie/omie.service.test.ts` cover credential validation
  (accept/reject), honest charge-status propagation (never fabricates "succeeded"), and error
  propagation — good unit coverage of the service layer.
- `src/lib/ai/__tests__/budget.test.ts` covers the per-organization AI budget contract in isolation
  (mocked Prisma) — global-budget path covered separately in `gateway.test.ts` (spy-only, per its own
  comment).
- No E2E test exists for the Stripe/Omie connection panels or for creating/viewing a Stripe charge
  (BILLING-008) — acceptable for a same-day feature addition, but a gap given `tests/e2e/` is the
  project's own bar for "does this really work end to end."

## Integration

- Stripe: real, honest, narrow (manual one-off `PaymentIntent` creation/lookup + connection
  management). Not a subscription/checkout integration, not linked to any CRM entity, no webhook.
- Omie: real, honest, narrow (customer create/update only — `IncluirCliente`). Does not touch Omie's
  invoicing/nota fiscal APIs at all, so it cannot currently serve as the "fonte homologada de
  faturamento" that `billingRevenue.agent.ts` requires before it will report a "faturado" number —
  worth noting since Omie is precisely the kind of ERP source that agent's prompt anticipates.
- No inbound webhook handling exists for Stripe (or any payment provider) anywhere in the codebase
  (BILLING-007).

## Product

- The product currently has no way to answer "what plan is this customer on" or "did this customer
  actually pay us" from inside the application — which is a reasonable, deliberate state for an
  internal tool that isn't (yet) self-serve SaaS, but is worth flagging explicitly since the domain
  brief for this audit is billing/monetization readiness.
- The "Cota Mensal de Tokens" widget (BILLING-004) actively works against that honesty: it presents
  a specific, plausible-looking number ("5.000.000 tokens/mês", "Limite contratual estimado") right
  next to a banner that says "não há plano nem assinatura configurados no sistema" — an internal
  contradiction on the same screen that could mislead a GESTOR/ADMIN reading it quickly.

## Mock/Fake/Placeholder

- **`Billing.tsx` "Cota Mensal de Tokens" card** (lines ~196-227) — hardcoded `5000000` denominator
  presented as "Limite contratual estimado", identical for every organization, with no backing
  config value anywhere (BILLING-004). This is the one clear instance in this domain of the audit's
  "hardcoded demo numbers" pattern.
- `BillingRevenueAgent` (`src/features/intelligence/agents/billingRevenue.agent.ts`) is explicitly
  and correctly a non-mock: its entire prompt contract is designed to refuse to answer "faturado"
  rather than fabricate it. Confirmed by reading the full prompt — flagged here only to record that
  it was checked and found to behave as documented, not as a defect.

## Dead/Orphan code

- `createStripeCharge` / `getStripeCharge` (`stripe.service.ts` + `stripe.routes.ts`) — implemented,
  tested, RBAC-gated, but zero callers anywhere in `src/` outside their own route file (BILLING-005).
- `upsertOmieCustomer` (`omie.service.ts` + `omie.routes.ts`) — same pattern (BILLING-006).

## Quick wins

- Add a small admin-only form (or extend an existing organization-settings screen) to read/write
  `Organization.monthlyAiBudgetUsd` — the enforcement already exists and is tested; only the write
  path from the UI is missing (BILLING-001).
- Replace the hardcoded `5000000` in `Billing.tsx` with either (a) a real per-org config value, or
  (b) remove the "Cota Mensal" card entirely until such a value exists, to stop contradicting the
  page's own "sem plano configurado" banner (BILLING-004).
- Either wire `createStripeCharge`/`getStripeCharge` into a UI action (e.g., a "cobrar" button on a
  `Fatura` document) or remove the unused endpoints — cheap either way, and removing them shrinks
  the unauthenticated-by-obscurity attack surface at zero product cost if they truly aren't planned
  for near-term use (BILLING-005).

## Structural problems

- Two independent, hand-rolled monthly-spend-cap implementations (`src/lib/ai/budget.ts`,
  `src/features/prospecting/services/providerBudget.ts`) with near-identical shape but no shared
  abstraction — see Architecture section. Not urgent, but the root cause of why a third paid
  integration (Birth Voice) was never given the same protection (BILLING-002).

## Needs verification

- **BILLING-N1** — Whether any operational/support process outside this codebase (e.g., a manual
  script, a support runbook) currently sets `Organization.monthlyAiBudgetUsd` in production. Grep of
  `src/`, `scripts/`, and `.agents/` found no such script, but a runbook or one-off SQL outside the
  indexed tree cannot be ruled out from static analysis alone. Confidence: MEDIUM.
- **BILLING-N2** — Whether Bland (the Birth Voice provider) is in fact billed per-minute/per-call in
  this deployment (vs. a flat contract that would make BILLING-002 lower priority). The code's own
  `durationSeconds`/`providerCallId` tracking suggests billing-relevance was anticipated, but no
  pricing contract or invoice was available to confirm the actual commercial terms. Confidence:
  MEDIUM.

## Complete findings list

### BILLING-001 — Real per-organization AI budget cap has no admin UI (BACKEND ONLY)

- **Category**: TD-BILLING, TD-CONFIG
- **Severity**: HIGH
- **Priority**: P2
- **Confidence**: HIGH
- **Status**: CONFIRMED
- **Effort**: S
- **Evidence**: `Organization.monthlyAiBudgetUsd` (`prisma/schema.prisma:911`, migrated in
  `prisma/migrations/20260827210000_onda42_decisoes_schema/migration.sql:29`) is read and enforced
  in `src/lib/ai/budget.ts` (`getOrgAiBudgetUsd`, `assertOrgAiBudgetNotExceeded`) — a real 429
  (`AiOrgBudgetExceededError`) is thrown when an organization's monthly AI spend meets its
  configured cap. A repository-wide grep for `monthlyAiBudgetUsd` outside `src/lib/ai/**` returns
  zero results in `src/features/**` — no controller, use case, or React component ever writes this
  field.
- **Expected**: An ADMIN should be able to view and set their organization's monthly AI budget from
  within the product (e.g., alongside the "Consumo de IA" screen, which already shows the org's
  actual spend).
- **Actual**: The field can only be set via direct database/SQL access; the enforcement is real but
  invisible and unconfigurable from the application itself.
- **Root cause**: The field was added (DEC-09, onda 42) to close the enforcement gap, but the
  corresponding admin-facing write path was apparently out of scope for that change and was never
  picked up afterward.
- **Business impact**: An organization cannot self-serve set or discover its own AI spend cap; any
  change requires an engineer with database access, and there is no visibility for an ADMIN into
  whether a cap is even configured for their org.
- **User impact**: An ADMIN/GESTOR sees the "Consumo de IA" cost figures but has no way to explain
  or influence why AI calls might suddenly start failing with a 429 once a cap (that they cannot see)
  is reached.
- **Suggested resolution**: Add a `PATCH`-style endpoint + admin-only UI control (small form or
  inline edit) to read/write `monthlyAiBudgetUsd`, reusing the existing RBAC pattern
  (`requireRole(['ADMIN'])`) already used for `/api/usage`.
- **Files**: `prisma/schema.prisma`, `src/lib/ai/budget.ts`, `src/features/billing/components/Billing.tsx`

### BILLING-002 — Telephony (Birth Voice/Bland) consumption has no cost tracking or budget governance

- **Category**: TD-BILLING, TD-INTEGRATION
- **Severity**: HIGH
- **Priority**: P2
- **Confidence**: MEDIUM
- **Status**: CONFIRMED (structural gap), NEEDS_VERIFICATION (actual Bland pricing model — see
  BILLING-N2)
- **Effort**: M
- **Evidence**: `VoiceCallLog` (`prisma/schema.prisma:2789-2815`) records `durationSeconds` and
  `providerCallId` per call (both are the raw ingredients needed for cost estimation), but a
  repository-wide grep for `assertVoiceBudget`/`voiceBudget`/`BlandBudget`/`blandCost` and any
  cost-estimation function under `src/features/integrations/birth-voice/**` returns nothing. By
  contrast, the two other paid, metered external call sites in the same codebase — the AI gateway
  (`src/lib/ai/budget.ts`) and Apollo/Hunter prospecting
  (`src/features/prospecting/services/providerBudget.ts`) — both compute a real per-call cost and
  enforce a per-organization monthly ceiling.
- **Expected**: Given the product already has two working patterns for "estimate cost of an external
  paid call, enforce a per-org monthly ceiling," a third real paid external API (telephony) should
  follow the same pattern.
- **Actual**: Voice call duration is logged for operational/UX purposes (transcripts, summaries) but
  never translated into a cost figure, never rolled into the "Consumo de IA" screen (which is
  AI-only despite its broader "consumption" framing), and never checked against any ceiling.
- **Root cause**: The Birth Voice integration was likely built for its functional value (calling,
  transcription) without carrying over the budget-governance pattern already established for AI and
  prospecting providers.
- **Business impact**: If Bland is billed per-minute (unverified — see BILLING-N2), an organization
  (or a runaway automation) could generate unbounded real-world cost with zero visibility or circuit
  breaker, unlike every other paid provider in the platform.
- **User impact**: None directly visible to end users; the risk is entirely to the platform
  operator's cost exposure.
- **Suggested resolution**: Add `estimateVoiceCallCostUsd(durationSeconds)` plus an
  `assertVoiceBudgetNotExceeded()` guard mirroring `providerBudget.ts`, and surface call cost in the
  "Consumo de IA" screen (or a renamed "Consumo" screen that also covers voice).
- **Files**: `prisma/schema.prisma` (`VoiceCallLog`), `src/features/integrations/birth-voice/*`,
  `src/lib/ai/budget.ts` (pattern reference), `src/features/prospecting/services/providerBudget.ts`
  (pattern reference)

### BILLING-003 — Invoice "Pago" status is a free-form manual transition with no reconciliation

- **Category**: TD-DATA, TD-BILLING
- **Severity**: HIGH
- **Priority**: P2
- **Confidence**: HIGH
- **Status**: CONFIRMED
- **Effort**: M
- **Evidence**: `CrmDocumentType` includes `Fatura` and `CrmDocumentStatus` includes `Pago`
  (`prisma/schema.prisma:112-136`). The transition is performed by a generic
  `updateDocumentStatus(organizationId, documentId, status)` (`Crm360UseCases.ts:91`,
  `PrismaCrm360Repository.ts:888`) exposed at `PUT /api/crm360/documents/:id/status`
  (`crm360.routes.ts:70`) behind `requireRole(['ADMIN','GESTOR','CLOSER','SDR'])` — i.e. any
  commercial role, not a finance-specific one — and driven from the UI by a plain "next status"
  button list in `PropostaDetail.tsx` (`STATUS_TRANSITIONS.Aceito = ['Pago', 'Cancelado']`). No
  field on `CrmCommercialDocument` references a Stripe `paymentId`, an Omie invoice/boleto id, or any
  other external reconciliation record; a grep for `stripe`/`Stripe` inside `src/features/crm360/**`
  and `documentSignature.ts` returns zero results.
- **Expected**: A "Paid" status on a financial document (invoice) should be backed by, or at least
  cross-checked against, some external evidence of payment (a Stripe charge id, an Omie financial
  record, a bank reconciliation import) — or, short of that, be restricted to a role with financial
  authority.
- **Actual**: Any SDR/CLOSER on the deal can mark a `Fatura` as `Pago` with a single click, with
  nothing behind it but their own assertion.
- **Root cause**: `CrmCommercialDocument`'s status machine was built as a generic
  proposal/quote-approval workflow (`Rascunho → Enviado → Visualizado → Aceito/Recusado`) and `Pago`/
  `Vencido`/`Cancelado` were added onto the same generic transition mechanism without a
  finance-specific gate, likely before Stripe/Omie existed to reconcile against.
- **Business impact**: Any revenue/pipeline reporting that trusted `Pago` as ground truth would be
  reporting self-attested, unverified data — a real risk for forecast accuracy or compliance if this
  status is ever wired into a dashboard. (Confirmed NOT currently wired into
  `revenueIntelligence`/forecast code — see Info section — so today's blast radius is limited to the
  CRM360 document list/detail views themselves.)
- **User impact**: A GESTOR reviewing "which invoices are paid" in CRM360 has no way to distinguish a
  verified payment from an optimistic/incorrect status set by a rep.
- **Suggested resolution**: Either (a) gate the `Pago` transition to `ADMIN`/`GESTOR` only and require
  a reference field (Stripe payment id / Omie doc id / manual note), or (b) build the natural
  integration point implied by BILLING-005/BILLING-006 — auto-transition to `Pago` when a linked
  Stripe `PaymentIntent` succeeds.
- **Files**: `prisma/schema.prisma`, `src/features/crm360/application/Crm360UseCases.ts`,
  `src/features/crm360/infra/PrismaCrm360Repository.ts`, `src/features/crm360/routes/crm360.routes.ts`,
  `src/features/crm360/components/PropostaDetail.tsx`

### BILLING-004 — "Cota Mensal de Tokens" widget hardcodes a fake 5,000,000-token contractual limit

- **Category**: TD-MOCK, TD-BILLING
- **Severity**: MEDIUM
- **Priority**: P2
- **Confidence**: HIGH
- **Status**: CONFIRMED
- **Effort**: XS
- **Evidence**: `src/features/billing/components/Billing.tsx:196-227`. The literal `5000000` appears
  five times as the denominator for a progress bar labeled "Cota Mensal de Tokens (IA & SDR)" with
  subtitle "Limite contratual estimado de 5.000.000 tokens/mês". No prop, API field, or config value
  supplies this number — it is a JSX literal, identical for every organization regardless of actual
  contract or of the real, per-org `Organization.monthlyAiBudgetUsd` cap (which is USD-denominated,
  not token-denominated, and is a different number entirely). Not covered by
  `tests/unit/features/billing/components/Billing.test.tsx` (no assertion on this text/number), so
  nothing currently locks this value in place.
- **Expected**: Given the page's own info banner two sections above states "Não há plano nem
  assinatura configurados no sistema," a specific "contractual limit" figure should not appear
  anywhere on the same screen.
- **Actual**: The screen contradicts its own disclosed honesty within the same view.
- **Root cause**: Likely a leftover from an earlier design/demo iteration of this screen that
  predates (or was never reconciled with) the "this is not billing" clarification documented in
  `.claude/PILOTS.md` Pilot 022.
- **Business impact**: Low direct impact (informational only), but reputational/trust risk if a
  customer-facing GESTOR takes the "5.000.000 tokens/mês" figure at face value and later discovers no
  such contract term exists.
- **User impact**: Misleading self-service signal — a GESTOR at 95% of this fake bar might believe
  they are about to be cut off, when the real (and only) enforcement mechanism is the USD-based
  `monthlyAiBudgetUsd` cap, which they cannot see on this page at all.
- **Suggested resolution**: Remove the card, or replace the fixed denominator with a real per-org
  value once BILLING-001 gives one a home; in the meantime, at minimum drop the word "contratual" and
  the specific number.
- **Files**: `src/features/billing/components/Billing.tsx`

### BILLING-005 — `createStripeCharge`/`getStripeCharge` are BACKEND ONLY (no UI consumer)

- **Category**: TD-IMPL, TD-DEAD
- **Severity**: MEDIUM
- **Priority**: P3
- **Confidence**: HIGH
- **Status**: CONFIRMED
- **Effort**: XS (to remove) / M (to wire up)
- **Evidence**: `stripe.service.ts:183-241` implements `createStripeCharge`/`getStripeCharge`,
  exposed at `POST /api/integrations/stripe/connections/:connectionId/charges` and
  `GET .../charges/:paymentId` (`stripe.routes.ts:68-106`), both role-gated and unit-tested
  (`stripe.service.test.ts`). A repository-wide grep for `createStripeCharge`/`getStripeCharge`
  outside `stripe.service.ts`/`stripe.routes.ts` returns zero results — `useStripeIntegration.ts`
  (the hook backing the only UI, `StripeConnectionPanel.tsx`) implements only
  connect/disconnect/test, never charge creation or lookup.
- **Expected**: A tested, role-gated write endpoint for a core business action (charging a customer)
  should have a UI entry point, or a documented reason it doesn't yet (e.g., "reserved for a future
  agent tool binding").
- **Actual**: Fully functional, unreachable from the product.
- **Root cause**: Likely built ahead of the UI as part of the same commit that added the connector,
  with the charge-creation UI deferred to a later iteration that hasn't landed yet.
- **Business impact**: None currently (dead code doesn't cost anything at rest), but it is an
  unused, tested surface that adds review/maintenance burden and could bit-rot silently.
- **User impact**: None — feature is invisible.
- **Suggested resolution**: Either wire a "cobrar" action into `Fatura`/proposal detail views (natural
  fit given BILLING-003), or remove until there's a concrete UI plan.
- **Files**: `src/features/integrations/stripe/stripe.service.ts`,
  `src/features/integrations/stripe/stripe.routes.ts`, `src/hooks/useStripeIntegration.ts`

### BILLING-006 — `upsertOmieCustomer` is BACKEND ONLY (no UI consumer)

- **Category**: TD-IMPL, TD-DEAD
- **Severity**: MEDIUM
- **Priority**: P3
- **Confidence**: HIGH
- **Status**: CONFIRMED
- **Effort**: XS (to remove) / M (to wire up)
- **Evidence**: `omie.service.ts:187-242` implements `upsertOmieCustomer`, exposed at
  `POST /api/integrations/omie/connections/:connectionId/customers`
  (`omie.routes.ts:68-79`), role-gated and unit-tested (`omie.service.test.ts`). Grep for
  `upsertOmieCustomer` outside `omie.service.ts`/`omie.routes.ts` returns zero results;
  `OmieConnectionPanel.tsx` has no reference to customers or this endpoint.
- **Expected/Actual/Root cause/Impact**: Same pattern as BILLING-005.
- **Suggested resolution**: Wire into Company/Contact creation (auto-sync a new CRM company to Omie
  as a customer) or remove until planned.
- **Files**: `src/features/integrations/omie/omie.service.ts`, `src/features/integrations/omie/omie.routes.ts`,
  `src/features/integrations/omie/components/OmieConnectionPanel.tsx`

### BILLING-007 — No Stripe (or any payment-provider) webhook receiver exists

- **Category**: TD-INTEGRATION, TD-IMPL
- **Severity**: MEDIUM
- **Priority**: P3
- **Confidence**: HIGH
- **Status**: CONFIRMED
- **Effort**: M
- **Evidence**: Repository-wide grep for `stripe.*webhook|webhook.*stripe|constructEvent|STRIPE_WEBHOOK`
  across `src/**` returns zero results. `createStripeCharge`'s own doc comment
  (`stripe.service.ts:154-158`) acknowledges that without a `paymentMethodId`, a `PaymentIntent` is
  created but stays `requires_payment_method` — there is no mechanism (webhook or otherwise) for the
  system to ever learn that it later succeeded, was confirmed via 3-D Secure, was refunded, or was
  disputed, other than a manual call to `getStripeCharge` (itself uncalled — see BILLING-005).
- **Expected**: Any real payment integration needs an inbound webhook to receive asynchronous status
  changes, since not all payment confirmations complete synchronously in the request/response cycle.
- **Actual**: None exists.
- **Root cause**: The Stripe integration was scoped narrowly (manual charge creation/lookup only) and
  a webhook was out of scope for this pass.
- **Business impact**: Currently low (the charge-creation flow itself is unused — BILLING-005), but
  this is a prerequisite gap that must be closed before this integration could safely be used for any
  charge that isn't guaranteed to synchronously succeed.
- **Suggested resolution**: Add a `POST /api/integrations/stripe/webhook` route with signature
  verification (`stripe-signature` header + webhook secret, stored like the other connection
  secrets) before any charge-creation UI is built on top of this connector.
- **Files**: `src/features/integrations/stripe/stripe.service.ts`, `src/features/integrations/stripe/stripe.routes.ts`

### BILLING-008 — No E2E coverage for Stripe/Omie connection panels

- **Category**: TD-TEST
- **Severity**: LOW
- **Priority**: P3
- **Confidence**: HIGH
- **Status**: CONFIRMED
- **Effort**: S
- **Evidence**: `grep -rln "stripe\|omie" tests/e2e` returns no results; coverage is unit-only
  (`stripe.service.test.ts`, `omie.service.test.ts`).
- **Expected**: Given the project's own bar (per `CLAUDE.md` §4 rule 10 and `tests/e2e/`), a new
  integration panel would ideally get at least a smoke E2E test (connect happy path, RBAC-gated
  buttons disabled for non-managers).
- **Actual**: None yet — reasonable for a same-day addition, flagged as backlog.
- **Suggested resolution**: Add a Playwright spec analogous to existing integration panel coverage
  once one exists for a comparable connector (e.g., 3CX/Slack), following the same pattern.
- **Files**: `tests/e2e/**` (absence), `src/features/integrations/stripe/components/StripeConnectionPanel.tsx`,
  `src/features/integrations/omie/components/OmieConnectionPanel.tsx`

### BILLING-009 — `estimateCostUsd` silently defaults unknown models to `local-llama3-fast` pricing

- **Category**: TD-DATA, TD-BILLING
- **Severity**: LOW
- **Priority**: P4
- **Confidence**: HIGH
- **Status**: CONFIRMED
- **Effort**: XS
- **Evidence**: `src/lib/ai/gateway/pricing.ts:18-25` —
  `PRICING_PER_MILLION_TOKENS[model] ?? PRICING_PER_MILLION_TOKENS['local-llama3-fast']`, with no
  logging or metric emitted on the fallback branch. Cross-checked against
  `src/lib/ai/gateway/model-routing.ts` — today's canonical/resolved model names all do have entries
  in the pricing table, so this is currently latent, not actively causing miscalculation.
  Confidence is HIGH on the code pattern; the "currently latent" framing is why severity is LOW
  rather than MEDIUM.
- **Expected**: A silent pricing fallback for cost figures that feed a real spend-enforcement
  mechanism (`assertAiBudgetNotExceeded`) should at least log a warning so a future new model
  doesn't silently under/over-count against the budget cap.
- **Actual**: No log, no metric, on the fallback path.
- **Suggested resolution**: Add a `logger.warn` (or a dedicated metric) on the fallback branch in
  `estimateCostUsd`.
- **Files**: `src/lib/ai/gateway/pricing.ts`

## capability_rows

See structured summary.
