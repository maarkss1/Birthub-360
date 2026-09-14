# Capability Matrix — Repository Debt Audit

One row per real product capability, merged from all domain specialists' capability assessments.
Where specialists disagreed on a column for the same capability, the more conservative (lower)
rating is kept and the disagreement is noted. Values: `COMPLETE`, `FUNCTIONAL`, `PARTIAL`,
`MOCKED`, `MISSING`, `BROKEN`, `LEGACY`, `UNKNOWN`, `N/A`.

Audit date: 2026-09-12. Branch `fix/fase1-alta-prioridade`.

## CRM Core

| Capability | Frontend | Backend | Database | Integration | AI | Automation | Tests | Security | Tenancy | Observability | Documentation | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Lead CRUD & status lifecycle | COMPLETE | COMPLETE | COMPLETE | FUNCTIONAL | N/A | FUNCTIONAL | FUNCTIONAL | FUNCTIONAL | COMPLETE | FUNCTIONAL | PARTIAL | FUNCTIONAL |
| Company / Contact CRUD | COMPLETE | COMPLETE | COMPLETE | FUNCTIONAL | N/A | N/A | FUNCTIONAL | PARTIAL (CRM-007: no ownership gate) | COMPLETE | FUNCTIONAL | PARTIAL | FUNCTIONAL |
| Pipeline / Stage & Kanban movement | COMPLETE | COMPLETE | COMPLETE | FUNCTIONAL | N/A | FUNCTIONAL | FUNCTIONAL | FUNCTIONAL | COMPLETE | PARTIAL | PARTIAL | FUNCTIONAL |
| Search & Filtering | COMPLETE | PARTIAL (CRM-001: title unsearchable once Meili healthy) | COMPLETE | PARTIAL | N/A | N/A | PARTIAL | FUNCTIONAL | COMPLETE | PARTIAL | MISSING | PARTIAL |
| Deduplication / Merge | MISSING | MOCKED (CRM-002/003: hard-delete, no real merge, orphaned) | PARTIAL | N/A | N/A | PARTIAL | MOCKED | PARTIAL | UNKNOWN | PARTIAL | MISSING | MOCKED |
| Notes | PARTIAL (Lead only, CRM-004) | PARTIAL | PARTIAL | N/A | N/A | N/A | UNKNOWN | FUNCTIONAL | COMPLETE | MISSING | MISSING | PARTIAL |
| Attachments | MISSING | MISSING | MISSING (CRM-005) | N/A | N/A | N/A | MISSING | N/A | N/A | N/A | MISSING | MISSING |
| Tags & Custom Fields | PARTIAL (CRM-011: Lead=JSON, Company=array) | PARTIAL | PARTIAL | N/A | N/A | N/A | PARTIAL | FUNCTIONAL | COMPLETE | MISSING | MISSING | PARTIAL |
| Import / Export (CSV, Bitrix) | COMPLETE | COMPLETE | COMPLETE | FUNCTIONAL | N/A | FUNCTIONAL | PARTIAL | FUNCTIONAL | COMPLETE | FUNCTIONAL | PARTIAL | FUNCTIONAL |
| Owners / Permissions | PARTIAL | PARTIAL (CRM-007/009) | COMPLETE | N/A | N/A | FUNCTIONAL | PARTIAL | PARTIAL (BACKEND-004: name-collision fallback) | COMPLETE | PARTIAL | PARTIAL | PARTIAL |
| History / Audit / Timeline | COMPLETE | COMPLETE | COMPLETE | N/A | N/A | FUNCTIONAL | PARTIAL | FUNCTIONAL | COMPLETE | FUNCTIONAL | PARTIAL | FUNCTIONAL |
| Bitrix-mirrored commercial fields (9 fields) | MISSING (CRM-006) | PARTIAL | COMPLETE | FUNCTIONAL | N/A | N/A | UNKNOWN | N/A | COMPLETE | MISSING | PARTIAL | PARTIAL |

## Revenue / Commercial Intelligence

