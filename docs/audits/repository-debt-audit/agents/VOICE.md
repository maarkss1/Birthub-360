# VOICE — Audit Report

## Agent
VOICE (voice/telephony capability specialist), part of the multi-domain Birth Hub 360º repository debt audit.

## Mission
Audit the Voice/Telephony capability end-to-end: Birth Voices Hub SDR voice agent, cold calling, 3CX PABX integration, inbound/outbound calls, STT/TTS, recording, transcription, call state, call analysis, CRM writeback, summaries, qualification, follow-up generation, consent/recording compliance, PII storage, and related billing. Trace real chains (UI → API → service → domain → DB/queue/external provider) and classify maturity honestly, distinguishing UI-only/prototype work from code genuinely wired to a real provider.

## Scope
- `src/features/integrations/birth-voice/**` (Birth Voices Hub / Bland AI outbound SDR voice agent, cold-call campaign, call suppression/opt-out, webhooks)
- `src/features/integrations/threecx/**` (3CX PABX Click-to-Call + Call Flow webhook)
- `src/features/copiloto-ia/**` (voice-call ingestion bridge, Whisper transcription pipeline, insight extraction, coaching/deal-health scoring) — inspected because voice call transcripts feed directly into it
- `src/lib/queue/coldCall.worker.ts`, `src/features/automations/coldCallCampaign.api.ts` (BullMQ scheduling)
- `src/hooks/use3CXIntegration.ts`, `src/hooks/useVoiceHubIntegration.ts`, `src/features/integrations/birth-voice/components/VoiceCallActivity.tsx`, `src/features/integrations/birth-voice/components/VoiceHubConnectionPanel.tsx` (frontend wiring)
- `src/components/ui/VoiceCommandWidget.tsx`, `src/features/mesa-tratamento/hooks/useVoiceDictation.ts` (browser Web Speech API, unrelated to telephony but "voice" in scope)
- `src/features/roleplay/**` (roleplay practice — uses browser mic/STT, not real telephony; inspected to confirm it is correctly kept separate from real calling)
- `prisma/schema.prisma` models: `VoiceHubConnection`, `VoiceCallLog`, `ThreeCXConnection`, `ThreeCXCallEvent`, `CallSuppression`, `OptOutRecord`, `CopilotoConversation`, `CopilotoTranscriptSegment`, `CopilotoInsight`, `CopilotoConsentRecord`
- `src/lib/crypto/piiFields.ts`, `src/shared/services/dataSubjectErasure.service.ts` (LGPD/PII posture as it applies to call data)
- `src/features/billing/**` (Usage domain, checked for voice-provider cost tracking)
- `src/config/env.ts` (voice-related env contract)
- Existing test files under `tests/unit/features/integrations/birth-voice/**`, `src/features/integrations/threecx/__tests__/**`, `src/features/copiloto-ia/**/__tests__/**`

## Areas inspected
1. Outbound AI voice SDR call flow (Birth Voices Hub / Bland AI): dial → provider call → async webhook → CRM Activity/TimelineEvent/VoiceCallLog → WhatsApp fallback → Copiloto ingestion.
2. Cold-call campaign automation (BullMQ scheduler → policy/window checks → `callLead` → persisted run report).
3. Opt-out / call suppression (`CallSuppression` + unified `OptOutRecord`), consent-to-record detection.
4. 3CX PABX integration: connection CRUD, Click-to-Call, inbound Call Flow webhook, tenant resolution by extension.
5. Voice-call → Copiloto Comercial IA bridge (consent-gated), Whisper STT pipeline for meeting audio, downstream insight/coaching/deal-health/forecast scoring.
6. PII/LGPD posture specific to call content: encryption at rest, data-subject erasure coverage.
7. Billing/cost visibility for voice-provider usage.
8. Browser-only voice features (Web Speech API command widget, dictation, roleplay practice mic) — confirmed these are correctly *not* conflated with real telephony.

