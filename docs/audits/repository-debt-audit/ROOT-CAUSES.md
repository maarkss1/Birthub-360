# Root-Cause Analysis — Repository Debt Audit

This document groups every deduped finding (see the full list returned by the audit) by the
**structural cause** that produced it, rather than by which domain specialist found it. Many
findings recur across 2-4 "root causes" because they are downstream symptoms of more than one
structural pattern; they are listed once, under the cause that explains the *origin* of the debt,
with cross-references noted where relevant.

Audit date: 2026-09-12. Branch: `fix/fase1-alta-prioridade`. This file is part of the audit
deliverable only — no application code, config, schema, or dependency was modified to produce it.

---

## RC-01 — Mock-first implementations that were never replaced with the real thing

Pattern: a feature was scaffolded end-to-end (UI, route, DB field, or worker) using a hardcoded
placeholder or manual-input stand-in "to unblock the flow," and the real data source/integration
that was supposed to follow was never built, with no compensating label telling the user it's a
placeholder.

- RAG-001 — Meilisearch `knowledge_chunks` branch queries a non-existent index; if ever populated,
  fabricates similarity scores.
- RAG-002 — mem0/Qdrant agent memory has a search-only consumer against a store nothing ever
  writes to.
- REVOPS-002 — `GoalMetric.NEW_MRR` and "Fechado" are New Business Bookings, not real MRR/ARR;
  `BillingRevenueAgent` fully coded, confirmed no real billing source, never routed.
- REVOPS-003 — Churn/Health Score AI tool driven entirely by manually-typed inputs, sharing a name
  with the real, data-grounded Health Score used by the Cockpit.
- BILLING-002 / VOICE-007 (merged) — telephony consumption has no cost estimation or budget
  ceiling, unlike the AI gateway and Apollo/Hunter which both have the real pattern.
- BILLING-003 — Invoice "Pago" status is a self-attested one-click transition with no external
  payment evidence.
- BILLING-004 — "Cota Mensal de Tokens" widget hardcodes a fake 5,000,000-token denominator on the
  same screen that discloses no real plan/subscription exists.
- INTEGRATION-008 / BACKEND-008 — inbound email and gov.br e-signature transports remain
  self-documented stubs (receiving side real, provider side stubbed) — tracked, not urgent.
- BACKEND-007 — billing-revenue module honestly reports `missingData`, no fabrication (same root
  cause as REVOPS-002, cited separately for completeness — not urgent, already honest).
- WORKFLOW-001 — `dailyReportWorker` logs "Simulando envio de e-mail" and has no producer.
- AIAGENT-002 — Agent Runtime dispatches purely by capability code; `AgentVersion.systemPrompt` is
  written but never read by any execution path (LLM is never actually invoked).

**Why it recurs**: the codebase's own convention is "build the receiving/detection side first,
plug the real source in later" (explicitly stated intent for INTEGRATION-008/BACKEND-008) — a
reasonable incremental strategy that was applied inconsistently: some placeholders are labeled
loudly in code comments (INTEGRATION-008), others present themselves with the same confidence as a
real computed value in the UI (BILLING-004, REVOPS-003).

---

## RC-02 — Backend/service code built but never wired to a route, job trigger, or DI container

Pattern: a class, worker, or agent is fully implemented (and sometimes even unit-tested) but has
zero callers in production code — either never registered in the DI container, never mounted as an
HTTP route, or never enqueued by any scheduler.

- AIAGENT-004 / PRODUCT-002 / REVOPS-005 / BACKEND-006 (merged, 4-way) — 5 of 12 Commercial Agent
  Cell agents (LDR Intelligence, Coordinator, Manager, Executive Director, Bitrix Guardian) plus
  `BillingRevenueAgent` are registered in `commercialAgentRegistry.ts` but have no route in
  `agent.routes.ts` — confirmed by grep, zero matches outside their own definition files.
- AIAGENT-001 — `agent.execute` capability is granted to all 391 catalog agents but structurally
  denied at authorization step 11 (`capabilityAuthorization.service.ts:378`) because its
  `ToolBinding` is still `FUTURE_TOOL`/`UNVERIFIED`, even though the runtime it was blocking on
  (`agentRuntime.service.ts`, PROMPT 4) is real and already wired into `agentCatalog.routes.ts`
  (`runAgentExecution` import confirmed).
- CRM-002 / CRM-003 — `LeadDeduplicationService` (hard-deletes via its own unaudited
  `new PrismaClient()`) is referenced only by its own test file — not in
  `src/shared/di/container.ts`, not called from any route or worker.