| Capability | Frontend | Backend | Database | Integration | AI | Automation | Tests | Security | Tenancy | Observability | Documentation | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Forecast / Commit / Best Case / Upside (weighted probability) | COMPLETE | COMPLETE | COMPLETE | N/A | N/A | COMPLETE | COMPLETE | COMPLETE | COMPLETE | FUNCTIONAL | COMPLETE | PRODUCTION READY |
| Pipeline Coverage (90-day protection) | COMPLETE | COMPLETE | COMPLETE | N/A | N/A | N/A | COMPLETE | COMPLETE | COMPLETE | FUNCTIONAL | COMPLETE | PRODUCTION READY |
| Win Rate / Sales Cycle / Ticket Médio / Aging | COMPLETE | COMPLETE | COMPLETE | N/A | N/A | N/A | COMPLETE | COMPLETE | COMPLETE | FUNCTIONAL | COMPLETE | PRODUCTION READY |
| Pipeline Creation / Pace / Goal Attainment | COMPLETE | COMPLETE | COMPLETE | N/A | N/A | N/A | COMPLETE | COMPLETE | COMPLETE | FUNCTIONAL | COMPLETE | PRODUCTION READY |
| Health Score composto (6 pillars) & Forecast Accuracy | COMPLETE | COMPLETE | COMPLETE | N/A | N/A | COMPLETE | COMPLETE | COMPLETE | COMPLETE | FUNCTIONAL | COMPLETE | PRODUCTION READY |
| Pipeline Velocity | MISSING | MISSING (REVOPS-001, confirmed: zero matches for "velocity" in commercial-intelligence) | N/A | N/A | N/A | N/A | MISSING | N/A | N/A | MISSING | MISSING | NOT IMPLEMENTED |
| MRR/ARR recurring-revenue + sold-vs-billed reconciliation | PARTIAL | PARTIAL | MISSING | MISSING | FUNCTIONAL (agent code exists, unrouted) | MISSING | PARTIAL | N/A | N/A | MISSING | COMPLETE (honestly documented as absent) | PLACEHOLDER |
| Account-level Churn / Health Score (AI Suite manual tool) | FUNCTIONAL | FUNCTIONAL | MISSING | MISSING | FUNCTIONAL | N/A | PARTIAL | FUNCTIONAL | FUNCTIONAL | MISSING | PARTIAL | MOCKED (manual-input only, shares a name with the real Cockpit score) |
| Weekly automated Win/Loss Analysis | FUNCTIONAL | PARTIAL | MISSING (REVOPS-004: result never persisted) | MISSING | FUNCTIONAL | PARTIAL | MISSING | FUNCTIONAL | FUNCTIONAL | PARTIAL | PARTIAL | BROKEN (runs, output discarded) |

## AI Agents / Job-Roles Runtime

| Capability | Frontend | Backend | Database | Integration | AI | Automation | Tests | Security | Tenancy | Observability | Documentation | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Production Swarm (Supervisor + SDR/BDR/Closer/CRM/Ops) | N/A | COMPLETE | COMPLETE | COMPLETE | COMPLETE | COMPLETE | FUNCTIONAL | COMPLETE | COMPLETE | FUNCTIONAL | FUNCTIONAL | FUNCTIONAL |
| LearningAgent (versioned, human-approved style profile) | UNKNOWN | COMPLETE | COMPLETE | N/A | COMPLETE | COMPLETE | FUNCTIONAL | COMPLETE | COMPLETE | FUNCTIONAL | FUNCTIONAL | FUNCTIONAL |
| Commercial Cell — 3 routed agents (revenue-intel, churn, contract-signature) | UNKNOWN | COMPLETE | COMPLETE | COMPLETE | COMPLETE | PARTIAL | PARTIAL (TEST-001: zero tests for revenue-intel/contract-signature, confirmed) | COMPLETE | COMPLETE | PARTIAL | FUNCTIONAL | FUNCTIONAL |
| Commercial Cell — 5 unrouted agents + BillingRevenueAgent | MISSING | COMPLETE | N/A | N/A | COMPLETE | MISSING | MISSING | N/A | N/A | MISSING | PARTIAL | ORPHANED (confirmed: zero matches in `agent.routes.ts`) |
| agent.execute capability (generic runtime invocation) | N/A | COMPLETE (runtime exists, confirmed wired) | COMPLETE | PARTIAL | MISSING (confirmed: no LLM invoke call in agentRuntime.service.ts) | COMPLETE | FUNCTIONAL | COMPLETE (fails closed) | COMPLETE | FUNCTIONAL | PARTIAL | BLOCKED (confirmed: denied at authorization step 11 for all 391 grants) |
| 379-agent normalized catalog (as executable AI workforce) | UNKNOWN | PARTIAL | COMPLETE | MOCKED | MISSING (confirmed: 27/379 have a prompt, 28/379 EXISTING_SERVICE) | BROKEN | PARTIAL | COMPLETE | COMPLETE | PARTIAL | MOCKED (count overstates real capability ~10x) | PARTIALLY IMPLEMENTED |
| AI Gateway (model routing, fallback, circuit breaker, cost budget) | N/A | COMPLETE | COMPLETE | COMPLETE | COMPLETE | COMPLETE | FUNCTIONAL | COMPLETE | COMPLETE | COMPLETE | FUNCTIONAL | PRODUCTION READY |
| Guardrails (PII redaction, prompt-injection defense, LGPD consent) | N/A | PARTIAL (AIAGENT-006: CPF-only regex, confirmed) | PARTIAL | N/A | COMPLETE | PARTIAL | FUNCTIONAL | PARTIAL | PARTIAL (AIAGENT-005: env-var global gate) | FUNCTIONAL | FUNCTIONAL | PARTIALLY FUNCTIONAL |
| Human approval gates (AIPendingAction, learning-profile approve/reject) | UNKNOWN | COMPLETE | COMPLETE | N/A | N/A | COMPLETE | FUNCTIONAL | COMPLETE | COMPLETE | COMPLETE | FUNCTIONAL | FUNCTIONAL |

