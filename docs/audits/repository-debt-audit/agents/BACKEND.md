# BACKEND — Audit Report

## Agent
BACKEND (domain code: `BACKEND`)

## Mission
Audit the Express/Node backend of Birth Hub 360º: routes, controllers, services, use cases,
repositories, adapters/providers, events, jobs, queues, workers, webhooks. For a representative
sample of routes across modules, check auth, authorization, tenant scope, validation, rate
limiting, error handling, logging, audit, tests, and whether the implementation is real or a
stub/mock/placeholder.

## Scope
This is an audit only — no application source file, config, dependency, or database was modified.
All work is read-only (Read/Grep/Bash inspection); the only file written is this report.

## Areas inspected
- Process bootstrap: `server.ts`, `worker.ts`, `src/bootstrap/*.ts` (security, rate limiters,
  webhooks, observability, health checks, auth mount, routes mount, workers, shutdown).
- Cross-cutting middleware: `src/shared/middlewares/*` (authenticateToken, authorization/
  requireTenant, requireRole, requireLeadOwnership, requirePlatformOperator, errorHandler).
- Route mounting map (`src/bootstrap/routes.ts`) for all 54 `*.routes.ts` files across 33 feature
  modules — verified where auth/tenant/role middleware is actually applied (centrally at mount
  time vs per-router), not just grepped per-file.
- Integrations: Stripe, Omie, Slack (newest, from the most recent commit), Bitrix24, WhatsApp,
  3CX, Birth Voice, Google, Chatwoot, e-mail reply webhook, e-signature (gov.br stub).
- Encryption-at-rest for integration credentials (`src/lib/crypto/piiFields.ts`,
  `secretFields.ts`, `src/lib/prisma.ts` Prisma extension) cross-checked against
  `prisma/schema.prisma` model comments for `StripeConnection`, `OmieConnection`,
  `SlackConnection`, `ThreeCXConnection`, `BitrixConnection`, `VoiceHubConnection`, `Account`.
- Billing/usage module (`src/features/billing/**`) — full vertical slice (domain, application,
  infra, presentation, routes).
- LGPD module (`src/features/lgpd/**`) — erasure, export, audit-log listing.
- Intelligence "Commercial Agent Cell" registry (`commercialAgentRegistry.ts`) cross-referenced
  against `agent.routes.ts` to verify which of the 12 catalogued agents actually have an HTTP
  route.
- `worker.ts` job/queue registration (26 BullMQ workers) and its standalone `/metrics` and
  `/health` HTTP server (separate from the Express app).
- CORS/Helmet/trust-proxy configuration (`src/bootstrap/security.ts`).
- Quick pass over `.dependency-cruiser-known-violations.json` (945 lines) and test-file ratio.

## Files inspected (non-exhaustive list, representative)
`server.ts`, `worker.ts`, `src/bootstrap/{security,rateLimiters,webhooks,routes,observability,
healthchecks,auth,bullBoard,workers,shutdown,appServices,apiDocs,frontend}.ts`,
`src/shared/middlewares/{authenticateToken,authorization,requireRole,requireLeadOwnership,
requirePlatformOperator,errorHandler}.ts`, `src/lib/crypto/{piiFields,secretFields}.ts`,
`src/lib/prisma.ts`, `src/features/billing/**` (6 files), `src/features/lgpd/lgpd.routes.ts`,
`src/features/integrations/stripe/{stripe.routes,stripe.service}.ts`,
`src/features/integrations/omie/omie.service.ts`, `src/features/integrations/slack/
slack.service.ts`, `src/features/intelligence/agents/commercialAgentRegistry.ts`,
`src/features/intelligence/routes/agent.routes.ts`, `prisma/schema.prisma` (targeted sections),
plus ~50 `*.routes.ts` files scanned for middleware wiring and 90+ integration files scanned by
line count/grep for stub/mock/TODO markers.

Approx. **~130 files** directly read or grep-inspected with targeted context.

