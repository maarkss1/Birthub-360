# SEC — Security Audit

## Agent
SEC (Application Security specialist), part of the multi-domain repository debt audit of Birth Hub 360º.

## Mission
Audit application security end-to-end: authentication, authorization/RBAC, session handling, input
validation, injection risks (SQL/XSS/command), secrets handling, CORS, rate limiting, dependency
vulnerabilities, audit logging, encryption at rest/in transit, and LGPD/PII handling. Treat any
credible cross-tenant data exposure or auth bypass as CRITICAL.

## Scope
Whole monorepo, not limited to a `security/`-named folder: `src/lib/auth.ts` (Better Auth config),
`src/config/access-policy.ts` and `env.ts`, `src/shared/middlewares/*` (authn/authz), `src/lib/prisma.ts`
and `src/lib/tenant-prisma.ts` (RLS/tenant isolation), `src/bootstrap/security.ts` and
`rateLimiters.ts`, `src/lib/crypto/*` (encryption at rest), `src/shared/security/urlGuard.ts` (SSRF),
webhook handlers under `src/features/integrations/*`, the three newest connectors (Slack/Stripe/Omie,
added in the most recent commit), `src/features/lgpd/*`, dependency audit (`npm audit`), and a
targeted search for hardcoded secrets across the repo (source, configs, `.env*`, YAML/Helm/Compose).

## Areas inspected
- Authentication (Better Auth: email/password, OAuth, session cookies, account lockout)
- Login/signup domain allowlisting (`access-policy.ts`) and its documented removal
- Authorization/RBAC (`requireRole`, `ROLE_HIERARCHY`, module-specific role gates)
- Multi-tenant isolation (application-level Prisma extension + PostgreSQL RLS policies)
- Encryption at rest for integration credentials and Contact PII (AES-256-GCM)
- Rate limiting (per-IP, per-tenant, per-route) and account lockout
- CORS and HTTP security headers (Helmet/CSP)
- SSRF guard for tenant-supplied URLs (Slack webhook, Bitrix, 3CX)
- Webhook signature/replay handling (Bitrix, Birth Voice, Google OAuth state)
- New integrations added in the latest commit (Slack, Stripe, Omie) — credential storage, route
  authorization, outbound request safety
- LGPD data-subject rights routes (erase/export) and audit logging
- Dependency vulnerabilities (`npm audit`)
- Hardcoded secret scan across the repo

## Files inspected (representative, not exhaustive)
- `src/config/access-policy.ts`, `src/config/env.ts`
- `src/lib/auth.ts`, `src/lib/auth/authorization.ts`, `src/lib/auth-client.ts`
- `src/shared/middlewares/authenticateToken.ts`, `authorization.ts`, `requireRole.ts`
- `src/lib/prisma.ts`, `src/lib/tenant-prisma.ts`
- `prisma/migrations/20260722020322_enable_rls/migration.sql` (+ related RLS migrations)
- `src/bootstrap/security.ts`, `src/bootstrap/rateLimiters.ts`
- `src/lib/crypto/piiFields.ts`, `secretFields.ts`, `piiIndex.ts`
- `src/shared/security/urlGuard.ts`
- `src/features/integrations/slack/{slack.routes.ts,slack.service.ts}`
- `src/features/integrations/stripe/{stripe.routes.ts,stripe.service.ts}`
- `src/features/integrations/omie/omie.routes.ts`
- `src/features/integrations/bitrix/bitrix.webhook.ts`
- `src/features/integrations/google/google.service.ts`
- `src/features/lgpd/lgpd.routes.ts`
- `.env.example`, `docs/deploy/oracle-cloud.md`
- `node_modules/better-auth/dist/context/secret-utils.mjs`, `create-context.mjs`, `cookies/index.mjs`
  (to verify default-secret and cookie-signing behavior of the actual auth library version pinned)
- `.dependency-cruiser-known-violations.json` (checked for pre-existing tracked SEC debt — none found)

Approx. 45 files read in full or in targeted excerpts, plus ~15 repo-wide greps.