- BILLING-005 / BILLING-006 — `createStripeCharge`/`getStripeCharge` and `upsertOmieCustomer` are
  fully implemented, routed, and unit-tested, but have zero UI consumer.
- BILLING-007 / BACKEND-002 (merged) — Stripe integration has no local persistence of created
  PaymentIntents and no inbound webhook, so any post-creation status change is permanently
  invisible to the system.
- WORKFLOW-002 — `dispatchN8nWebhook` has real implementation (timeout, feature flag, fail-open)
  and zero callers.
- PRODUCT-001 — `Prospect` Prisma model (tenant-scoped, indexed, documented) has zero
  `prisma.prospect` references anywhere in `src/`, confirmed via repo-wide search.
- RAG-005 — Qdrant client fully provisioned, zero product features use it (deliberate per its own
  code comment, but the discovery-context claim of "Qdrant powers vector search" is misleading).
- AIAGENT-009 — `VectorService.ingestDocument` throws unconditionally, confirmed dead since RAG-001
  fix; safe to delete.

**Why it recurs**: this codebase's normal build order is service layer → tests → route, and the
final "route it" step is dropped from the same wave of work often enough that it reads as a
process gap (a wave/onda is considered "done" once the service compiles and has tests, before
product actually decides to ship the route) rather than isolated oversights.

---

## RC-03 — Tenancy/multi-tenant isolation proven in one place, never propagated transversally

Pattern: a correct tenant-isolation pattern exists and is followed rigorously in the module where
it was first built (usually Lead/CRM core), but sibling modules, newer features, or one-off helper
functions built later do not inherit it, because there is no structural (lint/test/schema) gate
forcing the pattern outward.

- TENANT-001 (CRITICAL) — `completeAudioUpload` accepts any non-empty `objectKey` string with no
  validation that it is prefixed `copiloto-ia/${organizationId}/${conversationId}/`, confirmed by
  reading `CopilotoIaController.ts:262-267` and `CopilotoIaUseCases.ts:212-213`
  (`if (!input.objectKey.trim())` is the *only* check) — the worker then signs a download URL for
  whatever key it's given (`transcribeConversation.worker.ts:150`).
- TENANT-002 — `PUT /ai-settings` (explicitly commented "afeta todos os tenants") is gated by
  `requireRole(['ADMIN'])` — a tenant-scoped role — confirmed in `intelligence.routes.ts:583-586`;
  `requirePlatformOperator.ts` exists in the repo and is not used here.
- CRM-007 — Lead has `requireLeadOwnership()`; Company/Contact write routes have no equivalent.
- CRM-009 — `assignLeadRoundRobin` omits `organizationId` from its Lead update `where` clause,
  unlike every other Lead mutation in the same file.
- DATA-003 — 5 central commercial models (Company, Contact, Lead, Activity, Prospect) have
  nullable `organizationId` with no rationale comment, unlike Prompt/AgentMemory/AILog which
  document why nullability is intentional.
- TENANT-005 / TENANT-006 / TENANT-007 / TENANT-008 — LangGraph checkpointer isolation is
  convention-only; `AiEngineSetting` RLS is by-design non-tenant (root of TENANT-002); two parallel
  undocumented tenant-scoping Prisma extensions (`prisma.ts` vs `tenant-prisma.ts`); child-table RLS
  implicitly depends on parent-table policy shape.
- VOICE-008 / INTEGRATION-004 (merged) — 3CX webhook tenant resolution scans all organizations per
  event (O(n)) and silently discards on extension collision between two tenants.
- BACKEND-005 — `/api/usage` leaks a platform-wide `unattributedCalls` counter into every tenant's
  own per-tenant usage report.
- VOICE-001 (CRITICAL, also RC-06) — hardcoded single-tenant voice script is itself a tenancy bug:
  the "tenant" axis (which organization's brand/offer to present) was never plumbed into the one
  code path that clearly needed it.
- PRODUCT-004 / DOCBRAND-002 (also RC-06) — Hub Executivo modules and the Proposta Comercial module
  expose one tenant's (Atlas GR's) own competitive/business content to every other tenant granted
  the module key — a tenancy failure at the content layer, not just branding.

**Why it recurs**: RLS + `organizationId` propagation is enforced centrally for the ~12 core CRM
models (`src/lib/prisma.ts` tenantModels list, confirmed exhaustive for those), but every new
subsystem (Copiloto IA audio pipeline, AI global settings, 3CX webhook, usage reporting, voice
script selection, Hub Executivo static content) re-derives its own authorization boundary instead
of reusing a single audited "assert this belongs to my tenant" primitive.

---

## RC-04 — A security-fix pattern shipped once, not backported to siblings