## Executive summary
This backend is unusually well-hardened and self-documented compared to a typical audit target:
the vast majority of "textbook" backend smells (missing tenant scoping, missing rate limiting on
AI/webhook routes, plaintext credentials, unguarded `/metrics`, RLS bypass in auth, fail-open
authorization) have already been found and fixed by prior work, each with an inline comment
explaining the original bug, why it mattered, and the fix (e.g. SEC-002 platform-operator token on
worker.ts's raw `/metrics`, SEC-008b per-tenant AI rate limiting, the Railway `.railway.app` CORS
wildcard fix, the LGPD audit-log envelope bug). Route-level `authenticateToken`/`requireTenant`
absence in a given `*.routes.ts` file is very often **not** a gap — it is applied centrally in
`src/bootstrap/routes.ts` at `app.use()` mount time, and in 3 cases (`/api/intelligence`,
`/api/agent`, `/api/knowledge`, `/api/bug-reports`) `authenticateToken` was deliberately moved into
`rateLimiters.ts` so a per-tenant AI/report rate limiter can key off `organizationId` — a real,
non-obvious architectural decision, not an oversight.

That said, real gaps remain, concentrated in three places: (1) a genuine production CORS hole that
lets **any** installed Chrome extension make credentialed requests against the API
(`chrome-extension://*` is trusted unconditionally, with `credentials: true`); (2) the newest
integrations (Stripe, Omie, Slack — all from the very last commit on this branch) ship with zero
automated tests, unlike every other integration in the same directory, and Stripe in particular
has no local persistence or inbound webhook, so a payment's final status (3-D Secure follow-up,
refund, dispute) can silently diverge from what the CRM believes; and (3) several agent/feature
surfaces are real but partially wired — 5 of the 12 "Commercial Agent Cell" agents have no HTTP
route, `billing-revenue` is a confirmed placeholder (no real invoicing data source exists in the
product), the gov.br e-signature transport and the inbound e-mail reply channel are both
documented stubs, and a legacy `Lead.owner` field mixes two different identity conventions
(user id vs. user display name) with only a name-based workaround at the authorization layer.

## Critical
None found with concrete, exploitable evidence at CRITICAL severity. The CORS finding below is the
closest candidate and is rated HIGH rather than CRITICAL because it requires the victim to already
have a malicious/compromised browser extension installed — see BACKEND-001.

## High

### BACKEND-001 — CORS trusts any `chrome-extension://` origin with credentials enabled, in production
- **Category:** TD-SEC
- **Severity:** HIGH · **Priority:** P1 · **Confidence:** HIGH · **Status:** CONFIRMED
- **Evidence:** `src/bootstrap/security.ts:127-147`. The CORS `origin` callback allows any
  non-production origin unconditionally, and separately:
  ```
  if (origin.startsWith('chrome-extension://')) return callback(null, true);
  ```
  with `credentials: true` set on the same `cors()` call, and no check against a specific,
  pinned extension ID anywhere in the codebase (`grep -rn "chrome-extension://" src` only matches
  this one line). `chrome-extension/manifest.json` has no `"key"` field pinning a stable extension
  ID either, so there is nothing to compare against even if the code wanted to.
- **Root cause:** the rule was added to let the project's own Meet-copiloto Chrome extension call
  the API with the user's session cookie, but the origin check matches the **scheme prefix**, not
  a specific extension ID.
- **Failure scenario:** a user with the legitimate extension installed also has *any other*
  Chrome extension (malicious or compromised, e.g. via a supply-chain update) that makes an
  `XMLHttpRequest`/`fetch` with `credentials: 'include'` to `https://<this-api>/api/...`. Because
  the browser sends the request with an `Origin: chrome-extension://<other-id>` header and this
  backend replies with `Access-Control-Allow-Origin: chrome-extension://<other-id>` +
  `Access-Control-Allow-Credentials: true`, the browser permits the response to be read — the
  extension can read/write CRM leads, contacts, LGPD export/erasure, integration connections, etc.
  as the logged-in user, bypassing same-origin protections entirely.