## Executive summary
This is an unusually mature security posture for a repository of this size — the codebase shows
clear evidence of multiple prior, real security-hardening passes (account lockout, RLS at both the
Postgres and Prisma-extension layers, AES-256-GCM encryption at rest for every integration credential
including the three connectors added in the very latest commit, timing-safe webhook signature checks,
a real SSRF guard with DNS-rebinding protection, and a unified single-source RBAC after a previously
duplicated/divergent system was removed). `npm audit` reports zero known vulnerabilities across 2,428
resolved dependencies, and no hardcoded live secrets were found in source or config.

The findings below are the residual, concrete gaps found on top of that baseline. The most
significant is a genuine internal inconsistency: `CREDENTIALS_ENCRYPTION_KEY` has an explicit,
tested, fail-closed guard that aborts credential encryption in production if the key is missing —
and a code comment in `env.ts` asserts `BETTER_AUTH_SECRET` has "the same conditional obligation,
enforced at runtime" — but no such runtime enforcement actually exists for `BETTER_AUTH_SECRET`
anywhere in the codebase. If that variable is ever absent in a deployed environment, Better Auth
silently falls back to a secret hardcoded in its own public source (`better-auth-secret-12345678901234567890`),
used to HMAC-sign the session cookie and other auth-related cookies. The second concrete finding is a
CORS policy that unconditionally trusts *any* `chrome-extension://` origin with credentials enabled,
which directly contradicts the project's own deployment documentation (`docs/deploy/oracle-cloud.md`),
which instructs operators to allowlist a *specific* extension ID through `ALLOWED_ORIGINS` — the code
never actually consults that allowlist for this scheme.

Access-policy domain allowlisting (the item most likely to be flagged by a shallow audit) was
deliberately and explicitly removed for a legitimate product reason (rebranding to a single, open ICP)
and is not tenant isolation — real tenant isolation is enforced independently by RLS — so it is
**not** re-flagged here as a defect; the file's own comments already document this correctly.

## Critical
None found with concrete, currently-reachable evidence. (See High for a config-contingent auth-bypass
gap that would become Critical only under a specific deployment misconfiguration that could not be
verified from the repository alone.)

## High
- **SEC-001** — `BETTER_AUTH_SECRET` has no production fail-closed enforcement, unlike its documented
  sibling `CREDENTIALS_ENCRYPTION_KEY`; a missing value silently activates a publicly-known default
  secret used to sign session cookies.

## Medium
- **SEC-002** — CORS unconditionally trusts any `chrome-extension://` origin with `credentials: true`,
  bypassing the `ALLOWED_ORIGINS` allowlist the deployment docs say governs it.

## Low
- **SEC-003** — SSRF IP-range guard (`urlGuard.ts`) does not block the CGNAT range (`100.64.0.0/10`)
  or a few other reserved IPv4 ranges (`192.0.0.0/24`, `198.18.0.0/15`), though it correctly blocks
  RFC1918, loopback, link-local, and multicast/reserved space.
- **SEC-004** — No password complexity policy beyond Better Auth's default 8-character minimum
  (`minPasswordLength` is never overridden in `src/lib/auth.ts`); acceptable by modern NIST guidance
  (length over complexity) but worth an explicit, documented decision rather than an implicit default.

## Info
- **SEC-005** — `isAuthorizedLoginEmail` / `access-policy.ts` intentionally validates only e-mail
  *format*, not domain — correctly documented as a deliberate product decision (open ICP), and
  correctly not the mechanism relied on for tenant isolation. Noted here only to confirm it was
  investigated per the audit brief, not because it is a defect.
- **SEC-006** — `npm audit --production` returns zero vulnerabilities (911 prod dependencies). No
  action needed at time of audit; this is a point-in-time result, not a standing guarantee.

## Technical debt
- TD-SEC/TD-CONFIG (SEC-001): asymmetric secret-handling guarantees between `CREDENTIALS_ENCRYPTION_KEY`
  and `BETTER_AUTH_SECRET` despite a code comment asserting parity — the kind of drift that is easy to
  reintroduce again for the *next* new secret added to `env.ts` if not corrected at the pattern level
  (e.g., a small shared `requireInProduction(name, value)` helper called from both `secretFields.ts`
  and `lib/auth.ts`/a boot-time check).

