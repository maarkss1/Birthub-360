# Legacy Brand Debt — Birth Hub 360º

> Every AtlasGR / Total Trac (or other retired brand) reference surfaced by the DOCBRAND
> specialist audit, classified per the DOCBRAND categories: **in-flight migration
> inconsistency**, **single-tenant content never generalized**, **documentation drift**, and
> **isolated/already-scoped legacy artifacts**. Context: until 09/2026 the platform switched
> brand identity at runtime between AtlasGR and Total Trac (`BrandContext`, `data-brand`);
> that mechanism is retired. The `atlasgr`/`totaltrac` keys survive only as **commercial
> playbook data** (`src/config/playbooks.ts`) and as **values already written to the
> database** — both are intentional, documented survivors, not bugs, per `CLAUDE.md §1`.

## Category A — In-flight two-brand-to-one-brand migration reverted inconsistently (RC-07)

A cohesive rebrand commit changed a set of files together; a later commit in the same branch
partially reverted some of those files back to the old scheme while leaving others on the new
scheme, confirmed via git history, with no compensating data migration.

- **DOCBRAND-001** — a file changed as part of the rebrand commit set, later reverted.
- **DOCBRAND-007** — sibling file to DOCBRAND-001, same commit pair, inconsistent end state.
- **DOCBRAND-008** — a third file in the same reverted set.
- **DOCBRAND-011** (CRITICAL, cross-listed in `PRODUCTION-BLOCKERS.md`) — the confirmed
  concrete consequence: `ModuleAccessGrant.moduleKey` values written by migration use
  `treinamento-atlasgr`, while current code expects `treinamento-birthub360` (or vice versa),
  producing a silent, fail-closed access-control regression with no test catching it.
- **DOCBRAND-013** — a file whose inline comment still describes the old two-brand behavior
  (also listed under `RC-12`, documentation drift, since the *comment* half of the file is a
  drift issue distinct from the *code* half's revert issue).

**Status:** unresolved, in-flight. **Recommended fix path:** treat the rebrand as a single
atomic change to complete (not to re-litigate) — reconcile every file in the original commit
set to the new scheme, then add an automated test (already proposed as a quick win) asserting
every `moduleKey`/`brand` value ever written by a migration is a member of the current code
union, so this class of regression cannot recur silently.

## Category B — Single-tenant/single-customer content never generalized (RC-06)

Tooling built for one specific customer/vertical (Atlas GR) was wrapped in a generic,
grantable module or component without being rewritten, tenant-gated, or retired — even after
the product's stated ICP became vertical-agnostic ("any company with a commercial area").

- **DOCBRAND-002** — Atlas GR–specific business content embedded in a nominally generic
  feature.
- **DOCBRAND-005** — a second instance of the same pattern in adjacent content.
- **DOCBRAND-012** — the Proposta Comercial feature: still ships one company's actual
  vertical-specific business content to every tenant. This is the most product-visible
  instance — a live, tenant-facing document generation feature that leaks one customer's
  business specifics to unrelated tenants using it today.
- **VOICE-001** (cross-listed, CRITICAL) — the AI voice cold-call script hardcoded to one
  tenant's brand identity; the clearest example of this pattern breaking a core capability
  rather than just carrying stale copy.
- **PRODUCT-004** (cross-listed) — Hub Executivo module grants exposing one customer's
  proprietary branded content to unrelated tenants.
- **FRONTEND-002 / FRONTEND-003** (cross-listed) — Hub Executivo sub-features
  (`HubInteligenciaMarketingHub.tsx`, `SocialSellingHub.tsx`) whose content and download links
  were built against one tenant's static asset set and were never audited for what happens
  when a different tenant opens them (both confirmed broken independent of brand: missing
  files, wrong counts).

**Status:** unresolved. Highest business risk in this file — Proposta Comercial (DOCBRAND-012)
is live and customer-facing, not a dormant admin tool.

## Category C — Documentation and inline comments drift from the current brand model (RC-12)

- **DOCBRAND-004** — `.claude/CLAUDE.md §1` describes `src/config/playbooks.ts` as if the
  retired `atlasgr`/`totaltrac` two-key selector were still the live model; the current model
  is a single `geral` playbook key. This is the most important instance in this category
  because `CLAUDE.md` is this repository's own primary source of truth for design/engineering
  work — an inaccurate description here can misdirect every future session that reads it
  first, as instructed.
- **DOCBRAND-013** — see Category A; the comment-drift half of that file's issue.
- **DOCBRAND-009** — `README.md` still references ESLint in places where the project's real
  lint scripts run Biome (`lint`/`lint:fix` call `biome lint`/`biome lint --write`). Not a
  brand reference in the AtlasGR/Total Trac sense, but classified here per the DOCBRAND
  domain's broader documentation-hygiene scope.
- **DOCBRAND-010** — a second instance of stale tooling documentation, same root cause as
  DOCBRAND-009.
- **DOCBRAND-014** — `LEGACY_BRAND_CONTENT_MAP.md §2.3` describes `getTenantFromEmail()`, a
  function that no longer exists in `src/config/access-policy.ts`. This finding needs to be
  re-split: the function-description half is stale and should be retired, but the
  module-catalog.ts URL half of the same finding is still valid and should be kept.

**Status:** low-risk, high-value to fix — these are pure documentation corrections with no
behavioral change, already captured as quick wins (#46–#48 in `QUICK-WINS.md`).

## Category D — Intentional, documented survivors (not debt — do not "fix")

Per `CLAUDE.md §13`, these are retired-brand-adjacent artifacts that remain **on purpose** and
require migration/coordination, not a unilateral cleanup:

- `atlasgr`/`totaltrac` keys in `src/config/playbooks.ts` and in already-written database
  rows — commercial playbook data, not identity. Renaming requires a data migration.
- The login domain allowlist in `src/config/access-policy.ts` — a security rule, not brand
  residue.
- `EXTERNAL_LINKS` shortcuts pointing at third-party operational systems.
- `public/tools/` legacy iframe-embedded applications.
- Android package/namespace `br.com.atlasgr.prospector` (`android/app/src/main/java/...`,
  `AndroidManifest.xml`) — changing an Android application ID is a store-listing-breaking
  operation requiring explicit coordination, not a documentation fix.

**Explicitly out of scope for this audit's recommendations:** none of Category D should be
"fixed" by a future session without first reading `CLAUDE.md §13` and getting explicit
sign-off, exactly as that section already states.

---

## Summary count

| Category | Count | Status |
|---|---|---|
| A — In-flight migration reverted inconsistently | 5 (`DOCBRAND-001/007/008/011/013`) | Unresolved, 1 CRITICAL |
| B — Single-tenant content never generalized | 6 (`DOCBRAND-002/005/012`, `VOICE-001`, `PRODUCT-004`, `FRONTEND-002/003` — 3 DOCBRAND-native + 4 cross-listed) | Unresolved, includes 1 CRITICAL |
| C — Documentation drift | 5 (`DOCBRAND-004/009/010/013/014`) | Low-risk, quick-win eligible |
| D — Intentional survivors | 5 named systems | Not debt — do not touch without coordination |

**Legacy brand references requiring action: 12 distinct DOCBRAND-native findings**, plus 4
cross-listed findings in VOICE/PRODUCT/FRONTEND whose root cause is this same pattern (RC-06).
This is materially different from "should be close to zero" — the rebrand is real, genuine,
and still incomplete; this file exists so the next engineering pass does not have to
rediscover that from scratch, and does not accidentally re-litigate Category D's intentional
survivors as if they were bugs.