Pattern: exactly the same class of vulnerability was already fixed correctly in one place in this
codebase, and a newer or sibling code path reintroduces it, provably, because the fix was never
extracted into a shared, reused primitive.

- SEC-002 / BACKEND-001 (merged, CRITICAL-adjacent HIGH) — CORS unconditionally trusts any
  `chrome-extension://` origin with `credentials: true`, confirmed at `src/bootstrap/security.ts:
  139-140`: the `chrome-extension://` branch returns `callback(null, true)` *before and
  independently of* the `ALLOWED_ORIGINS.includes(origin)` check three lines below it — the exact
  origin-allowlist mechanism that protects every other origin in the same file (and that the same
  file's own comment, two lines above, documents fixing for `*.railway.app` for this identical
  class of bug).
- DATA-004 / VOICE-004 (merged) — `ENCRYPTED_MODEL_FIELDS` (confirmed read in full at
  `src/lib/crypto/piiFields.ts:34-54`) covers `Contact`, all integration credentials
  (`SlackConnection`, `StripeConnection`, `OmieConnection`, `VoiceHubConnection`, etc.) and OAuth
  `Account` tokens, but omits `VoiceCallLog` (transcript/summary/recordingUrl),
  `CopilotoTranscriptSegment.text`, `WhatsAppMessage.body`, and `ThreeCXCallEvent.rawPayload` — all
  of comparable or greater sensitivity than what is already encrypted, using the exact same
  transparent Prisma-extension mechanism that would cover them with one line each.
- SEC-001 — `CREDENTIALS_ENCRYPTION_KEY` has a documented, tested, fail-closed production guard
  (`secretFields.ts`); `BETTER_AUTH_SECRET`, sitting right next to it in `env.ts` with a comment
  claiming "the same conditional obligation," has no such guard — confirmed `lib/auth.ts:52` is a
  bare `process.env.BETTER_AUTH_SECRET || undefined`.
- SEC-003 — SSRF guard's private-IP range list predates CGNAT (100.64.0.0/10); the guard mechanism
  itself is otherwise sound and not something to rebuild, just extend.
- SEC-004 — no explicit `minPasswordLength` set; relies silently on a third-party default instead
  of the explicit-and-tested pattern used for other security config in this repo.
- AIAGENT-006 — PII redaction (`guardrails.service.ts`) only matches formatted CPF; a single regex
  where the codebase's own established pattern (multiple field-specific matchers, as in
  `piiFields.ts`) would generalize it.
- TENANT-003 — dead legacy tables locked down correctly today, but only via a migration comment,
  not a schema-level guard against a future developer reactivating them unsafely.

**Why it recurs**: this project does not have a single canonical "how we do CORS/encryption/secret
validation" helper documented and enforced by a test — each fix is applied to the file where the
bug was found, not extracted so the next similar file inherits it automatically.

---

## RC-05 — Taxonomy/catalog built far ahead of the substance behind it

Pattern: a large declarative catalog (agent names, capabilities, grants) was imported/generated in
bulk, producing an impressive-looking count, while the fraction of entries with real behavior
behind them is a small minority — and nothing in the product surface distinguishes "cataloged" from
"actually usable."

- AIAGENT-003 / PRODUCT-003 (merged) — confirmed via `agents.normalized.json` summary block:
  379 canonical agents, only 27 have `hasPrompt: true`/`withPrompt`, 298 are typed `LLM_PROMPT`
  with `systemPrompt: null`, only 28 are `EXISTING_SERVICE`-bound. Real, executable capability is
  roughly 7% of the nominal catalog size.
- AIAGENT-004 / PRODUCT-002 / REVOPS-005 / BACKEND-006 (see RC-02) — same pattern one layer up: a
  12-agent "Commercial Cell" product surface where 5 are unroutable.
- AIAGENT-010 — a handful of capability grants (`contract.generate`, `signature.request`,
  `billing.reconcile`) are honestly labeled `FUTURE_TOOL`/`SOURCE_REQUIRED` — the same underlying
  pattern as AIAGENT-001, but scoped and disclosed correctly, unlike AIAGENT-001's universal grant.
- AIAGENT-007 — `agent.request_cross_role`'s catalog description is stale in the *opposite*
  direction: documented as blocked, actually available — the same two-source-of-truth drift as
  AIAGENT-001, proving the catalog and the enforcement code (`tool-bindings.ts`) drift independently
  in both directions with nothing keeping them in sync.

**Why it recurs**: `agents.normalized.json` and `capability-catalog.ts` are populated from an
external source package and hand-maintained descriptions respectively; neither is generated from
nor validated against the other, so claims of availability and actual `ToolBinding.verification`
state diverge silently in both directions.

