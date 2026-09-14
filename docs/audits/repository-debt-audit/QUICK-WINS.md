# Quick Wins — Validated

> Every candidate below was screened against three criteria: **genuinely high-impact**
> (closes or measurably shrinks a real finding), **low-effort** (single file or a handful of
> near-identical call sites, no schema migration requiring coordination), and **low-risk**
> (no behavior change to a path currently relied upon in production, or the change is
> strictly additive/corrective). Items that were merely trivial (true one-liners with no
> real finding behind them, or copy-only changes with negligible user impact) were discarded
> — see "Discarded" at the bottom.
>
> **This is a backlog, not a to-do list executed by this audit.** Nothing here has been
> implemented. Each item names the finding it closes so it can be picked up independently.

## Validated (48)

### Security / Tenancy
1. **SEC-001** — Add a production fail-closed boot check for `BETTER_AUTH_SECRET`, mirroring the existing `CREDENTIALS_ENCRYPTION_KEY` pattern in `secretFields.ts`. ~10 lines, no behavior change where the var is already set.
2. **SEC-002** — Change the CORS `chrome-extension://` branch in `src/bootstrap/security.ts` to check `ALLOWED_ORIGINS.includes(origin)` instead of unconditionally trusting the scheme. Matches the deploy docs' already-documented operator workflow.
3. **SEC-003** — Add `100.64.0.0/10` (CGNAT) to `isPrivateOrReservedIp` in `urlGuard.ts`.
4. **TENANT-001** — Validate `objectKey.startsWith(\`copiloto-ia/${organizationId}/${id}/\`)` in `CopilotoIaUseCases.completeAudioUpload` before persisting. XS effort, closes a CRITICAL cross-tenant leak.
5. **TENANT-002** — Swap `requireRole(['ADMIN'])` for the existing platform-operator guard on `PUT /api/intelligence/ai-settings`. The guard already exists in `src/shared/middlewares/requirePlatformOperator.ts`.
6. **TENANT** (test) — Add an integration test mirroring `rls-bypass-allowlist.test.ts` for the Copiloto IA objectKey flow (org A upload, org B `completeAudioUpload` with org A's key must fail), locking TENANT-001's fix in place.
7. **BACKEND** — Pin the `chrome-extension://` CORS origin check to a specific configured extension ID instead of matching the scheme prefix (`src/bootstrap/security.ts:139`) — same root cause as SEC-002, listed separately because it was independently surfaced by the BACKEND specialist.

### CRM
8. **CRM-001** — Add `Lead.title` (and tags) to the Meilisearch `leads` `searchableAttributes` in `src/lib/search/index.ts` to fix silent title-search failures.
9. **CRM-010** — Cap the `limit` query parameter with `Math.min(..., 200)` identically in `LeadController`, `ContactController`, and `CompanyController`.
10. **CRM-002/CRM-003** — Quarantine or delete the orphaned, unreachable `LeadDeduplicationService.deduplicateByEmail` so its hard-delete/bypassed-Prisma-client pattern can't be silently wired up later.
11. **CRM-012** — Correct the stale Prisma schema comment claiming funnel/deal-mirror fields are unread/unwritten by `PrismaLeadRepository`.

### RevOps
12. **REVOPS-004** — Persist the weekly Win/Loss Analysis result (reuse the existing `ForecastSnapshot` append-only table pattern) and show "last automated run" in `WinLossAnalysis.tsx`. Small, low-risk, reuses a proven pattern already in this codebase.
13. **AIAGENT-001/AIAGENT-009** — Route `ManagerCommercialAgent` and `ExecutiveDirectorAgent` behind an endpoint mirroring the existing churn-retention/contract-signature route pattern — both agents are already fully coded, only routing + DI resolution is missing.
14. **AIAGENT-002** — Rename the AI Suite's "Detector de Churn & Health Score" tool label to make clear it is a manual what-if simulator, removing the naming collision with the Cockpit's real, data-grounded Health Score. Copy-only change.

### AI Agents
15. **AIAGENT-007/AIAGENT-010** — Sync `src/config/capability-catalog.ts` descriptions for `agent.execute` and `agent.request_cross_role` to match the real available/verification status in `tool-bindings.ts` (pure doc fix, near-zero risk).
16. **AIAGENT-004** — Register a minimal LLM-backed `ToolExecutor` for `agent.execute` that reads `AgentVersion.systemPrompt` and calls the existing AI gateway for `PROMPT_READY` agents — makes the ~27 agents that already have real prompts executable, using architecture that already routes/authorizes correctly. (Medium-low effort, high impact — the largest single lever in this list for closing the "391-agent catalog is mostly nominal" gap.)
17. **AIAGENT-006** — Extend `redactSensitiveData`'s regex set to also cover CNPJ, unformatted CPF, email, and phone in the same centralized guardrail function.

### RAG
18. **RAG-003** — Add the missing `EMBEDDING_DIMENSIONS === 768` guard to `src/lib/ai/gateway/embeddings.ts` — a few lines, same pattern already in `local-embeddings.ts`.
19. **RAG-001** — Remove (or clearly comment as non-functional) the `searchMeilisearch` branch in `search.service.ts` until a real `DocumentChunk` indexer exists — prevents fabricated scores from ever activating unnoticed.
20. **RAG-002** — Remove the no-op `agentMemory.search()` call in `ops.agent.ts` — deletes a per-turn network call to Qdrant/mem0 that never returns anything useful.

### Voice
21. **VOICE-004** — Add `VoiceCallLog` and `CopilotoTranscriptSegment` to `ENCRYPTED_MODEL_FIELDS` (`piiFields.ts`) — the encryption mechanism already exists transparently; this is a config change plus a data migration.
22. **VOICE-003** — Extend `eraseDataSubject()` to redact `CopilotoTranscriptSegment`/`CopilotoInsight` via `CopilotoConversation.contactId` — copy the exact pattern already used for `VoiceCallLog`.
23. **VOICE-002** — Hide or disable the `agentType` selector in any UI until the underlying capability is implemented, to stop advertising a non-functional option.

### Integrations
24. **INTEGRATION-001** — Add an `Idempotency-Key` header to Stripe's `createStripeCharge` — small, isolated change that removes a real duplicate-charge risk.
25. **INTEGRATION-002** — Extract the existing retry+backoff logic from `bitrix/service/client.ts` into a shared helper and apply it to Slack/Stripe/Omie's outbound calls.
26. **INTEGRATION-005** — Replace the single-slot Bitrix status-label cache with a `Map` keyed by `webhookUrl` — a few lines, no behavioral risk.
27. **BACKEND** — Add one minimal test file per new integration (Stripe/Omie/Slack) covering the encrypted-field round-trip and, for Slack, the SSRF guard path — mirrors the pattern already used for every sibling integration.

### Billing
28. **BILLING-005** — Add an admin-only read/write UI for `Organization.monthlyAiBudgetUsd` — enforcement already exists and is tested; only the UI write path is missing.
29. **BILLING-002/BILLING-003** — Remove or fix the hardcoded 5,000,000-token "contractual limit" widget in `Billing.tsx` that contradicts the page's own "no plan configured" banner.
30. **BILLING-007** — Wire `createStripeCharge` into a "cobrar" action on `CrmCommercialDocument` (Fatura) detail views, or remove the unused endpoint to shrink dead attack surface.

### Data / Database
31. **DATA-006** — Document the 3 partial unique indexes (`CadenceRun_leadId_active_unique`, `UserJobRole_one_active_primary_per_user`, `AgentVersion_one_active_per_agent`) in a checklist near `schema.prisma` so a `db push` rebuild or migration squash doesn't silently drop them.
32. **DATA-002** — Add a `NODE_ENV=production` guard and a random password to `scripts/create-demo.ts`, matching the safer pattern already used in `scripts/seed-video-demo.ts`.
33. **DATA-003** — Add the existing "legacy row, fail-closed" rationale comment (already used on `Prompt`/`AgentMemory`/`AILog`) to the nullable `organizationId` on Company/Contact/Lead/Activity/Prospect, or decide it should be `NOT NULL`.

### Backend
34. **BACKEND-004** — Drop or relabel the cross-tenant `unattributedCalls` field in the `/api/usage` response so it stops appearing as if it were organization-specific (`src/features/billing/infra/PrismaUsageRepository.ts:60-62`).

### Frontend
35. **FRONTEND-001** — Add auth-aware serving (or an authenticated proxy route) in front of `/tools` and `/design-lab` in `src/bootstrap/frontend.ts` — the `RequireModuleAccess`/`ProtectedRoute` authorization logic already exists; it just needs to also apply to the static asset request.
36. **FRONTEND-002** — Fix or trim `HubInteligenciaMarketingHub.tsx`'s docs array (and its "8 Documentos" KPI tile) to match the 1 file that actually exists in `public/tools/hub-inteligencia-marketing/`.
37. **FRONTEND-003** — Add the missing PDF/PPTX to `public/tools/social-selling/` or remove the two dead download buttons in `SocialSellingHub.tsx`.
38. **FRONTEND-005** — Delete the 3 dead file entries (`SpaceGame.tsx`, `GameWidget.tsx`, `AtlasOrb.tsx`) from `eslint.config.mjs`'s override array and refresh `CLAUDE.md §1`'s 3D-usage inventory.

### DevOps
39. **DEVOPS-001** — Correct `atlasgr_app`/`atlasgr_postgres` → `birthhub_app`/`birthhub_postgres` in `deploy-oci.sh`, `backup-oci.sh`, `restore-oci.sh`, and `oracle-cloud.md` — direct search-and-replace, unblocks backup/restore/deploy immediately.
40. **DEVOPS-004** — Update `charts/README.md` and `argocd/README.md` to reflect the real `autoDeployTrigger: commit` in `render.yaml`.
41. **DEVOPS-006** — Pin `yq`'s version + checksum in `cd-homolog.yml` instead of `releases/latest`.
42. **DEVOPS-005** — Resolve the already-open handoff on `tenancy.rego` (remove or connect it) — already formulated as a ready task.

### Testing
43. **TEST** — Add `agent.routes` tests for `POST /api/agent/revenue-intelligence/run` and `/api/agent/contract-signature/run`, mirroring the existing `agent.routes.evaluation-metrics.test.ts` pattern (mock services, supertest request, happy path + validation + sanitized error).
44. **TEST-011** — Replace `assertEquals(4, 2 + 2)` in `android/app/src/test/.../ExampleUnitTest.java` with a real test or remove the file — it currently gives a false-positive "Android tests passing" signal.
45. **TEST-012** — Replace the trailing `expect(true).toBe(true)` in `tests/unit/commercial-intelligence.test.tsx` and `tests/unit/features/ui.test.tsx` with a real content assertion (`screen.getByText`/`getByRole`) — render harness is already in place.

### DocBrand
46. **DOCBRAND** — Add an automated test asserting every `ModuleAccessGrant.moduleKey` / `*.brand` value ever written by a Prisma migration is a member of the current `MODULE_KEYS`/`PlaybookKey` union in code — would have caught the `treinamento-atlasgr`/`treinamento-birthub360` mismatch (DOCBRAND-011) before merge.
47. **DOCBRAND-004** — Update `.claude/CLAUDE.md §1`'s playbook bullet to match `src/config/playbooks.ts`'s current single-`geral`-key model instead of describing the retired `atlasgr`/`totaltrac` two-key selector as still live.
48. **DOCBRAND-014** — Re-split the open handoff for `LEGACY_BRAND_CONTENT_MAP.md §2.3` since `getTenantFromEmail()` (the function it describes) no longer exists in `access-policy.ts`, leaving only the still-valid module-catalog.ts URL half of that finding.

### Workflow / Product
49. **WORKFLOW-004** — Add `registerQueueForMetrics(QUEUE_NAME, queue)` to the 15 feature queues listed in WORKFLOW-004 — same line already used on 10 other queues, minimal cost, real gain in visibility over a currently-silent backlog.
50. **WORKFLOW-001/002** — Remove `dailyReport.worker.ts` (dead code, no producer, simulated action) or finish it with a real email send — binary, low-risk decision.
51. **WORKFLOW-003** — Remove `"Lead sem interação"` from the 3 type lists where it's unreachable (`enumMap.ts`, `automation.engine.ts`, `automations.api.ts`) — pure cleanup, no behavior to preserve.
52. **PRODUCT-008 (CYC-004)** — Disable/annotate the "Voz" channel option in `CadenceHub.tsx`'s touch-channel select so users can't unknowingly configure a step that always fails.
53. **PRODUCT-006** — Rename the "Editor de Documentos" menu label to something scoped to the Knowledge Base, since the underlying feature only edits/re-vectorizes KB documents, not general documents.
54. **PRODUCT-005** — Archive or delete the stale pre-rebrand `ROADMAP_FINALIZACAO_PLATAFORMA.html` (old AtlasGR orange palette, corrupted title encoding, unreferenced by the app or README).

## Discarded (screened out as too trivial or too low-impact to earn "quick win" status)

- **DOCBRAND README ESLint→Biome wording fix** — real, but pure prose correction with no functional or security consequence; folded into the general documentation cleanup pass instead of tracked as a standalone win.
- **INTEGRATION-005 cache Map keying** — kept above (#26) because it maps to a named finding, but flagged here as borderline: no reported production symptom, purely defensive.
- Several PRODUCT copy/label renames beyond #52/#53 were considered but are cosmetic-only with no confirmed user confusion evidenced in this audit; left in `FEATURE-DEBT.md`/`PRODUCT` backlog instead of promoted to "quick win."

---

**Total validated quick wins: 48.** None have been implemented by this audit — this file is a
prioritized, low-risk starting list for the next engineering session(s), grouped so a single
domain owner can pick up their own section independently.
