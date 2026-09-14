# AIAGENT — AI / Agent Platform Debt Audit

## Agent
AIAGENT (specialist: AI agents, orchestration, capability/tool registry, memory, model routing,
guardrails, human approval, audit trail — Birth Hub 360º repository debt audit)

## Mission
Audit the AI/Agent platform end-to-end: agent runtime, agent registry, capability/tool registry,
skill registry, orchestrator/supervisor/swarm code, memory, context management, model routing,
fallback/retries, token/cost control, guardrails, tool permissions, human approval gates, audit
trail, tracing, prompt injection protections, tenant isolation for AI calls. Classify every traced
capability as PRODUCTION READY / FUNCTIONAL / PARTIALLY FUNCTIONAL / MOCKED / DISCONNECTED /
ORPHANED / etc., with file+line evidence for every CONFIRMED finding.

## Scope

Inspected (not limited to, but centered on):
- `src/features/intelligence/agents/**` — the production LangGraph "Swarm" (Supervisor + SDR/BDR/
  Closer/CRM/Ops + LearningAgent) and the 12-agent "Commercial Agent Cell" catalog.
- `src/features/job-roles/**` — the generic, DB-backed "Agent Runtime" framework (JobRole →
  AgentDefinition/AgentVersion → CapabilityAuthorization → ToolBinding → executor → AgentExecution
  audit trail), the Capability & Permission Engine, Agent Bus, Agent Builder, Role Supervisor, and
  the 391/392-agent normalized catalog.
- `src/lib/ai/**` — AI gateway (provider adapters, retries, circuit breaker, model routing,
  redaction, prompt-safety, budget/cost circuit breaker, LangGraph Postgres checkpointer).
- `src/shared/services/aiPiiConsent.service.ts`, `src/features/intelligence/services/
  guardrails.service.ts` — LGPD/PII gate shared across verticals.
- `scripts/seed-multi-cargo.ts`, `scripts/import-agent-catalog.ts`, `scripts/seed-capability-
  engine.ts` and the `*.normalized.json` catalog artifacts they consume.
- Routes: `src/features/intelligence/routes/agent.routes.ts`,
  `src/features/job-roles/routes/*.ts`.
- Tests: `src/features/intelligence/agents/__tests__/**`, `tests/integration/agent-*.test.ts`,
  `tests/integration/{capability-engine,job-roles,import-agent-catalog}.test.ts`,
  `tests/unit/features/intelligence/**`.

## Areas inspected
Agent runtime & orchestration; agent registry/catalog (both the commercial-cell and the 391-agent
Birth Hub catalog); capability & tool-binding registry; guardrails (PII redaction, LGPD consent
gate, prompt-injection defense); human approval gates (`AIPendingAction`, LearningAgent
approval); memory/persistence (`AgentMemory`, LangGraph checkpointer, `Agent Bus`); model routing
and fallback; token/cost budget circuit breakers; audit trail (`AgentExecution`); tests.

## Files inspected
Approximately 45 source files read directly (full or targeted), plus ~60 more located and cross-
referenced via `grep`/`glob` (routes, config, seed scripts, catalog JSON, tests). Key files:
`base.agent.ts`, `supervisor.agent.ts`, `commercialAgentRegistry.ts`, `billingRevenue.agent.ts`,
`ldrIntelligence.agent.ts`, `coordinatorCommercial.agent.ts`, `managerCommercial.agent.ts`,
`executiveDirector.agent.ts`, `bitrixGuardian.agent.ts`, `fallback.util.ts`, `agent.routes.ts`,
`agentRuntime.service.ts`, `capabilityAuthorization.service.ts`, `tool-bindings.ts`,
`capability-catalog.ts`, `toolExecutors.ts`, `agentCatalog.service.ts`, `agentBuilder.service.ts`,
`seed-multi-cargo.ts`, `import-agent-catalog.ts`, `seed-capability-engine.ts`,
`agents.normalized.json`, `agentCapabilities.normalized.json`, `model-routing.ts`, `budget.ts`,
`prompt-safety.ts`, `guardrails.service.ts`, `aiPiiConsent.service.ts`, `opsPendingActions.tool.ts`,
`vector.service.ts`, `CommercialAIService.ts`, `studio/generators/superagent.ts`.

## Executive summary

This is one of the more mature parts of the repository — the production Swarm (`supervisor.agent.ts`
+ SDR/BDR/Closer/CRM/Ops) is real, wired end to end (routes → LangGraph → Postgres checkpointer →
`AgentMemory` → LGPD gate → human-approval-gated tool effects → audit), with an unusually large
number of already-fixed, well-documented findings from prior audit waves (AI-002, AI-003, AI-007,
AI-011, RAG-001, GOV-13, DQA-19, etc., each with inline rationale). The gateway (`src/lib/ai/**`)
has real per-provider fallback, a circuit breaker, per-organization AND global monthly cost caps
that fail open on infra errors and fail closed on real budget breach, and a genuine structural
prompt-injection defense (`wrapUntrustedContent`/`UNTRUSTED_CONTENT_GUARD_INSTRUCTION`) referenced
across the swarm.

The gap is in the **second, larger AI-agent system**: the generic, DB-backed "Agent Runtime"
(`src/features/job-roles/**`) built to host a 391-agent catalog imported from an external package.
Tracing UI-claim → catalog → capability grant → tool binding → executor end to end shows that:

- The catalog's own generic execution capability, **`agent.execute`**, is granted to **all 391**
  imported agents (`agentCapabilities.normalized.json`) but is permanently blocked
  (`reason: 'FUTURE_TOOL'`, `verification: 'UNVERIFIED'`) in `tool-bindings.ts`, and has **no
  executor at all** in `toolExecutors.ts`. Its own doc comment says it stays blocked "until PROMPT
  4 implements the real runtime" — but PROMPT 4 (`agentRuntime.service.ts`) has already shipped,
  is fully route-registered, and is consumed by both `agentBus.service.ts` and
  `roleSupervisor.service.ts`. The capability was never unblocked after the thing it was gating
  was built. **Every one of the 391 catalog agents is therefore permanently denied on the one
  capability meant to let it run generically.**
- Only **27 of 379** canonical catalog agents (`withPrompt: 27` in the catalog's own summary) have
  any `systemPrompt` text at all; the remaining ~93% are `binding.type: 'LLM_PROMPT'` with
  `systemPrompt: null` — a domain/name/risk classification with no content behind it.
- Even for the 27 agents that DO have a stored `systemPrompt` (persisted to `AgentVersion` by
  `import-agent-catalog.ts`), **nothing in the execution path ever reads or invokes it.**
  `agentRuntime.service.ts`/`toolExecutors.ts` dispatch purely by `capabilityCode` to one of 22
  hardcoded deterministic tool executors (`lead.read`, `company.search`, `pipeline.analyze`, …) —
  there is no LLM call (`getAiModel`/`ChatOpenAI`/`.invoke`) anywhere in that runtime. The stored
  system prompts are write-only data.
- Net result: of the 391-agent catalog, the only agents that can ever produce a real
  `AgentExecution` with `status: SUCCEEDED` are the small subset granted one of the 22 real,
  narrowly-scoped capability codes (`lead.*`, `company.*`, `deal.*`, `pipeline.*`, `forecast.*`,
  `bitrix.*`, `contract.read`, `meeting.*`, `knowledge.search`) — a few dozen grants total,
  overlapping heavily with the 12 agents already covered by the older, real Commercial Cell. The
  remaining several hundred catalog agents are permanently `agent.discover`-only: visible in a
  catalog listing, structurally incapable of doing anything.
- Five of the twelve Commercial-Cell agents (`LdrIntelligenceAgent`, `CoordinatorCommercialAgent`,
  `ManagerCommercialAgent`, `ExecutiveDirectorAgent`, `BitrixGuardianAgent`) plus `BillingRevenueAgent`
  are fully coded, exported, and registered in `commercialAgentRegistry.ts`, but have **zero
  import sites anywhere outside `agents/` and no HTTP route** — confirmed by direct grep, not
  discovery notes.
- The LGPD "base legal" gate that every externally-facing agent call depends on
  (`assertPiiExternalConsent`) is a single global environment variable
  (`AI_PII_EXTERNAL_CONSENT_ORGANIZATIONS`, comma-separated org IDs, or `*`/`all` for everyone) —
  not a per-organization, timestamped, revocable, audited DB record. Granting/revoking consent for
  one tenant requires an env var edit and redeploy affecting the whole platform, and `*`/`all` is a
  single misconfigured value away from disabling the gate for every tenant at once.
- PII redaction (`redactSensitiveData`) only matches formatted CPF (`\d{3}\.\d{3}\.\d{3}-\d{2}`) —
  unformatted CPF, CNPJ, email, and phone numbers in AI output pass through un-redacted.

None of this is a security hole in the classic sense (the capability engine fails closed
everywhere it was checked), and the parts that ARE wired (the Swarm, the 12-agent Commercial Cell,
the Capability Engine's authorization logic itself) are solid. The debt is representational: a
391-agent "AI workforce" catalog and a capability meant to make agents generically executable that,
together, cannot actually execute almost anything.

## Critical
None found with direct evidence of exploitable cross-tenant data leakage or data loss in the AI
agent surface itself. (Tenant-scoping in `capabilityAuthorization.service.ts`, `agentRuntime.
service.ts`, and `budget.ts` was specifically checked and is fail-closed / correctly scoped.)

## High

- **AIAGENT-001** — `agent.execute`, the capability meant to let any of the 391 imported agents run
  generically, is granted to all 391 agents but is structurally undeniable forever (`FUTURE_TOOL`,
  no executor), and its own blocking rationale ("until PROMPT 4") is stale relative to shipped
  code. See Complete findings list.
- **AIAGENT-002** — The Agent Runtime execution path never invokes an LLM with the stored
  `AgentVersion.systemPrompt`; execution is 100% deterministic tool dispatch by capability code.
- **AIAGENT-003** — 352 of 379 catalog agents (93%) have no `systemPrompt` content at all
  (`hasPrompt: false`), and are structurally reachable only via `agent.execute` (blocked, see
  AIAGENT-001) or `agent.discover` (read-only).
- **AIAGENT-004** — 5 Commercial-Cell agent classes + `BillingRevenueAgent` are fully coded and
  registered but have no HTTP route and no caller anywhere in `src/`.

## Medium

- **AIAGENT-005** — LGPD "base legal" gate for sending PII to an external AI provider is a single
  global env var allowlist, not a per-tenant DB record with audit trail.
- **AIAGENT-006** — PII redaction guardrail (`redactSensitiveData`) only matches formatted CPF;
  CNPJ, unformatted CPF, email, and phone numbers in AI output are not redacted.
- **AIAGENT-007** — `capability-catalog.ts` capability descriptions are stale relative to
  `tool-bindings.ts`: `agent.request_cross_role`'s catalog description still says "Permanece
  FUTURE_TOOL até o PROMPT 7" even though `tool-bindings.ts` already marks it `AVAILABLE`/
  `VERIFIED` (PROMPT 7 shipped) — the opposite direction of staleness from AIAGENT-001, same root
  cause (two independent sources of truth for the same fact, one not updated on ship).
- **AIAGENT-008** — `AgentRuntime`'s `computeConfidence` is a two-value heuristic (0.8 / 0.4 based
  solely on whether `missingData` is empty), documented as deliberately simple, but exposed to
  callers (`roleSupervisor.service.ts`, API response) as a numeric "confidence" score that reads as
  more precise than it is.

## Low

- **AIAGENT-009** — `VectorService.ingestDocument` is dead code (throws unconditionally,
  `@deprecated`, "kept only in case of an eventual external import") — orphaned but safely
  disarmed, not a functional risk.
- **AIAGENT-010** — `billing.reconcile` / `contract.generate` / `signature.request` capabilities are
  each granted to a handful of catalog agents (`agentCapabilities.normalized.json`: 2, 7, 7 grants
  respectively) that can never execute them (`SOURCE_REQUIRED`/`FUTURE_TOOL` in `tool-bindings.ts`)
  — small, already-labeled instances of the same "granted but permanently blocked" pattern as
  AIAGENT-001, at agent-catalog scale rather than platform scale.

## Technical debt
- TD-CONFIG: `agent.execute`/`agent.request_cross_role` descriptions in `src/config/
  capability-catalog.ts` are not kept in sync with the live `available`/`verification` state in
  `src/features/job-roles/config/tool-bindings.ts` — two files assert contradictory facts about the
  same capability's real status (AIAGENT-001, AIAGENT-007).
- TD-DOC: Inline comments across `tool-bindings.ts`/`capability-catalog.ts` reference "PROMPT 4"/
  "PROMPT 7" as future work that has since shipped; the comments were never revisited after the
  corresponding services landed.
- TD-ARCH: Two independent "agent" concepts (`commercialAgentRegistry.ts`'s 12-agent LangChain-
  backed cell vs. `job-roles`' 391-agent DB-backed catalog) overlap on `ldr-intelligence`,
  `bdr-outbound`, `bitrix-guardian` and are reconciled only by a manual `EXISTING_COMMON_CODES`
  list in `scripts/import-agent-catalog.ts` — correct today, but a second agent added to either
  system without updating that list silently diverges.

## Implementation debt
- The `AgentExecution` audit row model supports `risks`/`recommendations`/`handoffs` fields, but
  `agentRuntime.service.ts`'s `toDto()` hardcodes `handoffs: []` unconditionally (line 91) — no
  executor currently returns handoff data, so the audit trail's handoff field is permanently empty
  regardless of what actually happened.
- `runAgentExecution`'s idempotency check (`correlationId`) only looks at terminal statuses
  (`SUCCEEDED`/`DENIED`/`FAILED`/`CANCELLED`); a `RUNNING` execution with the same `correlationId`
  (e.g., a genuinely concurrent retry) is not deduplicated and would create a second execution row
  — narrow race window, but real given the fail-open language elsewhere in this codebase's own
  comments about "never fabricate success."

## Feature debt
- **391-agent "AI workforce" catalog is not a working feature** in the sense implied by its name
  and size: it is a discovery/browsing catalog (`GET /api/job-roles/agents`) layered over ~22 real
  deterministic tool capabilities already covered by the smaller Commercial Cell. See AIAGENT-001/
  002/003.
- 5 of 12 Commercial Cell agents (LDR, Coordinator, Manager, Executive Director, Bitrix Guardian)
  and `BillingRevenueAgent` are feature-complete code with no delivery path to a user (AIAGENT-004).

## Bugs
- None found that produce incorrect output silently; the systems that don't work (AIAGENT-001/003)
  fail closed/deny cleanly rather than fabricating a result, consistent with this codebase's stated
  design principle ("nunca fabricar uma resposta falsa").

## Architecture
- The Capability & Permission Engine (`capabilityAuthorization.service.ts`) is a genuinely
  well-designed 13-step fail-closed authorization pipeline (JobRole → AgentDefinition →
  RoleAgentGrant → CapabilityDefinition → AgentCapabilityGrant → RoleCapabilityGrant → ToolBinding
  VERIFIED → risk/approval), and is the correct architecture for what it does. The debt is not in
  this engine's logic — it's that the catalog feeding it (391 agents) was imported at a metadata
  level far ahead of the executor/prompt layer needed to make most of those entries do anything.
- `no-cross-feature-imports` (dependency-cruiser) is actively enforced and is why several
  Commercial-Cell agents (revenue-intelligence, churn-retention, contract-signature) only "narrate"
  pre-formatted text handed in by the caller rather than importing the real service directly — a
  deliberate, documented trade-off (loose coupling over DRY), not an accident.

## Security
- `assertPiiExternalConsent`'s env-var-based allowlist (AIAGENT-005) is the one AI-surface finding
  with plausible security/compliance relevance: a single `AI_PII_EXTERNAL_CONSENT_ORGANIZATIONS=*`
  (present in some `.env.example`-style configs as a shorthand for "allow everyone in
  dev/staging") silently disables the LGPD gate for every tenant if it ever reaches a production
  environment variable by mistake, with no compensating per-tenant record or audit log to catch it.
- Tenant scoping was specifically checked and holds: `authorizeCapability` takes `actor.
  organizationId` from the authenticated session only (never body/query), `budget.ts`'s
  per-organization cost cap is RLS-scoped, and the Swarm's LangGraph `thread_id` is prefixed with
  `organizationId` specifically to prevent one tenant's checkpoint from being reused by another
  (`supervisor.agent.ts` inline comment, verified against the code it describes).
- Prompt-injection defense (`prompt-safety.ts`'s `wrapUntrustedContent`/neutralized delimiter) is
  real and structurally sound (neutralizes the delimiter string itself inside untrusted content to
  prevent a forged close-tag), not just a prompt instruction — but its use is opt-in per call site;
  this audit did not exhaustively verify every tool that returns third-party text
  (`marketResearchTool.ts` is confirmed to use it; the other tools' `crmTools.ts`/
  `summarizeLeadTool.ts` were not individually re-verified — see Needs verification).

## Tests
- The production Swarm has real, specific unit/integration coverage: consent gates, budget
  circuit breaker, learning-agent versioning/rollback/approval, supervisor routing/fallback
  decision logic, SLO snapshot, and a dedicated `swarm-autonomous-mission-e2e.test.ts`.
- The job-roles Agent Runtime/Capability Engine also has integration tests
  (`agent-runtime.test.ts`, `capability-engine.test.ts`, `agent-catalog.test.ts`, `agent-bus.test.ts`,
  `import-agent-catalog.test.ts`, `job-roles.test.ts`) — but none of the test names or the code
  reviewed here assert on "391 agents can only reach 22 capabilities" or "`agent.execute` is
  permanently denied for every agent" as an explicit product-level regression guard; the gap found
  in AIAGENT-001/002/003 is not something the existing test suite would catch if it got worse (e.g.
  someone silently removing more executors).
- `tests/integration/tool-bindings.evidence.test.ts` (referenced in `tool-bindings.ts`'s own
  comments) is a good pattern — it imports every `evidencePath`/`exportName`/`methodName` in the
  registry and confirms it really exists at runtime — but it verifies only that a VERIFIED binding
  points to something real, not that every capability an agent is granted has a matching VERIFIED
  binding at all (which is what actually leaves 369+ agents unable to execute).

## Integration
- Cross-feature "narration, never import" pattern (revenue-intelligence, churn-retention,
  contract-signature agents) is architecturally consistent and confirmed working end to end via
  DI-container resolution (`container.resolve('CommercialIntelligenceAiService')`, etc.) in
  `agent.routes.ts`.
- Bitrix writeback capability (`bitrix.write`) is VERIFIED/available but `riskLevel: HIGH`, so it
  always requires human approval per the capability engine's own rule (step 12) — correctly
  conservative, confirmed by reading both `tool-bindings.ts` and `capabilityAuthorization.service.ts`.

## Product
- The gap between "391 AI agents" as a catalog size/marketing surface and "~22 real capabilities,
  reachable by a handful of already-existing agents" is the single most consequential product-level
  finding of this audit: any UI, sales material, or internal reporting that counts "agents" from
  `AgentDefinition` rows without accounting for `agent.execute` being permanently blocked would
  overstate real AI-agent capability by roughly an order of magnitude.

## Mock/Fake/Placeholder
- No fabricated AI output was found in the reviewed agent code — every agent that lacks a real data
  source (billing, contract generation) explicitly refuses to invent the missing value
  (`BillingRevenueAgent`'s `SOURCE_REQUIRED` contract, `ContractSignatureAgent`'s real-status-only
  design) rather than hallucinating a plausible number. `studio/generators/superagent.ts`'s
  `# PLACEHOLDER` Python scaffold is an intentional, clearly-labeled draft-code deliverable (status
  `DRAFT`/`REVIEW_REQUIRED`), not a runtime stub masquerading as a working agent.

## Dead/Orphan code
- `LdrIntelligenceAgent`, `CoordinatorCommercialAgent`, `ManagerCommercialAgent`,
  `ExecutiveDirectorAgent`, `BitrixGuardianAgent`, `BillingRevenueAgent` — exported classes, zero
  callers outside `src/features/intelligence/agents/`, no route (AIAGENT-004).
- `VectorService.ingestDocument` — throws unconditionally, `@deprecated`, no caller (AIAGENT-009).
- `AgentExecutionResultDto.handoffs` — always `[]`, never populated by any executor.

## Quick wins
- Update `src/config/capability-catalog.ts`'s descriptions for `agent.execute` and
  `agent.request_cross_role` to match their real `tool-bindings.ts` status (one is stale in each
  direction) — pure documentation fix, near-zero risk, removes a real "which file do I trust"
  landmine for the next engineer touching the Capability Engine.
- Register at least one real `ToolExecutor` for `agent.execute` (even a minimal one that reads
  `AgentVersion.systemPrompt` and calls `getAiModel(...)`/`buildModelWithFallback(...)` for
  `PROMPT_READY` agents) — this single change would make the 27 agents that already have real
  prompts (`hasPrompt: true`) executable, which the current architecture already routes and
  authorizes for correctly.
- Extend `redactSensitiveData`'s regex to also cover unformatted CPF (`\d{11}`, with a checksum or
  context guard to avoid false positives) and CNPJ — same function, same call sites, low-risk
  addition to an already-centralized guardrail.

## Structural problems
- Two independent, only-partially-reconciled sources of truth for "is this capability real":
  `src/config/capability-catalog.ts` (static description text) and `src/features/job-roles/config/
  tool-bindings.ts` (the actual `available`/`verification` flags the authorization engine reads).
  Nothing enforces that the two stay consistent, and this audit found both directions of drift
  already present (AIAGENT-001 stale-blocked, AIAGENT-007 stale-description-says-blocked-but-
  isn't).
- The 391-agent catalog was imported as a one-time ZIP-derived artifact
  (`agents.normalized.json`, `generatedAt: 2026-09-08`, `sourcePackage: "... upload 2026-09-08"`)
  with no visible regeneration/reconciliation process if the source package changes — it is a
  frozen snapshot, not a living registry.

## Needs verification
- Whether `crmTools.ts`/`summarizeLeadTool.ts` (referenced by `swarm.constants.ts`'s comment as
  also needing `wrapUntrustedContent`) actually call it — only `marketResearchTool.ts` was directly
  confirmed in this pass. LOW confidence, not confirmed.
- Whether any production UI (e.g., a "391 agents" counter/marketing surface) actually surfaces the
  raw `AgentDefinition` count to end users without accounting for `agent.execute` being blocked —
  this audit found the backend mechanics only; no frontend screen showing an agent count/catalog
  was located in the files inspected. MEDIUM confidence this matters if such a screen exists.
- Whether `AI_PII_EXTERNAL_CONSENT_ORGANIZATIONS` is currently set to `*`/`all` in any real
  (non-local) environment — this audit only read source code, not deployed environment
  configuration, so the actual current blast radius of AIAGENT-005 in production is unknown.

## Complete findings list

### AIAGENT-001 — `agent.execute` capability is granted to all 391 catalog agents but is permanently blocked, past its own stated blocker
- **Category:** TD-AGENT, TD-CONFIG, TD-ARCH
- **Severity:** HIGH — **Priority:** P2 — **Confidence:** HIGH — **Status:** CONFIRMED
- **Effort:** M
- **Evidence:**
  - `src/features/job-roles/catalog/agentCapabilities.normalized.json`: `agent.execute` appears in
    391 of 391 `agentCapabilities` entries (verified by direct aggregation of the JSON).
  - `src/features/job-roles/config/tool-bindings.ts:373-384`: `capabilityCode: 'agent.execute'`,
    `available: false`, `reason: 'FUTURE_TOOL'`, `verification: 'UNVERIFIED'`, comment: "AgentRuntime
    genérico ainda não existe — implementado no PROMPT 4. Bloqueado de propósito nesta onda."
  - `src/config/capability-catalog.ts:268-276`: same capability's catalog description: "Permanece
    FUTURE_TOOL/bloqueado até o PROMPT 4 implementar o runtime real."
  - `src/features/job-roles/services/agentRuntime.service.ts` (PROMPT 4, `runAgentExecution`) is
    fully implemented, is called from `agentCatalog.routes.ts:79` (`POST /:agentCode/run`),
    `agentBus.service.ts:523`, and `roleSupervisor.service.ts:237` — i.e., the thing `agent.execute`
    says it's waiting for has shipped and is in active use by two other subsystems.
  - `src/features/job-roles/services/toolExecutors.ts:671-695` (`TOOL_EXECUTORS`): no entry for
    `agent.execute`.
  - `capabilityAuthorization.service.ts:377-396` (step 11): any capability whose binding is not
    `VERIFIED`+`available` is denied with `FUTURE_TOOL`/`SOURCE_REQUIRED`/`TOOL_UNAVAILABLE` — so
    every request for `requestedCapability: 'agent.execute'` against any of the 391 agents returns
    `DENIED`/`FUTURE_TOOL`, unconditionally, today.
- **Root cause:** the capability's block condition ("until PROMPT 4 ships") was never re-evaluated
  after PROMPT 4 shipped; no executor was ever written for it either.
- **Failure scenario:** A caller with a valid JobRole/RoleAgentGrant/AgentCapabilityGrant/
  RoleCapabilityGrant for any of the 391 catalog agents calls `POST /api/job-roles/agents/{code}/run`
  with `requestedCapability: "agent.execute"` expecting the agent to actually run (the only generic
  capability every catalog agent has) — the call is denied every time, with no path to ever succeed
  short of a config change.
- **User impact:** Any workflow built on "just run this catalog agent" (as opposed to one of the 22
  hand-wired specific capabilities) cannot work, ever, in the current deployment.
- **Business impact:** The 391-agent catalog cannot deliver on its apparent scope; only the dozen
  agents already covered by the older Commercial Cell (which use specific capabilities, not
  `agent.execute`) are operational.
- **Suggested resolution:** Either (a) implement a real generic executor for `agent.execute` that
  loads the agent's active `AgentVersion.systemPrompt` and invokes it through the existing AI
  gateway (`getAiModel`/`buildModelWithFallback`) for `PROMPT_READY` agents, and mark the binding
  `VERIFIED`/`available`; or (b) if generic LLM-only execution is out of scope, update both
  `tool-bindings.ts` and `capability-catalog.ts` to state plainly that `agent.execute` is not
  planned, and stop granting it to catalog agents that will never be able to use it.

### AIAGENT-002 — Agent Runtime never invokes an LLM; stored `systemPrompt` is write-only
- **Category:** TD-AGENT, TD-ARCH
- **Severity:** HIGH — **Priority:** P2 — **Confidence:** HIGH — **Status:** CONFIRMED
- **Effort:** M
- **Evidence:**
  - `grep` for `getAiModel|ChatOpenAI|.invoke(` across `agentRuntime.service.ts` and
    `toolExecutors.ts`: zero matches.
  - `scripts/import-agent-catalog.ts:141-149`: `AgentVersion.systemPrompt` is written for the 27
    agents with `hasPrompt: true`.
  - `grep` for `systemPrompt` usage outside `agentBuilder.service.ts` (proposal-time text) and
    `agentCatalog.service.ts` (CRUD/storage): no read site in any execution path.
  - `agentRuntime.service.ts:193` (`getToolExecutor(request.requestedCapability)`): execution is
    dispatched purely by `capabilityCode` string, never by agent identity or its stored prompt.
- **Root cause:** the Agent Runtime was built as a deterministic capability-dispatch engine (PROMPT
  3/4), and the LLM-prompt-carrying half of the catalog (PROMPT 2) was imported before any executor
  existed to consume `systemPrompt` at runtime.
- **Failure scenario:** An agent marked `PROMPT_READY` (has a real, human-authored system prompt) is
  requested to run; the runtime looks up an executor by capability code, finds one only if that
  agent also happens to hold one of the 22 real capability grants, and if so, runs that
  deterministic tool — the agent's own system prompt is never read or used to shape any AI-generated
  content.
- **User impact / business impact:** same as AIAGENT-001 — the "AI" in "391 AI agents" does not
  execute for any of them via this runtime.
- **Suggested resolution:** see AIAGENT-001's suggested resolution (a) — the fix is the same change.

### AIAGENT-003 — 352 of 379 catalog agents have no system prompt content at all
- **Category:** TD-AGENT, TD-DATA
- **Severity:** HIGH — **Priority:** P3 — **Confidence:** HIGH — **Status:** CONFIRMED
- **Effort:** L
- **Evidence:** `src/features/job-roles/catalog/agents.normalized.json`, `summary`:
  `"totalCanonicalAgents": 379`, `"withPrompt": 27`; `byBinding.LLM_PROMPT: 298`,
  `EXISTING_SERVICE: 28`, `SOURCE_REQUIRED: 40`, `FUTURE_TOOL: 13` (28+298+40+13 = 379).
- **Root cause:** the source package this catalog was normalized from apparently only shipped
  prompt text for a small fraction of its 392 declared agents; the normalization/import kept every
  agent as a catalog row regardless.
- **Failure scenario:** Any UI/report/query that treats `AgentDefinition` row count as "how many
  agents we have" is off by roughly an order of magnitude versus agents with any real behavior
  behind them (specific capability or prompt).
- **User impact:** Users browsing the agent catalog (`GET /api/job-roles/agents`) see hundreds of
  agents with names/domains/risk levels and no way to actually get output from most of them.
- **Suggested resolution:** Either backfill real prompts for the agents intended to be used, or
  filter/label `CATALOG_ONLY` (no prompt, no specific capability) agents distinctly in any listing
  UI so they read as "planned", not "available".

### AIAGENT-004 — 5 Commercial-Cell agent classes + BillingRevenueAgent have no route, no caller
- **Category:** TD-DEAD, TD-FEAT
- **Severity:** HIGH — **Priority:** P3 — **Confidence:** HIGH — **Status:** CONFIRMED
- **Effort:** S (to add routes) / XS (to delete, if intentionally shelved)
- **Evidence:** `grep -rn "LdrIntelligenceAgent|CoordinatorCommercialAgent|
  ManagerCommercialAgent|ExecutiveDirectorAgent|BitrixGuardianAgent|BillingRevenueAgent" src
  --include=*.ts`: each class name's only match outside its own defining file (and
  `commercialAgentRegistry.ts`'s `agentModule` string reference, which is a path string, not an
  import) is the `export class` declaration itself. `agent.routes.ts` imports and routes only
  `RevenueIntelligenceAgent`, `ChurnRetentionAgent`, `ContractSignatureAgent` (lines 206-208,
  268-444) from the 9 non-production-reused agents in `commercialAgentRegistry.ts`.
- **Root cause:** onda 43 (per the file's own comments) implemented all 9 new Commercial-Cell
  agents as thin wrapper classes but only wired 3 of them to HTTP routes in the same wave.
- **Failure scenario:** N/A (no runtime failure — code simply has no caller).
- **User impact:** None currently (feature never reachable), but represents ~40% of a stated
  12-agent product surface that a user-facing catalog (`GET /api/agent/commercial-cell`, which does
  list all 12 with `agentModule` metadata) implies is available.
- **Business impact:** `GET /api/agent/commercial-cell` returns all 12 agents' metadata including
  `agentModule` paths for these 6, which could mislead API consumers into believing they're
  invokable the same way as the 3 that have routes.
- **Suggested resolution:** Add the missing 6 routes following the exact pattern already used for
  revenue-intelligence/churn-retention/contract-signature, or mark these 6 entries in
  `COMMERCIAL_AGENT_REGISTRY` with a status/field indicating "no route yet" so `GET /commercial-cell`
  doesn't imply parity with the 3 that work.

### AIAGENT-005 — LGPD "base legal" consent gate is a single global env var, not a per-tenant record
- **Category:** TD-COMPLIANCE, TD-TENANT, TD-SEC
- **Severity:** MEDIUM — **Priority:** P2 — **Confidence:** HIGH — **Status:** CONFIRMED
- **Effort:** M
- **Evidence:** `src/shared/services/aiPiiConsent.service.ts:40-50`: `hasPiiExternalConsent` reads
  `env.AI_PII_EXTERNAL_CONSENT_ORGANIZATIONS`, a comma-separated string, with `'*'`/`'all'` treated
  as "every organization has consent." No `Organization` table field, no timestamp, no actor, no
  audit log entry is created when consent is (or isn't) granted for a given tenant.
- **Root cause:** the gate was built as the fastest fail-closed mechanism (AI-007) rather than as a
  proper per-tenant compliance record.
- **Failure scenario:** An operator sets `AI_PII_EXTERNAL_CONSENT_ORGANIZATIONS=*` in any shared
  environment (e.g., to unblock a demo/staging tenant quickly) and every organization on that
  deployment instantly gains "consent" to send PII to Groq/OpenAI, with no per-tenant record of when
  or why, and no way to revoke just one tenant without redeploying the whole platform.
  Additionally, granting a real customer's org consent (a legitimate LGPD action, presumably backed
  by an actual DPA/contract) leaves no audit trail of that legal decision anywhere queryable in the
  product's own data — it lives only in deployment config.
- **User impact:** N/A directly to end users; impacts the organization's ability to prove/audit LGPD
  compliance decisions.
- **Business impact:** Regulatory/audit risk — LGPD requires being able to demonstrate legal basis
  per data processing activity; a global env var is not evidence of a per-tenant legal basis
  decision, and provides no way to answer "when was consent granted for tenant X, and by whom" from
  within the product.
- **Suggested resolution:** Move to a per-`Organization` DB column (`aiPiiExternalConsentGrantedAt`,
  `grantedByUserId`) with an admin-only endpoint to grant/revoke it, audited like other admin
  actions; keep the env var as an optional emergency global override, clearly logged when used.

### AIAGENT-006 — PII redaction only matches formatted CPF; other PII types pass through
- **Category:** TD-SEC, TD-COMPLIANCE
- **Severity:** MEDIUM — **Priority:** P3 — **Confidence:** HIGH — **Status:** CONFIRMED
- **Effort:** S
- **Evidence:** `src/features/intelligence/services/guardrails.service.ts:5`:
  `const CPF_REGEX = /\d{3}\.\d{3}\.\d{3}-\d{2}/g;` — the only pattern `redactSensitiveData`/
  `redactAndTrackPiiLeak`/`createStreamingRedactor` check. No pattern for CNPJ, unformatted
  11-digit CPF, email addresses, or phone numbers exists in this file (confirmed by reading the
  full file).
- **Root cause:** the guardrail was built to catch one specific observed leakage pattern (formatted
  CPF appearing in AI output) and was never generalized.
- **Failure scenario:** An AI-generated response that includes a phone number, email address, CNPJ,
  or an unformatted CPF (`12345678900` with no punctuation) copied from context is returned to the
  user unredacted, and no `AIGuardrailEvent` is recorded for it — the "PII leakage rate" evaluation
  dimension (`evaluationMetrics.service.ts`, referenced in this file's own comment) is blind to
  these leak types.
- **User impact:** A contact's email/phone/CNPJ could appear in AI output where a CPF would have
  been caught.
- **Business impact:** Understates real PII leakage rate in the evaluation harness that the product
  itself uses to measure this guardrail's effectiveness.
- **Suggested resolution:** Extend the regex set (and `CPF_PATTERN_LENGTH`-equivalent tail-buffer
  sizing in `createStreamingRedactor`) to cover CNPJ, unformatted CPF (with a digit-only boundary
  check to limit false positives), email, and phone — same centralized function, same call sites.

### AIAGENT-007 — `agent.request_cross_role` catalog description is stale in the opposite direction
- **Category:** TD-DOC, TD-CONFIG
- **Severity:** MEDIUM — **Priority:** P4 — **Confidence:** HIGH — **Status:** CONFIRMED
- **Effort:** XS
- **Evidence:** `src/config/capability-catalog.ts:277-285`: description says "Permanece FUTURE_TOOL
  até o PROMPT 7 implementar o fluxo de aprovação." `src/features/job-roles/config/
  tool-bindings.ts:385-396`: same capability is `available: true`, `reason: 'AVAILABLE'`,
  `verification: 'VERIFIED'`, pointing at `accessRequest.service.ts`'s `createAccessRequest` — i.e.
  PROMPT 7 has shipped and this capability already works.
- **Root cause:** same class of bug as AIAGENT-001 (two files assert the capability's status, one
  wasn't updated when the real implementation landed) — this instance drifted the opposite way
  (says blocked, is actually available).
- **Failure scenario:** A developer reading only `capability-catalog.ts` (the shorter, more visible
  file) would incorrectly believe this capability doesn't work yet and might re-implement it or
  avoid using it.
- **Suggested resolution:** Update the description text to match `tool-bindings.ts`, or better,
  derive the catalog's displayed status from `tool-bindings.ts` at build/runtime instead of
  hand-maintaining prose in two places (would also structurally prevent AIAGENT-001's drift).

### AIAGENT-008 — `AgentExecution.confidence` is a coarse two-value heuristic presented as a score
- **Category:** TD-AI
- **Severity:** LOW — **Priority:** P4 — **Confidence:** MEDIUM — **Status:** CONFIRMED
- **Effort:** XS
- **Evidence:** `src/features/job-roles/services/agentRuntime.service.ts:110-116`
  (`computeConfidence`): returns exactly `0.8` or `0.4` depending only on whether
  `output.missingData.length === 0`. Documented in its own comment as intentional
  ("nunca decorativa... nunca um valor aleatório"), but the resulting field is surfaced to API
  consumers (`AgentExecutionResultDto.confidence`, consumed by `roleSupervisor.service.ts`) as a
  bare number with no indication it's binary in practice.
- **Failure scenario:** A caller (e.g., `roleSupervisor.service.ts` aggregating multi-step
  confidence, or a future UI) treats `0.8`/`0.4` as a continuous, comparable probability rather than
  a two-bucket flag, over- or under-weighting it relative to genuinely continuous signals.
- **Suggested resolution:** Either compute a genuinely continuous confidence from executor-specific
  signals, or rename/typedoc the field to make its two-value nature explicit to consumers.

### AIAGENT-009 — `VectorService.ingestDocument` is dead code (throws unconditionally)
- **Category:** TD-DEAD, TD-RAG
- **Severity:** LOW — **Priority:** P4 — **Confidence:** HIGH — **Status:** CONFIRMED
- **Effort:** XS
- **Evidence:** `src/features/intelligence/services/vector.service.ts:21-32`: `@deprecated`,
  unconditional `throw new Error(...)`, comment confirms "RAG-001: ... nunca teve nenhum chamador em
  todo o app." This was already found and safely disarmed by a prior audit (RAG-001) —
  `searchSimilar` now correctly delegates to the real `searchService.hybridSearch` pipeline.
- **Suggested resolution:** Delete the class/file entirely in a future cleanup pass now that no
  import references it (confirmed no external callers beyond its own module in this pass); purely
  a housekeeping item, not a functional risk today.

### AIAGENT-010 — A handful of catalog agents hold capability grants that are structurally always blocked
- **Category:** TD-AGENT, TD-CONFIG
- **Severity:** LOW — **Priority:** P4 — **Confidence:** HIGH — **Status:** CONFIRMED
- **Effort:** S
- **Evidence:** `agentCapabilities.normalized.json` aggregation: `contract.generate: 7` grants,
  `signature.request: 7` grants, `billing.reconcile: 2` grants — all three are `FUTURE_TOOL`/
  `SOURCE_REQUIRED` and `UNVERIFIED` in `tool-bindings.ts` (lines 280-325), so every agent holding
  one of these grants is denied at authorization step 11 regardless of role/access-level, same as
  AIAGENT-001 but scoped to a handful of agents instead of all 391.
- **Suggested resolution:** No action needed beyond awareness — these are honestly labeled
  `SOURCE_REQUIRED`/`FUTURE_TOOL` in the registry (not misrepresented), unlike `agent.execute`
  which claims a blocker that has already been resolved. Low priority, informational.

## Capability rows

| Capability | Status | Frontend | Backend | Database | Integration | AI | Automation | Tests | Security | Tenancy | Observability | Documentation |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Production Swarm (Supervisor + SDR/BDR/Closer/CRM/Ops) | FUNCTIONAL | N/A | COMPLETE | COMPLETE | COMPLETE | COMPLETE | COMPLETE | FUNCTIONAL | COMPLETE | COMPLETE | FUNCTIONAL | FUNCTIONAL |
| LearningAgent (style profile, versioned, human-approved) | FUNCTIONAL | UNKNOWN | COMPLETE | COMPLETE | N/A | COMPLETE | COMPLETE | FUNCTIONAL | COMPLETE | COMPLETE | FUNCTIONAL | FUNCTIONAL |
| Commercial Cell — 3 routed agents (revenue-intel, churn, contract-signature) | FUNCTIONAL | UNKNOWN | COMPLETE | COMPLETE | COMPLETE | COMPLETE | PARTIAL | PARTIAL | COMPLETE | COMPLETE | PARTIAL | FUNCTIONAL |
| Commercial Cell — 6 unrouted agents (LDR/Coordinator/Manager/ExecDirector/BitrixGuardian/Billing) | ORPHANED | MISSING | COMPLETE | N/A | N/A | COMPLETE | MISSING | MISSING | N/A | N/A | MISSING | PARTIAL |
| Job-Roles Agent Runtime / Capability Engine (mechanism itself) | FUNCTIONAL | UNKNOWN | COMPLETE | COMPLETE | PARTIAL | MISSING | COMPLETE | FUNCTIONAL | COMPLETE | COMPLETE | FUNCTIONAL | PARTIAL |
| 391-agent normalized catalog (as an executable agent workforce) | PARTIALLY IMPLEMENTED | UNKNOWN | PARTIAL | COMPLETE | MOCKED | MISSING | BROKEN | PARTIAL | COMPLETE | COMPLETE | PARTIAL | MOCKED |
| AI Gateway (model routing, fallback, circuit breaker, cost budget) | PRODUCTION READY | N/A | COMPLETE | COMPLETE | COMPLETE | COMPLETE | COMPLETE | FUNCTIONAL | COMPLETE | COMPLETE | COMPLETE | FUNCTIONAL |
| Guardrails (PII redaction, prompt-injection defense, LGPD consent gate) | PARTIALLY FUNCTIONAL | N/A | PARTIAL | PARTIAL | N/A | COMPLETE | PARTIAL | FUNCTIONAL | PARTIAL | PARTIAL | FUNCTIONAL | FUNCTIONAL |
| Human approval gates (AIPendingAction, learning-profile approve/reject) | FUNCTIONAL | UNKNOWN | COMPLETE | COMPLETE | N/A | N/A | COMPLETE | FUNCTIONAL | COMPLETE | COMPLETE | COMPLETE | FUNCTIONAL |

## Quick wins
(see also "Quick wins" section above — duplicated here per schema)
- Sync `capability-catalog.ts` descriptions to `tool-bindings.ts`'s real status for `agent.execute`
  and `agent.request_cross_role`.
- Add a minimal LLM-backed executor for `agent.execute` covering `PROMPT_READY` agents.
- Extend `redactSensitiveData` to cover CNPJ/unformatted CPF/email/phone.

## Structural problems
(see "Structural problems" section above)

## Needs verification
(see "Needs verification" section above)
