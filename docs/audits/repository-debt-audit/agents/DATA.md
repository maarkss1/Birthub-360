# DATA — Database Layer Audit (Birth Hub 360º)

## Agent
DATA (domain specialist, part of the multi-domain repository debt audit)

## Mission
Audit the database layer end to end: `prisma/schema.prisma` (112 models, 4565 lines), all 112
migrations, RLS/tenant scoping, foreign keys/cascades, indexes/uniques, nullability, soft delete,
audit fields, PII/encryption, seed data, and migration safety/drift. Cross-check divergences
between the ORM schema, raw migration SQL, and what application code actually assumes/relies on.

This is an audit only. No application source, schema, migration, or database was modified.

## Scope
- `prisma/schema.prisma` (all 112 models, all enums, all relations/indexes/uniques)
- `prisma/migrations/*/migration.sql` (112 migration directories, full-text grep across all,
  targeted deep read of ~20 of them — RLS-enabling migrations, the CRM360 soft-delete fix, the
  cadence/multi-cargo/agent-runtime partial-index migrations, the newest 2026-09 batch)
- `src/lib/prisma.ts` (Prisma Client extension: RLS session context, PII encrypt/decrypt,
  soft-delete injection, connection pool)
- `src/lib/crypto/piiFields.ts`, `src/lib/crypto/secretFields.ts` (field-level encryption map)
- `src/shared/services/dataSubjectErasure.service.ts` (LGPD erasure mechanism and its documented
  gaps)
- `src/features/crm/infra/PrismaLeadRepository.ts`, `src/features/companies/application/CompanyUseCases.ts`
  (representative repository/use-case layer to confirm whether schema-level nullability is
  actually exercised by real write paths)
- `scripts/create-demo.ts`, `scripts/seed-video-demo.ts`, `scripts/seed.ts`, `scripts/seed-multi-cargo.ts`
  (seed/demo data generators)
- `.claude/PILOTS.md` (full-text search for prior DB-related pilots/findings, to avoid
  re-discovering already-documented debt), `docs/REMOVED-DOCS.md` context, `.claude/CLAUDE.md`
- `npx prisma validate` executed directly (schema is syntactically/referentially valid)

## Areas inspected
- Tenant scoping (`organizationId` presence/nullability) across all 112 models
- Row-Level Security: which tables have `ENABLE ROW LEVEL SECURITY` + `CREATE POLICY`, which don't,
  and why (global catalog vs. tenant data)
- Foreign key `onDelete` behavior, especially the ~180 relations pointing at `Organization`
  (Cascade vs. SetNull vs. Restrict vs. unspecified/default)
- Unique constraints, including 3 partial unique indexes that exist only as raw SQL and are not
  representable in `schema.prisma`
- Soft delete (`deletedAt`) consistency against `src/lib/prisma.ts`'s `auditableModels` list
- PII/encryption-at-rest coverage vs. what is actually sensitive in the schema
- Seed/demo data scripts for production-safety guards
- Migration history health (drift already documented internally; `prisma validate` re-run)

## Files inspected
Approx. 45 files read/grepped in detail (schema, ~20 migrations opened directly, all 112 scanned by
pattern, `prisma.ts`, `piiFields.ts`, `secretFields.ts`, `dataSubjectErasure.service.ts`,
`PrismaLeadRepository.ts`, `CompanyUseCases.ts`, 4 seed scripts, `PILOTS.md`, `CLAUDE.md`), plus
`npx prisma validate` executed.

## Executive summary
The database layer is materially more mature than a typical audit target: RLS is real (`FORCE ROW
LEVEL SECURITY` + `USING`/`WITH CHECK` policies, not just `ENABLE`), Contact PII (email/phone/
whatsapp) is genuinely encrypted at rest with AES-256-GCM plus deterministic blind indexes for
equality/suffix search (a non-trivial, correctly-reasoned design), and a prior real bug (4 CRM360
models missing `deletedAt` columns that `auditableModels` assumed existed) was found, fixed with a
real migration, and left a paper trail. `npx prisma validate` passes cleanly.

