# Technical Debt — Birth Hub 360º

> Organized by engineering category. Each item names the finding ID(s) and the structural
> root cause (`RC-01`…`RC-15`) it belongs to, where one applies.

## Architecture

- **RC-02 — Backend/service code built but never wired to a route, job trigger, or DI
  container.** Recurring pattern: `AIAGENT-004/001`, `CRM-002/003`, `BILLING-005/006/007`,
  `WORKFLOW-002`, `PRODUCT-001`, `RAG-005`, `AIAGENT-009`. The architecture allows fully
  isolated, unit-tested modules to be merged with zero production callers — nothing in CI or
  code review currently catches "this class exists and is never instantiated in a live path."
- **RC-05 — Catalog/taxonomy built far ahead of the substance behind it.** The 391-agent
  job-roles catalog (`AIAGENT-003/004/010/007`) is architecturally a declarative data table
  with a thin, mostly non-functional execution layer bolted on — an architecture optimized for
  looking complete in a database query, not for executing agents.
- **RC-13 — The same concept modeled twice, never reconciled.** `TENANT-007`, `REVOPS-004`,
  `CRM-011` — steady-state duplication (not an active migration) with nothing forcing the two
  representations to converge.
- **RC-14 — Schema and application layer built at different times.** `PRODUCT-001`, `CRM-004`,
  `CRM-005`, `CRM-008`, `DATA-006` — either the schema has no application code, or the UI
  implies a capability the schema was never extended to support.

## Code

- **RC-01 — Mock-first implementations never replaced with the real thing, often unlabeled.**
  `RAG-001/002`, `REVOPS-002/003`, `BILLING-002/003/004`, `INTEGRATION-008`, `BACKEND-007`,
  `WORKFLOW-001`, `AIAGENT-002` — the largest single code-level pattern in the audit. A
  feature was scaffolded end-to-end with a hardcoded placeholder or manual-input stand-in and
  the real integration was never built, frequently with no UI signal telling the user it's a
  placeholder.
- **RC-12 — Documentation and inline schema comments drift from code.** `CRM-012`,
  `FRONTEND-005`, `DOCBRAND-013`, `AIAGENT-007`, `DOCBRAND-004`, `PRODUCT-006/007` — no
  automated check fails CI when code changes underneath a comment that described it.
- **CRM-010 / TENANT-004 / RAG-008 (RC-15)** — resource ceilings (query `limit`, input-size
  guards) fixed once at one call site, not ported to structurally identical siblings, because
  the fix was local rather than a shared, reusable guard.
- **WORKFLOW-003** — a trigger type present in 3 separate type lists with no backing Prisma
  enum, unreachable by construction — a symptom of a change made in application code without a
  corresponding schema-consistency check.

## Dependencies

- No confirmed dependency-level CVEs surfaced in this audit (SEC domain notes zero dependency
  CVEs at time of review).
- `@react-three/fiber` + `drei` + `three` are real dependencies used by exactly two decorative
  widgets (`SpaceGame.tsx`, `BrandOrb.tsx`) — not a defect, but a standing cost (bundle size,
  render cost) worth revisiting under `performance/SKILL.md`'s criteria whenever 3D usage is
  next touched.
- `cd-homolog.yml` pulls the `yq` binary from `releases/latest` with no pinned version or
  checksum (`DEVOPS-006`) — a supply-chain hygiene gap, not an active CVE.

## Database

- **RC-14** — `DATA-006`: three business-invariant partial unique indexes
  (`CadenceRun_leadId_active_unique`, `UserJobRole_one_active_primary_per_user`,
  `AgentVersion_one_active_per_agent`) exist only in migration SQL/comments, not in
  `schema.prisma` — invisible to anyone reasoning from the schema file alone.
- **DATA-003** — nullable `organizationId` on Company/Contact/Lead/Activity/Prospect lacks the
  "legacy row, fail-closed" rationale comment already used on `Prompt`/`AgentMemory`/`AILog` —
  an inconsistent documentation-of-intent problem with real tenancy implications.
- **DATA-002** — `scripts/create-demo.ts` has no `NODE_ENV=production` guard and a hardcoded
  weak admin password, unlike the safer `scripts/seed-video-demo.ts` pattern.
- **DATA-004 (RC-04)** — an at-rest encryption pattern fixed once was not consistently
  backported to a sibling model/field.
