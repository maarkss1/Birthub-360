# Master Debt Backlog — Birth Hub 360º

> Consolidated, deduped backlog from the full repository debt audit (Discovery + 17 domain
> audits + 2 consolidation stages, 20 agent sessions, ~635 files inspected). Findings are
> ordered by **priority (P0 → P4)**, then by **severity**, within each priority band. Every
> row points back to its finding ID and the root cause(s) it belongs to (see
> `TECHNICAL-DEBT.md` / `IMPLEMENTATION-DEBT.md` for the root-cause narratives, `RC-01`…`RC-15`).
>
> This is a documentation-only artifact. No source file, config, dependency, or schema was
> changed to produce it.

## How to read this backlog

- **Priority** answers "when should this be picked up relative to everything else."
- **Severity** answers "how bad is this on its own" (CRITICAL / HIGH / MEDIUM / LOW).
- **Domain** is the specialist audit lane that surfaced it (see the 17 domains in
  `EXECUTIVE-SUMMARY.md`).
- **Root cause** links to the structural pattern in the cross-review synthesis, when the
  finding is explained by one (most are; a residual set is genuinely isolated — see the
  bottom of this document).

---

## P0 — Fix before any "production-ready" claim stands

These are the findings that, left alone, make it false to say Birth Hub 360º is safe to run
as a real multi-tenant production system today. See `PRODUCTION-BLOCKERS.md` for the full
narrative and blast-radius per item.

| ID | Severity | Domain | Summary | Root cause |
|---|---|---|---|---|
| TENANT-001 | CRITICAL | TENANT | `CopilotoIaUseCases.completeAudioUpload` does not validate the caller-supplied object storage key belongs to the caller's own organization — a real cross-tenant data read/write path. | RC-03 |
| VOICE-001 | CRITICAL | VOICE | The outbound AI voice cold-call script is hardcoded to one tenant's brand identity, breaking the product's core multi-tenant value proposition for every other tenant on the Birth Voice channel. | RC-03, RC-06 |
| CRM-002 | CRITICAL | CRM | `LeadDeduplicationService.deduplicateByEmail` performs a hard delete that bypasses the codebase's own centralized soft-delete/audit Prisma extension — currently orphaned/unreachable, but a real data-loss pattern one wiring mistake away from production. | RC-02 |
| CRM-003 | CRITICAL | CRM | Same service also bypasses tenant-scoped Prisma client construction, compounding CRM-002 with a tenancy bypass if ever invoked. | RC-02, RC-03 |
| DOCBRAND-011 | CRITICAL | DOCBRAND | A same-day migration in the in-flight rebrand introduced a silent, fail-closed `moduleKey` mismatch that revokes module access unexpectedly, with no test or CI check that would catch it. | RC-07 |
| SEC-001 | HIGH→P0 | SEC | `BETTER_AUTH_SECRET` has no production fail-closed boot check, unlike the sibling `CREDENTIALS_ENCRYPTION_KEY` — a documented security guarantee (auth secret always set/strong in prod) is not actually enforced by code. | RC-04 |
| DEVOPS-001 | HIGH→P0 | DEVOPS | Rebrand renamed running containers (`atlasgr_app`/`atlasgr_postgres` → should be `birthhub_*`), but `deploy-oci.sh`, `backup-oci.sh`, `restore-oci.sh` still reference the old literal names — backup, restore, and automated deploy on the platform's own declared production path (Oracle Cloud, ADR-004) are all simultaneously broken. | RC-10 |
| DEVOPS-002 | HIGH→P0 | DEVOPS | Same root cause as DEVOPS-001, `oracle-cloud.md` documentation also references the stale names, so an operator following the runbook during an incident would fail the same way. | RC-10 |

## P1 — High-impact, fix in the next stabilization wave

