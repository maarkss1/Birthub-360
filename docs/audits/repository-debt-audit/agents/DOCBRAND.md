# DOCBRAND — Documentation Debt & Legacy Brand Contamination Audit

## Agent

DOCBRAND (domain: documentation debt + AtlasGR/Total Trac legacy-brand residue)

## Mission

Audit documentation debt (stale/contradictory docs, missing ADRs, dead roadmap items, README
drift) together with legacy-brand contamination (remaining AtlasGR / Atlas GR / Total Trac /
TotalTrac references across the whole repository — UI, backend, DB, comments, config, infra,
tests, static assets), classify each occurrence, and trace whether related features are actually
wired and working — not just present.

## Scope

Whole repository, not limited to files with "brand" or "doc" in the path: `src/`, `prisma/`,
`docs/`, `.claude/`, `.agents/`, `public/tools/`, `identidade-visual/`, `charts/`, `argocd/`,
`infrastructure/`, root-level `.md`/`.html` reports, `.env.example`, `package.json`, CI workflows.

## Areas inspected

- `docs/architecture/LEGACY_BRAND_CONTENT_MAP.md` (prior brand audit, 2026-09-10) and its 5 open
  handoffs under `.agents/handoffs/onda-c0/` — used as a baseline to re-verify current status
  rather than re-discovering from zero, per the mission's own instruction.
- `docs/REMOVED-DOCS.md` (documentation-removal ledger) and `.claude/CLAUDE.md`/`.claude/PILOTS.md`
  (design constitution + pilot log) for internal consistency against the current source of truth
  files they cite (`src/config/brand.ts`, `src/config/playbooks.ts`, `docs/BrandConstitution.md`).
- `src/config/playbooks.ts`, `src/config/module-catalog.ts`, `src/config/access-policy.ts`,
  `src/contexts/BrandContext.tsx`, `src/features/intelligence/routes/intelligence.routes.ts` —
  the actual current "brand axis" code, and its consistency with what `.claude/CLAUDE.md` claims.
- `prisma/schema.prisma` and the full `prisma/migrations/` history, in particular the most recent
  migration `20260912120000_structural_rebrand_unify_playbook` (same-day as this audit) and the
  git commit that introduced it (`f098d675`), diffed against `HEAD` and against the current
  uncommitted working tree.
- `src/features/module-access/**` (`ModuleAccessService`, `ModuleAccess.ts`,
  `PrismaModuleAccessRepository.ts`) and `src/hooks/useModuleAccess.ts` — full chain from DB grant
  row to the React gate, to determine whether the brand/module-key rename actually breaks anything.
- `src/features/propostas/components/PropostaComercialHub.tsx` and `src/App.tsx` routing — to
  verify (or refute) the prior audit's "not confirmed" status on `public/tools/portal-comercial/`.
- `infrastructure/opa/policies/{tenancy,rbac}.rego`, `charts/prospector-atlas/values.yaml`,
  `argocd/application-{production,homolog}.yaml`, `src/lib/email/meetingInvite.ts`,
  `src/features/commercial-intelligence/application/executiveExport.ts` — to verify whether the
  five previously-open handoffs from the 2026-09-10 brand map are still open today.
- `README.md`, `package.json` scripts, `docs/BrandConstitution.md` — spot-check of documentation
  accuracy against actual tooling/config.
- Repo-wide case-insensitive search for `atlasgr`, `totaltrac` (and variants) — 250+ and 97 files
  respectively (search result capped; true totals are close to the prior audit's 444/93 files).

## Files inspected

Approximately 60 files read/greped in depth (config, schema, migrations, module-access chain,
routing, email/export templates, OPA policies, infra manifests, README/CLAUDE.md/PILOTS.md/
BrandConstitution.md), plus ~350 files touched only by pattern search (file-list level) across
`src/`, `prisma/`, `docs/`, `.agents/`, `public/tools/`, `infrastructure/`, `charts/`, `argocd/`.

## Executive summary

The repository already has an unusually mature, honest internal audit trail for this exact
domain — `docs/architecture/LEGACY_BRAND_CONTENT_MAP.md` (2026-09-10) and `docs/REMOVED-DOCS.md`
are both accurate, well-organized, and explicitly warn against blind search-and-replace or
re-discovering already-triaged items. Re-verifying that map's open items against the current
working tree shows real progress: the two highest-risk items from that map (GHCR/ArgoCD pointing
at the old GitHub org name, and hardcoded AtlasGR orange in a real transactional email/executive
export) are **now resolved**. However, this audit found a **new, unresolved, self-inflicted
regression that did not exist on 2026-09-10**: a same-day migration
(`20260912120000_structural_rebrand_unify_playbook`, committed as `f098d675`) renamed the
`ModuleAccessGrant.moduleKey` column value `'treinamento-atlasgr'` → `'treinamento-birthub360'` in
the database, but the current working-tree code (`src/config/module-catalog.ts`, `src/App.tsx`,
`src/hooks/useModuleAccess.ts`) still defines and checks the module key as
`'treinamento-atlasgr'` — the two no longer agree, and nothing in the repository compensates for
it. This is a concrete, evidence-backed access-control regression, not a hypothesis. On top of
that, the working tree shows this same commit's broader rebrand (env vars, external portal URLs,
`playbooks.ts`, `access-policy.ts`) being **manually, partially reverted in place**, so the
repository is currently in a self-contradictory transitional state: some files use the new scheme,
some the old, and the database migration that already ran belongs to neither consistently. This
audit also found one item the 2026-09-10 map explicitly flagged as "not confirmed, needs
verification" — a live reference to `public/tools/portal-comercial/totaltrac-cockpit.html` and
`cockpit.html` from a routed, module-gated production component
(`PropostaComercialHub.tsx`) — and confirms it: it is real, live, and additionally reveals that an
entire AtlasGR/Total Trac vertical-specific business module (GR/logistics risk-management proposal
templates) is exposed to every tenant of a product whose declared ICP is "any company with a sales
team," which is a product-scope problem, not just a cosmetic one. Separately, `.claude/CLAUDE.md`
itself — the file every design/UI session is told to read first — contains a stale description of
`src/config/playbooks.ts` (the very file it names as source of truth), describing a two-key
`atlasgr`/`totaltrac` playbook selector that no longer exists in code (replaced by a single
`'geral'` key). `README.md` also misdescribes the lint tooling (says ESLint; the actual `npm run
lint` script runs Biome).