- Migration safety (`migrate deploy` on a fresh DB) is marked `UNKNOWN` — not re-executed in
  this audit; a documented-but-unresolved migration-drift issue exists per the DATA domain
  score justification.

## Testing

- **RC-09 — Test coverage gaps correlate almost exactly with where real bugs were found.**
  `TEST-001…007`, `TEST-011`, `TEST-012`, `FRONTEND-006` — the coverage gap is the mechanism
  by which several findings went undetected, not a theoretical process concern. Concrete
  instances: two production AI agent HTTP routes with zero tests; Android native testing is
  unmodified boilerplate; two files end in a no-op `expect(true).toBe(true)`; billing/usage
  persistence testing is mock-only; "roleplay de vendas" (a stated product pillar) has zero
  tests; no coverage threshold exists anywhere to prevent silent regression.
- Strong counter-signal worth preserving: 428 total test files, real Postgres+RLS integration
  tests for tenancy/RBAC/LGPD/security, CI gates on unit+integration+E2E, zero commented-out
  tests, zero snapshot abuse. The gap is concentrated, not systemic.

## Performance

- No CRITICAL/HIGH performance findings were confirmed in this audit pass. Watch items: 3D
  render cost of decorative widgets (already gated by lazy-loading conventions per
  `performance/SKILL.md`); the 3CX extension-based tenant resolution's O(n) scan
  (`INTEGRATION-004`) is a latent performance concern as connection count grows, in addition to
  its tenancy risk.

## Security

- **RC-04 — A security-fix pattern shipped once, not backported to sibling code paths.**
  `BACKEND-001`, `DATA-004`, `SEC-001/003/004`, `AIAGENT-006`, `TENANT-003` — the unifying
  lesson: this codebase is good at fixing a vulnerability class the first time it's found, and
  does not yet have a mechanism (shared primitive, lint rule, or checklist) that forces the fix
  to propagate to every structurally similar path. See `PRODUCTION-BLOCKERS.md` for the
  subset severe enough to block a production claim.
- Confirmed strong baseline worth preserving: RLS with FORCE across ~100/112 models, mature
  Contact PII encryption (AES-256-GCM + blind index), timing-safe webhook auth, tiered rate
  limiting, unified RBAC, zero dependency CVEs — and the newest connectors (Slack/Stripe/Omie)
  independently verified to already follow the established hardening patterns.

## Infra

- **RC-10 — Rebrand renamed running infrastructure; shell scripts/docs referencing containers
  by literal name were missed.** `DEVOPS-001/002/004` — there is no single source of truth for
  container names referenced from more than one place, so a rename event is structurally
  guaranteed to miss consumers.
- Kubernetes/Helm/ArgoCD path is explicitly aspirational/labeled — not counted as infra debt
  since it makes no claim of being live.
- `DEVOPS-005` — `tenancy.rego` (OPA) is dead/orphaned infra with an already-open handoff.
- `DEVOPS-006` — unpinned `yq` fetch in CI.

## Observability

- **RC-11 — Observability instrumentation added as a per-worker opt-in, not a structural
  default.** `WORKFLOW-004`, `DEVOPS-003`, `BILLING-009` — a metrics-registration helper
  exists and is used by core-infrastructure queues, but every product-feature worker built
  afterward independently forgot to opt in, and production has no working scrape path at all.
  This is the audit's clearest example of a good primitive that was never made mandatory.

## Documentation

- **RC-12 — Documentation and inline schema comments drift from the code they describe.** See
  Code section above; the same root cause, listed here for the documentation-specific
  instances: `.claude/CLAUDE.md §1` (playbook model), `charts/README.md`/`argocd/README.md`
  (deploy trigger), `README.md` (ESLint vs. Biome), `LEGACY_BRAND_CONTENT_MAP.md §2.3`
  (`getTenantFromEmail()`).
- Positive counter-signal: this project's DESIGN QA history, `docs/REMOVED-DOCS.md`, and
  `.claude/PILOTS.md` show unusually disciplined self-documentation of known debt — the drift
  found here is real but is the exception, not the norm, for this codebase's documentation
  culture.

---

**Cross-reference:** all 15 root causes (`RC-01`…`RC-15`) are represented above at least once.
The "Not explained by a structural cause" set from `MASTER-DEBT-BACKLOG.md` is intentionally
excluded from this file's category buckets since, by definition, it doesn't fit one.