## Implementation debt
- SEC-002: the intended design (per `docs/deploy/oracle-cloud.md`) is per-extension-ID allowlisting via
  `ALLOWED_ORIGINS`; the shipped implementation is a blanket scheme-based allow that never reads that
  allowlist for `chrome-extension://` origins. The gap is between documented intent and implementation,
  not a missing feature.

## Feature debt
None identified specific to this domain beyond what's listed above.

## Bugs
- SEC-001 and SEC-002 are both reachable via configuration/deployment paths rather than pure application
  logic bugs, but both are code-level defects (missing guard; wrong conditional) independent of any
  specific deployment's current state.

## Architecture
- Tenant isolation is defense-in-depth by design and was verified to be real, not cosmetic: PostgreSQL
  `FORCE ROW LEVEL SECURITY` policies (`prisma/migrations/20260722020322_enable_rls/...` and later
  migrations) are combined with an application-level Prisma Client extension
  (`src/lib/tenant-prisma.ts` for the legacy per-request client, and more importantly the *default*
  exported `prisma` client in `src/lib/prisma.ts`, which reads `organizationId`/`bypassRls` from
  `AsyncLocalStorage` on every single query — including raw SQL via `withRlsContext`). This means even
  a service that imports `prisma` directly (115 files do, rather than the per-request `req.db`) still
  gets tenant scoping automatically, as long as it runs inside `requestContext.run({ tenantId, ... })`.
  The `BYPASS_RLS_ALLOWED_MODELS` allowlist in `prisma.ts` is narrow, individually justified per model
  in inline comments, and was itself the subject of a prior audit that reverted `Company` from the
  list (referenced in-code, `rls-bypass-allowlist.test.ts`) — this is a genuinely well-governed control,
  not a rubber-stamped one.
- RBAC was previously duplicated/divergent (a dead `SUPER_ADMIN/TENANT_OWNER/…/GUEST` permission system
  never wired to any route, coexisting with the real `ADMIN/GESTOR/CLOSER/SDR/VISUALIZADOR` hierarchy)
  and has since been consolidated into a single canonical source (`src/lib/auth/authorization.ts`) — the
  dead system's file (`authorization.ts` middleware) now only documents its own removal. Verified this
  is actually the state of the code, not just a claim in a comment.

## Security
Full detail in Critical/High/Medium/Low above. Summary of what was verified as sound (so it is not
re-investigated or re-flagged by a future pass without cause):
- Session cookies: `httpOnly: true`, `sameSite: 'lax'`, `secure` tied to HTTPS deployment detection —
  correct defaults for a cookie-based session in a first-party SPA.
- Account lockout: 5 failed attempts / 15-minute lockout, keyed by account (not just IP), correctly
  guards against the "already locked" re-increment bug, and correctly avoids leaking account existence
  in its error responses.
- Password reset revokes all other sessions (`revokeSessionsOnPasswordReset: true`) — correct response
  to the "attacker already has a session" threat model.
- Self-service role escalation is blocked: `user.additionalFields.role` has `input: false`, so a user
  cannot set their own `role` via `authClient.updateUser`.
- Rate limiting is tiered appropriately: generic `/api` (600/15min), AI routes keyed by
  **organizationId** rather than IP (correctly avoids one org exhausting a shared-NAT IP's quota for
  another org), and a stricter auth-specific limiter that correctly `skip`s `GET` (session checks/OAuth
  redirects) so it only throttles actual credential-guessing attempts.
- Encryption at rest: every integration credential field found in the schema (Google OAuth tokens,
  Bitrix webhook secret, 3CX API key/secret, Birth Voices API key/webhook secret, and — confirmed for
  this audit specifically because they are brand new — **Slack `webhookUrl`/`botToken`, Stripe
  `secretKey`, and Omie `appKey`/`appSecret`**) is in `ENCRYPTED_MODEL_FIELDS` and transparently
  encrypted/decrypted by the Prisma extension. Contact PII (email/phone/whatsapp) is also encrypted
  with a blind-index side-channel for exact-match search, avoiding the naive "can't search encrypted
  data" trap.
