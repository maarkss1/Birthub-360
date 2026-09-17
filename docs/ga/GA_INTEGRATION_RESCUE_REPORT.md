# GA Integration Rescue Report

## Metadata

| Field | Value |
|---|---|
| **Date** | 2026-09-17 |
| **Main SHA (start)** | `26f6eed090d4e07f31228774e945dd05a48063b0` |
| **Rescue Branch** | `fix/ga-integration-rescue` |
| **Operation** | GA Integration Rescue — Smoke Gate Restoration |
| **Status** | GA INTEGRATION FREEZE = ACTIVE |

---

## Timeline

### PR #541 — `f80c4ede` (Merged to main)
**fix(deploy): enforce strict production smoke test gate on OCI deploy workflow**

Introduced:
- `scripts/smoke-test-oci.sh` — standalone smoke gate with retries, timeout, HTTP 200 + JSON validation
- Step 8 in `scripts/deploy-oci.sh` calling the smoke script
- `parse_deploy_log` step in `deploy-oci.yml` extracting HEALTH_LIVE, HEALTH_READY, SMOKE_TEST, MIGRATIONS
- `Validar gating estrito de Smoke Test` step that **fails the job** if SMOKE_TEST ≠ PASS
- Enriched deployment summary with all health metrics

### PR #542 — `0757fcfd` (Merged to main, CAUSED REGRESSION)
**feat(security): production domain and auth certification validation (Onda 17)**

Accidentally removed:
- ❌ `scripts/smoke-test-oci.sh` — **104 lines deleted**
- ❌ Step 8 smoke call in `deploy-oci.sh` — **3 lines removed**
- ❌ `parse_deploy_log` step — **simplified to only extract PREVIOUS_SHA**
- ❌ `Validar gating estrito` step — **COMPLETELY REMOVED**

Replaced with degraded inline smoke:
```bash
curl -fsS http://127.0.0.1:3000/health/live
curl -fsS http://127.0.0.1:3000/health/ready
echo "SMOKE_TEST=PASS"  # ← unconditional, no retry, no JSON validation
```

### Root Cause
PR #542's branch likely predated or did not incorporate PR #541's changes. When merged, it overwrote the smoke gate improvements without anyone catching the regression during review.

---

## What Was Preserved (Not Destroyed)

### Onda 17 (PR #542) — Domain & Auth
- `PRODUCTION_DOMAIN` / `DOMAIN` normalization
- `BETTER_AUTH_URL` / `PUBLIC_BASE_URL` configuration
- `ALLOWED_ORIGINS` sanitization (localhost removal)
- `COOKIE_DOMAIN` / `SECURE_COOKIES` / `TRUST_PROXY`
- Chrome Extension CORS support

### Onda 18 (PR #543) — Observability
- `COMMIT_SHA` / `BUILD_VERSION` / `DEPLOY_TIMESTAMP`
- `ENABLE_OBSERVABILITY` opt-in
- Prometheus profile support
- `PLATFORM_OPERATOR_TOKEN` management

### Infrastructure (PR #541) — Still Intact
- `workflow_run` trigger (CI → deploy chain)
- `workflow_dispatch` with mandatory SHA
- `require-ci-green` composite action
- `resolve-sha` job (NO CI PASS = NO DEPLOY)
- SHA-explicit checkout (never `origin/main` HEAD)
- `.env.production` backup during deploy

---

## Corrections Applied (Rescue PR)

### 1. Restored `scripts/smoke-test-oci.sh`
Exact restoration from PR #541. Features:
- Configurable `TARGET_URL`, `MAX_RETRIES` (12), `RETRY_INTERVAL` (5s)
- Per-endpoint retry loop with timeout
- HTTP 200 + JSON `{"status":"ok"}` validation
- Explicit `HEALTH_LIVE=PASS|FAIL`, `HEALTH_READY=PASS|FAIL`, `SMOKE_TEST=PASS|FAIL`
- Non-zero exit code on failure

### 2. Restored smoke call in `deploy-oci.sh`
Added step 8 back after migrations and seed:
```bash
echo "🩺 8. Executando Smoke Gate de Produção pós-deploy..."
chmod +x scripts/smoke-test-oci.sh
./scripts/smoke-test-oci.sh
```

### 3. Restored strict gating in `deploy-oci.yml`
- `parse_deploy_log` step now extracts: `prev_sha`, `health_live`, `health_ready`, `smoke`, `migrations`
- `Validar gating estrito de Smoke Test (NO SMOKE PASS = NO DEPLOY SUCCESS)` step restored
- Remote script sets `chmod +x` for both `deploy-oci.sh` and `smoke-test-oci.sh`
- Deployment summary includes all 5 health metrics
- Removed degraded inline curl/echo smoke