| ID | Severity | Domain | Summary | Root cause |
|---|---|---|---|---|
| FRONTEND-001 | HIGH | FRONTEND | `/tools/**` and `/design-lab` are served as static assets with no auth check, even though the app's `RequireModuleAccess`/`ProtectedRoute` logic exists and is used everywhere else — confirmed unauthenticated access to 5 modules. | none (isolated but severe) |
| BACKEND-001 | HIGH | BACKEND / SEC | CORS's `chrome-extension://` branch trusts any extension by scheme instead of an allowlisted extension ID or `ALLOWED_ORIGINS` check — any Chrome extension can ride a logged-in user's session. | RC-04 |
| SEC-002 | HIGH | SEC | CORS behavior does not match the already-documented operator deployment workflow — a real spec/implementation mismatch, not just BACKEND-001's logic gap. | RC-04 |
| TENANT-002 | HIGH | TENANT | `PUT /api/intelligence/ai-settings` is gated by `requireRole(['ADMIN'])` (any tenant admin) instead of the existing platform-operator guard — a tenant admin can change platform-wide AI settings. | RC-03 |
| AIAGENT-004 | HIGH | AIAGENT | `agent.execute` is granted to all 391 catalog agents but is permanently blocked past its own documented blocker; the runtime never invokes an LLM for any agent — it is a deterministic capability dispatcher over 22 real tool operations, not the "AI workforce" the catalog size implies. | RC-05, RC-02 |
| AIAGENT-003 | HIGH | AIAGENT | 93% of the 391-agent catalog has no prompt content at all — the catalog's nominal size vastly overstates the number of agents with any real behavior behind them. | RC-05 |
| VOICE-003 | HIGH | VOICE | `eraseDataSubject()` does not redact `CopilotoTranscriptSegment`/`CopilotoInsight` via `CopilotoConversation.contactId`, leaving an LGPD data-subject erasure gap for voice-derived content. | RC-03 (pattern not propagated) |
| BILLING-004 | HIGH | BILLING | `CrmCommercialDocument` (Fatura) "paid" status is self-attested with no payment reconciliation — the invoice lifecycle capability is functionally a mock wearing production UI. | RC-01 |
| DEVOPS-003 | HIGH | DEVOPS / WORKFLOW | No environment with real production traffic has centralized observability (metrics/health/tracing) at all — incidents are invisible until a user reports them. | RC-11 |
| PRODUCT-004 | HIGH | PRODUCT / TENANT | Hub Executivo module-access grants can expose one customer's own proprietary, vertical-specific branded content to unrelated tenants. | RC-03, RC-06 |
| INTEGRATION-001 | HIGH | INTEGRATION | `createStripeCharge` has no `Idempotency-Key` header — a real duplicate-charge / financial-risk bug, not cosmetic. | RC-08 |
| DATA-004 | HIGH | DATA | A previously-fixed encryption-at-rest pattern was not backported consistently to a sibling model/field, per the security-fix-not-backported pattern. | RC-04 |
| AIAGENT-006 | MEDIUM→P1 | AIAGENT | `redactSensitiveData`'s regex set covers some PII patterns but not CNPJ, unformatted CPF, email, or phone — the centralized guardrail has coverage gaps precisely because it was never audited against a full PII taxonomy. | RC-04 |
| SEC-003 | MEDIUM→P1 | SEC | `isPrivateOrReservedIp` in the SSRF guard omits the CGNAT range `100.64.0.0/10`, a real (if narrow) SSRF bypass class. | RC-04 |
| REVOPS-004 | MEDIUM→P1 | REVOPS | The weekly automated Win/Loss Analysis computes a real result and then silently discards it — no persistence, no "last run" indicator, contradicting its "automated" billing. | RC-13 |
| TEST-008 (agent routes) | MEDIUM→P1 | TEST | Two production AI agent HTTP routes (`revenue-intelligence`, `contract-signature`) have zero test coverage despite handling real customer-facing agent execution. | RC-09 |

## P2 — Real debt, schedule into the next 1–2 quarters