That said, this pass found several concrete, evidence-backed gaps, the most important being: three
business-critical partial unique indexes (one active cadence run per lead, one active primary job
role per user, one active agent version per agent) exist **only** as raw SQL inside migration
files and have **no representation in `schema.prisma`** — meaning `prisma db push` (used to sync
non-migration environments) silently omits them, which the project's own `PILOTS.md` already
observed causing a real test failure (expected `409`, got `201`). Separately, `PILOTS.md` also
already documents that the migration history itself accumulated drift severe enough to block
`prisma migrate deploy` in a prior session (worked around with a destructive `db push
--force-reset`, not a real fix) — current status of that specific problem could not be re-verified
without a live database in this environment. The five most central commercial entities (`Company`,
`Contact`, `Lead`, `Activity`, `Prospect`) all have a **nullable** `organizationId` with no
explanatory comment (unlike the several other nullable-tenant fields in the schema, which are all
explicitly documented as an intentional "legacy row, fail closed" pattern), combined with an
inconsistent `SetNull`-on-org-delete cascade versus the ~90 other models that hard-cascade. Finally,
call transcripts/recordings (`VoiceCallLog`) and WhatsApp message bodies are stored in plaintext
despite being at least as sensitive as the `Contact` fields the team already chose to encrypt, and
`scripts/create-demo.ts` is an unguarded script that creates a full admin account with a hardcoded
weak password and no environment check.

None of these are exploited-in-the-wild findings (no live database was queried, no production
incident is asserted) — they are schema/migration-level facts with a described, plausible
consequence, several of which are corroborated by the project's own `PILOTS.md` history rather than
purely inferred by this pass.

## Critical
None found with direct evidence in this pass. The closest candidate (migration drift blocking
`migrate deploy`) is downgraded to High because it is already known/documented and its current
live-environment status could not be re-confirmed here (see DATA-002, Needs Verification).

## High
- **DATA-001** — Three business-invariant partial unique indexes exist only in migration SQL, invisible to `schema.prisma`.
- **DATA-002** — Migration history has previously-documented, unresolved drift that blocked `prisma migrate deploy` (status now unverified).
- **DATA-004** — Call transcripts, recordings, and WhatsApp message bodies stored in plaintext despite comparable sensitivity to already-encrypted Contact PII.

## Medium
- **DATA-003** — `organizationId` nullable + inconsistent cascade on the 5 most central commercial models, undocumented unlike similar patterns elsewhere.
- **DATA-005** — `scripts/create-demo.ts` has no environment guard and hardcodes a weak admin password.

## Low
- **DATA-006** — `User.email` is globally unique across all organizations (one email = one org, forever); may be intentional but is unconfirmed as a deliberate product decision.
- **DATA-008** — `Company.bitrixCompanyId` / `Contact.bitrixContactId` have no uniqueness constraint by design, so duplicate local rows can legitimately point at the same Bitrix record (documented trade-off, flagged here only as a live dedup gap for anyone building reporting on top of these columns).

## Technical debt
- TD-MIGRATION / TD-DATA: partial unique indexes not representable in the Prisma schema DSL
  (DATA-001) — a structural limitation of Prisma's schema language, not a mistake by the team, but
  one that was not compensated for with any doc/checklist ensuring these 3 statements survive a
  migration squash or a `db push`-based environment rebuild.
- TD-MIGRATION: migration history drift already observed once (DATA-002); no CI gate found that
  runs `prisma migrate diff --from-migrations --to-schema-datamodel` (or equivalent) to catch this
  class of drift before it reaches this severity again.
- TD-DATA: inconsistent nullability/cascade convention for `organizationId` across the schema —
  most models are `String` (required) + implicit/explicit `Cascade`; a minority (`Company`,
  `Contact`, `Lead`, `Activity`, `Prospect`, `Prompt`, `AgentMemory`, `AILog`) are `String?` with
  mixed `SetNull`/unspecified-default/explicit reasoning, and only 3 of those 8 have an inline
  comment explaining why.