## Critical

- **DOCBRAND-001** — Database migration renamed `ModuleAccessGrant.moduleKey` away from the value
  the current application code still expects, silently breaking the "Treinamento Comercial" module
  gate for every previously-granted user. See Complete findings list.

## High

- **DOCBRAND-002** — A full AtlasGR/Total Trac vertical-specific (logistics/insurance risk
  management) proposal-generation sub-module, including a `totaltrac-cockpit.html` iframe tab, is
  live and reachable by any tenant via the `proposta-comercial` module grant — contradicts the
  product's own declared ICP and constitutes real cross-tenant business-content leakage, not mere
  brand residue.
- **DOCBRAND-003** — `.claude/CLAUDE.md` §1 describes `src/config/playbooks.ts` as still keying
  content by `atlasgr`/`totaltrac`; the actual current file only has a single `'geral'` key. A
  session trusting the constitution verbatim will misunderstand the live playbook architecture and
  may try to "preserve" keys that were already deliberately removed.
- **DOCBRAND-007** — The in-flight rebrand commit on this very branch changed real third-party
  portal URLs (`*.atlasgr.com.br`) to unverified `*.birthub360.com.br` domains, violating
  `CLAUDE.md §13`'s own explicit rule that `EXTERNAL_LINKS` require coordination before changing;
  the working tree is now mid-revert of that same commit, leaving the branch internally
  inconsistent as of this audit.

## Medium

- **DOCBRAND-004** — `README.md` documents the lint tooling as ESLint; `package.json`'s actual
  `lint`/`lint:fix` scripts run Biome.
- **DOCBRAND-005** — `src/config/module-catalog.ts` `EXTERNAL_LINKS` still hardcode real AtlasGR
  third-party system URLs, shown to every tenant regardless of ICP (confirmed still open;
  previously flagged in `LEGACY_BRAND_CONTENT_MAP.md` §2.3).
- **DOCBRAND-006** — `infrastructure/opa/policies/tenancy.rego` (package `atlasgr.tenancy`) is
  confirmed dead code (zero call sites in `src/`) while its own header comment calls it "the
  technical proof" of tenant isolation — confirmed still open; previously flagged in §2.4.
- **DOCBRAND-011** — `LEGACY_BRAND_CONTENT_MAP.md` §2.3's `getTenantFromEmail()` correlate is now
  stale in a different way: that function was fully removed (not just fixed), so the still-open
  half of §2.3 (module-catalog URLs) needs its own updated handoff instead of sharing one with a
  now-nonexistent function.

## Low

- **DOCBRAND-008** — Same migration also rewrote historical `brand` columns
  (`AssistantMessage`, `RoleplaySession`, `QualificationMatrixItem`, `ObjectionMatrixItem`) from
  `'atlasgr'/'totaltrac'` to a new, equally non-canonical value `'birthub360'` — harmless today
  because `playbooks.ts` already treats any unrecognized value as a fallback, but functionally
  pointless churn.
- **DOCBRAND-013** — `prisma/schema.prisma` inline comments (`brand String // 'atlasgr' |
  'totaltrac'`, ~lines 1735/1770) are stale relative to `playbooks.ts`'s current single-key model.
- **DOCBRAND-012** — Static, iframed legacy portals (`public/tools/treinamento-atlasgr/`,
  `public/tools/portal-comercial/`) continue to actively serve the old brand to end users on
  routed modules — confirmed still open (§2.5), not a functional break.
- **DOCBRAND-009 / DOCBRAND-010** (resolved, documented for traceability) — the two highest-risk
  items from the 2026-09-10 brand map (GHCR/ArgoCD repo naming; hardcoded `#FF5618` in a real
  transactional email and executive export) are already fixed in the current working tree.

## Technical debt

- TD-MIGRATION + TD-BUG + TD-DATA: DOCBRAND-001.
- TD-DATA + TD-MIGRATION: DOCBRAND-008.
- TD-DOC: DOCBRAND-003, DOCBRAND-004, DOCBRAND-013, DOCBRAND-011.
- TD-GOV + TD-MIGRATION: DOCBRAND-007.
- TD-DEAD + TD-SEC + TD-GOV: DOCBRAND-006.
- TD-BRAND + TD-TENANT + TD-PRODUCT: DOCBRAND-002 (RESOLVED 2026-09-20), DOCBRAND-005 (RESOLVED
  2026-09-20).
- TD-BRAND (cosmetic, no functional break): DOCBRAND-012 (RESOLVED 2026-09-20).

## Implementation debt

DOCBRAND-001 is the clearest implementation-debt item: a migration and its consuming code were
authored/reviewed independently (visible from the commit diff touching 20+ files at once) without
a check that the moduleKey rename and the code that reads it stay in lockstep. There is no
automated test asserting `ModuleAccessGrant.moduleKey` values in migrations match
`MODULE_CATALOG`/`ModuleKey` in `src/config/module-catalog.ts` — see Quick wins.

## Feature debt