## Files inspected
Approximately 30 files read in full or in large part, plus schema sections and targeted greps across ~150 matched files. Primary files:
- `src/features/integrations/birth-voice/birthVoice.service.ts`, `birthVoice.helpers.ts`, `birthVoice.webhook.ts`, `birthVoice.routes.ts`, `voiceResult.webhook.ts`, `coldCall.service.ts`, `coldCall.policy.ts`, `callSuppression.service.ts`, `voiceHubConnection.service.ts`, `atlasProductPlaybook.ts`, `components/VoiceCallActivity.tsx`
- `src/features/integrations/threecx/threecx.service.ts`, `threecx.routes.ts`
- `src/features/copiloto-ia/infra/CopilotoVoiceIngestionAdapter.ts`, `whisperTranscription.service.ts`, `jobs/transcribeConversation.worker.ts`
- `src/lib/queue/coldCall.worker.ts`, `src/features/automations/coldCallCampaign.api.ts`
- `src/hooks/use3CXIntegration.ts`, `src/hooks/useVoiceHubIntegration.ts`
- `src/components/ui/VoiceCommandWidget.tsx`, `src/features/mesa-tratamento/hooks/useVoiceDictation.ts`, `src/features/roleplay/components/RoleplayHub.tsx`, `src/features/roleplay/components/roleplay-hub/CallAnalysisReport.tsx`
- `src/lib/crypto/piiFields.ts`, `src/shared/services/dataSubjectErasure.service.ts`
- `src/features/billing/domain/Usage.ts`, `application/UsageUseCases.ts`
- `src/config/env.ts` (voice-related keys)
- `prisma/schema.prisma` (VoiceHubConnection, VoiceCallLog, ThreeCXConnection, ThreeCXCallEvent, CallSuppression, Copiloto* models)

## Executive summary
The Birth Voices Hub / Bland AI outbound calling path, the cold-call campaign automation, and the 3CX Click-to-Call integration are **unusually mature and self-audited** for a codebase of this kind: previous audit waves (visible in-code as "achado de auditoria"/"ACH-xx" comments) already fixed severe issues (webhooks that never parsed a body, a provider-routing bug that silently sent calls to the wrong vendor, a 3CX click-to-call that always reported success without dialing, cross-tenant webhook forgery, unsigned/hardcoded webhook secrets, SSRF/DNS-rebinding on tenant-supplied PBX/Hub URLs, opt-out bypass via 3CX). Idempotency, tenant isolation, honest outcome classification (never silently upgrading "voicemail"/"no-answer" to "completed"), and consent-to-record detection are all real and tested.

Despite that maturity, this audit found one **CRITICAL, previously-undocumented, multi-tenancy-breaking defect**: the entire AI voice-agent sales script (`atlasProductPlaybook.ts`) is hardcoded to one specific customer's brand and product ("Gessica" from "Atlas GR", pitching "Atlas Profile"/"CIA" background-check products) with **no per-organization override anywhere in the codebase**. Any other tenant of this now-generic, multi-industry CRM ("Birth Hub 360º", ICP = "qualquer empresa com área comercial" per `.claude/CLAUDE.md`) who enables the voice SDR feature will have the AI call their own leads and pitch a competitor's unrelated products under a fabricated persona. Compounding this, the `agentType` parameter (`'sdr' | 'nps' | 'reactivation'`) accepted by the API and threaded through `callLead()` is silently ignored by the prompt builder — an NPS or reactivation call plays the exact same cold-sales pitch as a first-touch SDR call.

Beyond that headline finding, this audit confirmed a real LGPD/PII gap: call transcripts and derived insights that flow into the Copiloto Comercial IA module (`CopilotoConversation`/`CopilotoTranscriptSegment`/`CopilotoInsight`, populated directly from voice-call webhooks) are **not reached by the data-subject erasure mechanism**, even though the erasure service's own documentation carefully enumerates every other PII table it reaches via `Lead.contactId` (including `VoiceCallLog`, which *is* redacted) — an inconsistency, not a documented trade-off. Call content (`VoiceCallLog.transcript/summary`, `CopilotoTranscriptSegment.text`, `ThreeCXCallEvent.rawPayload`) is also stored in plaintext at rest, unlike `Contact.email/phone/whatsapp`, which are AES-256-GCM encrypted in the same codebase. Recording links (`VoiceCallLog.recordingUrl`) are always null for the current/primary webhook path even though consent-to-record is actively tracked as if recordings exist. Voice-provider cost (Bland AI per-minute billing, Birth Voices Hub usage) has zero visibility inside the product, unlike Whisper/chat AI cost, which are tracked and budget-gated. The 3CX Call Control API contract is explicitly flagged in-code as never validated against a real PABX, and its inbound webhook tenant-resolution does an O(N)-orgs scan per event.

Net assessment: the **safety rails** (consent, opt-out, tenant isolation, idempotency, honest state reporting) around voice calling are production-grade. The **content correctness** of what the AI actually says on the call, and the **LGPD completeness** of what happens to what was said, both have real, demonstrable gaps.