## Implementation debt
- `scripts/create-demo.ts` (DATA-005) predates the more careful pattern used by
  `scripts/seed-video-demo.ts` (which requires an existing Better-Auth-created user, sets
  `bypass_rls` deliberately and scopedly, and only ever touches one already-known organization). It
  was seemingly never updated to match that safer pattern.

## Feature debt
None identified specific to this domain beyond what integration/AI agents already flag elsewhere
(e.g. `BillingRevenueAgent` placeholder is outside DATA's scope except to note: no billing/invoice
tables exist in `schema.prisma` at all — `StripeConnection`/`OmieConnection` only store connector
credentials, confirming there is genuinely no billing data model yet, consistent with what
discovery already reported).

## Bugs
No new live bugs directly observed in this pass (no database was queried). The one prior bug found
in `PILOTS.md` (Piloto 002 — 4 CRM360 models missing `deletedAt` columns that `auditableModels`
assumed existed, causing `PrismaClientValidationError` on every read) was independently re-verified
in this pass: all 8 current `auditableModels` entries (`Company`, `Contact`, `Lead`, `Activity`,
`CrmPipeline`, `CrmProduct`, `CrmDealItem`, `CrmCommercialDocument`) do have a `deletedAt` column in
the current schema — **confirmed fixed**, not re-reported as open debt.

## Architecture
- RLS design (`current_setting('app.current_tenant_id')` compared against `organizationId`, with a
  `app.bypass_rls` escape hatch restricted in production to a bootstrap allowlist — see
  `20260825120000_scope_rls_bypass_to_bootstrap_allowlist`) is sound and consistently applied to
  ~100 of 112 models.
- The 7 models without RLS or `organizationId` (`JobRole`, `AgentDefinition`, `AgentVersion`,
  `CapabilityDefinition`, `RoleAgentGrant`, `AgentCapabilityGrant`, `RoleCapabilityGrant`) are a
  deliberate, well-commented **global platform catalog** (`isSystem: true` by design today), joined
  to tenant data only through `UserJobRole` and `AgentExecution`, both of which are correctly
  `organizationId`-scoped and RLS-protected. This is a verified non-issue, not a gap.
- `AuditLog` uses a differently-named tenant column (`tenantId`, nullable) instead of
  `organizationId` — also deliberate and commented (`AuditService.log()` always populates it from
  request context in practice; NULL rows are system actions, fail-closed under RLS, same pattern as
  legacy rows elsewhere). Verified non-issue.

## Security
- **Strength**: `Contact.email/phone/whatsapp` are encrypted at rest (AES-256-GCM) with a
  deterministic HMAC-SHA256 blind index for equality/prefix/suffix search, correctly avoiding the
  IV-collision problem that caused an earlier revert (`onda-39`). This is genuinely solid work.
- **Gap (DATA-004)**: `VoiceCallLog.transcript`/`.summary`/`.recordingUrl` and
  `WhatsAppMessage.body` are not in `ENCRYPTED_MODEL_FIELDS` — full call transcripts, a pointer to
  the audio recording, and full WhatsApp message text sit in plaintext columns, protected only by
  RLS/network/DB-access controls, not by field-level encryption, despite being at least as sensitive
  as the Contact fields the team already decided needed encryption.
- **Gap (DATA-005)**: `scripts/create-demo.ts` is a live landmine — no `NODE_ENV`/production guard,
  creates a `role: 'ADMINISTRADOR'` user with `passwordHash` from the literal string
  `'password123'`. Not wired into any CI/CD workflow or `package.json` script found in this pass, so
  the exposure is "a human runs this by hand against the wrong `DATABASE_URL`", not an automated
  risk — but the script itself carries zero protection against that.
- `Account.password`/OAuth tokens (`accessToken`/`refreshToken`/`idToken`) are correctly encrypted;
  `GoogleWorkspaceConnection`, `BitrixConnection`, `ThreeCXConnection`, `VoiceHubConnection`,
  `SlackConnection`, `StripeConnection`, `OmieConnection` credentials are all correctly encrypted.
