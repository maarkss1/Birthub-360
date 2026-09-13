# Tracker Issue: Better Auth Critical Vulnerability

## Vulnerability

The `better-auth` package currently used (version `1.6.23`) contains multiple critical vulnerabilities (GHSA-wxw3-q3m9-c3jr, GHSA-pw9m-5jxm-xr6h, etc.).
Upgrading to a secure version currently means moving to a Release Candidate (`1.7.0-rc.x`), which causes conflicts with our peer dependency `@types/react` via `@lynx-js/react`.

## Action Required

- [ ] Monitor the `better-auth` repository for the official stable release of `1.7.0`.
- [ ] Upgrade `better-auth` and `@better-auth/cli` to the stable `1.7.0` version once available.
- [ ] Remove this tracking issue and resolve Risk Register entry RISK-001 once the upgrade is completed.