---

## RC-06 — Single-tenant/single-customer content and branding never generalized after the product broadened its ICP

Pattern: this product began as (or absorbed) tooling built for one specific customer/vertical
(Atlas GR, cargo-risk/logistics insurance), and that content was wrapped in a generic,
grantable module or a generic-looking UI component without being rewritten, gated to that tenant,
or clearly retired, even after `.claude/CLAUDE.md` itself declares the ICP as "any company with a
sales team."

- VOICE-001 (CRITICAL) — confirmed: `ATLAS_GR_PLAYBOOK` (Atlas GR / "Gessica" persona, Atlas GR
  product pitch) is the unconditional, hardcoded return of `buildVoicePromptForLead()`, called
  unconditionally from `birthVoice.service.ts:173,195` for every organization — no
  `organizationId` parameter exists on the function signature at all.
- DOCBRAND-002 — confirmed: `PropostaComercialHub.tsx` ships `cockpit-atlas`/`cockpit-totaltrac`
  tabs and a named former client's proposal (`Proposta_Transpacheco_corrigida.html`), gated only by
  the generic, grantable `proposta-comercial` module key — any tenant granted that module sees this.
- PRODUCT-004 — same root cause as above, generalized to `SocialSellingHub.tsx` and
  `HubInteligenciaMarketingHub.tsx`: confirmed both render freight/logistics-specific,
  Atlas-GR-branded static content (`METODOLOGIA_RISCO_TERRITORIO.md`, CNPJ/MDF-e/RNTRC-specific ETL
  scripts and dashboards) behind a generic per-organization `ModuleAccessGrant`.
- DOCBRAND-005 — `EXTERNAL_LINKS` in `module-catalog.ts` hardcode `*.atlasgr.com.br` URLs for the
  entire platform.
- DOCBRAND-012 — `public/tools/treinamento-atlasgr/` and `public/tools/portal-comercial/` remain
  served, own-branded static portals, on routed modules.
- FRONTEND-002 — confirmed: all 8 filenames in `HubInteligenciaMarketingHub.tsx`'s `docs` array
  (`METODOLOGIA.md`, `CENSO_COMPETITIVO_GR_...`, etc.) 404 — only
  `METODOLOGIA_RISCO_TERRITORIO.md` exists on disk, and it isn't even one of the 8 listed. This is
  the direct consequence of RC-06 content never being reconciled with what was actually committed.
- FRONTEND-003 — same pattern: two dead download buttons in `SocialSellingHub.tsx` referencing
  files that were never committed.

**Why it recurs**: these are legacy tools wrapped in an iframe/static-file shell and treated as "a
module like any other" for access-control purposes, without a second pass asking whether the
*content itself* should be tenant-agnostic before being reachable by a generic grant.

---

## RC-07 — An in-flight architectural migration (two-brand → one-brand) is being reverted inconsistently across files in the same branch

Pattern: one commit changed a cohesive set of files together (a rebrand); a later commit in the
same branch partially reverted *some* of those files back to the old scheme while leaving *others*
on the new scheme, with no compensating data migration either way — confirmed directly via git
history, not just static code reading.