## Critical
### VOICE-001 — AI voice-agent script is hardcoded to one tenant's brand/product, breaks for every other organization
- **Severity:** CRITICAL · **Priority:** P0 · **Confidence:** HIGH · **Status:** CONFIRMED
- **Category:** TD-TENANT, TD-FEAT, TD-ARCH
- **Evidence:** `src/features/integrations/birth-voice/atlasProductPlaybook.ts` — `ATLAS_GR_PLAYBOOK` is a literal, unparameterized constant naming the AI persona "Gessica", the company "Atlas GR" (founded 2004, 390+ clients, "Atlas Profile"/"CIA" products), and hardcoding the closing line "Tchau, tchau da Atlas GR!". `buildVoicePromptForLead(companyName, contactName)` only interpolates the *lead's* company/contact name into this fixed script; it takes no `organizationId`, no tenant playbook, no product catalog. `birthVoice.service.ts:173,195` calls this same function for every organization, for both the Bland AI branch and the Hub branch. A repo-wide grep for `buildVoicePromptForLead`/`ATLAS_GR_PLAYBOOK` shows zero other call sites and zero per-tenant override mechanism (no config table, no `organizationId`-keyed script lookup, no dependency on `src/config/playbooks.ts`, which only affects UI content, not this).
- **Root cause:** the voice script was written for a single original customer (Atlas GR) and never generalized when the product became a brand-agnostic, multi-tenant CRM (per `.claude/CLAUDE.md` §1: "ICP: qualquer empresa com área comercial que queira automatizar ponta a ponta... Nenhum texto novo deve amarrar o produto a um vertical específico").
- **Failure scenario:** any organization other than Atlas GR that configures a `VoiceHubConnection` (self-service via Integrations screen, `voiceHubConnection.service.ts`) and calls `POST /api/integrations/birth-voice/call/:leadId` will have the AI introduce itself as "Gessica from Atlas GR" and pitch background-check/fleet-risk products to that organization's own leads, regardless of what that organization actually sells.
- **User/business impact:** for a multi-tenant SaaS being positioned to "qualquer empresa com área comercial," this makes the flagship AI voice-calling feature actively harmful (wrong company name, wrong product, wrong offer) for every tenant except the original one — a customer-facing call that misrepresents the caller's own business, with real reputational/compliance exposure (the AI's own opening disclosure line would be a lie: it says "aqui é a Gessica... da Atlas GR" to a lead who has never heard of Atlas GR).
- **Suggested resolution:** make the voice script organization-scoped — store it (or a small structured template: persona name, company name/description, products/offers, closing line) on `VoiceHubConnection` or a sibling config table, and have `buildVoicePromptForLead` require and interpolate it instead of hardcoding Atlas GR's identity. Until that exists, this feature should not be presented as available/self-service to any tenant other than Atlas GR.
- **Effort:** M

### VOICE-002 — `agentType` (SDR/NPS/Reactivation) is accepted end-to-end but silently ignored by the prompt builder
- **Severity:** HIGH · **Priority:** P1 · **Confidence:** HIGH · **Status:** CONFIRMED
- **Category:** TD-BUG, TD-FEAT
- **Evidence:** `birthVoice.routes.ts:65` reads `req.body.agentType` (default `'sdr'`) and passes it to `callLead(organizationId, leadId, agentType)`. `birthVoice.service.ts:99-104` types `VoiceAgentType = 'sdr' | 'nps' | 'reactivation'` and includes `agentType` in the Hub request body (line ~191). But `buildVoicePromptForLead(companyName, contactName)` (the only thing that determines what the AI actually says, called at lines 173 and 195) takes no `agentType` argument at all and always returns the same first-touch cold-sales pitch ("agendar reunião comercial", "Teste Grátis").
- **Failure scenario:** calling `POST /call/:leadId` with `agentType: 'nps'` (meant to survey an existing customer) or `'reactivation'` (meant to win back a churned account) produces the identical unsolicited-sales script as a cold `'sdr'` call — an existing paying customer being surveyed for satisfaction instead hears a stranger-sounding cold pitch to "agendar uma reunião comercial," which is a materially different (and worse) customer experience than intended.
- **Suggested resolution:** either implement distinct prompt templates per `agentType` (compounding with VOICE-001's per-tenant fix), or remove the `agentType` parameter from the API/UI until it does something, so the type system doesn't advertise a capability that doesn't exist. This is the same class of issue AGENTS.md calls "bloqueador #7" (the system affirms something it doesn't actually do) already fixed elsewhere in this same module (3CX click-to-call, 3CX test-connection) — this instance was missed.
- **Effort:** M