- **User/business impact:** any user who installs an unrelated malicious Chrome extension is
  exposed to full account takeover of their Birth Hub 360 session from that extension, with no
  action needed inside the product itself.
- **Suggested resolution:** pin the extension ID explicitly (`chrome-extension://<fixed-id>`) by
  reading it from config/env, or only allow it in specific known-safe deployments; do not match on
  the `chrome-extension://` scheme alone.
- **Effort:** XS (one-line origin check + one env var).

## Medium

### BACKEND-002 — Stripe payment feature has no local persistence and no inbound webhook
- **Category:** TD-INTEGRATION / TD-FEAT / TD-BILLING
- **Severity:** MEDIUM · **Priority:** P2 · **Confidence:** HIGH · **Status:** CONFIRMED
- **Evidence:** `src/features/integrations/stripe/stripe.service.ts` (`createStripeCharge`,
  `getStripeCharge`) only ever calls the Stripe API directly and returns the response; there is no
  `Payment`/`StripeCharge`/`Invoice` Prisma model (`grep -n "^model Payment\|StripeCharge"
  prisma/schema.prisma` returns nothing), and `mountPreJsonWebhooks`
  (`src/bootstrap/webhooks.ts`) registers webhooks for Birth Voice, 3CX, Bland AI voice-result,
  e-mail reply, e-signature, Bitrix, and Chatwoot — but not Stripe.
- **Failure scenario:** a `PaymentIntent` created with `paymentMethodId` unset (the documented,
  intentional path when a customer hasn't tokenized a payment method yet) stays
  `requires_payment_method`/`requires_action` on Stripe's side; there is no mechanism (webhook or
  scheduled reconciliation job) in this codebase that will ever learn the payment later succeeded,
  failed 3-D Secure, or was refunded/disputed. The only way to know is to poll
  `GET /connections/:id/charges/:paymentId` by hand.
- **Business impact:** the "cobrança" feature behaves like an isolated Stripe API console bolted
  onto the CRM rather than an integrated billing capability — no deal/lead is ever linked to a
  charge, and no automated follow-up is possible.
- **Suggested resolution:** either persist created PaymentIntents (organizationId + connectionId +
  paymentId + status) and add a Stripe webhook endpoint (mounted pre-JSON like the others, with
  signature verification) to keep status current, or explicitly document the feature as a
  fire-and-forget charge trigger with manual reconciliation only, matching the honesty pattern
  already used for the gov.br signature stub.
- **Effort:** M.

### BACKEND-003 — New integrations (Stripe, Omie, Slack) ship with zero automated tests
- **Category:** TD-TEST
- **Severity:** MEDIUM · **Priority:** P1 · **Confidence:** HIGH · **Status:** CONFIRMED
- **Evidence:** directory listing of `src/features/integrations/**/*.ts` shows `__tests__`
  directories with real unit/integration coverage for Bitrix (10+ test files), WhatsApp (4),
  Birth Voice (6), 3CX (1, 567 lines), Google (2), Chatwoot (1) — but **none** for
  `src/features/integrations/stripe/`, `src/features/integrations/omie/`, or
  `src/features/integrations/slack/`, all three added in the most recent commit on this branch
  (`72f0bd40 feat(integrations): adiciona conectores Slack, Stripe e Omie`).
- **Failure scenario:** the Stripe/Omie/Slack services contain non-trivial logic (SSRF guarding
  via `assertSafeExternalUrl` for Slack's user-supplied webhook URL, credential validation against
  live APIs before persisting, `URLSearchParams` body construction for Stripe) with no regression
  safety net; a future refactor of `fetchWithTimeout`/`safeFetch` or of the encryption extension
  could silently break connection creation, secret encryption, or SSRF protection for these three
  integrations without any test failing.