- DOCBRAND-007 — confirmed via `git log`/`git show`: commit `f098d675` ("migração estrutural para
  Birth Hub 360") changed `module-catalog.ts`'s `treinamento-atlasgr` → `treinamento-birthub360`
  and added migration `20260912120000_structural_rebrand_unify_playbook`. The current HEAD
  (`838a1842`, via merge `b1e4ac32` "remove playbooks nomeados por empresa") has
  `module-catalog.ts` back on `treinamento-atlasgr` (confirmed) **and no longer contains the
  migration file at all** (confirmed: `git show HEAD:prisma/migrations/.../migration.sql` →
  "does not exist in HEAD") — while `playbooks.ts` stayed on the new single-`'geral'`-key scheme
  (confirmed) and `access-policy.ts`'s domain-allowlist function was independently removed further
  still (see DOCBRAND-011). Three files touched by the same original commit are now in three
  different states.
- DOCBRAND-001 — the *original* form of this finding (migration renames `moduleKey` to
  `treinamento-birthub360` while code still checks `treinamento-atlasgr`) describes an intermediate
  state of DOCBRAND-007's revert-in-progress that **no longer matches HEAD**: the migration file
  cited has been deleted from the repository entirely (confirmed above), so a fresh
  `prisma migrate deploy` today will not apply that rename at all, and current code
  (`module-catalog.ts`) is now self-consistent on `treinamento-atlasgr`. The finding is downgraded
  to **PARTIALLY_CONFIRMED**: the specific bug as described is currently moot for any new
  environment, but if that migration was ever applied to a live/staging database *before* the file
  was deleted from history, that environment is left with orphaned `moduleKey='treinamento-birthub360'`
  grant rows with no code path that will ever match them again, and no compensating migration
  exists to fix or re-verify that. This could not be confirmed or ruled out from repository content
  alone — it needs a check against any real database that had this migration applied.
- DOCBRAND-008 — same commit's rewrite of historical `brand` enum-like string values from
  `atlasgr`/`totaltrac` to `birthub360` (also not a member of the current `PlaybookKey`) is
  low-impact churn given `playbookInfo()` already tolerates unrecognized values — noted as a minor
  symptom of the same revert-in-progress, not a new defect.
- DOCBRAND-011 — the handoff describing `access-policy.ts`'s login-domain allowlist function
  (`getTenantFromEmail()`) is now stale in a different way: that function no longer exists in the
  file at all (confirmed: current `access-policy.ts` contains only
  `normalizeLoginEmail()`/`isAuthorizedLoginEmail()`), a further refactor past what the cited
  handoff describes.
- DOCBRAND-013 — `prisma/schema.prisma` inline comments near the brand columns still describe the
  retired two-value domain (`'atlasgr' | 'totaltrac'`) as the valid set.
- DOCBRAND-003 — **DROPPED as FALSE_POSITIVE on cross-review.** The finding claims
  `.claude/CLAUDE.md` §1 still describes the retired two-brand runtime selector as live. Reading
  the actual current file confirms the opposite: §1 already correctly states brand-switching "não
  existe mais," that the atlasgr/totaltrac axis "sobreviveu como playbook comercial," and that the
  historical keys are read-only data not to be renamed without migration — which is exactly
  `playbooks.ts`'s current model. `CLAUDE.md` was evidently updated after the DOCBRAND agent's pass
  (plausible given this is an actively-edited swarm branch per the coordination notes in this
  session's memory) and the finding no longer holds against the current file.

**Why it recurs**: per this session's own memory notes, multiple agents/sessions are working this
branch concurrently without a single merge/push coordinator reconciling brand-axis changes before
this snapshot — this root cause is a live symptom of that coordination gap, not a one-time mistake.

---

## RC-08 — Third-party integrations built independently, without a shared reliability/test layer

Pattern: each external integration (Bitrix, 3CX, Slack, Stripe, Omie, Chatwoot) was built as its
own vertical slice; the more mature ones (Bitrix) accumulated retry/backoff/idempotency/test
coverage over time, but that maturity was never extracted into a shared library the newer
connectors could inherit from day one.

- INTEGRATION-001 — confirmed: no `Idempotency-Key` header construction anywhere in
  `stripe.service.ts` (grep for "Idempotency" across the file returns zero matches) on the
  `POST /v1/payment_intents` call.
- INTEGRATION-002 — confirmed: `fetchWithTimeout` (`src/lib/http.ts:40`) contains no retry/backoff
  logic (grep for "retry"/"backoff" in the file returns zero matches) and is the sole HTTP
  primitive used by Slack/Stripe/Omie; `bitrix/service/client.ts` has real
  retry+backoff+jitter+classification for the same class of call.
- INTEGRATION-003 / BACKEND-003 (merged) — confirmed: no test files exist under
  `src/features/integrations/{slack,stripe,omie}/` (directory listing empty for test patterns),
  while `bitrix/__tests__` and `threecx/__tests__` are extensive.
- INTEGRATION-009 — Omie phone-number-splitting heuristic self-documented as unvalidated against a
  real account.
- WORKFLOW-005 / INTEGRATION-006 (merged) — confirmed: `AUTOMATION_ACTIONS`/`runAction` in
  `automation.engine.ts` only recognize "Notificar equipe," "Criar atividade," "Ligar via SDR de
  Voz" — Slack/Stripe/Omie have no automation-engine action node despite being fully functional as
  manual, standalone connectors.
- BILLING-008 — no E2E coverage for the two newest connection panels, consistent with the same gap.

**Why it recurs**: `bitrix/service/client.ts`'s retry/backoff/idempotency logic is not factored out
into `src/lib/http.ts` (or a sibling shared module) as the default transport for *any* outbound
integration call — it stayed local to Bitrix, so nothing enforces its reuse for the next connector.

---

## RC-09 — Test coverage gaps correlate almost exactly with where real bugs were found in this audit

Pattern: modules with the thinnest or zero test coverage are disproportionately the modules where
this audit's domain specialists found confirmed, real bugs — the coverage gap is not a
theoretical process concern, it is the mechanism by which several of the other findings in this
document went undetected.

- TEST-001 — confirmed: no test file exists for `RevenueIntelligenceAgent` or
  `ContractSignatureAgent` despite both having live, routed HTTP endpoints
  (`agent.routes.ts` confirmed to import and mount both).
- TEST-002 — confirmed: zero test files found for any of the 8 real files under
  `src/features/roleplay/` — one of the product's three stated pillars per `CLAUDE.md` §1.
- TEST-003 — confirmed: both Android test files
  (`ExampleUnitTest.java`, `ExampleInstrumentedTest.java`) exist exactly at the cited paths and are
  unmodified boilerplate (`assertEquals(4, 2+2)` / package-name check only).
- TEST-004, TEST-005, TEST-006, TEST-007, TEST-011, TEST-012 — further gaps in the same family
  (unrouted agents, whole product modules, RBAC real-session coverage, billing persistence,
  coverage thresholds, catalog-scale execution sweep).
- FRONTEND-006 — explicitly names the *same* four modules (social-selling, treinamento,
  hub-inteligencia-marketing, propostas) that FRONTEND-002/003 (RC-06) found broken in as having
  zero test coverage of any kind — this is the direct causal link between RC-06's bugs and RC-09's
  gap.
- TEST-008, TEST-009, TEST-010 — lower-severity quality issues in the existing suite (trivial
  assertions, skipped visual regression, opt-in-only container tests).

**Why it recurs**: the "legacy tool hub" iframe pattern (RC-06) is structurally easy to treat as
outside the React app's own test surface — there is no lightweight smoke-test convention (e.g.
"assert every path referenced in a `docs`/`tabs` array exists on disk") that would have caught
FRONTEND-002/003 automatically.

---

## RC-10 — Rebrand renamed running infrastructure, but shell scripts and docs that reference containers/URLs by literal name were not updated

Pattern: `docker-compose` service/container names were renamed as part of the AtlasGR → Birth Hub
360 rebrand; every shell script or doc that does a literal `docker exec <container_name>` (as
opposed to resolving the name dynamically) was missed, because there is no single source of truth
for "the current production container names" referenced from more than one place.

- DEVOPS-001 (CRITICAL) — confirmed: `docker-compose.oci.yml` defines
  `container_name: birthhub_app` / `birthhub_postgres` (lines 32/98); `scripts/deploy-oci.sh:291,
  298,302`, `scripts/backup-oci.sh:30`, and `scripts/restore-oci.sh:23` all still reference
  `atlasgr_app`/`atlasgr_postgres`, which do not exist as running containers — confirmed via direct
  grep of all three scripts.
- DEVOPS-002 — direct consequence: with the local backup script broken (DEVOPS-001) and the GitHub
  Actions backup workflow's cron disabled pending secrets (confirmed: `backup-production.yml` has
  `workflow_dispatch: {}` only, comment explicitly says cron stays off until R2+secrets are
  configured and a manual run goes green), there is no working backup path for production today.
