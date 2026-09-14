# Feature Debt — Birth Hub 360º

> Organized by how the gap between "advertised" and "real" manifests. A single capability can
> appear once here even if it also has a technical-debt or security angle covered elsewhere
> (`TECHNICAL-DEBT.md`, `PRODUCTION-BLOCKERS.md`) — this file is about product-surface
> completeness, not root cause.

## FEATURE NOT IMPLEMENTED

Capabilities the product implies (by name, by menu entry, or by adjacent capability) that do
not exist at all yet.

- **Pipeline Velocity** — no frontend, backend, or tests exist; the capability matrix marks
  every layer `MISSING`/`NOT_APPLICABLE`. `NOT IMPLEMENTED`.
- **Plans / subscriptions / entitlements** — no plan model, no subscription lifecycle, no
  entitlement enforcement tied to a plan anywhere in the codebase. Everything billing-shaped
  in the product today is AI-spend governance, not customer billing.
- **Bulk re-embedding / model-migration tooling (RAG-005)** — if the embedding model ever
  changes, there is no tooling to re-embed the existing Knowledge Base corpus.
- **Attachments (CRM)** — no frontend, backend, database, or tests; a CRM-core capability
  entirely absent despite being table-stakes for the category.
- **Telephony consumption cost tracking** — no cost visibility for voice/telephony usage,
  unlike the mature AI-spend metering that exists for LLM usage.
- **Voice-provider billing/cost visibility** — same gap from the billing domain's perspective;
  cross-listed because it was independently confirmed by both the VOICE and BILLING audits.

## FEATURE PARTIALLY IMPLEMENTED

Real, used capabilities with a confirmed hole in coverage, correctness, or scope.

- **Search & Filtering (CRM)** — functional overall, but silently fails on `Lead.title` due to
  a missing Meilisearch `searchableAttributes` entry (CRM-001).
- **Deduplication / Merge (CRM)** — frontend missing, backend mocked, only a database-level
  partial exists; the one real implementation (`LeadDeduplicationService`) is orphaned and
  unsafe (CRM-002/003).
- **Notes (Lead only)** — partial across every layer; not extended to Company/Contact despite
  those entities existing in the same CRM core.
- **Tags & Custom Fields** — partial across frontend/backend/database with no observability or
  documentation.
- **Owners / Permissions** — partial and inconsistent across sibling entities (CRM-007/009).
- **MRR/ARR recurring-revenue + sold-vs-billed reconciliation** — frontend/backend partial,
  database and integration missing; effectively a placeholder reusing a "new business" sales
  target under a recurring-revenue label (REVOPS-002/003).
- **Guardrails (PII redaction, prompt-injection, LGPD consent)** — real and tested at the
  mechanism level, but the redaction regex set has confirmed coverage gaps (AIAGENT-006) and
  LGPD consent is a global env var with no per-tenant audit trail.
- **Voice-call consent-to-record LGPD compliance** — partial; consent detection mechanism is
  solid but the erasure path (VOICE-003) and encryption-at-rest (VOICE-004) are incomplete.
- **3CX PABX Click-to-Call + Call Flow webhook** — partial; extension-based tenant resolution
  is an unresolved O(n) scan with a silent-discard collision case (INTEGRATION-004).
- **Object storage tenant isolation (S3-compatible)** — partial backend, confirmed CRITICAL
  break in tenancy/security for one specific flow (TENANT-001).
- **Per-org / global AI spend circuit breaker** — backend/enforcement complete and tested, but
  no admin UI exists to configure `monthlyAiBudgetUsd`, and a global cap still interferes with
  per-org limits.
- **LGPD data-subject rights (erase/export) + audit** — core complete, but the voice/copiloto
  path has a confirmed erasure gap (VOICE-003).
- **Global platform config vs per-tenant admin role separation** — partial; the AI-settings
  route gap (TENANT-002) is the concrete manifestation.
- **Automation trigger: "Lead sem interação"** — present in 3 type lists but has no backing
  Prisma enum value; unreachable by construction (WORKFLOW-003).

## FRONTEND ONLY

Capabilities where UI exists (fully or partially) but the backend/data layer does not support
what the UI implies.

- **Bitrix-mirrored commercial fields** — frontend `MISSING` while backend is `PARTIAL` and
  database is `COMPLETE` — actually the inverse pattern (data exists, no UI), listed here
  because it is the frontend gap that is user-visible: fields captured from Bitrix have
  nowhere to be reviewed/edited in-app.
- **Hub Executivo module content (5 modules)** — frontend `FUNCTIONAL`, backend `MISSING` —
  purely static content with no real backend behind it, and confirmed cross-tenant exposure
  plus 2 fully broken sub-features (FRONTEND-002/003).
- **Legacy static "tool hub" screens (`/tools/**`, `/design-lab`)** — frontend partial, backend
  missing, and confirmed unauthenticated (FRONTEND-001) — this is simultaneously a
  frontend-only gap and a production blocker.
- **Billing.tsx hardcoded contractual-limit widget** — a UI element with no corresponding
  backend plan/entitlement concept behind it (BILLING-002/003).

## BACKEND ONLY

Capabilities where real backend logic exists with no UI (or an unreachable one) surfacing it.