DOCBRAND-002 (as originally audited): the "Proposta Comercial" feature, as then shipped, was not
a generic proposal generator for "any company with a sales team" (the declared ICP) — it was
AtlasGR's own GR/logistics insurance proposal catalog plus a two-brand ("cockpit-atlas" /
"cockpit-totaltrac") cockpit switcher, wholesale. Any new tenant granted this module received a
third party's business content, not their own. **Update 2026-09-20:** the module was retired
entirely (not generalized in place) — see the RESOLVED status above.

## Bugs

- **DOCBRAND-001** (see Critical) — concrete, reproducible-by-inspection access-control regression.

## Architecture

- DOCBRAND-006: an authorization policy file (`tenancy.rego`) exists, is documented in its own
  header as *the* tenant-isolation control, and is never invoked — the only structural safeguard
  against a security reviewer trusting a control that never ran.
- DOCBRAND-007 illustrates a process/architecture gap rather than a code one: nothing in the repo
  (pre-commit hook, CI check, or documented protocol beyond prose in `AGENTS.md`) prevents two
  swarm agents from touching the same brand-axis files in opposite directions inside one branch
  without either noticing before this audit.

## Security

- DOCBRAND-006 (dead OPA tenancy policy that could be mistaken for a live control in a future
  security review) is the only security-adjacent finding in this domain; real tenant isolation is
  documented (and, per the prior brand map, confirmed) to run through `organizationId`/RLS via
  `src/lib/tenant-prisma.ts`, not through `tenancy.rego`.

## Tests

No test in `tests/unit/config/access-policy.test.ts` or elsewhere asserts that
`ModuleAccessGrant.moduleKey` values written by any migration match the live `ModuleKey` union in
`src/config/module-catalog.ts` — this is exactly the kind of check that would have caught
DOCBRAND-001 automatically. No test asserts `.claude/CLAUDE.md`'s brand/playbook description
matches `src/config/playbooks.ts` (out of scope for most repos, but this repo already treats
`CLAUDE.md` as load-bearing operational documentation, which raises the bar).

## Integration

Not applicable beyond what's already covered under Bugs/Feature debt — this domain's integration
surface is the static legacy portals (`public/tools/portal-comercial/*`, `treinamento-atlasgr/*`),
which are internal iframe-embedded HTML, not third-party API integrations.

## Product

DOCBRAND-002 is fundamentally a product-scope finding disguised as a brand-residue one: the
"Proposta Comercial" module's actual content assumes the tenant is in the logistics/cargo-risk
insurance business, which contradicts the platform's own stated ICP.

## Mock/Fake/Placeholder

None found specific to this domain beyond what's already covered.

## Dead/Orphan code

- DOCBRAND-006: `infrastructure/opa/policies/tenancy.rego` — confirmed zero call sites in `src/`.

## Quick wins

- Add one automated check (unit test or CI script) asserting every historical/known
  `ModuleAccessGrant.moduleKey` and `*.brand` value produced by any Prisma migration is a member of
  the current `MODULE_KEYS`/`PlaybookKey` union — would have caught DOCBRAND-001 before merge and
  prevents recurrence.
- Fix `README.md`'s "ESLint (Flat Config) e Prettier" / "Roda o ESLint..." wording to say Biome
  (`package.json` `lint`/`lint:fix` already run `biome lint`/`biome lint --write`) — a one-line,
  zero-risk documentation correction.
- Update `.claude/CLAUDE.md` §1's playbook bullet to match the current `src/config/playbooks.ts`
  (single `'geral'` key, migration already applied) instead of describing the retired two-key
  model as still live.
- Decide and execute one direction for the in-flight rebrand (either finish applying it
  consistently everywhere `f098d675` touched, or fully revert it including a compensating
  migration for `ModuleAccessGrant.moduleKey`) — right now the branch has neither.

## Structural problems

The repository's development process allows two independent agents/sessions to modify the same
brand-axis files (`module-catalog.ts`, `playbooks.ts`, `access-policy.ts`, `.env.example`, a
Prisma migration) in opposite directions inside the same branch, with the only sign being a
`git diff HEAD` a human/audit has to notice manually. `AGENTS.md`'s file-ownership/worktree
protocol is documented but this instance shows it did not prevent (or has not yet reconciled) this
specific conflict as of this audit's snapshot.

## Needs verification

- Whether `20260912120000_structural_rebrand_unify_playbook` has actually been applied (`prisma
  migrate deploy`) against any live database (staging/production) — this audit can only confirm
  the migration file exists, is committed, and is inconsistent with current code; it cannot
  confirm from the repository alone whether the blast radius has already materialized in a real
  environment or is still contained to a migration file waiting to be deployed.
- Whether `birthub360.com.br` is a real, provisioned domain with the specific subdomains
  (`connect.`, `newconnect.`, `perfil-securitario.`) the reverted commit pointed to — if it is not,
  `f098d675`'s `EXTERNAL_LINKS` change (now apparently being reverted in the working tree) would
  have been a genuine functional break had it reached production undetected.
- Whether any other file touched by `f098d675` (30 files changed) besides the ones sampled in this
  audit (`module-catalog.ts`, `playbooks.ts`, `access-policy.ts`, `env.ts`, `.env.example`,
  `BrandContext.tsx`) is left in a similarly half-reverted state — this audit sampled the
  brand-axis files most relevant to its domain, not the full 24-file diff.

## Complete findings list

### DOCBRAND-001 — ModuleAccessGrant.moduleKey renamed in DB migration but not in consuming code