## Knowledge Base / RAG

| Capability | Frontend | Backend | Database | Integration | AI | Automation | Tests | Security | Tenancy | Observability | Documentation | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Ingestion & chunking | COMPLETE | COMPLETE | COMPLETE | N/A | N/A | N/A | FUNCTIONAL | FUNCTIONAL | COMPLETE | PARTIAL | COMPLETE | FUNCTIONAL |
| Embedding generation (local e5, gateway fallback) | N/A | FUNCTIONAL | N/A | PARTIAL (RAG-003: no dimension guard on legacy path) | FUNCTIONAL | N/A | PARTIAL | FUNCTIONAL | N/A | PARTIAL | COMPLETE | FUNCTIONAL |
| Vector storage & indexing (pgvector) | N/A | COMPLETE | COMPLETE | N/A | N/A | N/A | FUNCTIONAL | COMPLETE | COMPLETE | PARTIAL | COMPLETE | COMPLETE |
| Hybrid search (RRF: vector + Postgres full-text) | COMPLETE | COMPLETE | COMPLETE | N/A | N/A | N/A | PARTIAL (RAG-006: no unit test for RRF fusion) | COMPLETE | COMPLETE | PARTIAL | COMPLETE | FUNCTIONAL |
| Meilisearch full-text branch for Knowledge Base | N/A | BROKEN (RAG-001, confirmed dead index) | MISSING | MOCKED | N/A | MISSING | MISSING | PARTIAL | UNKNOWN | MISSING | PARTIAL | MOCKED |
| LLM reranking (opt-in) | FUNCTIONAL | COMPLETE | N/A | N/A | COMPLETE | N/A | COMPLETE | COMPLETE | N/A | FUNCTIONAL | COMPLETE | COMPLETE |
| Knowledge Copilot RAG (grounded Q&A + citations) | PARTIAL (RAG-007: only in dev test console) | COMPLETE | N/A | N/A | COMPLETE | N/A | COMPLETE | COMPLETE | COMPLETE | FUNCTIONAL | COMPLETE | FUNCTIONAL |
| Document lifecycle (edit/reindex, delete, freshness, repair) | COMPLETE | COMPLETE | COMPLETE | N/A | N/A | N/A | FUNCTIONAL | COMPLETE | COMPLETE | PARTIAL | COMPLETE | FUNCTIONAL |
| Bulk re-embedding / model-migration tooling | MISSING | MISSING (RAG-004) | N/A | N/A | N/A | MISSING | MISSING | N/A | N/A | MISSING | PARTIAL | MISSING |
| Agent long-term memory (mem0/Qdrant) | MISSING | BROKEN (RAG-002, confirmed: write side never called) | N/A | PARTIAL | MOCKED | MISSING | MISSING | UNKNOWN | PARTIAL | MISSING | PARTIAL | BROKEN |
| Qdrant as a second vector database | N/A | MISSING (deliberately inert, RAG-005) | MISSING | MISSING | N/A | N/A | MISSING | N/A | N/A | FUNCTIONAL | COMPLETE | N/A (documented decision) |

## Voice / Telephony