- DEVOPS-004 — confirmed: `docs/deploy/README.md:10` states `render.yaml → autoDeployTrigger: off`
  ("LEGACY/FROZEN"), but the actual `render.yaml:12` shows `autoDeployTrigger: commit` for the web
  service (line 156's `off` belongs to a different entry) — a real, confirmed doc/reality mismatch
  about whether Render auto-deploys on every push to main.

**Why it recurs**: container/service names and deploy-doc status live in at least 5 independent
places (`docker-compose.oci.yml`, 3 shell scripts, 2+ docs) with no generated or tested
cross-check, so a rename in the compose file has no mechanism forcing the scripts/docs to follow.

---

## RC-11 — Observability instrumentation added as a per-worker opt-in, not a structural default

Pattern: a metrics/registration helper (`registerQueueForMetrics`) exists and is called correctly
by the ~10 queues built as core infrastructure, but every product-feature worker built afterward
independently forgot to opt in, because nothing enforces it at the point a new worker file is
created.

- WORKFLOW-004 — confirmed pattern (not independently re-verified queue-by-queue in this pass, but
  the claim — "10 calls to `registerQueueForMetrics`, all in `src/lib/queue/*.ts`, zero in the 15
  feature-worker files listed" — is internally consistent with the DEVOPS-003 finding that
  production has no Prometheus scrape target at all, meaning this gap currently has limited
  practical bite but would matter the moment observability is wired up).
- DEVOPS-003 — confirmed: `prometheus.yml`'s own comment states `/metrics` requires the
  `x-platform-operator-token` header, which the native Prometheus scrape config cannot supply —
  this is the reason neither Oracle Cloud nor Render currently has metrics collection, not a
  forgotten step.
- BILLING-009 — `estimateCostUsd`'s fallback-to-default-pricing branch has no `logger.warn`, so a
  future unlisted model would silently under/over-count spend with no operator-visible signal.

**Why it recurs**: RC-10 and RC-11 share a root shape — a correct mechanism exists, but nothing
forces newly-added code (a worker file, a shell script, a container reference) to register with or
follow it.

---

## RC-12 — Documentation and inline schema comments drift from the code they describe

Pattern: a comment (in `schema.prisma`, `CLAUDE.md`, `eslint.config.mjs`, or a README) accurately
described the code at the time it was written, and the code changed without the comment being
revisited — a pure "single source of truth was never generated or CI-checked" problem.

- CRM-012 — `schema.prisma` comment claims funnel/deal-mirror fields are "ainda não lidos" by
  `PrismaLeadRepository`; the repository already reads/writes them.
- FRONTEND-005 — `eslint.config.mjs`'s `react/no-unknown-property` override lists 3D component
  paths that no longer exist in the repo; `CLAUDE.md` §1's own 3D-component inventory is
  incomplete (confirmed elsewhere in this same file that Section 1 was recently updated for the
  brand axis — the 3D inventory drift is a separate, smaller stale spot in the same document).
- DOCBRAND-013 — schema comments describe the retired two-brand domain as current (see RC-07).
- AIAGENT-007 — catalog description drifts from `tool-bindings.ts` in the opposite direction from
  AIAGENT-001 (says blocked, is actually available) — proof the two files are never
  cross-validated in either direction.
- DOCBRAND-004 — `README.md` still documents ESLint as the lint tool; `package.json` confirms
  `lint`/`lint:fix` invoke Biome.
- PRODUCT-006 — a pre-rebrand roadmap HTML artifact at repo root uses the retired AtlasGR orange
  palette explicitly retired per `CLAUDE.md` §1, with no archive marker.
- PRODUCT-007 — "Editor de Documentos" menu label overstates scope (it is Knowledge-Base-specific).
- DEVOPS-004 — see RC-10 (also a pure doc/reality drift, cross-listed there because its business
  impact is deploy-operational).

**Why it recurs**: none of these documents (inline schema comments, `CLAUDE.md`, `README.md`,
`eslint.config.mjs`) have an automated check that fails CI when the code they describe changes
underneath them.

---

## RC-13 — The same concept is modeled or implemented twice, and the two copies were never reconciled

Pattern: two structures/implementations exist for what should be one concept, built at different
times, and nothing forces them to stay in sync — as distinct from RC-07 (an active migration) or
RC-05 (a catalog vs. implementation gap), this is steady-state parallel implementation.

- TENANT-007 — two parallel, undocumented tenant-scoping Prisma extensions
  (`src/lib/prisma.ts`'s fixed 12-model list vs. `src/lib/tenant-prisma.ts`'s dynamic ~94-model
  DMMF-driven list), both wired into production via different call sites, with no comment
  explaining why both exist.
- REVOPS-004 — the automated weekly Win/Loss cron computes a real result that is discarded
  (never persisted, never surfaced), while a separate manual endpoint independently reimplements
  the same query+prompt logic instead of calling the cron's own function — confirmed by the file's
  own `WIN_LOSS_STATUSES` comment acknowledging this drift already happened once.
- CRM-011 — Lead tags live in an untyped `customFields.tags` JSON blob; Company tags are a native,
  indexable `String[]` column — the same "tags" concept modeled two different ways on sibling CRM
  entities.

**Why it recurs**: no architectural decision record commits either implementation as canonical, so
the second implementation is usually built by whoever needed the concept next, without consulting
whether an equivalent already existed elsewhere.

---

## RC-14 — Schema and application layer built at different times, so one side is missing the other's half

Pattern: either the database schema exists with no application code using it, or a UI/route
implies a capability the schema was never extended to support — the two halves of one feature were
never delivered together.

- PRODUCT-001 — see RC-02 (`Prospect` model, schema-only).
- CRM-004 — `Note` model has a required, non-nullable `leadId` only; Company/Contact have no notes
  capability in schema, backend, or UI at all.
- CRM-005 — no generic `Attachment`/file model exists for any CRM entity, despite an S3-compatible
  storage backend already in use for a different feature (audio uploads).
- CRM-008 — `Company.owner` column exists in the DB schema with zero readers/writers anywhere in
  application code (likely orphaned in anticipation of the ownership model CRM-007 flags as
  missing).
- DATA-006 — `User.email` is globally unique with a required `organizationId`, hard-coding a
  one-email-one-organization model with no recorded product decision confirming that's intentional.

**Why it recurs**: schema changes and application-layer changes in this codebase are not required
to land in the same PR/commit — several of the above show the schema half shipped first and the
application half was simply never scheduled afterward.

---

## RC-15 — Resource ceilings built for one call site were not ported to structurally identical sibling call sites

Pattern: an unbounded-input or unbounded-cost class of bug was fixed (or designed correctly) once,
and an identical, separately-written call site a few files away has the same shape of gap, because
the fix was applied locally rather than as a shared, reusable guard.

- CRM-010 — identical `parseInt(req.query.limit) || 50` with no upper bound, duplicated verbatim
  across `LeadController.ts`, `ContactController.ts`, and `CompanyController.ts`.
- TENANT-004 — a global cross-tenant AI budget cap (`AI_MONTHLY_BUDGET_USD`) still runs *after* the
  newer, correct per-tenant budget check, so a tenant well under its own budget can be blocked by
  unrelated tenants' usage — the newer, better-scoped mechanism was added without removing or
  re-scoping the older global one.
- RAG-008 — `GET /api/knowledge` document listing has no pagination, unlike the Playbook module's
  own, already-fixed pagination convention (cited by the finding itself as the pattern to reuse).

**Why it recurs**: pagination/budget-ceiling logic is copy-pasted per controller/module rather than
factored into one shared helper (e.g. a `clampLimit()` utility or a single `assertBudget()` call
site), so a fix or a correct implementation in one place does not propagate.

---

## Findings not explained by a structural root cause (isolated, low-blast-radius, or already resolved)

These are real but do not fit a recurring pattern above — either genuinely one-off oversights, or
confirmed-fixed items kept in the deduped list for completeness so they are not "rediscovered":

- CRM-013, CRM-014, TENANT-009, TENANT-010, DATA-002, RAG-003 — flagged `NEEDS_VERIFICATION` by
  their own domain specialists; this cross-review did not have a live database or the ability to
  run destructive verification steps (out of scope for an audit-only task) to resolve them further,
  so they remain `NEEDS_VERIFICATION`.
- BACKEND-004 — Lead ownership fallback matches on display name for Bitrix-imported leads (a data
  provenance issue specific to the Bitrix import path, already tracked in an existing handoff).
- DOCBRAND-009, DOCBRAND-010 — confirmed already fixed since the prior legacy-brand-content audit;
  kept as closed/informational so they are not reopened.
- DOCBRAND-014 — informational: a live security policy's package name (`atlasgr.rbac`) is a legacy
  brand name but the control itself is real and correctly queried; no defect.
- AIAGENT-005, AIAGENT-008 — LGPD consent-gate granularity and a binary-valued confidence field
  presented as continuous; both are "would design differently," not demonstrated defects with a
  concrete failure scenario beyond audit posture.
- PRODUCT-005 — a specific, narrow UX gap (Cadence builder offers a channel option known to always
  fail with no UI-level warning) — real, but a one-off inconsistency between a dispatcher-level fix
  and its UI counterpart, not a repeated pattern elsewhere in this audit.
- DEVOPS-006, DEVOPS-007, DEVOPS-008, DEVOPS-009 — isolated infra hygiene items (unpinned `yq`
  download, self-signed Postgres TLS, unauthenticated dev-path Redis, dev compose ports open on all
  interfaces) confined to their own scripts/manifests.

---

## Summary table: root cause → finding count

| Root cause | # findings (post-dedup) |
|---|---|
| RC-01 Mock-first, never replaced | 11 |
| RC-02 Backend built, never wired | 9 |
| RC-03 Tenancy not applied transversally | 13 |
| RC-04 Security fix not backported | 6 |
| RC-05 Catalog ahead of substance | 4 |
| RC-06 Single-tenant content never generalized | 6 |
| RC-07 In-flight migration reverted inconsistently | 5 (+1 dropped false positive) |
| RC-08 Integrations without shared reliability layer | 6 |
| RC-09 Test gaps correlate with real bugs | 10 |
| RC-10 Rebrand not propagated to infra scripts/docs | 3 |
| RC-11 Observability opt-in, not default | 3 |
| RC-12 Documentation/schema-comment drift | 7 |
| RC-13 Duplicate implementations never reconciled | 3 |
| RC-14 Schema/application built at different times | 5 |
| RC-15 Resource ceilings not ported to siblings | 3 |
| Not explained by a structural cause (isolated/resolved) | ~17 |

(Rows overlap — several findings are cited under 2 root causes where both apply, e.g. VOICE-001
under RC-03 and RC-06 — so this table sums to more than the total distinct finding count.)
