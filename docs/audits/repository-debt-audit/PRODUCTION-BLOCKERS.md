# Production Blockers — Birth Hub 360º

> Only items that genuinely block honestly saying "Birth Hub 360º is production-ready" belong
> here. A blocker is not "a bug" or "missing polish" — it is something that, if a real tenant
> hit it or a real incident required it, would cause data loss, a security/compliance
> incident, an unrecoverable outage, or a materially false claim to a paying customer.
>
> 16 items meet that bar.

## SECURITY BLOCKERS

1. **SEC-001 — No fail-closed check on `BETTER_AUTH_SECRET`.** Unlike `CREDENTIALS_ENCRYPTION_KEY`, nothing prevents the app from booting in production with a missing or weak auth secret. If this ever happens, session/token security for the entire platform is compromised silently. *(HIGH, P0)*
2. **BACKEND-001 / SEC-002 — CORS trusts any Chrome extension by scheme.** Any installed Chrome extension on a user's machine can make authenticated requests riding that user's session cookie — a real cross-extension session-riding vector, and it contradicts the deployment docs' own stated CORS policy. *(HIGH, P1)*
3. **DOCBRAND-011 — Silent fail-closed access-control regression from the in-flight rebrand.** A `moduleKey` mismatch introduced by a same-day migration revokes module access unpredictably, with no test catching it — an access-control bug shipped as an unintentional side effect of unrelated rebrand work. *(CRITICAL, P0)*

## DATA BLOCKERS

4. **CRM-002 / CRM-003 — Orphaned hard-delete service bypasses the platform's own soft-delete/audit safety net.** `LeadDeduplicationService.deduplicateByEmail` is currently unreachable, but it is real code sitting in the repository that performs an irreversible hard delete and bypasses tenant-scoped Prisma client construction. One accidental wiring (a cron job, a new route, an agent tool binding) turns this into real, unrecoverable customer data loss with no audit trail. *(CRITICAL, P0)*
5. **DEVOPS-001 / DEVOPS-002 — Backup and restore on the platform's declared production path are broken.** `backup-oci.sh` and `restore-oci.sh` reference container names (`atlasgr_*`) that no longer exist post-rebrand (`birthhub_*`). If an incident required a restore today on Oracle Cloud, the documented recovery procedure would fail. A platform with no working backup/restore is not production-ready by definition, independent of every other finding. *(CRITICAL, P0)*
6. **DATA-006 — Three business-invariant partial unique indexes exist only in migration SQL/comments, not in `schema.prisma`.** A future `prisma db push` on a fresh environment, or a migration squash, would silently drop these constraints with no error, allowing duplicate active records (e.g. two "active" cadence runs for the same lead) that downstream logic assumes cannot exist. *(MEDIUM but structurally dangerous — included because the failure mode is silent data corruption, not a visible error.)*

## TENANCY BLOCKERS