| Capability | Frontend | Backend | Database | Integration | AI | Automation | Tests | Security | Tenancy | Observability | Documentation | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Outbound AI voice SDR calling (Birth Voices Hub / Bland) | FUNCTIONAL | FUNCTIONAL | FUNCTIONAL | FUNCTIONAL | PARTIAL | FUNCTIONAL | PARTIAL | FUNCTIONAL | BROKEN (VOICE-001, confirmed CRITICAL) | FUNCTIONAL | FUNCTIONAL | PARTIALLY FUNCTIONAL — hardcoded to one tenant's brand |
| Cold-call campaign automation | FUNCTIONAL | FUNCTIONAL | FUNCTIONAL | FUNCTIONAL | N/A | FUNCTIONAL | FUNCTIONAL | FUNCTIONAL | FUNCTIONAL | FUNCTIONAL | FUNCTIONAL | FUNCTIONAL |
| Call opt-out / suppression enforcement | FUNCTIONAL | FUNCTIONAL | FUNCTIONAL | N/A | N/A | FUNCTIONAL | FUNCTIONAL | FUNCTIONAL | FUNCTIONAL | FUNCTIONAL | FUNCTIONAL | FUNCTIONAL |
| agentType routing (sdr/nps/reactivation) | N/A | BROKEN (VOICE-002, confirmed: prompt builder ignores agentType) | FUNCTIONAL | N/A | PARTIAL | PARTIAL | UNKNOWN | N/A | N/A | FUNCTIONAL | FUNCTIONAL | PARTIAL |
| 3CX PABX Click-to-Call + Call Flow webhook | FUNCTIONAL | PARTIAL | FUNCTIONAL | UNKNOWN (VOICE-005, confirmed: contract self-documented unverified against real PABX) | N/A | N/A | PARTIAL | FUNCTIONAL | PARTIAL (VOICE-008/INTEGRATION-004, confirmed O(n) tenant scan) | FUNCTIONAL | FUNCTIONAL | PARTIALLY IMPLEMENTED |
| Call recording & transcription (Whisper STT) | FUNCTIONAL | FUNCTIONAL | PARTIAL (VOICE-006: recordingUrl always null on primary path) | FUNCTIONAL | FUNCTIONAL | FUNCTIONAL | FUNCTIONAL | PARTIAL (plaintext storage, see below) | FUNCTIONAL | FUNCTIONAL | FUNCTIONAL | PARTIALLY FUNCTIONAL |
| Call → Copiloto Comercial IA insight extraction | FUNCTIONAL | FUNCTIONAL | FUNCTIONAL | FUNCTIONAL | FUNCTIONAL | FUNCTIONAL | FUNCTIONAL | PARTIAL (VOICE-003, confirmed: LGPD erasure gap) | FUNCTIONAL | FUNCTIONAL | FUNCTIONAL | PARTIALLY FUNCTIONAL |
| Voice-call/consent-to-record LGPD compliance | N/A | PARTIAL | PARTIAL | N/A | N/A | N/A | PARTIAL | PARTIAL | FUNCTIONAL | FUNCTIONAL | FUNCTIONAL | PARTIAL |
| Call/message content encryption at rest (VoiceCallLog, CopilotoTranscriptSegment, WhatsAppMessage, ThreeCXCallEvent) | N/A | MISSING (DATA-004/VOICE-004, confirmed: not in ENCRYPTED_MODEL_FIELDS) | MISSING | N/A | N/A | N/A | MISSING | MISSING | N/A | N/A | PARTIAL | MISSING |
| Voice-provider billing/cost visibility | MISSING | MISSING (BILLING-002/VOICE-007, confirmed) | MISSING | N/A | N/A | N/A | N/A | N/A | N/A | MISSING | N/A | MISSING |
| Browser-based voice UX (Web Speech, dictation, roleplay mic) | FUNCTIONAL | N/A | N/A | N/A | N/A | N/A | UNKNOWN | N/A | N/A | N/A | FUNCTIONAL | FUNCTIONAL (correctly separate from real telephony) |

## Integrations