- **Suggested resolution:** add the same class of unit tests the sibling integrations already
  have (service-level tests mocking `fetchWithTimeout`/`prisma`, at minimum covering the
  SSRF-guard path for Slack's webhook URL and the encrypted-field round-trip for all three).
- **Effort:** S–M.

### BACKEND-004 — `Lead.owner` mixes user id and user display name; ownership check has a residual same-name collision risk
- **Category:** TD-DATA / TD-ARCH
- **Severity:** MEDIUM · **Priority:** P2 · **Confidence:** HIGH · **Status:** CONFIRMED (root
  cause already tracked internally; the residual risk of the workaround is a fresh observation
  from this audit)
- **Evidence:** `src/shared/middlewares/requireLeadOwnership.ts:6-20` documents that
  `Lead.owner` holds a `User.id` for leads created/assigned inside the app, but the **display
  name** for leads imported from Bitrix24 (referencing
  `.agents/handoffs/onda-7/04-para-06-owner-bitrix-nome-nao-id.md`), and implements a fallback:
  `ownerMatchesUserName` grants edit access to a CLOSER/SDR when `lead.owner === user.name`.
- **Failure scenario:** if two users in the same organization ever share the same `User.name`
  (a realistic possibility — nothing in the schema enforces name uniqueness, only email), and one
  of them has a Bitrix-imported lead attributed to that shared name, the *other* same-named
  CLOSER/SDR would pass `ownerMatchesUserName` and be granted edit/delete access to a lead they
  never captured and do not own. This is a narrower, real corollary of the already-documented
  root-cause bug (owner field mixing conventions), not yet called out anywhere.
- **Suggested resolution:** fix at the source (Bitrix import should resolve and store `User.id`,
  as the existing handoff doc already requests), and in the meantime tighten the fallback to also
  require the name to be unique among the organization's active users before granting access.
- **Effort:** S (workaround tightening) / M (source fix, owned by another workstream per the repo's
  own handoff doc).

### BACKEND-005 — Per-tenant AI usage dashboard leaks a platform-wide (cross-tenant) counter
- **Category:** TD-TENANT / TD-BUG
- **Severity:** MEDIUM · **Priority:** P3 · **Confidence:** HIGH · **Status:** CONFIRMED
- **Evidence:** `src/features/billing/infra/PrismaUsageRepository.ts:60-62`:
  ```ts
  async countUnattributed(since: Date): Promise<number> {
    return prisma.aILog.count({ where: { organizationId: null, createdAt: { gte: since } } });
  }
  ```
  called from `UsageUseCases.summary()` (`src/features/billing/application/UsageUseCases.ts:36`)
  without any `organizationId` filter — by construction, since these rows have `organizationId:
  null`, there is nothing to scope by. The domain-level doc comment
  (`src/features/billing/domain/Usage.ts:39`) acknowledges these are "chamadas gravadas antes da
  coluna de tenant existir, ou feitas fora de requisição" (legacy/unattributed calls), so the
  behaviour is deliberate, not an oversight — but the consequence was not spelled out anywhere.
- **Failure scenario:** every organization's `GET /api/usage` response includes the exact same
  `unattributedCalls` number — a platform-wide count of AI calls not attributed to *any* tenant.
  An ADMIN/GESTOR of Organization A sees a number that has nothing to do with Organization A's own
  usage, in a report whose entire purpose (per its own doc comment) is per-organization AI cost
  transparency. It is not sensitive PII, but it is a real tenant-isolation inconsistency in an
  otherwise carefully tenant-scoped module, and could confuse a customer into thinking it reflects
  their own historical usage.
- **Suggested resolution:** either drop the field from the per-tenant response (surface it only in
  an internal/platform-operator view, consistent with `requirePlatformOperator`'s existing
  separation of tenant-RBAC vs. platform-operator concerns), or clearly relabel it in the API
  response as platform-wide, not organization-specific.
- **Effort:** XS.

## Low

### BACKEND-006 — 5 of 12 "Commercial Agent Cell" agents are registered but have no HTTP route (unreachable)
- **Category:** TD-AGENT / TD-DEAD
- **Severity:** LOW · **Priority:** P3 · **Confidence:** HIGH · **Status:** CONFIRMED
- **Evidence:** `src/features/intelligence/agents/commercialAgentRegistry.ts` catalogues 12
  agents with `agentModule` pointing at real `.agent.ts` files for
  `ldr-intelligence`/`coordinator-commercial`/`manager-commercial`/`executive-director`/
  `bitrix-guardian` (in addition to the 3 wired ones). `grep` of
  `src/features/intelligence/routes/agent.routes.ts` for each agent id only finds
  `/commercial-cell/revenue-intelligence/run`, `/commercial-cell/churn-retention/run`, and
  `/commercial-cell/contract-signature/run` — no route exists for the other 5, matching the
  pre-existing discovery notes. This is intentional/tracked (the registry's own top-of-file
  comment documents the reclassification rationale, e.g. `contract-signature` was wrongly marked
  BLOCKED by an earlier audit), but confirms the "registered but unused" status is still accurate
  today.
- **Suggested resolution:** either wire HTTP routes for the remaining 5 agents (they already have
  real backing services per the registry's own `bindings` field) or explicitly mark them
  "internal/manual-only, no route planned" to stop them showing as ambiguous in future audits.
- **Effort:** S per agent (route + auth wiring, following the 3 existing ones as a template).

### BACKEND-007 — `billing-revenue` agent and module are a confirmed placeholder (no real invoicing data source)
- **Category:** TD-BILLING / TD-FEAT
- **Severity:** LOW · **Priority:** P4 · **Confidence:** HIGH · **Status:** CONFIRMED (already
  self-documented; re-verified here)
- **Evidence:** `commercialAgentRegistry.ts:236-257` (`status: 'NOVO_FONTE_PARCIAL'`, binding text:
  "Faturado: SEM FONTE REAL confirmada ... Sempre retorna billedAmount=null + missingData quando
  não houver fonte informada pelo chamador"), cross-checked against
  `src/features/billing/application/UsageUseCases.ts:14-20`, which independently confirms
  `src/features/billing/**` is AI token-cost tracking, not sales/invoice billing. No `Invoice`,
  `Payment`, or `Subscription` domain model backs "faturado" anywhere in `prisma/schema.prisma`
  besides the external `StripeConnection`/`OmieConnection` integration tables (which are also not
  wired to any local ledger — see BACKEND-002).
- **Suggested resolution:** none required beyond what is already documented; kept here only so the
  audit's own findings list doesn't have to be cross-referenced against the registry comment to
  know this is still true.
- **Effort:** N/A (accepted, documented placeholder; would become an XL effort item if a real
  billing/invoicing source is ever built).

### BACKEND-008 — Two integration transports remain documented stubs (gov.br e-signature, inbound e-mail)
- **Category:** TD-INTEGRATION
- **Severity:** LOW · **Priority:** P3 · **Confidence:** HIGH · **Status:** CONFIRMED (already
  self-documented; re-verified here)
- **Evidence:** `src/features/cadence/infra/GovBrSignatureProviderPort.ts:8-27` generates a
  `stub-govbr-request-<uuid>` id and logs "stub de transporte (provedor gov.br real ainda não
  plugado)" instead of calling a real gov.br signature API; the state machine
  (`src/shared/domain/signature.ts`) and `signatureStatus.webhook.ts` receiver are real.
  `src/features/integrations/email/emailReply.webhook.ts:17-20` documents itself as "hoje um
  stub: nenhum provedor real de inbound-parse plugado ainda" (built deliberately as
  "stub primeiro, plugar depois"). Both are already flagged in the codebase's own comments, so
  this finding exists to confirm neither has since been connected to a real provider and both
  remain reachable via real webhook routes that will simply never fire for signature/e-mail
  events in production today.
- **Suggested resolution:** none beyond what's already tracked; flagged for completeness of this
  audit's coverage of "feature exists vs. feature works."
- **Effort:** N/A (tracked elsewhere).

## Technical debt
- BACKEND-004 (`Lead.owner` dual-convention field) — see Medium.
- BACKEND-005 (cross-tenant `unattributedCalls` counter) — see Medium.
- Thin automated-test coverage at the file level: 171 `*.test.ts` files vs. 607 non-test `.ts`
  files under `src/features` + `src/lib` + `src/shared` (~22% file-level ratio; not a precise
  line-coverage measurement, but directionally consistent with BACKEND-003's finding that the
  newest work has zero coverage).

## Implementation debt
- BACKEND-002 (Stripe: no persistence, no webhook) — a real but incomplete implementation.
- BACKEND-003 (Stripe/Omie/Slack: no tests) — implementation shipped ahead of its safety net.

## Feature debt
- BACKEND-006 (5/12 Commercial Agent Cell agents unreachable).
- BACKEND-007 (billing-revenue placeholder).
- BACKEND-008 (gov.br signature + inbound e-mail stubs).

## Bugs
- BACKEND-005 (cross-tenant `unattributedCalls` counter leaking into per-tenant usage report).
- BACKEND-004's residual same-name collision risk in `requireLeadOwnership`'s fallback path.

## Architecture
- Route-level auth/tenant/role enforcement is centralized at mount time in
  `src/bootstrap/routes.ts`, which is a deliberate and sound pattern (defense-in-depth is added
  explicitly, e.g. `requireRole` re-applied at the mount call for `/api/commercial-intelligence`
  and `/api/copiloto-ia` even though the router already self-protects) — noted here as a positive
  finding so future auditors don't misread per-file middleware absence as a gap.
- `authenticateToken` is deliberately relocated into `src/bootstrap/rateLimiters.ts` for
  `/api/intelligence`, `/api/agent`, `/api/knowledge`, and `/api/bug-reports` so a per-tenant
  (not per-IP) AI/report rate limiter can key off `organizationId` — confirmed by reading
  `rateLimiters.ts` end-to-end; this is intentional, not a missing-auth bug.
- `Lead.owner` (BACKEND-004) is the one clear architectural inconsistency found: a single column
  serving two different identity semantics depending on data provenance (native vs. Bitrix-import).

## Security
- BACKEND-001 (CORS wildcard for `chrome-extension://` + credentials) is the headline security
  finding.
- Positive findings worth recording (not new debt, but relevant to a security-focused reader):
  `requirePlatformOperator` fails closed when `PLATFORM_OPERATOR_TOKEN` is unset, uses
  `timingSafeEqual` for comparison, and is applied to both the main process's `/metrics` and the
  separate `worker.ts` bare-`http` `/metrics` server (the worker's own top-of-file comment
  documents this as a previously-fixed gap — confirmed fixed by reading the surrounding code, not
  just the comment). Integration credentials (`StripeConnection.secretKey`, `OmieConnection.
  appKey/appSecret`, `SlackConnection.webhookUrl/botToken`, plus the pre-existing Bitrix/3CX/
  Google/VoiceHub credentials) are all confirmed present in `ENCRYPTED_MODEL_FIELDS`
  (`src/lib/crypto/piiFields.ts:34-57`) and therefore encrypted at rest via the Prisma extension in
  `src/lib/prisma.ts` — cross-checked against the schema comments claiming this, rather than
  trusting the comments alone.
- Minor, not raised to a numbered finding: `requirePlatformOperator` accepts the operator token via
  a query string parameter (`operator_token`) in addition to header/cookie, which is a known class
  of risk (secrets in URLs can end up in server/proxy access logs or `Referer` headers) — mitigated
  by immediately setting an httpOnly cookie on first use, but the very first query-string request
  is still exposed to logging. Given this is an internal/platform-operator surface (BullBoard,
  `/metrics`), not user-facing, this is left as an observation rather than a scored finding.

## Tests
- BACKEND-003: Stripe/Omie/Slack have no tests at all, in contrast to every sibling integration.
- File-level test ratio for `src/features` + `src/lib` + `src/shared`: 171 test files / 607
  source files (~22%) — directional signal only, not a coverage percentage.

## Integration
- BACKEND-002 (Stripe persistence/webhook gap).
- BACKEND-008 (gov.br signature and inbound e-mail transport stubs).
- Slack's user-supplied `webhookUrl` correctly goes through `assertSafeExternalUrl`/`safeFetch`
  (SSRF guard) before use (`slack.service.ts:73,131-132`), while Stripe/Omie correctly use the
  fixed-host `fetchWithTimeout` allowlist instead, since their API hosts are not tenant-supplied —
  confirmed this distinction is applied correctly in both new integrations, not just claimed in
  comments.

## Product
- BACKEND-006 (5/12 agent cell unreachable) and BACKEND-007 (billing-revenue placeholder) are the
  product-facing consequences of the architecture/feature debt above: a manager opening the
  "Comercial Agent Cell" catalog UI (if one exists) would see agents that cannot actually be
  invoked, and the intelligence layer explicitly refuses to fabricate a "faturado" number rather
  than mislead the user — the latter is a positive, deliberate product decision worth preserving.

## Mock/Fake/Placeholder
- `billing-revenue` (BACKEND-007): explicit placeholder, `billedAmount=null` always emitted when
  no source is provided — never fabricates data.
- gov.br signature transport (BACKEND-008): explicit stub id generator
  (`stub-govbr-request-<uuid>`), never claims a real signature occurred.
- Inbound e-mail webhook (BACKEND-008): explicit stub, documented as deliberately built before the
  real provider.
- `InMemoryAutomationVersionStore` / `InMemoryForecastSnapshotStore`: confirmed test-only fakes
  (their own doc comments say "não é mais a implementação em uso real, só o fake usado pelos
  testes"), correctly not reachable from production code paths in the files inspected.

## Dead/Orphan code
- BACKEND-006: 5 Commercial Agent Cell agent classes are implemented and registered in the
  catalog but have no route calling them — reachable only by direct import, which no HTTP surface
  does today.

## Quick wins
- Pin the `chrome-extension://` CORS origin check to a specific, configured extension ID
  (BACKEND-001) — smallest, highest-impact fix in this report.
- Drop or relabel the cross-tenant `unattributedCalls` field in the `/api/usage` response
  (BACKEND-005) — one-line change, removes a real (if minor) tenant-isolation inconsistency.
- Add a minimal test file per new integration service (Stripe/Omie/Slack) covering at least the
  encrypted-field round trip and (for Slack) the SSRF guard path (BACKEND-003) — bounded, mirrors
  an existing pattern already used for every sibling integration.

## Structural problems
- None beyond the `Lead.owner` dual-convention field (BACKEND-004), which is already tracked as an
  architecture handoff owned by another workstream in this repo's own process
  (`.agents/handoffs/onda-7/04-para-06-owner-bitrix-nome-nao-id.md`).

## Needs verification
- Real-world executability of the 392-agent normalized catalog
  (`src/features/job-roles/catalog/agents.normalized.json`) seeded via
  `scripts/seed-multi-cargo.ts` was flagged by discovery as UNKNOWN and was not independently
  re-verified in this pass (out of time budget for a backend-focused single pass) — a dedicated
  follow-up should sample a handful of seeded `AgentDefinition` rows and confirm their
  `ToolBinding`s resolve to real (non-`FUTURE_TOOL`) executors end to end.
- Whether any other route beyond `/api/usage` (BACKEND-005) aggregates data with a similar
  "legacy/unattributed, therefore unscoped by tenant" pattern was not exhaustively searched across
  all 112 Prisma models — only the billing module was inspected in this depth.

## Complete findings list
| ID | Title | Category | Severity | Priority | Confidence | Status |
|----|-------|----------|----------|----------|------------|--------|
| BACKEND-001 | CORS trusts any `chrome-extension://` origin with credentials in production | TD-SEC | HIGH | P1 | HIGH | CONFIRMED |
| BACKEND-002 | Stripe charges have no local persistence and no inbound webhook | TD-INTEGRATION, TD-FEAT, TD-BILLING | MEDIUM | P2 | HIGH | CONFIRMED |
| BACKEND-003 | Stripe/Omie/Slack integrations shipped with zero automated tests | TD-TEST | MEDIUM | P1 | HIGH | CONFIRMED |
| BACKEND-004 | `Lead.owner` mixes user id/name; ownership fallback has same-name collision risk | TD-DATA, TD-ARCH | MEDIUM | P2 | HIGH | CONFIRMED |
| BACKEND-005 | `/api/usage` leaks a platform-wide (cross-tenant) `unattributedCalls` counter | TD-TENANT, TD-BUG | MEDIUM | P3 | HIGH | CONFIRMED |
| BACKEND-006 | 5 of 12 Commercial Agent Cell agents registered but unreachable (no route) | TD-AGENT, TD-DEAD | LOW | P3 | HIGH | CONFIRMED |
| BACKEND-007 | `billing-revenue` agent/module is a confirmed placeholder, no real invoicing source | TD-BILLING, TD-FEAT | LOW | P4 | HIGH | CONFIRMED |
| BACKEND-008 | gov.br e-signature transport and inbound e-mail webhook remain documented stubs | TD-INTEGRATION | LOW | P3 | HIGH | CONFIRMED |

## Capability assessment
See `capability_rows` in the structured output for the machine-readable version of this table.

| Capability | Status | Notes |
|---|---|---|
| Backend routing/auth/tenant wiring | FUNCTIONAL | Centralized, defense-in-depth, well-documented; one real CORS hole (BACKEND-001). |
| Database/Prisma layer | FUNCTIONAL | 112-model schema, transparent field encryption for credentials confirmed real, RLS-aware auth bypass documented and scoped. |
| Integrations (Bitrix/WhatsApp/3CX/Birth Voice/Google/Chatwoot) | FUNCTIONAL | Mature, heavily tested, SSRF-guarded where user-supplied URLs exist. |
| Integrations (Stripe/Omie/Slack — new) | PARTIAL | Real API calls, real encryption, but Stripe lacks persistence/webhook and none have tests. |
| AI agents (Swarm, 3 of 12 Commercial Cell) | FUNCTIONAL | Wired end-to-end with routes, rate limiting, and RBAC. |
| AI agents (5 of 12 Commercial Cell) | PARTIAL | Implemented, registered, unreachable via HTTP. |
| Billing/invoicing | MOCKED | Deliberate placeholder; token-cost tracking exists, real invoicing does not. |
| E-signature (gov.br) | MOCKED | State machine/webhook real, transport is a documented stub. |
| Inbound e-mail | MOCKED | Documented stub, no real inbound-parse provider. |
| LGPD erasure/export/audit | FUNCTIONAL | RBAC-gated, audited, a previously-shipped envelope bug already fixed. |
| Tests (backend) | PARTIAL | ~22% file-level ratio; strong for mature integrations, absent for the newest ones. |
| Security (CORS/Helmet/rate limiting/secrets) | PARTIAL | Strong overall design, one confirmed HIGH-severity CORS gap. |
| Observability (metrics/health/tracing) | FUNCTIONAL | Prometheus, OTel, structured logging, dual-process health checks, operator-token-gated metrics. |
| Multi-tenancy | PARTIAL | Consistently enforced except the one confirmed leak in BACKEND-005. |
