# CRM Domain Audit — Birth Hub 360º

## Agent

CRM specialist (domain code: `CRM`).

## Mission

Audit the CRM core end to end — Leads, Contacts, Companies, Deals/Opportunities, Activities,
Tasks, Cadences, Pipeline/Stages, Owners, Permissions, Notes, Timeline, Tags, Custom fields,
Attachments, History/Audit, Search, Filtering, Pagination, Import/Export,
Deduplication/Merge, Lead conversion, Company/contact linking, Opportunity lifecycle — tracing
UI → API → service → DB, and classifying each traced feature by real, verified wiring status.
This is an audit only; no application source was modified.

## Scope

`src/features/crm`, `src/features/contacts`, `src/features/companies`, `src/features/activities`,
`src/features/notes`, `src/features/cadence`, `src/features/crm360` (pipeline/stage/proposals),
`src/features/commercial-intelligence` and `src/features/analytics` (as consumers of CRM data),
`src/features/mesa-tratamento` (loss-reason capture flow), `src/features/integrations/bitrix`
(as the CRM's sync partner), `src/lib/search`, `src/lib/queue/search.queue.ts`, `src/lib/prisma.ts`
(tenant/audit/search extension), `src/shared/middlewares` (ownership/role), and the relevant
sections of `prisma/schema.prisma` (Lead, Company, Contact, Activity, Note, TimelineEvent,
LeadStageHistory, LeadFieldChange, SavedView, CrmPipeline/CrmPipelineStage, CrmDealItem,
CrmCommercialDocument, CadenceSequence/Run, DealClosureEvent).

## Areas inspected

- Lead CRUD (routes → controller → use cases → `PrismaLeadRepository` → Postgres), status
  transitions, soft delete, timeline write-on-mutation, field-change history.
- Multi-tenancy: `organizationId` scoping in repositories/middlewares, RLS migration coverage,
  the tenant-context (`app.current_tenant_id`) mechanism in `src/lib/prisma.ts`.
- Search: Meilisearch index definitions vs. what is actually indexed and searchable for Leads
  and Companies; Postgres fallback path.
- Deduplication/Merge: the only two code paths in the repo (`LeadDeduplicationService` and the
  scheduled `deduplication.worker.ts`) and whether either performs a real merge.
- Notes, Timeline, Activities/Tasks: which entities they can actually attach to.
- Attachments: whether any file/blob model exists for CRM records.
- Tags and Custom Fields: how they are actually stored per entity (Lead vs. Company) and whether
  they are searchable.
- Owners/Permissions: `requireLeadOwnership`, role gates on Lead/Contact/Company routes,
  `assignment.service.ts` round-robin assignment.
- Bitrix-mirrored commercial fields (deal package/status, relationship level, commission,
  partner broker, resume date, cadence stage, AM qualification validation): who writes them, who
  reads them, whether they are visible/editable in the primary CRM UI.
- Import/Export: CSV export, Bitrix import/export routes.
- Pipeline/Stage: `CrmPipeline`/`CrmPipelineStage` wiring via `crm360`, Kanban drag-and-drop
  persistence (`CrmBoard.tsx` → `PUT /api/leads/:id`).
- Saved Views (filters/pagination persistence).
- Cadence module structure (test coverage breadth only — deep cadence audit likely owned by a
  dedicated integration/automation pass).
- Existing E2E coverage for the domain (`tests/e2e/*.spec.ts`).

## Files inspected (representative, ~45)

`prisma/schema.prisma` (Lead, Company, Contact, Activity, Note, TimelineEvent, LeadStageHistory,
LeadFieldChange, SavedView, CrmPipeline, CrmPipelineStage, CrmDealItem, CrmCommercialDocument,
CadenceSequence/Run, DealClosureEvent, Prompt) · `src/features/crm/routes/lead.routes.ts` ·
`src/features/crm/presentation/LeadController.ts` · `src/features/crm/application/LeadUseCases.ts`
· `src/features/crm/application/LeadDeduplicationService.ts` (+ its test) ·
`src/features/crm/application/__tests__/LeadDeduplicationService.test.ts` ·
`src/features/crm/domain/Lead.ts` · `src/features/crm/infra/PrismaLeadRepository.ts` ·
`src/features/crm/jobs/deduplication.worker.ts` · `src/features/crm/services/assignment.service.ts`
(+ test) · `src/features/crm/services/savedView.service.ts` ·
`src/features/contacts/routes/contact.routes.ts` ·
`src/features/contacts/components/ContactDetail.tsx` ·
`src/features/companies/routes/company.routes.ts` ·
`src/features/companies/components/CompanyDetail.tsx` ·
`src/features/companies/components/CompanyForm.tsx` ·
`src/features/notes/routes/note.routes.ts` · `src/features/notes/domain/Note.ts` ·
`src/features/crm/components/LeadDetailDrawer.tsx` ·
`src/shared/middlewares/requireLeadOwnership.ts` · `src/lib/zod.ts` (leadSchema, companySchema,
contactSchema, noteSchema) · `src/lib/search/index.ts` · `src/lib/queue/search.queue.ts` ·
`src/lib/prisma.ts` (tenant/audit/search Prisma extension) · `src/components/CrmBoard.tsx` ·
`src/features/crm360/components/CrmOverview.tsx` ·
`src/features/mesa-tratamento/routes/mesaTratamento.routes.ts` ·
`src/features/mesa-tratamento/components/CurrentLeadCard.tsx` ·
`src/features/integrations/bitrix/service/customFields.ts` · plus migration files under
`prisma/migrations/20260722020322_enable_rls/` and `20260909131444_saved_view/`, and
`tests/e2e/*.spec.ts` (listing only, not executed).

## Executive summary

The CRM core (Lead/Company/Contact CRUD, status/pipeline movement, tenant isolation, soft delete,
audit logging, saved views, CSV/Bitrix import-export) is materially more solid than a typical
"vibe-coded" CRM: tenant scoping is enforced consistently at the repository layer, RLS is enabled
with `FORCE ROW LEVEL SECURITY` on the core tables, soft delete is centralized in a Prisma
extension, and there is real E2E coverage (`crm.spec.ts`, `leads-crud.spec.ts`, `crm-board.spec.ts`,
`contact-company-forms.spec.ts`, `saved-views.spec.ts`). Several prior audit waves are visible and
legible in code comments (hard-delete → soft-delete fix, RLS-context fix for a dedup worker,
CNPJ-normalization fix, owner-name-vs-id fallback, PII decryption for nested Contact relations).

However, three CRM capabilities named explicitly in the mission scope are not actually delivered:

1. **Deduplication/Merge** has no real "merge" anywhere in the codebase. The only two
   implementations are (a) a scheduled worker that *detects* duplicate contacts by email/phone
   index and only logs a count (`deduplication.worker.ts`, comment: "No futuro, isso poderia
   realizar o merge... Por enquanto, apenas detecta e envia logs"), and (b) an orphaned,
   unreachable service (`LeadDeduplicationService.deduplicateByEmail`) that does not merge data at
   all — it silently hard-deletes every duplicate Lead except the highest-`amount` one, using a
   second, unaudited `PrismaClient` instance that bypasses the shared tenant/audit/search Prisma
   extension the rest of the codebase relies on.
2. **Attachments** do not exist as a CRM capability at all — there is no file/blob model
   attachable to Lead, Contact, or Company anywhere in the 4500+ line Prisma schema.
3. **Notes** only attach to Leads. Contacts and Companies have no notes capability in either the
   backend (`Note.leadId` is a required, non-nullable foreign key) or the frontend
   (`CompanyDetail.tsx`/`ContactDetail.tsx` have zero note-related code).

Search has a quieter but real defect: the Meilisearch "leads" index's `searchableAttributes` cover
only `company.tradeName`, `contact.name`, `contact.email` — never `Lead.title` (the deal/opportunity
name) or tags. Once Meilisearch is healthy, `PrismaLeadRepository.findAllWithFilters` trusts its
result unconditionally (`matchedIds !== null`) and never falls back to the Postgres `OR` clause
that *does* search `title` — so searching by deal title silently stops working the moment
Meilisearch comes online, even though the Postgres fallback path proves the intent was for title
to be searchable.

Nine Bitrix-mirrored commercial fields on Lead (`dealPackage`, `dealStatus`, `relationshipLevel`,
`commissionPercent`, `partnerBroker`, `qualificationValidatedByAM`, `resumeDate`, `cadenceStage`,
plus `lossReason` outside the Mesa de Tratamento flow) are excluded from `leadSchema` (the Zod
schema behind `POST`/`PUT /api/leads`) and absent from `LeadDetailDrawer.tsx` — they are populated
only by one-way Bitrix sync and consumed only by analytics/commercial-intelligence/gamification
services, invisible and non-editable for any organization not running through Bitrix, and
non-editable in-app even for organizations that are.

Permission modeling is inconsistent across entities: Leads have a dedicated ownership gate
(`requireLeadOwnership`, CLOSER/SDR can only edit their own lead) with a well-documented
owner-id-vs-owner-name compatibility fallback for Bitrix-imported leads. Companies and Contacts
have no equivalent gate — any CLOSER/SDR can edit or re-enrich any company/contact in the tenant,
including `Company.owner`, a field that turns out to be entirely unused dead schema (never read,
written, or displayed anywhere in `src/features/companies`).

None of these are exotic or theoretical: each is backed by the concrete evidence below (file,
line, or absence-of-match across the relevant directories).

## Critical

None found in this pass. No cross-tenant data leak was demonstrated; `organizationId` is present
in the `where` clause of every read/write path inspected in `PrismaLeadRepository`,
`requireLeadOwnership`, and `savedView.service.ts`, and the core CRM tables carry
`FORCE ROW LEVEL SECURITY` (migration `20260722020322_enable_rls`).

## High

- **CRM-002** — `LeadDeduplicationService.deduplicateByEmail` hard-deletes Leads via a second,
  unaudited `PrismaClient`, with no real merge of dependent data (notes/activities/timeline are
  cascade-deleted, not preserved).
- **CRM-001** — Lead full-text search silently ignores `title` (and tags) once Meilisearch is
  healthy, contradicting the Postgres fallback's own intent.
- **CRM-003** — "Deduplication/Merge" as a product capability is not implemented anywhere:
  detection-only for Contacts (logged, never actioned), no UI, no merge for Leads/Companies at all.

## Medium

- **CRM-004** — Notes attach only to Leads; Companies and Contacts have no notes capability
  (backend or UI).
- **CRM-005** — No Attachment/file model exists for any CRM entity.
- **CRM-006** — Nine Bitrix-mirrored commercial fields are write-only-from-Bitrix and invisible
  in the primary CRM UI, despite being consumed by analytics/gamification/commercial-intelligence.
- **CRM-007** — Company/Contact write routes lack an ownership gate analogous to
  `requireLeadOwnership`; any CLOSER/SDR can edit any company/contact in the tenant.
- **CRM-010** — `GET /api/leads`, `/api/contacts`, `/api/companies` accept an unbounded `limit`
  query parameter with no cap, identically in all three controllers.

## Low

- **CRM-008** — `Company.owner` is dead schema: defined in Prisma, never read/written/displayed
  by any application code.
- **CRM-009** — `assignLeadRoundRobin`'s `prisma.lead.update` omits `organizationId` from its
  `where` clause, breaking the tenant-isolation pattern used everywhere else in the same file/
  feature (not currently exploitable — the only call site passes a `leadId` just created in the
  same organization — but a latent defense-in-depth gap).
- **CRM-011** — Lead tags live inside `customFields.tags` (untyped JSON array, no GIN index, not
  Meilisearch-searchable), while Company tags are a native, indexable `String[]` column —
  inconsistent representation of the same "tags" concept across two sibling entities.

## Technical debt

- TD-ARCH/TD-DATA (CRM-011): tags modeled two different ways for Lead vs. Company.
- TD-DOC: the Prisma schema comment above `Lead.funnel`/`resumeDate`/etc. (lines 588-592) states
  these fields are "not yet read/written by `PrismaLeadRepository`," but `funnel` is in fact read
  as a filter in `findAllWithFilters` and the `Lead` domain type includes all of them — the comment
  is stale relative to current code and should be corrected or removed to avoid misleading a future
  reader into re-litigating settled ground.
- TD-PERF (CRM-010): unbounded pagination `limit` on the three main CRM list endpoints.

## Implementation debt

- CRM-002: `LeadDeduplicationService` uses `new PrismaClient()` instead of the shared, extended
  `prisma` singleton from `src/lib/prisma.ts` — it therefore never runs through the tenant-context
  (`app.current_tenant_id`), audit-log, or search-index hooks that every other Lead mutation path
  in this codebase goes through. Under the `FORCE ROW LEVEL SECURITY` policy on `Lead` (migration
  `20260722020322_enable_rls`), a raw client with no `app.current_tenant_id` session variable set
  is very likely — by the exact precedent documented in this repo's own
  `deduplication.worker.ts` comment about an equivalent bug on `Contact.groupBy` — to see/affect
  zero rows in a real Postgres environment with policies applied, making the service a silent
  no-op there. That does not make the code safe: in any environment where RLS is not enforced
  identically (a test double, a differently-configured environment, a future refactor that swaps
  the connection string to a role with `BYPASSRLS`), this same code would perform real,
  unaudited, unmerged hard deletes scoped only by the explicit `organizationId` filter in its own
  query (which does correctly prevent cross-tenant deletion, but not intra-tenant data loss).
- CRM-006: nine schema+domain-type fields with no write path through the standard API.

## Feature debt

- CRM-003, CRM-004, CRM-005: Deduplication/Merge, cross-entity Notes, and Attachments — three
  capabilities explicitly named in this audit's mission scope — are not implemented as usable
  product features today.

## Bugs

- CRM-001 (search silently drops `title` matches once Meilisearch is up) is a genuine behavioral
  bug: the code visibly intends title to be searchable (see the Postgres `OR` fallback in
  `PrismaLeadRepository.findAllWithFilters`) but the primary path never reaches it once the
  Meilisearch index is healthy, because `matchedIds !== null` short-circuits regardless of whether
  the query actually matched anything meaningful.

## Architecture

- CRM-002 is as much an architectural violation as a bug: this codebase has a single, carefully
  designed Prisma access point (`src/lib/prisma.ts`) that centralizes soft delete, audit logging,
  RLS tenant context, search indexing, and PII encryption/decryption — documented in-line with
  real incident history (P2028 pool exhaustion, hard-delete regression, RLS-context bug). A second,
  ad hoc `PrismaClient` instantiated inside a feature file re-opens every one of those already-
  fixed classes of bug for whatever code path uses it.
- CRM-007/CRM-011: the CRM's authorization and tagging models are not applied uniformly across
  Lead/Company/Contact, which are conceptually siblings in every other part of this codebase
  (shared search index family, shared customFields pattern, shared soft-delete/audit behavior).

## Security

- No cross-tenant leak demonstrated. `organizationId` scoping is consistently present in the
  repository/middleware layers inspected.
- CRM-002's use of a bypassed Prisma client is flagged here as well as under Bugs/Architecture: it
  is the one code path in the inspected CRM surface that does not go through the RLS/tenant-context
  mechanism the rest of the codebase relies on for defense in depth, even though its own explicit
  `where: { organizationId }` filters happen to prevent a cross-tenant leak today.
- CRM-007 is a real authorization-consistency gap (not a proven exploit): CLOSER/SDR-level users
  can modify any Company/Contact record in their tenant, with no ownership check, while the
  equivalent Lead endpoints deliberately restrict this.

## Tests

- Real, non-trivial E2E coverage exists for this domain: `tests/e2e/crm.spec.ts`,
  `leads-crud.spec.ts`, `crm-board.spec.ts`, `crm-kanban.spec.ts`, `crm-kanban-mobile.spec.ts`,
  `contact-company-forms.spec.ts`, `saved-views.spec.ts`, `cadence.spec.ts`,
  `commercial-intelligence-journey.spec.ts`/`-rbac.spec.ts`. These were enumerated, not executed,
  in this pass (audit scope forbids running the app/mutating state; a release-readiness pass
  should confirm they currently pass in CI).
- `LeadDeduplicationService.deduplicateByEmail` has a dedicated unit test suite
  (`LeadDeduplicationService.test.ts`) that exercises the merge/delete behavior in isolation —
  which is precisely why the service reads as "tested and working" on a superficial pass, even
  though it is never invoked by any route, worker, or DI registration in the running application.
  A unit test proving a function's internal logic is not evidence the function is reachable.
- No test exists for a Contact/Company merge flow, because no such flow exists.
- No test exists for Notes on Company/Contact, because no such feature exists.

## Integration

- Bitrix→CRM field sync is one-directional for the nine commercial fields in CRM-006: written by
  `bitrix/service/customFields.ts`, never accepted back from the CRM UI.
- `mesa-tratamento` is a legitimate, working alternate write path for `Lead.lossReason` (via
  `resolveLossReasonLabel`), distinct from and not exposed through the standard
  `PUT /api/leads/:id` (`leadSchema` does not include `lossReason`).
- Kanban drag-and-drop (`src/components/CrmBoard.tsx`) genuinely persists via
  `PUT /api/leads/:id` with `{ status }`, routed by `LeadController.updateLead` to
  `updateLeadStatus` — confirmed real, not a local-only UI illusion.

## Product

- The nine invisible Bitrix-mirrored fields (CRM-006) mean two different experiences of the same
  product exist today depending on whether an organization syncs with Bitrix: for a non-Bitrix
  tenant, `dealPackage`/`dealStatus`/`relationshipLevel`/`commissionPercent`/`partnerBroker`/
  `qualificationValidatedByAM`/`resumeDate`/`cadenceStage` can never be populated by any UI action,
  yet the commercial-intelligence and gamification services that read them presumably assume data
  exists.
- "Deduplication/Merge" is likely represented to stakeholders as an existing capability (a
  dedicated service class and a scheduled weekly job both reference it), but neither one produces
  a usable merge outcome for an end user today.

## Mock/Fake/Placeholder

- None found that masquerade as real functionality in the strict sense (no `setTimeout`-as-backend,
  no hardcoded demo numbers) in the areas inspected. The closest analog is CRM-003: a
  fully-implemented-looking `LeadDeduplicationService` class and test suite that reads as "the
  merge feature" but is disconnected from the running application.

## Dead/Orphan code

- **CRM-002/CRM-003**: `LeadDeduplicationService` — not in the DI container
  (`src/shared/di/container.ts`), not called from any route or worker, referenced only by its own
  test file.
- **CRM-008**: `Company.owner` — schema column with zero application-code references.

## Quick wins

- Add `Lead.title` (and, ideally, `customFields.tags`) to the Meilisearch `leads` index's
  `updateSearchableAttributes` call in `src/lib/search/index.ts` — closes CRM-001 with a
  one-line config change plus a re-index of the existing index (already backfilled via the
  Prisma-extension write path; no new indexing code needed).
- Cap `limit` in `LeadController.getLeads`, `ContactController.getContacts`,
  `CompanyController.getCompanies` (e.g. `Math.min(parseInt(...) || 50, 200)`) — closes CRM-010,
  three near-identical one-line changes.
- Delete or explicitly quarantine (rename to `*.disabled.ts` with a comment, or add a loud
  `throw new Error('not wired — see CRM audit')` guard) the orphaned
  `LeadDeduplicationService.deduplicateByEmail` so it cannot be resurrected/wired up later without
  someone first fixing the hard-delete/no-merge/bypassed-Prisma-client problems documented in
  CRM-002 — low-risk because it is provably unreachable today.
- Remove the stale schema comment on `Lead.funnel`/`resumeDate`/etc. that claims these fields are
  unread/unwritten by `PrismaLeadRepository` (documentation debt only, zero behavior change).

## Structural problems

- The single biggest structural risk in this domain is CRM-002's pattern (a feature file
  instantiating its own `PrismaClient` instead of importing the shared extended singleton) —
  because the tenant/audit/soft-delete/search guarantees this codebase relies on for every other
  Lead mutation live entirely inside that one extension, any code that bypasses it silently loses
  all of them at once. Worth a repo-wide grep for `new PrismaClient()` outside `src/lib/prisma.ts`
  as a follow-up (not done exhaustively in this CRM-scoped pass beyond the one instance found).

## Needs verification

- Whether `LeadDeduplicationService.deduplicateByEmail`, if it were ever wired up and run against
  the real production Postgres instance (with RLS policies and no `app.current_tenant_id` set),
  would actually no-op (as the sibling `deduplication.worker.ts` comment about an equivalent
  `Contact.groupBy` bug suggests) or would perform destructive deletes — this depends on exact RLS
  policy definitions and the DB role's `BYPASSRLS` attribute, neither of which was fully traced in
  this pass. Confidence: MEDIUM that the code is a landmine in principle; LOW/MEDIUM on precisely
  what it would do if triggered today.
- Whether `Lead.organizationId`, `Company.organizationId`, `Contact.organizationId` being nullable
  (`String?`) in the schema can actually end up `null` through any live application code path
  (e.g., a user whose own `organizationId` is null), which would create RLS-invisible orphan
  records. Not confirmed either way in this pass — worth a follow-up grep of
  `authenticateToken`/session issuance for whether `organizationId` can ever be absent on an
  authenticated user.
- Whether any Playwright suite listed under Tests currently passes in CI; this audit enumerated
  but did not execute them.

## Complete findings list

| ID | Title | Category | Severity | Priority | Confidence | Status |
|---|---|---|---|---|---|---|
| CRM-001 | Lead search never matches on deal title (or tags) once Meilisearch is healthy | TD-BUG, TD-CRM | HIGH | P1 | HIGH | CONFIRMED |
| CRM-002 | LeadDeduplicationService hard-deletes via a second, unaudited PrismaClient with no real merge | TD-BUG, TD-ARCH, TD-DATA | HIGH | P1 | HIGH | CONFIRMED |
| CRM-003 | "Deduplication/Merge" is not an implemented product capability (detect-only, no UI, no actual merge) | TD-FEAT, TD-CRM | HIGH | P2 | HIGH | CONFIRMED |
| CRM-004 | Notes only attach to Leads; Companies/Contacts have no notes capability | TD-FEAT, TD-CRM | MEDIUM | P2 | HIGH | CONFIRMED |
| CRM-005 | No Attachment/file model exists for any CRM entity | TD-FEAT, TD-CRM | MEDIUM | P2 | HIGH | CONFIRMED |
| CRM-006 | Nine Bitrix-mirrored commercial fields are write-only-from-Bitrix and invisible in the CRM UI | TD-INTEGRATION, TD-UX | MEDIUM | P2 | HIGH | CONFIRMED |
| CRM-007 | Company/Contact write routes lack an ownership gate that Leads have | TD-AUTH, TD-CRM | MEDIUM | P2 | HIGH | CONFIRMED |
| CRM-008 | `Company.owner` is dead schema (never read/written/displayed) | TD-DEAD, TD-DATA | LOW | P3 | HIGH | CONFIRMED |
| CRM-009 | `assignLeadRoundRobin` update omits `organizationId` from its `where` clause | TD-TENANT | LOW | P3 | MEDIUM | CONFIRMED |
| CRM-010 | Unbounded `limit` query parameter on Lead/Contact/Company list endpoints | TD-PERF | MEDIUM | P2 | HIGH | CONFIRMED |
| CRM-011 | Tags modeled inconsistently: JSON blob for Lead vs. native array column for Company | TD-DATA, TD-ARCH | LOW | P3 | HIGH | CONFIRMED |
| CRM-012 | Stale schema comment claims `funnel`/deal-mirror fields are unread/unwritten by PrismaLeadRepository, contradicting current code | TD-DOC | INFO | P4 | HIGH | CONFIRMED |
| CRM-013 | RLS-bypass behavior of the orphaned dedup service under production RLS policies not fully traced | TD-DATA, TD-SEC | MEDIUM | P3 | LOW | NEEDS_VERIFICATION |
| CRM-014 | Nullable `organizationId` on Lead/Company/Contact — whether it can actually become null via a live code path | TD-TENANT | LOW | P3 | LOW | NEEDS_VERIFICATION |