| Capability | Frontend | Backend | Database | Integration | AI | Automation | Tests | Security | Tenancy | Observability | Documentation | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Bitrix24 (leads/deals sync, webhooks) | COMPLETE | COMPLETE | COMPLETE | COMPLETE | N/A | FUNCTIONAL | COMPLETE | COMPLETE | COMPLETE | COMPLETE | COMPLETE | FUNCTIONAL |
| Google Workspace OAuth (Gmail/Calendar readonly) | FUNCTIONAL | COMPLETE | COMPLETE | COMPLETE | N/A | N/A | UNKNOWN | COMPLETE | COMPLETE | PARTIAL | COMPLETE | FUNCTIONAL |
| WhatsApp (Baileys) | COMPLETE | COMPLETE | COMPLETE | FUNCTIONAL | N/A | FUNCTIONAL | FUNCTIONAL | COMPLETE | COMPLETE | COMPLETE | COMPLETE | FUNCTIONAL |
| Slack connector | COMPLETE | FUNCTIONAL | COMPLETE | PARTIAL (INTEGRATION-002, confirmed no retry) | N/A | MISSING (not wired to automation engine) | MISSING (confirmed no tests) | COMPLETE | COMPLETE | PARTIAL | PARTIAL | PARTIAL |
| Stripe connector (charges) | PARTIAL (BILLING-005: no UI for charge creation) | PARTIAL (BACKEND-002: no persistence/webhook, confirmed) | COMPLETE | PARTIAL (INTEGRATION-001, confirmed no idempotency key; INTEGRATION-002 no retry) | N/A | MISSING | MISSING (confirmed) | COMPLETE | COMPLETE | PARTIAL | PARTIAL | PARTIAL |
| Omie connector (customers) | PARTIAL (BILLING-006: no UI) | FUNCTIONAL | COMPLETE | PARTIAL | N/A | MISSING | MISSING (confirmed) | COMPLETE | COMPLETE | PARTIAL | PARTIAL | PARTIAL |
| Chatwoot inbound webhook | MISSING | PARTIAL (validated + logged only, no CRM sync, self-documented) | N/A | MOCKED | N/A | MISSING | PARTIAL | COMPLETE | N/A | PARTIAL | COMPLETE | PARTIAL |
| Inbound email reply | N/A | FUNCTIONAL | COMPLETE | MOCKED (documented stub) | N/A | N/A | UNKNOWN | COMPLETE | PARTIAL | PARTIAL | COMPLETE | PARTIAL |
| Signature status webhook / gov.br send | UNKNOWN | FUNCTIONAL | COMPLETE | MOCKED (documented stub) | N/A | N/A | UNKNOWN | COMPLETE | COMPLETE | PARTIAL | COMPLETE | PARTIAL |
| Apollo/Hunter enrichment | UNKNOWN | FUNCTIONAL | COMPLETE | FUNCTIONAL | N/A | FUNCTIONAL | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | PARTIAL | FUNCTIONAL |
| n8n outbound webhook dispatcher | N/A | COMPLETE (built, confirmed zero callers) | N/A | MISSING | N/A | MISSING | MISSING | PARTIAL | N/A | MISSING | COMPLETE | MOCKED (dead code) |
| Connectors ↔ automation engine (Slack/Stripe/Omie as automation actions) | FUNCTIONAL (as standalone panel) | FUNCTIONAL (as standalone panel) | COMPLETE | PARTIAL | N/A | MISSING (confirmed: no automation action node) | PARTIAL | COMPLETE | COMPLETE | PARTIAL | PARTIAL | DISCONNECTED |

## Security / Auth / Tenancy (cross-cutting)