## High
### VOICE-003 — Voice-call transcripts/insights bridged into Copiloto Comercial IA are not reachable by the LGPD data-subject erasure mechanism
- **Severity:** HIGH · **Priority:** P1 · **Confidence:** HIGH · **Status:** CONFIRMED
- **Category:** TD-COMPLIANCE, TD-SEC, TD-DATA
- **Evidence:** `src/shared/services/dataSubjectErasure.service.ts:43-71` documents, table by table, everything `eraseDataSubject()` reaches and redacts (`WhatsAppMessage`, `VoiceCallLog` — "redige `transcript`, `summary` e `recordingUrl`", `ConversationSignal`/`TimelineEvent`) and explicitly documents what it deliberately does *not* reach and why (`AgentMemory` — no contactId/leadId path; `AILog`/`EnrichmentLog` — not applicable). Nowhere in this function, or anywhere else in the codebase (`grep -rn "Copiloto" dataSubjectErasure.service.ts` → no matches), is `CopilotoConversation`, `CopilotoTranscriptSegment`, or `CopilotoInsight` mentioned or redacted — despite `CopilotoConversation` having a **direct** `contactId` field (`prisma/schema.prisma` model `CopilotoConversation`, line ~2063-2082), which is a more direct, easier-to-reach path than the `Lead.contactId` indirection already used for `VoiceCallLog`. These tables are populated straight from voice-call content: `CopilotoVoiceIngestionAdapter.ingestCallResult()` (called from both `birthVoice.webhook.ts` and `voiceResult.webhook.ts` on every completed call with a real conversation) writes the full segmented transcript into `CopilotoTranscriptSegment.text` and derived objections/competitors/complaints into `CopilotoInsight.valueJson`.
- **Failure scenario:** a lead/contact who exercises their LGPD right to erasure gets `VoiceCallLog.transcript` redacted (per the documented mechanism) while the *same conversation's* full transcript and AI-extracted insights (potentially including sentiment, objections, competitor mentions, complaints — richer than the raw transcript) remain fully identifiable and readable in `CopilotoConversation`/`CopilotoTranscriptSegment`/`CopilotoInsight` forever, because nothing ever redacts them.
- **Suggested resolution:** extend `eraseDataSubject()` to redact `CopilotoTranscriptSegment.text` and neutralize/delete `CopilotoInsight.valueJson` for conversations where `CopilotoConversation.contactId` (direct) or `.leadId` matches the target contact, mirroring the existing `VoiceCallLog` treatment.
- **Effort:** S