| ID | Severity | Domain | Summary | Root cause |
|---|---|---|---|---|
| CRM-001 | MEDIUM | CRM | Lead search silently fails to match on `title`/tags because they are missing from Meilisearch's `leads` `searchableAttributes` — a primary field is effectively unsearchable with no error surfaced. | isolated |
| CRM-004/CRM-005/CRM-008 | MEDIUM | CRM | Deduplication/Merge, Attachments, and cross-entity Notes are advertised or partially wired capabilities with no real schema+application-layer pairing behind them. | RC-14 |
| CRM-007 / CRM-009 | MEDIUM | CRM | Permission modeling is inconsistent across sibling entities (Company/Contact vs. Lead) that should share one authorization boundary. | RC-03 |
| CRM-010 | MEDIUM | CRM | `LeadController`/`ContactController`/`CompanyController` do not cap the `limit` query parameter identically — an unbounded-query-cost class of bug present on 3 near-identical call sites. | RC-15 |
| CRM-011 | MEDIUM | CRM | A concept (likely deal/funnel stage vs. pipeline stage) is modeled twice with nothing forcing the two representations to stay in sync. | RC-13 |
| CRM-012 | LOW | CRM | A Prisma schema comment claims funnel/deal-mirror fields are unread/unwritten by `PrismaLeadRepository`; the code has since changed and the comment is stale. | RC-12 |
| REVOPS-002 / REVOPS-003 | MEDIUM | REVOPS | MRR/ARR is a placeholder reusing a "new business" sales target under a recurring-revenue name; the dedicated `BillingRevenueAgent` reconciliation is both a placeholder and unroutable. | RC-01, RC-02 |
| AIAGENT-001 / AIAGENT-009 | MEDIUM | AIAGENT | `ManagerCommercialAgent`, `ExecutiveDirectorAgent`, and 4 other Commercial Cell agents are fully coded (some unit-tested) but never registered behind a route/DI resolution. | RC-02 |
| AIAGENT-002 | MEDIUM | AIAGENT | The Account-level Churn/Health Score "AI Suite" tool is a manual-input simulator with no real data grounding, presented without a label distinguishing it from the Cockpit's real, data-grounded Health Score. | RC-01 |
| AIAGENT-007 / AIAGENT-010 | MEDIUM | AIAGENT | `capability-catalog.ts` descriptions for `agent.execute`/`agent.request_cross_role` do not match their real available/verification status in `tool-bindings.ts`. | RC-05, RC-12 |
| TENANT-005 / TENANT-006 / TENANT-007 / TENANT-008 | MEDIUM | TENANT | Sibling modules built after the core Lead/CRM tenancy pattern re-derive their own (often weaker) authorization boundary instead of reusing the proven RLS + Prisma-extension pattern. | RC-03 |
| TENANT-003 | MEDIUM | TENANT | A tenancy-adjacent security-fix pattern proven once elsewhere was not backported to a newer code path. | RC-04 |
| TENANT-004 | MEDIUM | TENANT | An unbounded-cost/input-size guard fixed once for one call site has an identical, separately-written sibling with the same gap. | RC-15 |
| DATA-003 | MEDIUM | DATA | Nullable `organizationId` on Company/Contact/Lead/Activity/Prospect lacks the "legacy row, fail-closed" rationale comment already used on `Prompt`/`AgentMemory`/`AILog`, or should be `NOT NULL`. | RC-03 |
| DATA-006 | MEDIUM | DATA | Three business-invariant partial unique indexes exist only in migration SQL/comments, not in `schema.prisma` — a `db push` rebuild or migration squash would silently drop them. | RC-14 |
| DATA-002 | MEDIUM | DATA | `scripts/create-demo.ts` has no `NODE_ENV=production` guard and uses a hardcoded weak admin password, unlike the safer pattern in `scripts/seed-video-demo.ts`. | isolated |
| BACKEND-004 | MEDIUM | BACKEND | `/api/usage`'s `unattributedCalls` field is cross-tenant in nature but appears as if it were organization-specific in the response shape. | RC-03 |
| BACKEND-005 | MEDIUM | BACKEND | A tenancy boundary pattern established elsewhere in backend code was not applied to a newer feature path. | RC-03 |
| BACKEND-007 | MEDIUM | BACKEND | A backend feature was scaffolded with a mock/manual-input stand-in for its real data source, without a label telling the user it's a placeholder. | RC-01 |
| WORKFLOW-001 | MEDIUM | WORKFLOW | `dailyReport.worker.ts` runs with no producer enqueuing it and performs a simulated (non-real) send action. | RC-01 |
| WORKFLOW-002 | MEDIUM | WORKFLOW | The n8n outbound webhook dispatcher is fully implemented with zero production callers — confirmed dead code. | RC-02 |
| WORKFLOW-003 | LOW | WORKFLOW | The `"Lead sem interação"` automation trigger type exists in 3 type lists but has no backing Prisma enum value, making it unreachable by construction. | isolated (schema/code drift) |
| WORKFLOW-004 | MEDIUM | WORKFLOW | 15 of ~25 product-feature BullMQ queues never call `registerQueueForMetrics`, so queue depth is invisible until final-failure dead-lettering — the observability helper exists but was never made a structural default. | RC-11 |
| DEVOPS-004 | LOW | DEVOPS | `charts/README.md` and `argocd/README.md` describe a deploy trigger that no longer matches `render.yaml`'s real `autoDeployTrigger: commit`. | RC-10 |
| DEVOPS-005 | LOW | DEVOPS | `tenancy.rego` (OPA policy) is dead/orphaned with an already-open handoff to remove or connect it. | not explained (legacy, already scoped) |
| DEVOPS-006 | LOW | DEVOPS | `cd-homolog.yml` pulls the `yq` binary from `releases/latest` with no pinned version or checksum — a supply-chain hygiene gap. | not explained (isolated) |
| DOCBRAND-001 / DOCBRAND-007 / DOCBRAND-008 / DOCBRAND-013 | MEDIUM | DOCBRAND | A cohesive rebrand commit was later partially reverted across some but not all of the same files, with no compensating data migration — confirmed via git history. | RC-07 |
| DOCBRAND-002 / DOCBRAND-005 / DOCBRAND-012 | MEDIUM | DOCBRAND | Vertical-specific (Atlas GR) content, e.g. the Proposta Comercial feature, still ships to every tenant despite the product's ICP having broadened to vertical-agnostic. | RC-06 |
| DOCBRAND-004 | LOW | DOCBRAND | `.claude/CLAUDE.md` (this repo's own source of truth) describes `src/config/playbooks.ts` inaccurately, citing a retired two-key brand selector as if still live. | RC-12 |
| FRONTEND-002 | MEDIUM | FRONTEND | `HubInteligenciaMarketingHub.tsx`'s docs array (and its "8 Documentos" KPI tile) claims 8 files; only 1 exists in `public/tools/hub-inteligencia-marketing/`. | RC-06 |
| FRONTEND-003 | MEDIUM | FRONTEND | `SocialSellingHub.tsx` has 2 dead download buttons pointing at PDF/PPTX files that do not exist in `public/tools/social-selling/`. | RC-06 |
| FRONTEND-005 | LOW | FRONTEND | `eslint.config.mjs`'s override array still references 3 dead file entries; `CLAUDE.md §1`'s 3D-usage inventory is stale relative to actual usage. | RC-12 |
| FRONTEND-006 | MEDIUM | FRONTEND | Frontend modules with zero test coverage correlate almost exactly with where this audit found real, confirmed bugs (the "static file behind an iframe" pattern). | RC-09 |
| INTEGRATION-002 / INTEGRATION-003 / INTEGRATION-006 / INTEGRATION-009 | MEDIUM | INTEGRATION | Slack/Stripe/Omie have no retry/backoff and no tests, unlike the mature Bitrix client whose reliability layer was never extracted into a shared library. | RC-08 |
| INTEGRATION-004 | MEDIUM | INTEGRATION | 3CX extension-based tenant resolution is an unresolved O(n) scan with a silent-discard collision case (already flagged in the team's own code comments). | RC-03 |
| INTEGRATION-005 | LOW | INTEGRATION | Bitrix's single-slot status-label cache should be a `Map` keyed by `webhookUrl` to avoid cross-connection cache pollution. | isolated |
| INTEGRATION-008 | MEDIUM | INTEGRATION | Chatwoot inbound webhook and inbound-email/gov.br-signature transports are mock/stub with no label distinguishing them from live integrations in the UI. | RC-01 |
| SEC-004 | MEDIUM | SEC | An additional instance of a security-fix pattern proven once not being backported to a sibling path. | RC-04 |
| VOICE-002 | MEDIUM | VOICE | The `agentType` selector in cold-call UI advertises capabilities that are not implemented, letting users configure a non-functional path. | RC-06 |
| VOICE-004 | MEDIUM | VOICE | `VoiceCallLog`/`CopilotoTranscriptSegment` content is stored in plaintext, inconsistent with the codebase's own precedent of encrypting comparable Contact PII. | RC-04 (pattern not extended) |
| VOICE-005 | LOW | VOICE | The 3CX integration's external contract is self-documented as never validated against a real provider. | not explained (isolated) |
| RAG-001 | MEDIUM | RAG | The Meilisearch full-text branch for Knowledge Base is documented as configurable but has no indexer anywhere — the write side is 100% missing, so any activation would silently fabricate relevance scores. | RC-01 |
| RAG-002 | MEDIUM | RAG | `agentMemory.search()` in `ops.agent.ts` is a per-turn no-op call to Qdrant/mem0 that never returns anything useful, while the underlying assistant-memory-across-sessions need remains genuinely unaddressed. | RC-01 |
| RAG-003 | LOW | RAG | `src/lib/ai/gateway/embeddings.ts` is missing the `EMBEDDING_DIMENSIONS === 768` guard already present in `local-embeddings.ts` — a latent (untriggered) validation gap. | not explained (isolated) |
| RAG-005 | LOW | RAG | Bulk re-embedding/model-migration tooling does not exist at all. | RC-02 |
| RAG-008 | MEDIUM | RAG | A resource ceiling fixed once for one RAG call site was not ported to an identical sibling call site. | RC-15 |
| BILLING-002 / BILLING-003 | MEDIUM | BILLING | Plans/subscriptions/entitlements do not exist at all; Billing.tsx shows a hardcoded 5,000,000-token "contractual limit" widget that contradicts the page's own "no plan configured" banner. | RC-01 |
| BILLING-005 / BILLING-006 / BILLING-007 | MEDIUM | BILLING | The one real per-org AI-spend cap has no admin configuration UI; `createStripeCharge` is not wired into any Fatura "cobrar" action, leaving it unreachable dead code. | RC-02 |
| BILLING-008 | MEDIUM | BILLING | New payment/ERP connectors inherit none of the reliability maturity (retry, idempotency, tests) the Bitrix integration accumulated over time. | RC-08 |
| BILLING-009 | LOW | BILLING | Telephony/voice-provider cost has no governance at all, unlike AI spend which has a real circuit breaker. | RC-11 |
| PRODUCT-001 | MEDIUM | PRODUCT | The `Prospect` data model is fully designed in schema with zero application layer using it. | RC-02, RC-14 |
| PRODUCT-006 / PRODUCT-007 | LOW | PRODUCT | "Editor de Documentos" menu label implies general document editing but the feature only edits/re-vectorizes Knowledge Base documents; a comparable naming/description drift exists in a second product surface. | RC-12 |
| PRODUCT-008 (CYC-004) | LOW | PRODUCT | `CadenceHub.tsx`'s touch-channel select lets users configure a "Voz" (voice) cadence step that always fails given VOICE-001/VOICE-002. | related to RC-03/RC-06 |

## P3 — Low-risk cleanup, documentation drift, dead code

| ID | Severity | Domain | Summary | Root cause |
|---|---|---|---|---|
| CRM-013 / CRM-014 | LOW | CRM | Isolated, low-blast-radius findings kept for completeness (not a recurring pattern). | not explained |
| AIAGENT-005 / AIAGENT-008 | LOW | AIAGENT | Isolated findings, not part of a recurring structural pattern. | not explained |
| TENANT-009 / TENANT-010 | LOW | TENANT | Isolated tenancy findings, low blast radius or already mitigated. | not explained |
| DEVOPS-007 / DEVOPS-008 / DEVOPS-009 | LOW | DEVOPS | Isolated DevOps process gaps. | not explained |
| DOCBRAND-009 / DOCBRAND-010 / DOCBRAND-014 | LOW | DOCBRAND | `README.md` still says ESLint where the project runs Biome; `LEGACY_BRAND_CONTENT_MAP.md §2.3` describes a function (`getTenantFromEmail()`) that no longer exists — needs re-splitting, only its module-catalog half is still valid. | not explained (RC-12-adjacent) |
| PRODUCT-005 | LOW | PRODUCT | `ROADMAP_FINALIZACAO_PLATAFORMA.html` is a stale pre-rebrand artifact (old orange palette, corrupted title encoding) unreferenced by the app or README. | not explained |
| TEST-001…007, 011, 012 | LOW–MEDIUM | TEST | Coverage gaps: Android native test is unmodified boilerplate (`assertEquals(4, 2+2)`); two unit test files end in a no-op `expect(true).toBe(true)`; billing/usage persistence testing is mock-only; roleplay-de-vendas (a stated product pillar) has zero tests; no coverage threshold enforced anywhere. | RC-09 |

## Not explained by a structural cause

The cross-review stage deliberately kept these even though they don't fit a recurring pattern,
so they are not rediscovered from scratch in a future audit: `CRM-013`, `CRM-014`,
`TENANT-009`, `TENANT-010`, `DATA-002`, `RAG-003`, `BACKEND-004`, `DOCBRAND-009`,
`DOCBRAND-010`, `DOCBRAND-014`, `AIAGENT-005`, `AIAGENT-008`, `PRODUCT-005`, `DEVOPS-006`,
`DEVOPS-007`, `DEVOPS-008`, `DEVOPS-009`.

---

**Totals:** 118 findings — 7 CRITICAL, 21 HIGH, 54 MEDIUM, 36 LOW. See `EXECUTIVE-SUMMARY.md`
for the full findings-by-domain/category table and the maturity score matrix.