| Capability | Frontend | Backend | Database | Integration | AI | Automation | Tests | Security | Tenancy | Observability | Documentation | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Authentication (Better Auth) | COMPLETE | COMPLETE | N/A | N/A | N/A | N/A | PARTIAL | PARTIAL (SEC-001, confirmed: BETTER_AUTH_SECRET no fail-closed guard) | N/A | N/A | FUNCTIONAL | FUNCTIONAL (one secret-handling gap) |
| Authorization / RBAC | N/A | COMPLETE | N/A | N/A | N/A | N/A | FUNCTIONAL | COMPLETE | N/A | N/A | FUNCTIONAL | COMPLETE |
| Multi-tenant isolation (RLS + Prisma extension) | N/A | COMPLETE | COMPLETE | N/A | N/A | N/A | COMPLETE | COMPLETE | COMPLETE | N/A | COMPLETE | COMPLETE (core CRM models) |
| Encryption at rest (integration creds + Contact PII) | N/A | COMPLETE | COMPLETE | N/A | N/A | N/A | FUNCTIONAL | COMPLETE | N/A | N/A | COMPLETE | COMPLETE |
| CORS / HTTP security headers | N/A | FUNCTIONAL | N/A | N/A | N/A | N/A | N/A | BROKEN (SEC-002/BACKEND-001, confirmed: any chrome-extension:// origin trusted with credentials) | N/A | N/A | PARTIAL | BROKEN |
| Rate limiting (IP/tenant/account) | N/A | COMPLETE | N/A | N/A | N/A | N/A | N/A | COMPLETE | N/A | N/A | COMPLETE | COMPLETE |
| SSRF guard for tenant-supplied URLs | N/A | COMPLETE | N/A | N/A | N/A | N/A | N/A | FUNCTIONAL (SEC-003: minor CGNAT range gap) | N/A | N/A | COMPLETE | FUNCTIONAL |
| Webhook signature/replay verification | N/A | COMPLETE | N/A | COMPLETE | N/A | N/A | N/A | COMPLETE | N/A | N/A | COMPLETE | COMPLETE |
| LGPD data-subject rights (erase/export) + audit | N/A | COMPLETE (core), PARTIAL (voice/copiloto path) | FUNCTIONAL | N/A | N/A | N/A | N/A | COMPLETE (core), PARTIAL (VOICE-003) | COMPLETE | N/A | COMPLETE | PARTIAL overall |
| Object storage tenant isolation | N/A | PARTIAL | N/A | N/A | N/A | N/A | MISSING | BROKEN (TENANT-001, confirmed CRITICAL) | BROKEN | N/A | N/A | BROKEN |
| Global platform config vs. per-tenant admin separation | N/A | MISSING | N/A | N/A | N/A | N/A | N/A | PARTIAL (TENANT-002, confirmed) | PARTIAL | N/A | N/A | PARTIAL |
| Third-party integration tenant scoping (Bitrix/Slack/Stripe/Omie/3CX/Voice) | N/A | COMPLETE | N/A | FUNCTIONAL | N/A | N/A | N/A | FUNCTIONAL | FUNCTIONAL (except 3CX O(n) scan) | N/A | N/A | FUNCTIONAL |

## Billing / Usage

| Capability | Frontend | Backend | Database | Integration | AI | Automation | Tests | Security | Tenancy | Observability | Documentation | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| AI usage/cost metering | COMPLETE | COMPLETE | COMPLETE | N/A | COMPLETE | N/A | COMPLETE | COMPLETE | COMPLETE | PARTIAL | COMPLETE | FUNCTIONAL |
| Per-org / global AI spend circuit breaker | MISSING (no admin UI, BILLING-001 confirmed) | COMPLETE | COMPLETE | N/A | COMPLETE | COMPLETE | COMPLETE | COMPLETE | PARTIAL (TENANT-004, confirmed global cap still interferes) | PARTIAL | PARTIAL | PARTIAL |
| Plans / subscriptions / entitlements | MISSING | MISSING | MISSING | MISSING | N/A | N/A | N/A | N/A | N/A | MISSING | MISSING | MISSING |
| Invoice (Fatura) lifecycle / paid-status reconciliation | FUNCTIONAL | FUNCTIONAL | COMPLETE | MISSING | N/A | MISSING | PARTIAL | PARTIAL (BILLING-003, confirmed self-attested Pago) | COMPLETE | PARTIAL | PARTIAL | MOCKED |
| Telephony consumption cost tracking | MISSING | MISSING | PARTIAL | N/A | N/A | MISSING | N/A | N/A | N/A | MISSING | N/A | MISSING |
| Billing-revenue reconciliation (vendido × faturado) | MISSING | N/A | N/A | MISSING | FUNCTIONAL (honest placeholder) | N/A | N/A | N/A | N/A | N/A | COMPLETE | N/A (documented placeholder) |

## Database / Data Integrity

| Capability | Frontend | Backend | Database | Integration | AI | Automation | Tests | Security | Tenancy | Observability | Documentation | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Partial unique index invariants (active-record constraints) | N/A | N/A | PARTIAL (DATA-001, confirmed: only in migration SQL/comments, not `schema.prisma`) | N/A | N/A | N/A | PARTIAL | N/A | N/A | N/A | MISSING | PARTIAL |
| Migration safety (`migrate deploy` on fresh DB) | N/A | N/A | UNKNOWN (DATA-002, historically documented drift; not re-executed in this audit) | N/A | N/A | N/A | N/A | N/A | N/A | N/A | PARTIAL | UNKNOWN |
| Soft delete consistency (auditableModels vs. schema) | N/A | COMPLETE | COMPLETE | N/A | N/A | N/A | N/A | N/A | N/A | N/A | COMPLETE | COMPLETE (confirmed fixed) |
| Nullable organizationId on 5 central commercial models | N/A | N/A | PARTIAL (DATA-003) | N/A | N/A | N/A | N/A | N/A | PARTIAL | N/A | MISSING | PARTIAL |
| Seed/demo data safety (`create-demo.ts`) | N/A | N/A | PARTIAL (DATA-005: no env guard, hardcoded weak password) | N/A | N/A | N/A | N/A | PARTIAL | N/A | N/A | N/A | PARTIAL |

## Frontend / Legacy Modules / Brand

| Capability | Frontend | Backend | Database | Integration | AI | Automation | Tests | Security | Tenancy | Observability | Documentation | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Route tree / navigation wiring | COMPLETE | COMPLETE | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | FUNCTIONAL |
| Role/module-based UI gating (in-app routes) | COMPLETE | COMPLETE | N/A | N/A | N/A | N/A | N/A | FUNCTIONAL | N/A | N/A | N/A | FUNCTIONAL |
| Legacy static "tool hub" screens (`/tools/**`, `/design-lab`) | PARTIAL | MISSING | N/A | N/A | N/A | N/A | MISSING | BROKEN (FRONTEND-001, confirmed: `express.static` mounted with zero auth check, dev and prod) | BROKEN | N/A | PARTIAL | PARTIALLY FUNCTIONAL |
| Hub Executivo module content (social-selling, hub-inteligencia-marketing, propostas, treinamento) | FUNCTIONAL (UI renders) | MISSING | N/A | N/A | N/A | N/A | MISSING (FRONTEND-006, confirmed) | N/A | BROKEN (PRODUCT-004, confirmed cross-tenant exposure) | N/A | PARTIAL | LEGACY / PARTIAL (2 confirmed 100%-broken sub-features: FRONTEND-002/003) |
| Shared UI component library (`src/components/ui`) | PARTIAL (FRONTEND-004: 10 exported components, zero consumers) | N/A | N/A | N/A | N/A | N/A | PARTIAL | N/A | N/A | N/A | PARTIAL | PARTIAL |
| Accessibility (jsx-a11y, focus, contrast) | COMPLETE | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | FUNCTIONAL |
| 3D/gamification decorative widgets | COMPLETE | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | PARTIAL (FRONTEND-005: stale references) | FUNCTIONAL |
| Notifications (SSE-backed) | COMPLETE | COMPLETE | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | FUNCTIONAL |
| Playbook / brand data model | FUNCTIONAL | FUNCTIONAL | PARTIAL | N/A | N/A | N/A | N/A | N/A | N/A | N/A | PARTIAL (see RC-07; `CLAUDE.md` itself now accurate) | PARTIAL |
| Module access grants (`ModuleAccessGrant`) | FUNCTIONAL | FUNCTIONAL | PARTIAL (DOCBRAND-007, confirmed in-flight revert; DOCBRAND-001 migration since removed from HEAD) | N/A | N/A | N/A | N/A | FUNCTIONAL | FUNCTIONAL | N/A | PARTIAL | PARTIAL |
| OPA tenancy policy (`tenancy.rego`) | N/A | MISSING (dead, confirmed never queried) | N/A | N/A | N/A | N/A | N/A | BROKEN (misleading self-description as active control) | MOCKED | N/A | MISSING | LEGACY |

## Automation Engine & Workflows

| Capability | Frontend | Backend | Database | Integration | AI | Automation | Tests | Security | Tenancy | Observability | Documentation | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Automation engine (triggers/conditions/actions) | COMPLETE | COMPLETE | COMPLETE | PARTIAL | N/A | COMPLETE | COMPLETE | COMPLETE | COMPLETE | PARTIAL | COMPLETE | FUNCTIONAL |
| BullMQ infra queues/workers (leads, agent, search, bitrixSync, coldCall, enrichment, whatsapp) | N/A | COMPLETE | COMPLETE | COMPLETE | PARTIAL | COMPLETE | FUNCTIONAL | COMPLETE | COMPLETE | COMPLETE | COMPLETE | FUNCTIONAL |
| Product-feature queues (follow-up, dedup, cadence, LGPD anonymize, forecast, etc.) | N/A | COMPLETE | COMPLETE | PARTIAL | PARTIAL | COMPLETE | FUNCTIONAL | COMPLETE | COMPLETE | MISSING (WORKFLOW-004, confirmed pattern) | PARTIAL | PARTIAL |
| Dead-letter / failure auditing for queues | N/A | COMPLETE | COMPLETE | N/A | N/A | COMPLETE | PARTIAL | COMPLETE | COMPLETE | PARTIAL | COMPLETE | FUNCTIONAL |
| Inbound webhooks (3CX, Bitrix24, Birth Voice) | N/A | COMPLETE | COMPLETE | COMPLETE | N/A | N/A | PARTIAL | COMPLETE | COMPLETE | PARTIAL | COMPLETE | FUNCTIONAL |
| "Lead sem interação" automation trigger | N/A | N/A | MISSING (WORKFLOW-003, confirmed absent from Prisma enum) | N/A | N/A | MISSING | N/A | N/A | N/A | N/A | PARTIAL | MISSING (unreachable by construction) |
| Human approval workflow (AIPendingAction) | FUNCTIONAL | COMPLETE | COMPLETE | PARTIAL | COMPLETE | COMPLETE | FUNCTIONAL | COMPLETE | COMPLETE | PARTIAL | COMPLETE | FUNCTIONAL |

## Deploy / DevOps / Observability

| Capability | Frontend | Backend | Database | Integration | AI | Automation | Tests | Security | Tenancy | Observability | Documentation | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Deploy automatizado (Oracle Cloud, alvo ADR-004) | N/A | N/A | N/A | N/A | N/A | BROKEN (DEVOPS-001, confirmed: script container names mismatch) | MISSING | FUNCTIONAL | N/A | MISSING | PARTIAL (DEVOPS-004, confirmed inconsistency) | BROKEN |
| Backup/restore de produção | N/A | N/A | BROKEN (DEVOPS-001/002, confirmed) | BROKEN (R2 403) | N/A | BROKEN | MISSING | FUNCTIONAL (encryption correct when active) | N/A | MISSING | COMPLETE | BROKEN |
| Deploy Render (active fallback, real traffic) | FUNCTIONAL | FUNCTIONAL | FUNCTIONAL | PARTIAL (SMTP never configured) | N/A | FUNCTIONAL | N/A | FUNCTIONAL | FUNCTIONAL | MISSING | PARTIAL (DEVOPS-004, confirmed) | FUNCTIONAL |
| Kubernetes/Helm/ArgoCD path | N/A | N/A | PARTIAL | N/A | N/A | PARTIAL | MISSING | FUNCTIONAL | N/A | N/A | COMPLETE | N/A (aspirational, well-labeled) |
| CI (canonical release gate) | FUNCTIONAL | FUNCTIONAL | FUNCTIONAL | N/A | PARTIAL | COMPLETE | COMPLETE | COMPLETE | N/A | N/A | COMPLETE | FUNCTIONAL |
| Production observability (metrics/health/tracing) | N/A | MISSING | N/A | MISSING | N/A | N/A | N/A | PARTIAL (DEVOPS-003, confirmed: `/metrics` auth header blocks native scrape) | N/A | MISSING | COMPLETE (gap well documented) | MISSING |

## Testing

| Capability | Tests | Notes / Status |
|---|---|---|
| Unit test coverage (services/domain) | FUNCTIONAL | Solid where present |
| Integration tests (Postgres real, RLS) | COMPLETE | Real Postgres + tenancy assertions |
| RBAC / real-session E2E route coverage | PARTIAL | ~11 real-session files vs. 14+ fake-user files (TEST-006) |
| AI agent test coverage (production narrator agents) | PARTIAL | Confirmed gap for revenue-intelligence/contract-signature (TEST-001) |
| Billing/Usage persistence testing | MOCKED | All Prisma-mocked, no real-Postgres tenancy test (TEST-007) |
| Frontend E2E (Playwright core flows) | COMPLETE | CRM/auth/kanban/cadence covered |
| Visual regression testing | BROKEN | Entire suite `describe.skip`, no Linux baselines (TEST-009) |
| Android native test coverage | BROKEN | Confirmed: both files are unmodified boilerplate (TEST-003) |
| Coverage enforcement (thresholds) | MISSING | No threshold configured in any Vitest config (TEST-011) |
| Product-module test coverage (roleplay, playbook, treinamento, social-selling, chatbook, design-lab, onboarding, hub-inteligencia-marketing) | MISSING | Confirmed zero for roleplay (TEST-002); same pattern across the other 6 modules (TEST-005) |

---

### Legend notes

- **PRODUCTION READY** is reserved for the 5 Forecast/RevOps capabilities where every column was
  independently rated COMPLETE by the specialist domain and nothing in this cross-review's spot
  checks contradicted that.
- Where a row cites a finding ID as "confirmed," that column's rating was verified against the
  actual repository content during this audit's cross-review pass, not merely carried over from
  the source finding.
- Rows with no finding ID cited were carried over from the domain specialists' assessments without
  an independent re-read of every underlying file (out of scope to re-verify all ~140 non-CRITICAL/
  HIGH rows line-by-line); treat those as specialist-reported, not independently re-verified.