### VOICE-004 — Call content stored in plaintext at rest while equivalent contact PII in the same codebase is encrypted
- **Severity:** HIGH · **Priority:** P2 · **Confidence:** HIGH · **Status:** CONFIRMED
- **Category:** TD-SEC, TD-COMPLIANCE
- **Evidence:** `src/lib/crypto/piiFields.ts:34-57`, `ENCRYPTED_MODEL_FIELDS` — lists `Contact: ['email', 'phone', 'whatsapp']` (AES-256-GCM at rest, with a large comment block explaining why this matters) plus every integration credential (`ThreeCXConnection.apiKey/apiSecret`, `VoiceHubConnection.apiKey/webhookSecret`, etc.). `VoiceCallLog` (schema line 2789) is absent from this map, so `transcript`, `summary`, and `recordingUrl` — the actual recorded content of a sales call with a named lead, per `voiceResult.webhook.ts:262-273` and `birthVoice.webhook.ts:117-135` — are written to Postgres in plaintext. Same for `CopilotoTranscriptSegment.text` (schema line ~2140) and `ThreeCXCallEvent.rawPayload` (schema line ~3503, a raw JSON blob of the 3CX payload which `threecx.service.ts`'s own comments note "pode conter" the full caller/callee phone number).
- **Failure scenario:** a Postgres backup, replica, or `pg_dump` leak exposes full call transcripts (potentially containing health, financial, or other sensitive statements made by leads) in cleartext, while the same leak would only expose encrypted ciphertext for that same person's phone/email/WhatsApp — an inconsistent security posture for data of comparable or greater sensitivity.
- **Suggested resolution:** add `VoiceCallLog: ['transcript', 'summary', 'recordingUrl']` and `CopilotoTranscriptSegment: ['text']` to `ENCRYPTED_MODEL_FIELDS` (the same transparent Prisma-extension mechanism already used for every other sensitive field in this codebase), and evaluate whether `ThreeCXCallEvent.rawPayload` needs at least phone-number redaction before persistence given it's an unstructured JSON blob that can't be selectively field-encrypted.
- **Effort:** M

### VOICE-005 — 3CX Call Control API contract never validated against a real PABX
- **Severity:** HIGH · **Priority:** P1 · **Confidence:** HIGH (as a documented, acknowledged gap) · **Status:** CONFIRMED
- **Category:** TD-INTEGRATION, TD-TEST
- **Evidence:** `threecx.service.ts:226-245` (`make3CXCall`) and the block comment at lines 389-410 (`process3CXWebhook`) explicitly state: "o contrato exato da API de Call Control deste PABX (`/api/v1/calls`, payload `{ from, to }`) não pôde ser validado contra um servidor 3CX real"; the webhook field-name guesses ("nomenclatura plausível, não confirmada") are similarly unverified. `test3CXConnection` pings a guessed `/api/v1/healthcheck` endpoint with the same caveat.
- **Failure scenario:** in production, every `make3CXCall`/`test3CXConnection`/`process3CXWebhook` invocation against a real customer's 3CX PABX may fail (honestly, per the code's own design — it does not lie about success) or silently misparse events (e.g., a real 3CX field name not in the guessed list falls through to `null`), because the actual 3CX REST Call Control / Call Flow contract for the customer's PBX version was never confirmed.
- **Note:** this is already self-documented in the code (a real strength — the module fails honestly rather than fabricating success), but it means the 3CX integration should be treated as **UNVERIFIED against a real provider**, not as a working integration, until validated against an actual 3CX server. This audit did not find evidence anywhere in the repo (tests, docs, handoffs) that such validation has since occurred.
- **Suggested resolution:** validate against a real 3CX sandbox/trial PABX (3CX publishes its Call Control API v20+ reference) before this is relied upon in a live customer rollout; until then, disclose this as a beta/unverified integration rather than a supported one.
- **Effort:** M (validation + likely contract fixes)

## Medium
### VOICE-006 — `VoiceCallLog.recordingUrl` is always null on the primary (Birth Voices Hub) webhook path
- **Severity:** MEDIUM · **Priority:** P2 · **Confidence:** HIGH · **Status:** CONFIRMED
- **Category:** TD-FEAT, TD-IMPL
- **Evidence:** `birthVoice.helpers.ts:16-35`, the `CallEndedData` interface (the Hub's webhook payload shape) has no `recordingUrl`/`recording_url` field at all. `birthVoice.webhook.ts:117-135` (`recordCallResult`) hardcodes `recordingUrl: null` when creating every `VoiceCallLog` row. Only the legacy `voiceResult.webhook.ts` (Bland AI's own webhook, `recordingUrl` at line 271) ever populates this field. `VoiceCallActivity.tsx:164-173` renders an "Ouvir" (Listen) link only `{call.recordingUrl && ...}` — for any organization using the Birth Voices Hub path (the one advertised in the Integrations screen, `VoiceHubConnectionPanel.tsx`, as opposed to the legacy Bland-only path), that link will never appear.
- **Failure scenario:** consent-to-record is actively detected and gated (`detectRecordingConsent`/`RECORDING_DISCLOSURE_PHRASES` — the whole point of which is that recordings exist and require disclosure), yet no reviewer can ever actually listen to a Hub-originated call recording through the product — there is no code path that could populate the URL even if the Hub does record calls server-side.
- **Suggested resolution:** confirm whether the Birth Voices Hub exposes a recording URL/ID in its webhook payload (or via a separate "recording ready" callback/endpoint) and wire it into `CallEndedData`/`recordCallResult`; if the Hub genuinely never exposes recordings, the consent-to-record disclosure language and detection should be re-examined for accuracy (disclosing recording when none is retrievable is itself a compliance question).
- **Effort:** S–M (depends on Hub API)