- **Category:** TD-MIGRATION, TD-BUG, TD-DATA
- **Severity:** CRITICAL
- **Priority:** P0
- **Confidence:** HIGH
- **Status:** CONFIRMED
- **Effort:** S
- **Evidence:**
  - `prisma/migrations/20260912120000_structural_rebrand_unify_playbook/migration.sql`:
    `UPDATE "ModuleAccessGrant" SET "moduleKey" = 'treinamento-birthub360' WHERE "moduleKey" = 'treinamento-atlasgr';`
    (committed in `f098d675`, no compensating later migration exists — confirmed via
    `ls prisma/migrations | sort | tail`, last entry is `20260912130000_slack_stripe_omie_connections`,
    unrelated feature).
  - `src/config/module-catalog.ts` (current working tree): `export type ModuleKey = 'social-selling'
    | 'treinamento-atlasgr' | 'proposta-comercial' | 'hub-inteligencia-marketing';` and
    `MODULE_CATALOG` entry `key: 'treinamento-atlasgr'` — the only value the app currently
    recognizes as valid.
  - `src/App.tsx`: route `path="/treinamento-atlasgr"` wrapped in
    `<RequireModuleAccess moduleKey="treinamento-atlasgr">`.
  - `src/hooks/useModuleAccess.ts` `useHasModuleAccess()`:
    `return grantedModules.includes(moduleKey)` — exact string match, fail-closed
    (`fallback = false`) by explicit design comment.
  - `src/features/module-access/services/moduleAccess.service.ts`
    `listGrantedModulesForUser()` returns the raw `moduleKey` strings straight from the
    `ModuleAccessGrant` repository rows for any non-`ADMIN` role, with no re-mapping.
- **Root cause:** the migration and the code change that was supposed to accompany it were
  authored together in commit `f098d675`, but that commit's module-catalog.ts change has since
  been reverted in the working tree (see DOCBRAND-007) without a compensating data migration.
- **Expected:** a user granted "Treinamento Comercial" keeps seeing/using it after any deploy.
- **Actual:** after the migration runs, `ModuleAccessGrant` rows for that module carry
  `moduleKey = 'treinamento-birthub360'`; the app only ever checks for `'treinamento-atlasgr'`.
  The grant becomes permanently invisible to `useHasModuleAccess`/`listGrantedModulesForUser` with
  no error, log, or user-facing signal — it just silently disappears from the granted list.