- SSRF: tenant-supplied URLs (Slack Incoming Webhook, Bitrix webhook, 3CX PBX URL) go through
  `assertSafeExternalUrl`/`safeFetch`, which resolves DNS once, rejects private/reserved/loopback/
  link-local addresses, and then **pins the TCP connection to the already-validated addresses** via a
  custom `undici.Agent` lookup override — this specifically closes the DNS-rebinding TOCTOU gap that a
  naive "validate then fetch" implementation would leave open. Fixed-destination provider calls
  (Stripe `api.stripe.com`, Slack Bot Token `slack.com`) correctly use a simpler host-allowlist fetch
  instead, since there's no SSRF risk on a hardcoded destination.
- Webhook security: Bitrix inbound webhook uses `timingSafeEqual` for shared-secret comparison and a
  replay guard (`webhookReplayGuard.ts`); Google OAuth `state` is HMAC-signed and verified.
- LGPD data-subject rights (`DELETE /titular/:contactId`, `GET /titular/:contactId/export`) are
  restricted to `ADMIN`/`GESTOR`, take `organizationId` only from the authenticated session (never a
  client-controlled header), and explicitly write to `AuditLog` beyond the generic Prisma-extension
  audit trail (since exports are reads, which the generic trail doesn't cover).
- No hardcoded live credentials (`sk_live_`, `AKIA`, Slack tokens, PEM private keys) found anywhere in
  tracked source/config via targeted regex search.

## Tests
- Encryption-at-rest fail-closed behavior for `CREDENTIALS_ENCRYPTION_KEY` has a dedicated unit test
  (`src/lib/crypto/__tests__/secretFields.unit.test.ts`) that specifically asserts production refuses
  to encrypt with no key configured rather than falling back to a default — this is exactly the pattern
  that is **missing** for `BETTER_AUTH_SECRET` (SEC-001): there is no equivalent test (or runtime code)
  proving the same guarantee for the auth secret, which is arguably the more sensitive of the two.
- A dedicated integration test (`tests/integration/rls-bypass-allowlist.test.ts`, referenced from
  `prisma.ts` comments) locks the `BYPASS_RLS_ALLOWED_MODELS` allowlist down at the database level —
  good practice worth calling out as a pattern other tenant-sensitive controls should copy.

## Integration
- The three connectors added in the audited repo's most recent commit (Slack, Stripe, Omie) were
  reviewed end-to-end (route → service → Prisma) as the highest-risk-of-fresh-debt surface, and were
  found to already follow the established security patterns (role-gated writes, tenant-scoped
  `findFirst`/`deleteMany`, encrypted credential storage, SSRF guard on the one tenant-supplied URL
  field, honest error propagation instead of fabricated success). This is a positive integration
  finding, not a gap — called out because it shows the CLAUDE.md/AGENTS.md security review discipline
  is actually being applied to new work, not just documented in comments about old work.

## Product
Not directly in scope for SEC; no product-shaped findings beyond the access-policy note in Info.

## Mock/Fake/Placeholder
None found in the security-critical paths reviewed (auth, RLS, encryption, rate limiting, SSRF guard,
webhook verification) — all are backed by real cryptographic primitives, real database policies, and
real external calls with honest failure propagation (explicitly called out in code comments as a
deliberate anti-pattern avoidance, e.g. "nunca reporta sucesso sem uma resposta HTTP real ok").

## Dead/Orphan code
- The old, divergent RBAC permission system (`SUPER_ADMIN/TENANT_OWNER/.../GUEST`,
  `requirePermission`/`requireAnyPermission` in `src/shared/middlewares/authorization.ts`) has already
  been removed from live code; the file now exists only as a comment documenting its own prior removal
  and pointing to the canonical replacement. No further action needed — flagged only so a future pass
  doesn't mistake the comment for an undone task.

## Quick wins
- Add the same production fail-closed check that `secretFields.ts` has for `CREDENTIALS_ENCRYPTION_KEY`
  to `BETTER_AUTH_SECRET` (a `~10`-line boot-time check in `env.ts` or `lib/auth.ts`) — closes SEC-001
  with minimal risk and no behavior change for any environment that already sets the variable correctly
  (which presumably includes current production, given `.env.example`'s explicit placeholder).
- Change the CORS `chrome-extension://` branch in `src/bootstrap/security.ts` to check the origin
  against `ALLOWED_ORIGINS` (as the deploy docs already instruct operators to populate) instead of
  unconditionally trusting the scheme — closes SEC-002 by making the code match the documented,
  already-expected operator workflow, no new mechanism required.
- Add `100.64.0.0/10` (and optionally `192.0.0.0/24`, `198.18.0.0/15`) to `isPrivateOrReservedIp` in
  `urlGuard.ts` — a handful of lines, no behavior change for any legitimate public destination.

## Structural problems
None beyond SEC-001's pattern-level observation (secret-handling guarantees should be enforced by a
single shared helper rather than re-implemented per secret, to prevent the next new secret from
repeating this same asymmetry).

## Needs verification
- Whether `BETTER_AUTH_SECRET` is actually set in the current production deployment(s) (Render/OCI/K8s)
  could not be verified from the repository alone (it is an environment secret, correctly not committed).
  SEC-001 is reported as a **code-level** confirmed gap (no enforcement exists) — its real-world impact
  depends on operational configuration this audit cannot see. Recommend the deployment owner confirm the
  variable is set everywhere as a matter of urgency given the missing guard.
- Whether Better Auth's optional `session.cookieCache` feature is enabled anywhere outside
  `src/lib/auth.ts` (it is not configured there, so it is presumed off) — if it were ever turned on,
  the impact of a missing `BETTER_AUTH_SECRET` would be materially worse (the cache cookie carries
  self-contained session data validated only by the HMAC signature, rather than requiring a matching
  server-side session row). NEEDS_VERIFICATION only in the sense of "stays true if this config is never
  changed" — flagging so a future change to enable cookie caching re-triggers a look at SEC-001's
  severity.

## Complete findings list

### SEC-001 — `BETTER_AUTH_SECRET` lacks the fail-closed production guard its own code comments claim it has
- **Category:** TD-SEC, TD-CONFIG, TD-AUTH
- **Severity:** HIGH (would be CRITICAL if confirmed unset in any live deployment)
- **Priority:** P0
- **Confidence:** HIGH (code-level gap is directly confirmed by reading the library source); MEDIUM on
  real-world exploitability (depends on external deployment config not visible from the repo)
- **Status:** CONFIRMED
- **Effort:** XS
- **Evidence:**
  - `src/config/env.ts:17` — `BETTER_AUTH_SECRET: z.string().optional()`, no `.refine()`/production check.
  - `src/config/env.ts:20-24` — comment: "Opcional aqui (mesmo padrão de BETTER_AUTH_SECRET) — a
    obrigatoriedade em produção é reforçada em runtime por secretFields.ts" (describing
    `CREDENTIALS_ENCRYPTION_KEY`, and asserting `BETTER_AUTH_SECRET` follows "the same conditional
    obligation, enforced at runtime").
  - `src/lib/auth.ts:52` — `secret: process.env.BETTER_AUTH_SECRET || undefined` — no throw, no warning,
    no fail-closed branch if unset.
  - Repo-wide search confirms `BETTER_AUTH_SECRET` is only *read defensively* in one unrelated place
    (`src/features/integrations/google/google.service.ts:55-75`, for signing its own OAuth `state`
    HMAC, which does correctly throw if missing) — there is no equivalent boot-time or auth-config-time
    check for Better Auth's own use of the variable.
  - Contrast: `src/lib/crypto/secretFields.ts:19-37` for `CREDENTIALS_ENCRYPTION_KEY` **does** throw
    `'CREDENTIALS_ENCRYPTION_KEY ausente em produção — obrigatória...'` when `NODE_ENV==='production'`
    and the key is missing, and this exact behavior is unit-tested
    (`src/lib/crypto/__tests__/secretFields.unit.test.ts:66-71`, `'em produção, sem
    CREDENTIALS_ENCRYPTION_KEY, recusa cifrar em vez de usar um segredo padrão'`).
  - `node_modules/better-auth/dist/context/secret-utils.mjs:71` — the pinned Better Auth version's own
    fallback: `secret = legacySecret || "better-auth-secret-12345678901234567890"` when no
    `secret`/`secrets`/`BETTER_AUTH_SECRET`/`BETTER_AUTH_SECRETS`/`AUTH_SECRET` is resolvable.
  - `node_modules/better-auth/dist/cookies/index.mjs:172` — `ctx.setSignedCookie(sessionToken.name,
    session.session.token, ctx.context.secret, ...)`: this exact secret HMAC-signs the primary session
    cookie (and, per lines 100-166, would also fully encode/sign session data if the optional
    `cookieCache` feature were ever turned on — see "Needs verification").
- **Failure scenario:** An operator deploys to production (Render/OCI/K8s — any of the environments
  documented in `docs/deploy/`) without setting `BETTER_AUTH_SECRET` (a plausible slip: the variable is
  `optional()` in the Zod schema, so the app boots normally and shows no error, unlike a missing
  `DATABASE_URL` which is `min(1)`-enforced and would abort the boot). Better Auth silently signs every
  session cookie with the publicly-known string `"better-auth-secret-12345678901234567890"`, which is
  visible in the open-source `better-auth` package installed by anyone. This weakens the integrity
  guarantee of every session cookie issued in that environment and, depending on which optional Better
  Auth features happen to be active, could enable forged or tampered session/verification cookies.
- **Root cause:** `env.ts` treats `BETTER_AUTH_SECRET` as optional (correct for local dev, where Better
  Auth needs *some* usable default to avoid a bad first-run experience) but never re-asserts the
  requirement specifically for `NODE_ENV==='production'`, unlike the parallel pattern already built and
  tested for `CREDENTIALS_ENCRYPTION_KEY`.
- **User/business impact:** Silent weakening of session integrity in a misconfigured production
  deployment, with no boot-time signal to the operator that anything is wrong.
- **Suggested resolution:** Add a boot-time check (mirroring the `ALLOW_DEV_AUTH_BYPASS` pattern already
  in `env.ts:329-341`, or the `secretFields.ts` pattern) that calls `process.exit(1)` (or, at minimum,
  logs a `logger.error` loudly) when `NODE_ENV==='production' && !process.env.BETTER_AUTH_SECRET`. Add a
  unit test mirroring `secretFields.unit.test.ts`'s coverage of the equivalent `CREDENTIALS_ENCRYPTION_KEY`
  guarantee.

### SEC-002 — CORS unconditionally trusts any `chrome-extension://` origin with credentials, bypassing the documented allowlist
- **Category:** TD-SEC, TD-CONFIG
- **Severity:** MEDIUM
- **Priority:** P1
- **Confidence:** HIGH
- **Status:** CONFIRMED
- **Effort:** XS
- **Evidence:**
  - `src/bootstrap/security.ts:126-146` — the CORS `origin` callback: `if (origin.startsWith('chrome-extension://')) return callback(null, true);` runs **before** and independently of the
    `ALLOWED_ORIGINS.includes(origin)` check that follows it, and `credentials: true` is set globally
    for the whole CORS config.
  - `docs/deploy/oracle-cloud.md:351,358` — the project's own deployment documentation instructs
    operators: `ALLOWED_ORIGINS` should be `https://<DOMAIN>,chrome-extension://<CHROME_EXTENSION_ID>`,
    and explicitly warns that *without* adding the extension's specific ID to that list, its requests
    will fail CORS — i.e., the documented, intended mechanism is a per-extension-ID allowlist entry,
    not a blanket scheme match.
  - `chrome-extension/manifest.json` shows the project's own first-party extension declares
    `optional_host_permissions: ["https://*/*"]` — broad, but that is a separate (browser-extension-side)
    permission model from the server's CORS trust decision being evaluated here.
- **Failure scenario:** Any Chrome extension installed in a user's browser — not just the organization's
  own "Copiloto Comercial IA" extension — that makes a `fetch`/`XHR` request with `credentials:'include'`
  from an extension-hosted page (popup, side panel, or an extension page opened as a tab) to the
  production API will pass this CORS check, regardless of what is or isn't listed in `ALLOWED_ORIGINS`.
  The practical blast radius is reduced by `sameSite:'lax'` on the session cookie (which the current
  Chromium cookie model generally excludes from cross-site subresource requests), but this is
  browser-behavior-dependent defense, not a server-side control, and it is not the control the project's
  own documentation describes as being in place.
- **Root cause:** The `chrome-extension://` branch was added as a shortcut to unblock the first-party
  extension without wiring it through the existing `ALLOWED_ORIGINS` mechanism that every other
  production origin already goes through.
- **User/business impact:** Widens the credentialed-CORS trust boundary beyond the single extension the
  feature was built for, in a way that contradicts the operator-facing documentation for how the control
  is supposed to work — a fresh Design/Security reviewer relying on `oracle-cloud.md` would incorrectly
  conclude arbitrary extensions are blocked.
- **Suggested resolution:** Replace the unconditional branch with the same `ALLOWED_ORIGINS.includes(origin)`
  check already used for every other origin (which already supports comma-separated
  `chrome-extension://<id>` entries per the deploy doc) — i.e., delete the special-cased early return and
  let extension origins flow through the existing allowlist path.

### SEC-003 — SSRF guard's private/reserved IPv4 range list is incomplete (CGNAT and a couple of reserved ranges)
- **Category:** TD-SEC
- **Severity:** LOW
- **Priority:** P3
- **Confidence:** HIGH
- **Status:** CONFIRMED
- **Effort:** XS
- **Evidence:** `src/shared/security/urlGuard.ts:26-37`, `isPrivateOrReservedIp` checks `10.0.0.0/8`,
  `127.0.0.0/8`, `169.254.0.0/16`, `172.16.0.0/12`, `192.168.0.0/16`, `0.0.0.0/8`, and `>=224.0.0.0`
  (multicast+reserved), but does not check the CGNAT range `100.64.0.0/10`, the IETF protocol assignment
  block `192.0.0.0/24`, or the benchmarking block `198.18.0.0/15`.
- **Failure scenario:** In a cloud environment where internal/shared infrastructure is addressed from
  `100.64.0.0/10` (a real, increasingly common pattern for CGNAT and some cloud provider internal
  ranges), a tenant-supplied Slack/Bitrix/3CX URL that resolves into that range would pass the guard and
  the connection-pinned `safeFetch` would reach it — a real, if narrow, SSRF exposure specific to that
  network layout.
- **Root cause:** The range list was built from the classic RFC1918 + loopback + link-local set and does
  not include the newer RFC6598 CGNAT allocation.
- **Suggested resolution:** Add `100.64.0.0/10` (and optionally the two smaller reserved blocks) to
  `isPrivateOrReservedIp`.

### SEC-004 — No explicit password complexity policy beyond the framework default
- **Category:** TD-SEC, TD-CONFIG
- **Severity:** LOW
- **Priority:** P3
- **Confidence:** HIGH
- **Status:** CONFIRMED
- **Effort:** XS
- **Evidence:** `src/lib/auth.ts`'s `emailAndPassword` block never sets `minPasswordLength`/
  `maxPasswordLength`; Better Auth's own default (`node_modules/better-auth/dist/context/create-context.mjs:186`,
  `options.emailAndPassword?.minPasswordLength || 8`) applies implicitly.
- **User/business impact:** Minimal on its own (8 characters plus the existing account-lockout policy is
  a defensible modern baseline per NIST 800-63B), but it is an *implicit* reliance on a third-party
  default rather than an explicit, reviewed decision recorded in this codebase's own configuration.
- **Suggested resolution:** Set `minPasswordLength` explicitly in `src/lib/auth.ts` (even if the chosen
  value stays 8) so the policy is visible and intentional in this repo rather than inherited silently
  from a dependency's default.

## Capability assessment (see structured summary for machine-readable rows)
Authentication, tenant isolation/RLS, encryption at rest, rate limiting, and webhook security are all
FUNCTIONAL-to-COMPLETE with real, tested, and (for RLS specifically) database-enforced controls. The two
substantive gaps found (SEC-001, SEC-002) are both narrow, config-shaped, and cheap to close; neither
reflects a systemic weakness in how this team builds security controls — if anything, both stand out
precisely because they are exceptions to an otherwise consistently-applied pattern (explicit fail-closed
guards; origin allowlisting) elsewhere in the same files.