### VOICE-007 — No cost/usage visibility for voice-provider consumption (Bland AI / Birth Voices Hub)
- **Severity:** MEDIUM · **Priority:** P2 · **Confidence:** HIGH · **Status:** CONFIRMED
- **Category:** TD-BILLING, TD-FEAT
- **Evidence:** `src/features/billing/domain/Usage.ts` and `UsageUseCases.ts` model usage purely from `AILog` (chat completions, keyed by model/prompt). `whisperTranscription.service.ts` cost IS tracked via a synthetic `AILog` row (`transcribeConversation.worker.ts:65-84`, `recordWhisperCost`) and gated by `assertAiBudgetNotExceeded()`. No equivalent exists anywhere for outbound voice-call cost: `callLead()`/`runColdCallCampaign()` never write an `AILog` row or any other cost record, and there is no budget circuit breaker analogous to the AI-chat one before dialing.
- **Failure scenario:** the automated cold-call campaign (`coldCall.worker.ts`, every 15 minutes, up to `SDR_MAX_CALLS_PER_RUN` calls per organization per run, default 10) can run continuously for an authorized organization with zero in-product visibility into what it is costing on the Bland AI / Birth Voices Hub side, and no internal safeguard would ever halt it for budget reasons the way `assertAiBudgetNotExceeded()` halts AI chat/Whisper usage.
- **Suggested resolution:** if the Hub/Bland API returns call cost or billable duration in the webhook (Bland's `call_length` is already read), record it into `AILog` (or a dedicated usage table) the same way Whisper cost is recorded, and consider an analogous budget guard before `runColdCallCampaign` dials.
- **Effort:** M

### VOICE-008 — Per-webhook O(N)-organizations scan to resolve 3CX tenant by extension
- **Severity:** MEDIUM · **Priority:** P2 · **Confidence:** HIGH (self-documented) · **Status:** CONFIRMED
- **Category:** TD-PERF, TD-ARCH
- **Evidence:** `threecx.service.ts:420-483` (`resolveConnectionByExtension`) runs one tenant-scoped `findFirst` query per organization in the entire database (capped at `MAX_ORGS_SCAN_FOR_EXTENSION_MATCH = 5000`) for **every single inbound 3CX webhook event**, because the shared `THREECX_WEBHOOK_SECRET` is global and the payload's only tenant hint is the extension number. The code itself documents this as a known, unresolved scaling cost ("CUSTO CONHECIDO, NÃO RESOLVIDO NESTA TAREFA... não escala para uma base grande de tenants") and names the correct fix (a per-connection opaque webhook path, as Bitrix already does) as out of scope for whichever task last touched this file.
- **Failure scenario:** at meaningful tenant scale, every 3CX call event (which can include multiple non-terminal events like ringing/answered per call) triggers up to thousands of sequential DB round-trips before the actual event is even processed — a latency and DB-load problem that grows linearly with tenant count, not with call volume.
- **Suggested resolution:** adopt the same per-connection opaque identifier in the webhook URL path already used for Bitrix (`bitrix.webhook.ts`), which the code's own comment identifies as the correct architecture; requires a schema/routing change outside `threecx/**`.
- **Effort:** M–L (cross-cutting: routing + migration)

## Low
### VOICE-009 — `VoiceHubConnection` selection has no per-agent-type or per-purpose routing
- **Severity:** LOW · **Priority:** P3 · **Confidence:** HIGH · **Status:** CONFIRMED
- **Category:** TD-ARCH, TD-FEAT
- **Evidence:** `birthVoice.service.ts:35-39` (`requireConfig`) always picks the single `VoiceHubConnection` with `enabled: true` ordered `createdAt: 'asc'` — the model's own schema comment (line ~2651) says plainly "não é (ainda) um roteamento por tipo de agente." Combined with VOICE-002, an organization that configures multiple Hub connections for different purposes has no way to route `sdr`/`nps`/`reactivation` calls to different agents/numbers.
- **Suggested resolution:** low priority until VOICE-001/002 (script personalization) are addressed, since routing to different connections is moot while every connection plays the identical hardcoded script.
- **Effort:** S

### VOICE-010 — WhatsApp integration has no audio/voice-note (PTT) handling
- **Severity:** LOW · **Priority:** P3 · **Confidence:** MEDIUM · **Status:** NEEDS_VERIFICATION
- **Category:** TD-FEAT
- **Evidence:** `grep -rn "mediaType|audio|ptt" src/features/integrations/whatsapp/*.ts` returns no matches in `whatsappMessage.service.ts` or `conversation-intelligence.service.ts`. This suggests inbound WhatsApp voice notes (a common channel for Brazilian SMBs, the product's stated market) are not transcribed or otherwise processed — likely because the WhatsApp integration only handles text messages generally (not voice-specific), so this may be a broader "no media support" gap rather than a voice-specific one.
- **Suggested resolution:** confirm with the WhatsApp/integration-audit findings whether media handling exists at all; if text-only is a deliberate scope decision, no voice-specific action is needed beyond noting the gap for anyone assuming voice notes are transcribed.
- **Effort:** N/A (verification only)

## Technical debt
- VOICE-008 (O(N)-org scan), VOICE-009 (no connection routing) are architecture-level technical debt with real, if currently modest, cost.

## Implementation debt
- VOICE-001, VOICE-002 (hardcoded/incomplete prompt logic) and VOICE-006 (recordingUrl never populated on primary path) are implementation gaps where the data model and API surface promise more than the implementation delivers.

## Feature debt
- VOICE-002 (`agentType` NPS/reactivation not implemented), VOICE-007 (no cost tracking/budget guard for voice), VOICE-009 (no per-agent-type connection routing).

## Bugs
- VOICE-002 is effectively a correctness bug: a caller-visible parameter (`agentType`) has no effect on behavior, matching this codebase's own definition of "bloqueador #7" (affirms a capability it doesn't have).

## Architecture
- VOICE-001/002: the AI voice script has no tenant-scoping architecture at all — a gap given every *other* integration in this same directory (Bitrix, Slack, Stripe, Omie, 3CX, the Hub connection itself) is already correctly modeled per-organization.
- VOICE-008: tenant resolution by extension via a global secret is an architectural mismatch inherited from a single shared 3CX webhook route; the fix is known and documented but not scheduled.

## Security
- VOICE-004: call transcripts, summaries, recording URLs, and raw 3CX event payloads are unencrypted at rest, inconsistent with this codebase's own standard (Contact PII, all integration credentials) for data of comparable sensitivity.
- Positive finding (not a debt item, noted for completeness): webhook signature verification for both the Birth Voices Hub and 3CX paths is fail-closed, per-tenant where a connection secret exists, timing-safe, and replay-guarded — this is genuinely solid and was clearly hardened by a prior audit wave (ACH-06-01).
- Positive finding: SSRF/DNS-rebinding protection (`assertSafeExternalUrl`/`safeFetch`) is consistently applied to all tenant-supplied URLs (PBX URL, Hub base URL) at both registration and every subsequent use.

## Tests
- Unit test files exist and appear to target the right units: `birthVoice.helpers.test.ts`, `birthVoice.service.test.ts`, `birthVoice.webhook.test.ts`, `callSuppression.service.test.ts`, `coldCall.service.test.ts`, `voiceHubConnection.service.test.ts`, `threecx.service.test.ts`, `CopilotoVoiceIngestionAdapter.consent.unit.test.ts`, `transcribeConversation.consent.unit.test.ts`. This audit did not execute the suite (out of scope — audit only), so pass/fail status is NEEDS_VERIFICATION, but the existence and naming of dedicated consent-focused test files is a positive signal of intentional LGPD-consent test coverage for the *ingestion* logic (which does not extend to the erasure gap in VOICE-003, since erasure is a separate service with no corresponding voice-specific test found).
- No test evidence found validating the 3CX Call Control contract against anything resembling a real/mock 3CX server response shape beyond the plausible field names already in the parser (see VOICE-005) — the tests validate the code's own defensive parsing, not conformance to the real external contract.

## Integration
- Birth Voices Hub / Bland AI: real HTTP calls, real webhook consumption, real persistence — genuinely wired, with the content-correctness caveats above (VOICE-001/002/006).
- 3CX: real HTTP calls and real webhook consumption are coded and tested against the code's own assumptions, but the actual external contract is unverified (VOICE-005) and inbound tenant-resolution doesn't scale (VOICE-008).
- Copiloto Comercial IA bridge: real, consent-gated, and functionally wired for ingestion; incomplete for erasure (VOICE-003).

## Product
- The cold-call campaign (`coldCall.service.ts`) is a well-designed, fail-closed automation (explicit organization allowlist, call-window enforcement, per-lead attempt/cooldown policy, persisted run reporting) — a good example of "system never claims to have done something it didn't."
- The flagship AI-voice-agent experience itself (what the lead actually hears) is the weakest link found in this audit, via VOICE-001/002.

## Mock/Fake/Placeholder
- No mocked/fake voice provider calls were found in production code paths (`callLead`, `make3CXCall`, `process3CXWebhook` all make real HTTP calls or process real webhook payloads; earlier "always returns success" mock-like behavior in 3CX click-to-call was already fixed by a prior audit and is documented as such in-code).
- The roleplay module's "Nota da Ligação" (`CallAnalysisReport.tsx`) is correctly a simulated practice tool (browser mic + Web Speech API + local `MediaRecorder`), not connected to any real telephony provider, and is not mislabeled as such in the UI — flagged here only to confirm it was checked and is not a case of a fake feature masquerading as real telephony.

## Dead/Orphan code
- None found specific to voice/telephony beyond the already-superseded legacy Bland webhook path (`voiceResult.webhook.ts`), which is still live and intentionally kept for backward compatibility (not dead code — it is mounted and documented as the legacy route).

## Quick wins
- Add `VoiceCallLog` and `CopilotoTranscriptSegment` to `ENCRYPTED_MODEL_FIELDS` (VOICE-004) — the encryption mechanism already exists and is transparent; this is a schema-comment-sized config change plus a migration for existing plaintext data.
- Extend `eraseDataSubject()` to cover `CopilotoTranscriptSegment`/`CopilotoInsight` via `CopilotoConversation.contactId` (VOICE-003) — the function already has the exact pattern to copy from `VoiceCallLog`.
- Remove or clearly gray-out the `agentType` selector in any UI that exposes it (if one exists) until VOICE-002 is implemented, to stop advertising a non-functional capability.

## Structural problems
- The absence of any tenant-scoping mechanism for the AI voice script (VOICE-001) is a structural gap in an otherwise consistently multi-tenant-aware codebase — every sibling integration in the same directory got this right.
- The LGPD erasure mechanism's coverage list (VOICE-003) is structurally incomplete relative to its own stated design intent (reach every PII table via `Lead.contactId`/direct `contactId`), suggesting the Copiloto module's schema additions were not cross-checked against the erasure service when they were introduced.

## Needs verification
- VOICE-005: whether the 3CX Call Control contract has since been validated against a real PABX (no evidence found in this pass).
- VOICE-010: whether WhatsApp media (voice notes) handling exists elsewhere and was simply not matched by this audit's greps.
- Whether the Birth Voices Hub actually exposes a recording URL by any field name not covered by `CallEndedData` (would change VOICE-006 from "gap" to "simple mapping fix").
- Whether `SDR_COLD_CALL_ENABLED`/`SDR_COLD_CALL_ORGANIZATIONS` are currently set to enable cold-calling for any real organization in production (this audit only reviewed code, not runtime config/secrets).

## Complete findings list
| ID | Title | Severity | Priority | Category | Status |
|---|---|---|---|---|---|
| VOICE-001 | AI voice script hardcoded to one tenant's brand/product | CRITICAL | P0 | TD-TENANT, TD-FEAT, TD-ARCH | CONFIRMED |
| VOICE-002 | `agentType` (NPS/reactivation) accepted but ignored | HIGH | P1 | TD-BUG, TD-FEAT | CONFIRMED |
| VOICE-003 | Copiloto transcripts/insights unreachable by LGPD erasure | HIGH | P1 | TD-COMPLIANCE, TD-SEC, TD-DATA | CONFIRMED |
| VOICE-004 | Call content stored in plaintext (not encrypted like Contact PII) | HIGH | P2 | TD-SEC, TD-COMPLIANCE | CONFIRMED |
| VOICE-005 | 3CX API contract never validated against real PABX | HIGH | P1 | TD-INTEGRATION, TD-TEST | CONFIRMED |
| VOICE-006 | `VoiceCallLog.recordingUrl` always null on primary webhook path | MEDIUM | P2 | TD-FEAT, TD-IMPL | CONFIRMED |
| VOICE-007 | No cost/usage tracking for voice-provider consumption | MEDIUM | P2 | TD-BILLING, TD-FEAT | CONFIRMED |
| VOICE-008 | O(N)-orgs scan per 3CX webhook event | MEDIUM | P2 | TD-PERF, TD-ARCH | CONFIRMED |
| VOICE-009 | No per-agent-type connection routing | LOW | P3 | TD-ARCH, TD-FEAT | CONFIRMED |
| VOICE-010 | WhatsApp has no voice-note/PTT handling | LOW | P3 | TD-FEAT | NEEDS_VERIFICATION |