- **User impact:** every non-ADMIN user previously granted the training module loses access to it
  after this migration is applied, with no visible cause; an ADMIN re-checking the access matrix
  would see the toggle appear "off" and have to re-grant it (which would then write the *current*
  code's key, `'treinamento-atlasgr'`, creating a second, non-overlapping grant history).
- **Business impact:** silent loss of a paid/managed training entitlement; support burden from
  users asking why a module they had access to vanished.
- **Suggested resolution:** pick one canonical `moduleKey` value, then either (a) write a
  compensating migration to align the DB with the code's current key, or (b) update
  `module-catalog.ts`/`App.tsx` to the migration's key — whichever direction the rebrand actually
  lands on (see DOCBRAND-007) — and add the regression test suggested in Quick wins.

### DOCBRAND-002 — Live AtlasGR/Total Trac vertical-specific proposal module exposed to every tenant

- **Category:** TD-BRAND, TD-TENANT, TD-PRODUCT
- **Severity:** HIGH
- **Priority:** P1
- **Confidence:** HIGH
- **Status:** RESOLVED (2026-09-20, verified during fix/docbrand-012) — `PropostaComercialHub.tsx`,
  its `proposalsList` (GR/logistics/insurance templates and the named `Transpacheco` proposal),
  the `cockpit-atlas`/`cockpit-totaltrac` tabs and the `'proposta-comercial'` `MODULE_CATALOG`
  entry/route no longer exist in the working tree. They were retired wholesale (not tenant-gated,
  not "generic-ified" — fully removed) in `b06ba649` ("aposenta módulos executivos proprietários
  da Atlas GR") and `edcf6b0d` ("remove conteúdo estático dos módulos executivos aposentados"),
  per the explicit user decision recorded in `src/config/module-catalog.ts`'s header comment
  ("Atlas GR não é ninguém, não é nem mais pra existir"). `isModuleKey('proposta-comercial')` now
  returns `false`, and `src/features/module-access/services/__tests__/moduleAccess.service.test.ts`
  already asserts `grantModuleAccess` rejects the retired key; `src/config/__tests__/
  module-catalog.test.ts` (added in the DOCBRAND-012 pass) additionally locks `MODULE_CATALOG`/
  `EXTERNAL_LINKS` against reintroducing GR/logistics/insurance terminology or `*.atlasgr.com.br`
  URLs. No proposal-generation feature remains in the product today — CRM 360's own
  `PropostaForm.tsx`/`PropostaDetail.tsx`/`PropostasList.tsx` (a different, always-generic
  quote/proposal entity, unrelated to this finding) were checked and contain no vertical-specific
  copy. Original evidence below, kept for history — file:line citations are stale.
- **Effort:** M
- **Evidence (historical — files removed):**
  - `src/features/propostas/components/PropostaComercialHub.tsx` lines 7-9, 69-76: tab state type
    `'selecao' | 'modelos' | 'cockpit-atlas' | 'cockpit-totaltrac'`; iframe `src` resolves to
    `/tools/portal-comercial/cockpit.html` or `/tools/portal-comercial/totaltrac-cockpit.html`
    depending on the selected tab.
  - Same file's `proposalsList` (lines 17-60): proposal templates named e.g. "Proposta
    Gerenciamento de Risco (GR)", "Perfil Securitário — Cadastro & Consulta", "Torre de Controle
    Logística & Connect", "Proposta Especial — Transpacheco" (a named third-party client) — all
    logistics/cargo-insurance-specific business content, served from
    `public/tools/propostas/Modelo_Proposta_*_FINAL_REVISADO.html`.
  - `src/App.tsx` line ~485-487: this component is routed and gated by
    `<RequireModuleAccess moduleKey="proposta-comercial">`, and `'proposta-comercial'` is a real,
    grantable entry in `MODULE_CATALOG` (`src/config/module-catalog.ts`) — any organization's
    ADMIN can grant this to any user.
  - This corrects `docs/architecture/LEGACY_BRAND_CONTENT_MAP.md` §2.5's explicit "não confirmado
    — requer verificação" status for `public/tools/portal-comercial/`: the reference does exist
    and is live.
- **Root cause:** the module was built for AtlasGR's actual business (cargo risk management/GR)
  before the ICP broadened to "any company with a sales team," and was never generalized or
  gated behind the old ICP when the platform was rebranded.
- **Expected:** a "Proposta Comercial" module usable by any tenant's own proposal
  templates/business content, consistent with `docs/BrandConstitution.md`'s ICP statement.
- **Actual:** every tenant sees AtlasGR's own insurance/logistics proposals and a hardcoded
  Total Trac cockpit tab, with a named third-party client's custom proposal
  (`Proposta_Transpacheco_corrigida.html`) in the list.
- **User impact:** non-AtlasGR tenants granted this module see irrelevant, confusing, third-party
  branded business content that has nothing to do with their own operation.
- **Business impact:** looks unfinished/unprofessional to a prospective customer evaluating the
  product, and technically exposes one former client's named proposal to any tenant with the
  module granted.
- **Suggested resolution:** treat per CLAUDE.md §6 (classify before removing) — this is real
  business content, not decoration, so refine/relocate rather than delete outright: either gate
  this specific proposal set behind the AtlasGR organization specifically (tenant-scoped content,
  not global), or replace with a genuinely generic/empty-state proposal module and move the
  AtlasGR-specific content to that tenant's own configuration.

### DOCBRAND-003 — CLAUDE.md's playbook description is stale relative to its own cited source of truth

- **Category:** TD-DOC
- **Severity:** HIGH
- **Priority:** P1
- **Confidence:** HIGH
- **Status:** CONFIRMED
- **Effort:** XS
- **Evidence:**
  - `.claude/CLAUDE.md` §1: "O eixo que aquele seletor de fato controlava no CONTEÚDO (playbook,
    personas, matriz de objeções, portal Bitrix) sobreviveu como playbook comercial
    (`src/config/playbooks.ts`...) ... As chaves `atlasgr`/`totaltrac` continuam gravadas em banco
    e não devem ser renomeadas sem migração."
  - `src/config/playbooks.ts` (current working tree, lines 1-27): `export type PlaybookKey =
    'geral';` with a header comment explicitly stating the two company-named keys were "removidas
    por pedido explícito do usuário" — they are no longer part of the type system at all, and a
    migration (`20260912120000_structural_rebrand_unify_playbook`) has already run against the
    historical data.
  - `src/features/intelligence/routes/intelligence.routes.ts` lines 97-98, 161, 218, 238, 607, 613
    confirm the route layer is already consistent with the new single-`'geral'`-key model
    (`brand !== 'geral'` validation, `z.literal('geral')`), not the two-key model CLAUDE.md
    describes.
- **Root cause:** `.claude/CLAUDE.md` was not updated when `playbooks.ts` was refactored from a
  two-key to a one-key model in the same rebrand effort that produced the 2026-09-12 migration.
- **Expected:** the design constitution accurately describes the file it names as source of truth.
- **Actual:** it describes an architecture (`atlasgr`/`totaltrac` as the live playbook selector)
  that source code has already retired.
- **User impact:** none directly (internal dev documentation), but any future Claude Code session
  reading CLAUDE.md first (as instructed) will be misled about the current playbook model and may
  try to preserve or reference keys that no longer exist in the type system.
- **Business impact:** wasted engineering time re-investigating an already-resolved architecture
  question; risk of a future session reintroducing the two-key model believing it's required.
- **Suggested resolution:** update CLAUDE.md §1's playbook bullet to describe the current
  single-`'geral'`-key model and the fact that historical `atlasgr`/`totaltrac` values are
  read-only/fallback-only, not "gravadas em banco e vivas."

### DOCBRAND-004 — README.md misdescribes the actual lint tooling

- **Category:** TD-DOC
- **Severity:** MEDIUM
- **Priority:** P2
- **Confidence:** HIGH
- **Status:** CONFIRMED
- **Effort:** XS
- **Evidence:** `README.md` "Tecnologias e Configuração": "ESLint (Flat Config) e Prettier para
  padronização"; "Scripts Disponíveis": "`npm run lint`: Roda o ESLint validando toda a pasta
  `src/`...". `package.json` scripts: `"lint": "biome lint src"`, `"lint:ci": "biome lint src"`,
  `"lint:fix": "biome lint --write src"`, `"format": "biome format --write src"` —
  `@biomejs/biome` is the tool actually invoked; ESLint config (`.eslintrc.js`,
  `eslint.config.mjs`) exists in the repo but is not what these npm scripts run.
- **Root cause:** the project migrated its primary lint runner to Biome without updating the
  onboarding README.
- **Expected:** README accurately names the tool a new contributor will actually run.
- **Actual:** it names ESLint.
- **User impact:** a new contributor following the README literally (e.g. trying to configure an
  editor ESLint integration to match CI) would be solving the wrong problem.
- **Business impact:** minor onboarding friction.
- **Suggested resolution:** update the two README passages to name Biome as the tool `npm run
  lint`/`lint:fix` actually invoke, and clarify ESLint's remaining/coexisting role if any.

### DOCBRAND-005 — module-catalog.ts EXTERNAL_LINKS still hardcode AtlasGR-only third-party URLs (still open)

- **Category:** TD-BRAND, TD-TENANT
- **Severity:** MEDIUM
- **Priority:** P2
- **Confidence:** HIGH
- **Status:** RESOLVED (2026-09-20, verified during fix/docbrand-012) — `EXTERNAL_LINKS` in the
  current `src/config/module-catalog.ts` contains only `gmail` (`mail.google.com`) and `workspace`
  (`drive.google.com`); none of the `*.atlasgr.com.br`/`atlasgr.bitrix24.com.br` URLs cited below
  remain. This appears to have been generalized in the same rebrand pass that retired the
  `proposta-comercial`/`treinamento-atlasgr` modules (see DOCBRAND-002), though no single commit
  message calls out `EXTERNAL_LINKS` by name — verified directly against the working tree, not
  inferred from history. Note: `.claude/CLAUDE.md` §13 still describes "os atalhos de
  `EXTERNAL_LINKS` apontam para sistemas de terceiros da operação" as a live constraint requiring
  coordination to change; that sentence is now stale relative to this file and worth a follow-up
  doc fix, but is out of scope for this pass (code-only, per task scope). `src/config/__tests__/
  module-catalog.test.ts` now asserts no `atlasgr` domain can be reintroduced into `EXTERNAL_LINKS`.
- **Effort:** M
- **Evidence (historical — URLs no longer present):** `url:
  'https://connect.atlasgr.com.br/portalatlas/Atlas_Principal.php'`,
  `'https://newconnect.atlasgr.com.br/dashboard'`,
  `'https://perfil-securitario.atlasgr.com.br/report/recentRecords'`,
  `'https://atlasgr.bitrix24.com.br/'`, `'https://webmail.atlasgr.com.br/?_task=mail&_mbox=INBOX'`
  — all rendered as real clickable shortcuts (per `Sidebar.tsx`/`ExecutiveHeader.tsx` consumers)
  visible to any tenant, since `module-catalog.ts` is the single source for the whole platform,
  not per-organization configuration.
- **Root cause:** carried over from `docs/architecture/LEGACY_BRAND_CONTENT_MAP.md` §2.3, still
  unresolved as of this audit; `CLAUDE.md` §13 explicitly documents this as intentional-for-now,
  requiring coordination to change — this finding does not recommend unilateral action, only
  confirms the item is still open and re-flags it since the map is from two days before this
  audit and might otherwise be assumed stale/handled.
- **Expected/Actual:** see LEGACY_BRAND_CONTENT_MAP.md §2.3 (unchanged).
- **Suggested resolution:** move these URLs to per-organization configuration (D-class fix per the
  prior map's own taxonomy) rather than a single hardcoded set for the whole platform.

### DOCBRAND-006 — infrastructure/opa/policies/tenancy.rego is dead code with a misleading self-description (still open)

- **Category:** TD-DEAD, TD-SEC, TD-GOV
- **Severity:** MEDIUM
- **Priority:** P2
- **Confidence:** HIGH
- **Status:** CONFIRMED
- **Effort:** S
- **Evidence:** `infrastructure/opa/policies/tenancy.rego` package `atlasgr.tenancy`, header
  comment: "Separação visual não é prova de isolamento — este arquivo é a prova técnica." Grep for
  `tenancy.rego|atlasgr.tenancy|tenant_allowed|brand_allowed|cross_brand_violation` across `src/`
  returned zero matches (confirmed in this session) — no middleware or service queries this
  policy; only `rbac.rego` (different package, `atlasgr.rbac`) is queried live, per
  `src/middleware/opa.ts`/`src/lib/auth/authorization.ts` (not modified since the prior audit).
- **Root cause:** the policy was authored during the two-brand era and never wired to a call site,
  or its call site was removed without removing the policy file.
- **Expected:** either the policy is queried somewhere, or its header does not claim to be "the
  technical proof" of an active control.
- **Actual:** neither — it is inert and self-describes as load-bearing.
- **User impact:** none today (real isolation runs through `organizationId`/RLS, confirmed
  unchanged by this audit).
- **Business impact:** a future security audit or new engineer could treat this file as
  authoritative and miss that it never executes, producing an incorrect security assessment.
- **Suggested resolution:** either wire it into `src/middleware/opa.ts` for real, or delete it and
  correct any documentation that references it as active (governance decision, not a unilateral
  code change — per `CLAUDE.md` §13's own caution about touching legacy-brand-named infra).

### DOCBRAND-007 — In-flight rebrand commit is being manually, partially reverted, leaving the branch self-contradictory

- **Category:** TD-GOV, TD-MIGRATION
- **Severity:** HIGH
- **Priority:** P1
- **Confidence:** HIGH
- **Status:** CONFIRMED
- **Effort:** M
- **Evidence:**
  - Commit `f098d675` ("feat(rebrand): migracao estrutural para Birth Hub 360 e unificacao de
    playbooks", 2026-09-12) touched 24+ files including `src/config/module-catalog.ts` (renamed
    `'treinamento-atlasgr'` → `'treinamento-birthub360'` and rewrote `EXTERNAL_LINKS` from
    `*.atlasgr.com.br` to `*.birthub360.com.br`), `src/config/playbooks.ts`, `src/config/env.ts`,
    `.env.example`, `charts/prospector-atlas/values.yaml`, `Caddyfile.oci`, `docker-compose.oci.yml`,
    and the migration referenced in DOCBRAND-001.
  - `git diff HEAD -- src/config/module-catalog.ts` (this session, current working tree) shows the
    working tree reverting exactly those `module-catalog.ts` changes back to
    `'treinamento-atlasgr'` and `*.atlasgr.com.br`.
  - `git diff HEAD --stat -- src/config/access-policy.ts src/config/playbooks.ts
    src/contexts/BrandContext.tsx .env.example src/config/env.ts` confirms all five files have
    uncommitted changes on top of `f098d675`, but `src/config/playbooks.ts`'s current *content*
    (read directly) is still the new single-`'geral'`-key model, not reverted — i.e. the revert is
    inconsistent even across files that were touched by the same original commit.
  - `CLAUDE.md` §13: "os atalhos de `EXTERNAL_LINKS` apontam para sistemas de terceiros da
    operação... Trocar qualquer um deles exige migração de dados ou coordenação com
    infraestrutura — peça antes." — `f098d675` changed them without that coordination being
    evidenced anywhere in the commit message or an accompanying handoff file.
  - No compensating Prisma migration exists to revert the `ModuleAccessGrant.moduleKey` /
    `*.brand` column changes alongside the code revert (see DOCBRAND-001, DOCBRAND-008).
- **Root cause:** at least two agents/sessions in this repo's development swarm are working the
  same brand-axis files in opposite directions within one branch, without a merge/rebase step
  reconciling them before this audit's snapshot.
- **Expected:** a rebrand (or its revert) lands atomically — code and migration consistent, all
  touched files moving the same direction.
- **Actual:** the branch is split: `playbooks.ts`/`intelligence.routes.ts` on the new scheme,
  `module-catalog.ts`/`App.tsx` back on the old scheme, and the migration permanently on the new
  scheme with no code left recognizing it.
- **Suggested resolution:** whoever owns this branch (per the repo's own coordinator convention —
  see `MEMORY.md`: a dedicated PR/merge coordinator session exists for this repo) should pick one
  direction, finish it everywhere `f098d675` touched, and add the compensating migration if
  reverting; do not merge/push until this is resolved (consistent with existing memory: coordinate
  through the designated PR/merge session, confirm with the user before merge/push).

### DOCBRAND-008 — Migration renamed historical brand values to a third, equally non-canonical value (low-impact churn)

- **Category:** TD-DATA, TD-MIGRATION
- **Severity:** LOW
- **Priority:** P3
- **Confidence:** HIGH
- **Status:** CONFIRMED
- **Effort:** XS
- **Evidence:** `prisma/migrations/20260912120000_.../migration.sql`: `UPDATE "AssistantMessage"
  SET "brand" = 'birthub360' WHERE "brand" IN ('atlasgr', 'totaltrac');` (and the same for
  `RoleplaySession`, `QualificationMatrixItem`, `ObjectionMatrixItem`). `src/config/playbooks.ts`
  comment: "Linhas antigas gravadas com `atlasgr`/`totaltrac` continuam legíveis:
  `playbookInfo()` cai no padrão para qualquer chave desconhecida" — the fallback already handled
  the old values gracefully, so rewriting them to `'birthub360'` (also not a member of
  `PlaybookKey = 'geral'`) achieves nothing functionally different, just replaces one
  unrecognized string with another.
- **Expected/Actual:** no behavior change either way, confirmed via the fallback design in
  `playbooks.ts`.
- **Suggested resolution:** none required; noted for completeness since it's part of the same
  migration as DOCBRAND-001.

### DOCBRAND-009 — [RESOLVED since 2026-09-10] GHCR image repo / ArgoCD repoURL no longer point at old GitHub org name

- **Category:** TD-BRAND, TD-INFRA
- **Severity:** LOW
- **Priority:** P4
- **Confidence:** HIGH
- **Status:** CONFIRMED (resolved)
- **Effort:** —
- **Evidence:** `charts/prospector-atlas/values.yaml` line 17: `repository:
  ghcr.io/maarkss1/birthub-360`. `argocd/application-production.yaml` /
  `application-homolog.yaml` line 9: `repoURL: 'https://github.com/maarkss1/Birthub-360.git'` —
  both match the actual current repository name/owner. `docs/architecture/LEGACY_BRAND_CONTENT_MAP.md`
  §2.1 flagged the old `ghcr.io/maarksn/central-de-inteligencia-comecial-atlasgr` /
  `github.com/MaarksN/CENTRAL-DE-INTELIGENCIA-COMECIAL-ATLASGR.git` values as high-risk two days
  ago; they are gone now. Recommend closing
  `.agents/handoffs/onda-c0/11-para-10-argocd-ghcr-nome-antigo.md`.

### DOCBRAND-010 — [RESOLVED since 2026-09-10] Hardcoded AtlasGR orange removed from transactional email and executive export

- **Category:** TD-BRAND
- **Severity:** LOW
- **Priority:** P4
- **Confidence:** HIGH
- **Status:** CONFIRMED (resolved)
- **Effort:** —
- **Evidence:** `src/lib/email/meetingInvite.ts` now uses `BRAND.colors.brand` /
  `BRAND.colors.obsidian` tokens (not `#FF5618`) for the invite button and accent border; grep for
  `ff5618`/`FF5618` in `src/features/commercial-intelligence/application/executiveExport.ts`
  returned zero matches (empty result), vs. the prior map's citation of `border-bottom:2px solid
  #ff5618` at line 206. Recommend closing the corresponding handoff
  (`11-para-03-cor-marca-antiga-em-producao.md`, referenced in §4 of the map though not sampled
  directly in this audit).

### DOCBRAND-011 — access-policy.ts's `getTenantFromEmail()` no longer exists; prior handoff needs re-splitting

- **Category:** TD-DOC
- **Severity:** MEDIUM
- **Priority:** P2
- **Confidence:** HIGH
- **Status:** CONFIRMED
- **Effort:** XS
- **Evidence:** `src/config/access-policy.ts` (current, full file read this session) contains only
  `normalizeLoginEmail()` and `isAuthorizedLoginEmail()`; its own header comment states the
  corporate-domain allowlist was "Removida por pedido explícito do usuário." No
  `getTenantFromEmail()` function exists anywhere in this file. This differs from
  `LEGACY_BRAND_CONTENT_MAP.md` §2.3's description ("`getTenantFromEmail()` ... ainda infere um
  rótulo `'atlasgr'|'totaltrac'` por substring de domínio de e-mail").
- **Root cause:** further refactor of `access-policy.ts` after the 2026-09-10 map was written,
  removing the function the map described, while leaving the (still valid) other half of §2.3
  (module-catalog.ts hardcoded URLs) untouched.
- **Suggested resolution:** update or split the open handoff
  (`.agents/handoffs/onda-c0/11-para-01-url-hardcoded-tenant-especifico.md`) so it only covers the
  still-open `module-catalog.ts` URLs, not a function that no longer exists.

### DOCBRAND-012 — Static legacy-brand portals still served on routed modules (still open, cosmetic)

- **Category:** TD-BRAND
- **Severity:** LOW
- **Priority:** P3
- **Confidence:** HIGH
- **Status:** RESOLVED (2026-09-20, verified during fix/docbrand-012) — `public/tools/` today
  contains only `social-selling/`; `public/tools/treinamento-atlasgr/` and
  `public/tools/portal-comercial/` (and `public/tools/propostas/`) no longer exist on disk. Removed
  in `edcf6b0d` ("remove conteúdo estático dos módulos executivos aposentados"), alongside the
  route/module retirement described under DOCBRAND-002. Choice made: full removal, not
  generalization or tenant-gating — per the explicit user decision recorded in
  `src/config/module-catalog.ts` ("Atlas GR não é ninguém, não é nem mais pra existir"), this was
  legacy-vendor demo/training content and one named third-party client's proposal, not real
  multi-tenant configuration data worth preserving behind a toggle; CLAUDE.md §6's preference for
  refinement over removal is satisfied because the removal is documented (module-catalog.ts header
  comment, App.tsx route comment, this audit) and was an explicit user request, not a unilateral
  aesthetic call.
- **Effort:** L
- **Evidence (historical — directories removed):** `public/tools/treinamento-atlasgr/` (Next.js
  static export, 200+ files, own logo/palette) served via the routed `/treinamento-atlasgr` path
  (see DOCBRAND-001's App.tsx citation); `public/tools/portal-comercial/{cockpit,totaltrac-cockpit,
  ...}.html` served via `PropostaComercialHub.tsx` (see DOCBRAND-002). Recurrence of
  `LEGACY_BRAND_CONTENT_MAP.md` §2.5, confirmed unchanged/still open at time of original audit.
- **Suggested resolution (historical):** per the prior map, not a functional blocker; schedule a
  content refresh pass owned by Agent 11 (Marca e Ativos Institucionais) per that map's existing
  handoff. Superseded by outright removal — see Status above.

### DOCBRAND-013 — prisma/schema.prisma comments stale relative to playbooks.ts's current model

- **Category:** TD-DOC
- **Severity:** LOW
- **Priority:** P4
- **Confidence:** MEDIUM
- **Status:** NEEDS_VERIFICATION (exact current line numbers may have shifted; content confirmed
  present via grep this session)
- **Effort:** XS
- **Evidence:** `prisma/schema.prisma`: `brand String // 'atlasgr' | 'totaltrac'` appears twice
  (grep hits near lines 1735 and 1770, on `PlaybookObjectionItem`-style models) — inline comments
  documenting a domain (`atlasgr`/`totaltrac` as the valid values) that `src/config/playbooks.ts`
  no longer supports as the writable set (only `'geral'` is written going forward, per that file's
  own comment).
- **Suggested resolution:** update the inline comments to reflect the current single-key model and
  note that old values are read-only/historical.

### DOCBRAND-014 — rbac.rego's `atlasgr` package name is a live-but-legacy-named security control (informational, no action)

- **Category:** TD-BRAND (MIGRATION COMPATIBILITY)
- **Severity:** INFO
- **Priority:** P4
- **Confidence:** HIGH
- **Status:** CONFIRMED
- **Effort:** —
- **Evidence:** `infrastructure/opa/policies/rbac.rego` package `atlasgr.rbac` — distinct from the
  dead `tenancy.rego` (DOCBRAND-006); this one is genuinely queried by
  `src/middleware/opa.ts`/`src/lib/auth/authorization.ts` per the prior map (not independently
  re-verified line-by-line in this session beyond confirming it's a different, real call path).
  Renaming requires changing the package name and the calling URL together, or the policy stops
  responding. No action recommended now; recorded so it is not confused with DOCBRAND-006's dead
  policy in a future pass.

## Capability rows

| Capability | Frontend | Backend | Database | Documentation | Tenancy | Security | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Brand identity (visual tokens, logo, colors) | COMPLETE | N/A | N/A | COMPLETE | N/A | N/A | FUNCTIONAL |
| Playbook / brand data model (`playbooks.ts` + DB) | FUNCTIONAL | FUNCTIONAL | PARTIAL (mid-migration, see DOCBRAND-001/007/008) | BROKEN (CLAUDE.md stale, see DOCBRAND-003) | N/A | N/A | PARTIAL |
| Module access grants (`moduleAccess.*`) | FUNCTIONAL | FUNCTIONAL | BROKEN (moduleKey mismatch, DOCBRAND-001) | PARTIAL | FUNCTIONAL (org-scoped) | FUNCTIONAL | BROKEN |
| Proposta Comercial module content | REMOVED (2026-09-20, DOCBRAND-002) | N/A — module retired | N/A | RESOLVED (this audit updated) | RESOLVED — feature no longer exists, nothing left to leak | N/A | RESOLVED |
| Legacy static portals (`treinamento-atlasgr`, `portal-comercial`) | FUNCTIONAL (still renders) | N/A | N/A | PARTIAL (documented in prior audit) | FUNCTIONAL | N/A | LEGACY |
| OPA tenancy policy (`tenancy.rego`) | N/A | MISSING (never called) | N/A | MISSING (self-described as active, isn't) | MOCKED (looks like a control, isn't wired) | BROKEN (misleading) | LEGACY |
| Repository-level docs (README, CLAUDE.md, BrandConstitution) | N/A | N/A | N/A | PARTIAL (2 stale claims found: DOCBRAND-003, DOCBRAND-004) | N/A | N/A | PARTIAL |