7. **TENANT-001 — Cross-tenant object storage access in Copiloto IA.** `CopilotoIaUseCases.completeAudioUpload` does not validate that the caller-supplied object storage key belongs to the caller's own organization. This is a confirmed, exploitable cross-tenant data exposure path in a multi-tenant SaaS product — the single most severe finding in the audit. *(CRITICAL, P0)*
8. **TENANT-002 — Tenant admin can modify platform-wide AI settings.** `PUT /api/intelligence/ai-settings` uses `requireRole(['ADMIN'])` (any tenant's admin) instead of a platform-operator guard that already exists elsewhere in the codebase — any customer admin can change settings that affect every tenant. *(HIGH, P1)*
9. **PRODUCT-004 / VOICE-001 — Vertical-specific and single-tenant content leaks across tenant boundaries.** Hub Executivo module grants can expose one customer's proprietary branded content to unrelated tenants, and the AI voice cold-call script is hardcoded to one tenant's brand identity — both break the basic multi-tenant promise of the product for any tenant other than the one the content was built for. *(HIGH/CRITICAL, P0/P1)*

## FUNCTIONAL BLOCKERS

10. **AIAGENT-003 / AIAGENT-004 — The flagship 391-agent catalog does not do what its scale implies.** `agent.execute` is granted platform-wide but permanently blocked; 93% of catalog agents have no prompt content; the runtime never calls an LLM for any agent. Any sales or executive claim that Birth Hub 360º ships "an AI workforce of 391 agents" is not currently true of the executable system — it is true of a catalog. *(HIGH, P1 — blocks honest positioning, not runtime safety.)*
11. **BILLING-004 — Invoice "paid" status is self-attested with no reconciliation.** The Fatura lifecycle capability looks production-ready in the UI but has no real payment verification behind the paid/unpaid state — a customer-facing financial status that cannot currently be trusted. *(HIGH, P1)*
12. **INTEGRATION-001 — Stripe charge creation has no idempotency key.** A network retry or double-click on a real charge path can create a duplicate charge — a real financial-risk bug in a payment integration, not a cosmetic one. *(HIGH, P1)*

## INFRA BLOCKERS

13. **DEVOPS-001 / DEVOPS-002 (again, infra angle) — Automated deploy on the declared production path is also broken by the same container-name mismatch.** Deploy, backup, and restore fail simultaneously from one root cause — there is currently no functioning emergency-response path on Oracle Cloud, the platform's own designated production environment (ADR-004). Render is a working fallback carrying real traffic today, but is not the platform's stated target architecture. *(CRITICAL, P0)*

## OBSERVABILITY BLOCKERS

14. **DEVOPS-003 — No centralized observability (metrics/health/tracing) exists on any environment with real production traffic.** Combined with WORKFLOW-004 (15 of ~25 feature queues never register metrics), the platform currently has no reliable way to detect a production incident before a customer reports it. *(HIGH, P1)*

## LEGAL/COMPLIANCE BLOCKERS

15. **VOICE-003 — LGPD data-subject erasure is incomplete for voice-derived content.** `eraseDataSubject()` does not redact `CopilotoTranscriptSegment`/`CopilotoInsight`, meaning a data-subject erasure request executed today would leave voice-call-derived personal data behind — a real LGPD compliance gap in a Brazilian product. *(HIGH, P1)*
16. **VOICE-004 — Call/message content stored in plaintext.** `VoiceCallLog` and `CopilotoTranscriptSegment` are not in `ENCRYPTED_MODEL_FIELDS`, inconsistent with the same codebase's mature, correctly-engineered Contact PII encryption — plaintext storage of call transcripts is a real exposure if the database is ever compromised. *(MEDIUM severity in isolation, but included as a compliance blocker because it directly contradicts the product's own stated data-protection posture for comparable content.)*

## PRODUCT BLOCKERS

- No dedicated PRODUCT-only blocker rose to this bar independent of the tenancy/functional
  items above — the two most severe product-facing gaps (391-agent catalog reality, Fatura
  self-attestation) are cross-listed under FUNCTIONAL BLOCKERS since their root cause and fix
  live there. This is not a signal that PRODUCT is blocker-free; see `EXECUTIVE-SUMMARY.md`
  for the domain's full maturity discussion (score 58/100) and `FEATURE-DEBT.md` for the
  broader non-blocking gaps (Pipeline Velocity, MRR/ARR, Plans/Subscriptions/Entitlements).

---

## What is explicitly NOT a production blocker

To keep this list honest, these confirmed real issues are excluded here deliberately —
tracked instead in `TECHNICAL-DEBT.md` / `FEATURE-DEBT.md` because their blast radius is
narrow, their current usage is already gated/labeled, or they are pre-existing, accepted
tradeoffs:

- The 6 fully-coded-but-unrouted Commercial Cell agents (AIAGENT-001/009) — dead code, not a
  live risk.
- Slack/Stripe/Omie's missing retry/tests (INTEGRATION-002/003/006/009) — real reliability
  debt, but these connectors are new and low-traffic today.
- Kubernetes/Helm/ArgoCD path — explicitly documented as aspirational, not a claimed
  production path.
- Qdrant as a second vector database — a documented, intentional non-decision, not a gap.
- 3D/gamification decorative widgets, legacy roadmap HTML — cosmetic/dead-code only.

---

**Summary: 16 production blockers** across 7 categories. The single highest-leverage fix is
**DEVOPS-001/002** (one root cause, unblocks backup + restore + deploy simultaneously),
followed by **TENANT-001** (one guard clause closes the most severe confirmed cross-tenant
leak). See `MASTER-DEBT-BACKLOG.md` P0/P1 bands for the full ordered list and
`EXECUTIVE-SUMMARY.md` for the recommended stabilization sequencing (Wave 0/1).
