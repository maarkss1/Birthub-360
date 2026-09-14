# Implementation Debt — Birth Hub 360º

> Answers one question: **what was started but never finished?** Distinct from
> `FEATURE-DEBT.md` (which asks "is the feature real from a user's point of view") — this file
> traces the engineering work itself: what got built, how far it got, and exactly what step
> was skipped to call it done.

## Pattern 1 — Built, tested, never connected (RC-02)

The most common shape of unfinished work in this codebase: a class, worker, or agent is
**fully implemented and sometimes unit-tested**, but has zero production callers.

| What was built | What's missing | Finding |
|---|---|---|
| `ManagerCommercialAgent`, `ExecutiveDirectorAgent` (+ 4 more Commercial Cell agents), `BillingRevenueAgent` | A route + DI registration mirroring the existing churn-retention/contract-signature pattern | AIAGENT-001, AIAGENT-009 |
| n8n outbound webhook dispatcher | Any caller at all — confirmed zero production callers | WORKFLOW-002 |
| `Prospect` data model + repository | An application layer, a route, a UI | PRODUCT-001 |
| `createStripeCharge` endpoint | Wiring into a "cobrar" action on Fatura detail views | BILLING-007 |
| `LeadDeduplicationService.deduplicateByEmail` | Never finished — and should stay unfinished until its hard-delete/tenant-bypass pattern is fixed | CRM-002/003 |

**What this means structurally:** the codebase's review process catches "does this compile
and pass its own tests" reliably, but has no equivalent check for "is this code ever called in
production." A lightweight dead-code/unreferenced-export check (even a manual quarterly pass)
would have caught every row above before merge.

## Pattern 2 — Scaffolded with a placeholder, real integration never built (RC-01)

A feature was built end-to-end using a hardcoded stand-in for its real data source or
integration, frequently without any UI label telling the user it's not real yet.

| Feature | Placeholder in place of | Finding |
|---|---|---|
| MRR/ARR recurring-revenue | Real subscription/billing data — reuses a "new business" sales target instead | REVOPS-002 |
| `BillingRevenueAgent` reconciliation | A real vendido-x-faturado data pipeline | REVOPS-003 |
| Fatura (invoice) paid status | Payment gateway reconciliation | BILLING-002/003/004 |
| Chatwoot inbound webhook, inbound email reply / gov.br signature | Live transports | INTEGRATION-008 |
| `dailyReport.worker.ts`'s report-send action | A real email send | WORKFLOW-001 |
| Account-level Churn/Health Score "AI Suite" tool | Real account data grounding (currently manual input only) | AIAGENT-002 |

**What this means structurally:** these are not bugs in the placeholder logic itself — the
placeholders mostly work as designed. The debt is that "placeholder" was never a tracked
state with an expiry or a required UI disclosure. Several of these (MRR/ARR, Fatura) are
now load-bearing enough in the product's Revenue Intelligence and Billing story that a
customer could reasonably be misled about what the number means.

## Pattern 3 — Catalog built ahead of the substance behind it (RC-05)

The 391-agent job-roles catalog is implementation debt at scale: the catalog structure,
authorization, and routing mechanism are complete and correct, but the thing the catalog
describes — an executable AI agent per row — is real for a small minority of rows.

- `agent.execute` is granted to all 391 agents; the tool executor behind it is permanently
  blocked past its own documented blocker (AIAGENT-004).
- 93% of catalog agents have no prompt content at all (AIAGENT-003).
- The runtime never invokes an LLM for any agent — it is a deterministic dispatcher over 22
  real tool operations (AIAGENT-004).
- ~27 agents already have `PROMPT_READY` status and real prompts — these are the closest to
  finished and the highest-leverage next step (see the AIAGENT-004 quick win in
  `QUICK-WINS.md`).

**What this means structurally:** this is architecture-first, content-second development at a
scale where the gap compounds — every new agent added to the catalog widens the nominal/real
gap unless the execution path is finished first. This is the single largest "started but not
finished" item in the entire audit by scope.

## Pattern 4 — Tenancy pattern proven once, not propagated (RC-03)

A correct, rigorous tenant-isolation pattern exists (Lead/CRM core: RLS + Prisma extension),
but every module built after it independently re-derived its own boundary — sometimes
correctly, sometimes not.

- Finished correctly: Lead/Company/Contact CRUD, Pipeline/Kanban, Forecast/Revenue
  Intelligence, Bitrix24, WhatsApp.
- **Not finished / re-derived incorrectly:** Copiloto IA object storage (TENANT-001,
  CRITICAL), AI settings route (TENANT-002), Hub Executivo grants (PRODUCT-004), Voice/Birth
  Voice tenant-scoped branding (VOICE-001), 3CX extension resolution (INTEGRATION-004), and 4
  further sibling modules (TENANT-005/006/007/008).

**What this means structurally:** the fix that would have prevented most of this list already
exists in the codebase (the Lead/CRM RLS + Prisma-extension pattern) — the debt is that it was
never extracted into a mandatory, reused primitive that new modules are required to adopt.

## Pattern 5 — Rebrand started, not finished, reverted inconsistently (RC-07)

The AtlasGR/Total Trac → Birth Hub 360º rebrand is genuinely in-flight, not complete, and a
same-branch commit partially reverted it:

- A cohesive rebrand commit changed a set of files together; a later commit reverted some of
  those files back to the old scheme while leaving others on the new scheme, with no
  compensating data migration (DOCBRAND-001/007/008/013).
- The concrete, confirmed consequence: a `moduleKey` mismatch (`treinamento-atlasgr` vs.
  `treinamento-birthub360`) that silently fails-closed on module access (DOCBRAND-011) — this
  is unfinished-migration debt that became a live access-control bug.
- `.claude/CLAUDE.md` itself — the project's own source of truth — still describes the retired
  two-key playbook selector as if live (DOCBRAND-004).

**What this means structurally:** a multi-file, semantically-linked change (a rebrand) was not
executed as an atomic, verifiable unit — nothing in CI checks "every file that mentions brand
key X is internally consistent." See `LEGACY-BRAND-DEBT.md` for the full inventory.

## Pattern 6 — Observability helper built, never made mandatory (RC-11)

`registerQueueForMetrics` is a real, working helper used by 10 core-infrastructure queues.
15 of ~25 product-feature queues (follow-up, dedup, cadence, LGPD, forecast — the queues the
business most directly depends on) never call it, so queue depth is invisible until a job
dead-letters (WORKFLOW-004). Production itself has no working scrape path at all (DEVOPS-003).

**What this means structurally:** identical to Pattern 4 (tenancy) in shape — a correct
pattern exists, was never made structurally default for new code, and the debt accumulated
silently because nothing fails loudly when a new queue skips it.

---

**Summary:** the dominant implementation-debt story in this codebase is not "code that doesn't
work" — confirmed correctness bugs are a minority of findings. It is **finished components
that were never connected to a caller**, **placeholders that were never labeled or replaced**,
and **correct patterns that were proven once and never made mandatory for what came after**.
All three are process/discipline gaps, not skill gaps — the same engineers who built the
correct pattern (RLS core, metrics helper, agent routing) are the ones who didn't reuse it
downstream, most plausibly because nothing enforced reuse.