- LGPD erasure (`dataSubjectErasure.service.ts`) is real and well-reasoned (anonymizes Contact PII,
  redacts derived tables), and **already self-documents** one known gap: `AgentMemory.messages`
  (free-text JSON conversation blob) has no `contactId`/`leadId` to locate a data subject's
  sessions for erasure — re-confirmed present in the current schema (`AgentMemory` still has only
  `sessionId`/`agentType`/`organizationId`), so this remains open, not newly discovered.

## Tests
- No new DB-focused tests were run in this pass (no live Postgres instance in this environment).
- `npx prisma validate` was executed directly: schema is valid.
- This pass leans on `.claude/PILOTS.md`'s own record of real test runs against real Postgres
  (Piloto 002) for corroboration rather than re-running that infrastructure, per the audit's
  instruction to check known documentation before re-discovering debt.

## Integration
- Bitrix `bitrixLeadId`/`bitrixDealId`/`bitrixCompanyId`/`bitrixContactId` fields are deliberately
  not globally unique (documented reasoning: multi-tenant, or "one Bitrix Deal can legitimately
  produce more than one local row" for Company/Contact) — verified consistent with
  `companyIdentity.service.ts`'s CNPJ-based dedup being the real integrity mechanism instead.
- `VoiceHubConnection`/`ThreeCXConnection`/`SlackConnection`/`StripeConnection`/`OmieConnection` all
  correctly encrypt their credential fields; schema comments explicitly cross-reference the webhook
  handlers that rely on them (`birthVoice.webhook.ts`, `threecx.service.ts`).

## Product
No product-facing findings beyond what's captured above (billing has no data model — consistent
with discovery's note that `BillingRevenueAgent` is a placeholder).

## Mock/Fake/Placeholder
- `scripts/seed-video-demo.ts`, `scripts/seed-team.ts`, `scripts/seed-multi-cargo.ts`: legitimate,
  clearly-labeled demo/seed data generators, scoped to an already-existing organization/user
  (`seed-video-demo.ts` explicitly refuses to run if the target user doesn't already exist via the
  real signup flow) — good practice, not flagged as debt.
- `scripts/create-demo.ts`: the one seed script that is NOT well-guarded (see DATA-005).

## Dead/Orphan code
- None found at the schema level in this pass beyond what discovery already reported for the
  392-agent catalog (out of scope for DATA to re-verify — that catalog's executability is an
  AI/agent-domain question, not a schema-integrity one; the `AgentDefinition`/`AgentVersion` tables
  themselves are structurally sound and RLS-appropriate for a global catalog).

## Quick wins
- Add the 3 partial unique indexes (DATA-001) to a short internal checklist/comment at the top of
  `schema.prisma` (or a `docs/` note) enumerating them by name and migration, so any future
  `db push`-based environment rebuild or migration squash doesn't silently drop them. Very low
  effort, removes a real recurring foot-gun.
- Add a `NODE_ENV !== 'production'` guard (and/or require a `--i-know-what-i-am-doing` flag) plus a
  randomly generated password to `scripts/create-demo.ts` (DATA-005). Trivial, low-risk, removes a
  standing unguarded-admin-creation script.
- Add the same explanatory "legacy row, fail-closed" comment already used for `Prompt`/
  `AgentMemory`/`AILog` to the nullable `organizationId` on `Company`/`Contact`/`Lead`/`Activity`/
  `Prospect` (DATA-003) — or, if it's not actually legacy-justified for these five, that absence of
  justification is itself the finding worth a follow-up decision. Documentation-only, no schema
  change required to capture the first half of this.

## Structural problems
- Prisma's schema DSL has no native way to express a partial/filtered unique index — this is a
  known upstream limitation, not a mistake by this team, but it means any invariant of the shape
  "at most one active X per Y" will always live outside `schema.prisma` and is invisible to anyone
  who audits the schema file without also reading migration SQL. This project already hit this
  exact seam once (DATA-001) with a real test failure as the symptom.
- Migration history drift blocking `migrate deploy` (DATA-002) was worked around, historically, with
  `prisma db push --force-reset` rather than a migration squash/baseline — an approach that fixes
  the immediate test environment but does not repair the underlying migration chain, so the same
  problem is likely to resurface for the next person who tries `migrate deploy` against a genuinely
  fresh database.

## Needs verification
- **DATA-002**: Whether the migration-history drift documented in `.claude/PILOTS.md` (Pilot 002,
  "histórico de 80 migrations tinha drift acumulado pré-existente... que impedia `migrate deploy`")
  is still present now that the migration count has grown from ~80 to 112. This pass could not run
  `prisma migrate deploy`/`migrate diff` against a real database in this environment to re-confirm
  either way — recommend running `npx prisma migrate diff --from-migrations prisma/migrations
  --to-schema-datamodel prisma/schema.prisma --shadow-database-url <url>` (or `migrate deploy`
  against a disposable fresh Postgres) as the concrete next step.
- **DATA-003 consequence**: Whether any live write path (worker, script, or Bitrix import job not
  covered by this pass's read of `PrismaLeadRepository`/`CompanyUseCases`) can actually produce a
  `Company`/`Contact`/`Lead`/`Activity`/`Prospect` row with `organizationId = NULL` today. The two
  repository/use-case files inspected always require `organizationId` as a parameter, which is
  reassuring but not exhaustive — dozens of other write paths (Bitrix sync, prospecting promotion,
  cadence workers) were not individually traced for this.
- **DATA-006**: Whether `User.email` global uniqueness (one email → exactly one organization) is a
  deliberate product decision or an unexamined Better Auth default. Low severity either way, but
  worth a product-owner confirmation since it forecloses any "same person, multiple client
  organizations" use case (relevant to a B2B sales tool that may itself be resold/operated by
  agencies or consultants across multiple client tenants).

## Complete findings list

### DATA-001 — Business-critical partial unique indexes exist only in raw migration SQL, invisible to schema.prisma
- Category: TD-DATA, TD-MIGRATION
- Severity: HIGH | Priority: P1 | Confidence: HIGH | Status: CONFIRMED | Effort: S
- Evidence: `grep -rn "CREATE UNIQUE INDEX.*WHERE" prisma/migrations/*/migration.sql` returns
  exactly 3 hits, none present anywhere in `prisma/schema.prisma`:
  - `prisma/migrations/20260816120000_cadence_scheduling_signature/migration.sql:78`:
    `CREATE UNIQUE INDEX "CadenceRun_leadId_active_unique" ON "CadenceRun"("leadId") WHERE "status" = 'Active';`
  - `prisma/migrations/20260908020000_multi_cargo_agent_governance_foundation/migration.sql:119`:
    `CREATE UNIQUE INDEX "UserJobRole_one_active_primary_per_user" ON "UserJobRole"("userId") WHERE "isPrimary" = true AND "isActive" = true;`
  - same migration, line 139: `CREATE UNIQUE INDEX "AgentVersion_one_active_per_agent" ON "AgentVersion"("agentDefinitionId") WHERE "status" = 'ACTIVE';`
  - `.claude/PILOTS.md` (~line 1372) independently documents the real-world symptom: a
    `cadence-start.routes.test.ts` integration test expecting HTTP 409 ("lead already has an
    active cadence") instead received 201, with the pilot's own diagnosis: "provavelmente um
    índice único parcial do Postgres não aplicado/drift no banco de teste".
- Root cause: Prisma's schema DSL has no syntax for partial/filtered unique indexes, so these three
  invariants had to be hand-written into migration SQL and can never be added to `schema.prisma`.
  Any environment synced via `prisma db push` (which generates DDL purely from the schema file,
  ignoring migration history) will never create them; any future migration squash/baseline that
  regenerates SQL from the schema will silently drop them.
- Business impact: "one active cadence run per lead", "one active primary job role per user", and
  "one active version per agent definition" can all be silently violated in any `db push`-derived
  environment (documented test/staging DBs), producing duplicate active state that the application
  code assumes cannot exist.
- Suggested resolution: Add a durable, discoverable note (top-of-schema comment block, or a
  `docs/database/partial-indexes.md`) listing all three by name/table/migration, and add a CI check
  (e.g. `psql \d+` assertion or a small script) that fails if any of the three indexes is missing
  from a freshly-migrated database, so `migrate deploy` divergence is caught before it reaches a
  test failure again.

### DATA-002 — Previously-documented migration history drift blocking `prisma migrate deploy` (current status unverified)
- Category: TD-MIGRATION
- Severity: HIGH | Priority: P1 | Confidence: MEDIUM | Status: NEEDS_VERIFICATION | Effort: M
- Evidence: `.claude/PILOTS.md` (~line 656): "banco `prospectordb_test` criado... schema
  sincronizado via `prisma db push --force-reset` (histórico de 80 migrations tinha drift acumulado
  pré-existente, não relacionado a este piloto, que impedia `migrate deploy` — reset explicitamente
  confirmado pelo usuário antes de executar, por ser ação destrutiva...)". This is the project's own
  record, from a session where a real Postgres instance was available, that `migrate deploy` could
  not be trusted against the actual migration chain and had to be bypassed with a destructive reset.
  The repository now has 112 migrations (up from ~80 at that pilot), and this pass found no later
  pilot entry, ADR, or handoff documenting that the drift was root-caused and fixed (only that it
  was worked around once, in one disposable test database).
- Business impact: If this remains true, a genuinely fresh production-like environment (a new
  region deploy, a disaster-recovery restore target, a new staging clone) cannot be reliably brought
  up with `prisma migrate deploy`, which is the only non-destructive, CI/CD-safe way to apply
  Prisma migrations.
- Why NEEDS_VERIFICATION rather than CONFIRMED: this pass has no live database in this environment
  to run `migrate deploy`/`migrate diff` against; the finding is a faithful restatement of the
  project's own prior evidence, not a fresh reproduction.
- Suggested resolution: Run `npx prisma migrate diff --from-migrations prisma/migrations
  --to-schema-datamodel prisma/schema.prisma --shadow-database-url <disposable-postgres>` (or
  attempt `migrate deploy` against a throwaway fresh database) as a dedicated follow-up; if drift is
  confirmed, resolve via a documented migration squash/baseline rather than another `db push` reset.

### DATA-003 — `organizationId` nullable + inconsistent cascade on the 5 most central commercial models
- Category: TD-DATA, TD-TENANT
- Severity: MEDIUM | Priority: P2 | Confidence: HIGH (schema fact) / MEDIUM (live consequence) | Status: CONFIRMED | Effort: M
- Evidence: `prisma/schema.prisma` — `Company.organizationId` (line 272), `Contact.organizationId`
  (line 514), `Lead.organizationId` (line ~670), `Activity.organizationId` (line 705),
  `Prospect.organizationId` (line 2986) are all declared `String?` (nullable), with no `NOT NULL`
  database constraint. By contrast, `User`, `Organization`-child-of-everything-else,
  `CommercialGoal`, `AgentExecution`, and ~90 other models declare `organizationId String`
  (required). `prisma/migrations/20260717183411_sprint3_5_enums_and_cleanup/migration.sql:104`
  confirms the FK behavior for `Lead`: `ON DELETE SET NULL ON UPDATE CASCADE` — i.e., deleting an
  `Organization` orphans its `Lead` rows (sets `organizationId` to NULL) instead of removing them,
  unlike ~140 other FKs in the schema that use `ON DELETE CASCADE` for the same `Organization`
  parent. Three of the eight nullable-`organizationId` models elsewhere in the schema (`Prompt`,
  `AgentMemory`, `AILog`) have an explicit inline comment explaining this is deliberate
  ("legacy rows without a known tenant stay orphaned and invisible under RLS, rather than deleted
  or exposed to everyone") — `Company`, `Contact`, `Lead`, `Activity`, and `Prospect` have no such
  comment at their declaration.
- Verification performed: grepped `PrismaLeadRepository.ts` and `CompanyUseCases.ts` — both always
  require `organizationId` as an explicit parameter on every write path inspected, so the
  nullability does not appear to be exercised by the two repository layers checked. Not exhaustive
  (Bitrix sync, prospecting promotion, and cadence workers were not individually traced).
- Business impact: (a) no live application code path was found in this pass that deletes an
  `Organization`, so the orphaning risk is currently latent rather than active; (b) the missing
  `NOT NULL` constraint means a future write path bug could silently create a Company/Contact/Lead/
  Activity/Prospect row invisible to every tenant (visible only under `bypass_rls`), with no
  database-level guardrail to catch it.
- Suggested resolution: Either (a) document the same "legacy, fail-closed" rationale inline if it
  applies here too, or (b) if these five models never actually need a nullable `organizationId` in
  practice (unlike the AI/telemetry tables, which explicitly exist to keep pre-migration legacy
  rows), migrate to `NOT NULL` to make the tenant boundary a real database guarantee instead of an
  application-layer convention.

### DATA-004 — Call transcripts, recordings, and WhatsApp message bodies stored in plaintext
- Category: TD-SEC, TD-DATA, TD-COMPLIANCE
- Severity: HIGH | Priority: P2 | Confidence: HIGH | Status: CONFIRMED | Effort: M
- Evidence: `src/lib/crypto/piiFields.ts` — `ENCRYPTED_MODEL_FIELDS` covers `Contact: ['email',
  'phone', 'whatsapp']` plus integration credentials (`GoogleWorkspaceConnection`,
  `BitrixConnection`, `ThreeCXConnection`, `VoiceHubConnection`, `SlackConnection`,
  `StripeConnection`, `OmieConnection`, `Account`). `VoiceCallLog` is **not** in this map, despite
  `prisma/schema.prisma` (~line 2789) declaring `transcript String? @db.Text`, `summary String?
  @db.Text`, and `recordingUrl String? @db.Text` — full call transcripts and a pointer to the
  actual audio recording. Likewise `WhatsAppMessage.body String? @db.Text` (~line 1948, full
  message content) is not encrypted, only `phoneE164` gets an index (not encryption).
- Business impact: A database-level compromise, an unencrypted backup leak, or over-broad DB
  access (e.g. an analyst role, a support engineer, a misconfigured read replica) exposes full
  sales-call transcripts, recording locations, and WhatsApp conversation text in plaintext — content
  at least as sensitive as the Contact email/phone/whatsapp fields the team already chose to
  encrypt, for a product operating under LGPD in Brazil. RLS still protects cross-tenant access, so
  this is a defense-in-depth gap, not a demonstrated cross-tenant leak.
- Suggested resolution: Extend `ENCRYPTED_MODEL_FIELDS` to `VoiceCallLog: ['transcript', 'summary',
  'recordingUrl']` and `WhatsAppMessage: ['body']`, following the same blind-index pattern already
  proven for `Contact` if any equality/substring search over these fields is needed elsewhere in the
  product (none was found in this pass, which would make this a lower-risk addition than the
  Contact rollout was).

### DATA-005 — `scripts/create-demo.ts` has no environment guard and hardcodes a weak admin password
- Category: TD-SEC, TD-DATA
- Severity: MEDIUM | Priority: P3 | Confidence: HIGH | Status: CONFIRMED | Effort: XS
- Evidence: `scripts/create-demo.ts` (full file read) — no `NODE_ENV`/`process.env` production
  check anywhere in the file; creates `prisma.organization.create(...)`, then
  `prisma.user.create({ ..., role: 'ADMINISTRADOR', email: 'demo@demo.com', ... })` with
  `bcrypt.hash('password123', 10)` — a literal, hardcoded, well-known weak password. Verified via
  `grep -n "create-demo" package.json .github/workflows/*.yml docker-compose*.yml charts/` that
  this script is not wired into any npm script, CI workflow, or deploy manifest found in this pass
  — it can only run via a manual, deliberate `tsx scripts/create-demo.ts` invocation.
- Business impact: Low likelihood (manual-only invocation, no automation found), but zero
  mitigation if someone runs it against the wrong `DATABASE_URL` — it creates a full-admin account
  with a password an attacker would try first.
- Suggested resolution: Add an explicit `if (env.NODE_ENV === 'production') throw ...` guard (the
  pattern `scripts/seed-video-demo.ts` already uses — it requires a specific, already-created,
  clearly-named demo user and refuses to run otherwise) and generate a random password instead of a
  literal string.

### DATA-006 — `User.email` is globally unique across all organizations
- Category: TD-ARCH, TD-TENANT
- Severity: LOW | Priority: P4 | Confidence: HIGH (schema fact) / LOW (whether it's a real problem) | Status: NEEDS_VERIFICATION | Effort: L (if it needs to change — this is a foundational auth-model decision)
- Evidence: `prisma/schema.prisma` (~line 758): `email String @unique` on `User`, combined with
  `organizationId String` (required, non-null) on the same model — one email can belong to exactly
  one `Organization`, permanently, in the current schema.
- Business impact: Forecloses any workflow where the same person (same email) needs an account
  under two different tenant organizations (e.g. a consultant, reseller, or agency operating this
  CRM on behalf of multiple client companies) — they would need a second email address to get a
  second account. This may be entirely intentional for this product's target ICP (an internal
  sales team per organization), in which case it is not a defect.
- Suggested resolution: Confirm with product ownership whether cross-organization membership by the
  same person is ever expected; if never, this finding can be closed as "working as intended" and
  is only recorded here for completeness.

### DATA-007 — (Resolved, recorded for completeness) CRM360 soft-delete columns
- Category: TD-DATA
- Severity: INFO | Priority: — | Confidence: HIGH | Status: CONFIRMED (fixed, not open debt) | Effort: —
- Evidence: `.claude/PILOTS.md` (Piloto 002) documents that `CrmPipeline`, `CrmProduct`,
  `CrmDealItem`, and `CrmCommercialDocument` were added to `auditableModels` in `src/lib/prisma.ts`
  (which unconditionally injects `deletedAt: null` into every read) before the corresponding
  migration existed, causing `PrismaClientValidationError` on every query against those tables —
  fixed by migration `20260809100000_crm360_soft_delete_columns`. Re-verified independently in this
  pass: `src/lib/prisma.ts` currently lists exactly 8 `auditableModels` (`Company`, `Contact`,
  `Lead`, `Activity`, `CrmPipeline`, `CrmProduct`, `CrmDealItem`, `CrmCommercialDocument`), and a
  script-based check of `prisma/schema.prisma` confirms all 8 currently declare a `deletedAt`
  field. No open debt here — recorded so this audit doesn't get re-flagged as "newly discovered" by
  a future pass.

### DATA-008 — Bitrix ID fields intentionally not unique (documented dedup gap for downstream consumers)
- Category: TD-DATA, TD-INTEGRATION
- Severity: LOW | Priority: P4 | Confidence: HIGH | Status: CONFIRMED | Effort: — (by design)
- Evidence: `prisma/schema.prisma` inline comments on `Company.bitrixCompanyId` (~line 264) and
  `Contact.bitrixContactId` (~line 512): explicitly no `@@unique`, because "cada Negócio importado
  cria uma Company nova (sem dedupe entre Negócios do mesmo cliente...)" — i.e., two local rows can
  legitimately share the same `bitrixCompanyId`/`bitrixContactId`.
- Business impact: Any future reporting/analytics or new integration code that assumes
  `bitrixCompanyId`/`bitrixContactId` uniquely identifies one local `Company`/`Contact` row will be
  silently wrong. This is a deliberate, documented trade-off (not a bug), listed here only as a
  standing trap for anyone who builds on these columns without reading the schema comment first.
- Suggested resolution: None required now; consider surfacing this constraint in
  `docs/` (e.g. an integration data-model note) so it doesn't have to be rediscovered by reading
  schema comments each time.