### 4. Created invariant tests
`tests/unit/ci/deploy-production-contract.test.ts` — 16 tests covering:
- PROD-001: require-ci-green action presence
- PROD-002: SHA-explicit deploy (no origin/main checkout)
- PROD-003: smoke-test-oci.sh existence, retry logic, PASS/FAIL gating
- PROD-004: localhost guard in production
- PROD-006: workflow not debug-only (has workflow_run, resolve-sha, environment: production)
- PROD-008: .env.production preserved during checkout
- PROD-009: migrations run before smoke test
- PROD-010: release SHA metadata in deploy

---

## PR Audit Results

### PR #544 — `feat(db): enforce row level security on 100% of database tables`
**Status:** QUARANTINED — Needs review and rebase

Key findings:
- 104 of 114 tables have RLS enabled
- 83 tables have proper tenant-scoped policies
- **18 tables still have `WITH CHECK (true)` — allows cross-tenant writes**
- 5 tables have `USING (true)` (legitimate global catalogs: AiEngineSetting, FeatureFlag, MarketIntelligence*)
- Integration tests are high-quality (real PostgreSQL, cross-tenant access verification)
- Unit tests are string/mock-based only
- **Recommendation:** Do not merge until `WITH CHECK (true)` is addressed on all 18 tables

### PR #546 — `fix(security): harden production secrets, replay guard e validação de timestamp`
**Status:** CONTAMINATED — Requires clean reconstruction

Key findings:
- 16 commits, only ~5 are in-scope security
- Contains: version bump to 1.0.0 (GA scope), Caddy debug logs, brand sanitization, domain placeholder docs
- Historical obfuscation attempt (`['segredo','compartilhado',...].join('_')`) was caught and removed
- webhookReplayGuard itself is legitimate and valuable
- **Recommendation:** Close PR #546, create clean `fix/security-harden-clean` with only IN_SCOPE_SECURITY files

### PR #547 — `fix(ga): GA Release Certification fixes and 1.0.0 release`
**Status:** QUARANTINED / REJECT — Contains catastrophic CI/CD regression

Key findings:
- **`deploy-oci.yml` replaced entirely with 35-line debug SSH script**
- Removes: `workflow_run`, `require-ci-green`, SHA gate, `environment: production`, smoke tests
- Replaces deploy with: `docker logs --tail 20 birthhub_caddy`
- Contains accidental `chore: hijack deploy for debug` commit
- Mixes: version bump, debug code, brand sanitization, legitimate security fixes
- **Recommendation:** Close PR #547 immediately. Never merge. Cherry-pick only legitimate fixes to new clean branches.

---

## Production Invariants (Formalized)

| ID | Invariant | Enforcement |
|---|---|---|
| PROD-001 | NO CI PASS = NO DEPLOY | `require-ci-green` action + invariant test |
| PROD-002 | DEPLOY SHA = CI APPROVED SHA | `resolve-sha` job + invariant test |
| PROD-003 | NO SMOKE PASS = NO DEPLOY SUCCESS | `smoke-test-oci.sh` + gating step + invariant test |
| PROD-004 | PRODUCTION ENV MUST NOT USE LOCALHOST PUBLIC URL | deploy-oci.sh guard + invariant test |
| PROD-005 | SECRETS MUST NEVER BE LOGGED | deploy-oci.sh redaction |
| PROD-006 | PRODUCTION WORKFLOW CANNOT BECOME DEBUG-ONLY | invariant test |
| PROD-007 | MAIN PROTECTION MUST REMAIN ACTIVE | GitHub branch protection |
| PROD-008 | ENV.PRODUCTION MUST SURVIVE DEPLOY CHECKOUT | ENV_BACKUP logic + invariant test |
| PROD-009 | MIGRATIONS MUST RUN BEFORE SMOKE | deploy-oci.sh ordering + invariant test |
| PROD-010 | HEALTH VERSION MUST IDENTIFY RELEASE SHA | COMMIT_SHA/BUILD_VERSION + invariant test |

---

## Decisions

1. **PR #547:** CLOSE WITHOUT MERGE. Reconstruct only legitimate content in separate clean PRs.
2. **PR #546:** CLOSE WITHOUT MERGE. Create `fix/security-harden-clean` with only security-scoped files.
3. **PR #544:** QUARANTINE until `WITH CHECK (true)` regression is addressed on 18 tables.
4. **Version bump:** NOT in this PR. Separate `chore(release): prepare Birth Hub 360 v1.0.0` after GA certification.
5. **Queues/Observability:** NOT in this PR. Operational validation after rescue stabilization.