- **Commercial Cell — 5 unrouted agents + `BillingRevenueAgent`** — backend `COMPLETE`,
  frontend `MISSING`, automation `MISSING` — fully coded, unreachable (AIAGENT-001/009).
- **n8n outbound webhook dispatcher** — backend `COMPLETE`, confirmed zero production callers
  — dead code with no UI or trigger ever wired to it (WORKFLOW-002).
- **`Prospect` data model / application layer** — schema exists; no application code, no UI,
  no route (PRODUCT-001).
- **Stripe `createStripeCharge`** — backend endpoint exists; not wired into any Fatura
  "cobrar" action in the UI (BILLING-007).

## MOCKED

Capabilities that present as real to a user but are backed by a placeholder, manual input, or
fabricated data.

- **Deduplication / Merge (CRM)** — backend mocked (see above).
- **Account-level Churn / Health Score (AI Suite manual tool)** — manual-input simulator with
  no real data grounding, confusingly sharing a name with the Cockpit's real Health Score
  (AIAGENT-002).
- **Meilisearch full-text branch for Knowledge Base** — configurable in settings but has no
  indexer; activating it would silently fabricate relevance scores (RAG-001).
- **Agent long-term memory (mem0/Qdrant)** — write side unimplemented; the one production read
  call is a permanent no-op (RAG-002).
- **Chatwoot inbound webhook** — integration mocked.
- **Inbound email reply / gov.br signature (stub transports)** — documented, intentional stub;
  kept here for completeness even though it is disclosed rather than silent.
- **Invoice (Fatura) lifecycle / paid-status reconciliation** — self-attested paid status,
  confirmed (BILLING-004).
- **Billing/Usage persistence testing** — the test suite itself is mock-only for this surface,
  meaning the "tested" signal for billing persistence is not real.
- **Android native test coverage** — unmodified boilerplate (`assertEquals(4, 2+2)`); a
  passing test suite that tests nothing.

## DISCONNECTED

Real, working pieces on both ends that are simply never plugged into each other.

- **Connectors x automation engine (Slack/Stripe/Omie as automation actions)** — frontend and
  backend both functional independently; automation engine cannot invoke any of them.
  `DISCONNECTED (confirmed)`.
- **n8n outbound webhook dispatcher** — see BACKEND ONLY above; also disconnected in the sense
  that nothing in the product ever decided to call it.
- **Weekly automated Win/Loss Analysis** — computes a real result every week and then discards
  it instead of persisting/surfacing it (REVOPS-004).

## ABANDONED

Capabilities that were clearly started, then dropped without cleanup.

- **OPA tenancy policy (`tenancy.rego`)** — dead, with an already-open handoff to remove or
  connect it; nothing currently evaluates it.
- **`dailyReport.worker.ts`** — runs with no producer, performs a simulated (non-real) action;
  neither finished nor removed.
- **Legacy pre-rebrand `ROADMAP_FINALIZACAO_PLATAFORMA.html`** — stale, unreferenced, carries
  the old brand's visual identity.
- **Two-brand (AtlasGR/Total Trac) selector UI (`SelectionScreen.tsx`)** — no longer exists;
  `/select-brand` survives only as a redirect, a clean example of a properly-abandoned
  feature (contrast with DOCBRAND's *incompletely* abandoned migration artifacts, tracked in
  `LEGACY-BRAND-DEBT.md`).

## DOCUMENTED BUT MISSING

Capabilities the codebase's own documentation describes as if real, that are not.

- **`.claude/CLAUDE.md §1`'s two-key playbook selector** — describes the retired
  `atlasgr`/`totaltrac` runtime brand switch as if still live; the real model today is a
  single `geral` playbook key (DOCBRAND-004).
- **`LEGACY_BRAND_CONTENT_MAP.md §2.3`** — describes `getTenantFromEmail()`, a function that no
  longer exists in `access-policy.ts` (DOCBRAND-014).
- **Prisma schema comment on Lead funnel/deal-mirror fields** — claims those fields are
  unread/unwritten by `PrismaLeadRepository`; the code has since changed (CRM-012).
- **`capability-catalog.ts` descriptions for `agent.execute`/`agent.request_cross_role`** —
  describe availability/verification status that does not match `tool-bindings.ts`
  (AIAGENT-007/010).
- **`charts/README.md` / `argocd/README.md`** — describe a Kubernetes/ArgoCD deploy trigger
  that does not match the real, active `render.yaml` trigger (DEVOPS-004).
- **`README.md`'s ESLint references** — the project runs Biome (`lint`/`lint:fix` call
  `biome lint`); ESLint is not the active linter for those scripts (DOCBRAND-009/010).
- **Billing-revenue reconciliation (vendido x faturado)** — explicitly self-documented as a
  placeholder; the one item in this file that is *disclosed* rather than silently missing —
  included for completeness of the "documented" half of this category.

---

**Cross-reference:** every ID above also appears in `MASTER-DEBT-BACKLOG.md` with its
priority/severity assignment. Counts feeding the executive synthesis: **34 feature-debt items**
across the eight buckets above (some items are cross-listed in 2 buckets where the pattern
genuinely spans both, e.g. Object storage tenant isolation appears once here and once in
`PRODUCTION-BLOCKERS.md`).
