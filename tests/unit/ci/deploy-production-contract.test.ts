import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Deploy Production Contract Tests — Birth Hub 360º
 *
 * These tests enforce structural invariants of the production deployment pipeline.
 * They exist to prevent regressions like the one where PR #542 accidentally deleted
 * the smoke gate introduced by PR #541.
 *
 * INVARIANTS:
 * PROD-001: NO CI PASS = NO DEPLOY
 * PROD-002: DEPLOY SHA = CI APPROVED SHA
 * PROD-003: NO SMOKE PASS = NO DEPLOY SUCCESS
 * PROD-004: PRODUCTION ENV MUST NOT USE LOCALHOST PUBLIC URL
 * PROD-005: SECRETS MUST NEVER BE LOGGED
 * PROD-006: PRODUCTION WORKFLOW CANNOT BECOME DEBUG-ONLY
 * PROD-007: MAIN PROTECTION MUST REMAIN ACTIVE (enforced by GitHub, not testable here)
 * PROD-008: ENV.PRODUCTION MUST SURVIVE DEPLOY CHECKOUT
 * PROD-009: MIGRATIONS MUST RUN BEFORE SMOKE
 * PROD-010: HEALTH VERSION MUST IDENTIFY RELEASE SHA
 */

const ROOT = resolve(__dirname, '..', '..', '..');

function readProjectFile(relativePath: string): string {
  const fullPath = resolve(ROOT, relativePath);
  if (!existsSync(fullPath)) {
    throw new Error(`Required file not found: ${relativePath}`);
  }
  return readFileSync(fullPath, 'utf-8');
}

describe('Deploy Production Contract — Invariants', () => {
  // PROD-003: smoke-test-oci.sh must exist
  it('PROD-003: scripts/smoke-test-oci.sh exists', () => {
    const filePath = resolve(ROOT, 'scripts', 'smoke-test-oci.sh');
    expect(existsSync(filePath)).toBe(true);
  });

  it('PROD-003: smoke-test-oci.sh validates health/live and health/ready', () => {
    const content = readProjectFile('scripts/smoke-test-oci.sh');
    expect(content).toContain('/health/live');
    expect(content).toContain('/health/ready');
    expect(content).toContain('SMOKE_TEST=');
    expect(content).toContain('HEALTH_LIVE=');
    expect(content).toContain('HEALTH_READY=');
  });

  it('PROD-003: smoke-test-oci.sh has retry logic', () => {
    const content = readProjectFile('scripts/smoke-test-oci.sh');
    expect(content).toContain('MAX_RETRIES');
    expect(content).toContain('RETRY_INTERVAL');
  });

  it('PROD-003: smoke-test-oci.sh exits non-zero on failure', () => {
    const content = readProjectFile('scripts/smoke-test-oci.sh');
    // The script must have an explicit failure exit path
    expect(content).toMatch(/SMOKE_TEST.*FAIL/);
    expect(content).toMatch(/exit[_ ]code=1|exit 1/);
  });

  // PROD-003 continued: deploy-oci.sh must call the smoke test
  it('PROD-003: deploy-oci.sh calls smoke-test-oci.sh', () => {
    const content = readProjectFile('scripts/deploy-oci.sh');
    expect(content).toContain('smoke-test-oci.sh');
  });

  // PROD-001: Workflow uses require-ci-green action
  it('PROD-001: deploy-oci.yml uses require-ci-green action', () => {
    const content = readProjectFile('.github/workflows/deploy-oci.yml');
    expect(content).toContain('require-ci-green');
  });

  // PROD-002: Deploy uses explicit SHA, never origin/main HEAD
  it('PROD-002: deploy-oci.yml resolves explicit SHA for deploy', () => {
    const content = readProjectFile('.github/workflows/deploy-oci.yml');
    expect(content).toContain('TARGET_SHA');
    // Active code (non-comment lines) must not use origin/main as a checkout/reset target
    const activeLines = content.split('\n').filter(l => !l.trimStart().startsWith('#'));
    const activeContent = activeLines.join('\n');
    expect(activeContent).not.toMatch(/git\s+(reset|checkout|pull)\s+[^\n]*origin\/main/);
  });

  // PROD-006: Workflow must not be debug-only
  it('PROD-006: deploy-oci.yml is not a debug-only workflow', () => {
    const content = readProjectFile('.github/workflows/deploy-oci.yml');
    // Must have workflow_run trigger (automatic deploy after CI)
    expect(content).toContain('workflow_run');
    // Must have the resolve-sha job
    expect(content).toContain('resolve-sha');
    // Must have the deploy job with environment: production
    expect(content).toContain('environment: production');
    // Must NOT be just a debug SSH job
    expect(content).not.toMatch(/^\s*name:\s*SSH and Debug$/m);
  });

  // PROD-003: Workflow has strict gating step
  it('PROD-003: deploy-oci.yml has strict smoke gating step that fails the job', () => {
    const content = readProjectFile('.github/workflows/deploy-oci.yml');
    // Must have the explicit gating step
    expect(content).toContain('NO SMOKE PASS = NO DEPLOY SUCCESS');
    // Must reference the smoke output
    expect(content).toMatch(/smoke.*!=.*PASS|SMOKE.*FAIL/i);
    // Must fail the job on smoke failure
    expect(content).toContain('exit 1');
  });

  // PROD-003: Workflow parses HEALTH_LIVE, HEALTH_READY, SMOKE_TEST from log
  it('PROD-003: deploy-oci.yml parses complete health metrics from deploy log', () => {
    const content = readProjectFile('.github/workflows/deploy-oci.yml');
    expect(content).toContain('HEALTH_LIVE');
    expect(content).toContain('HEALTH_READY');
    expect(content).toContain('SMOKE_TEST');
  });

  // PROD-008: env.production preserved during deploy checkout
  it('PROD-008: deploy-oci.yml preserves .env.production during checkout', () => {
    const content = readProjectFile('.github/workflows/deploy-oci.yml');
    expect(content).toContain('ENV_BACKUP');
    expect(content).toContain('.env.production');
  });

  // PROD-009: Migrations run before smoke
  it('PROD-009: deploy-oci.sh runs migrations before smoke test', () => {
    const content = readProjectFile('scripts/deploy-oci.sh');
    const migrationsIndex = content.indexOf('prisma migrate deploy');
    const smokeIndex = content.indexOf('smoke-test-oci.sh');
    expect(migrationsIndex).toBeGreaterThan(-1);
    expect(smokeIndex).toBeGreaterThan(-1);
    expect(migrationsIndex).toBeLessThan(smokeIndex);
  });

  // PROD-010: Release SHA metadata in deploy
  it('PROD-010: deploy-oci.sh includes COMMIT_SHA for release identification', () => {
    const content = readProjectFile('scripts/deploy-oci.sh');
    expect(content).toContain('COMMIT_SHA');
    expect(content).toContain('BUILD_VERSION');
    expect(content).toContain('DEPLOY_TIMESTAMP');
  });

  // PROD-004: Localhost guard
  it('PROD-004: deploy-oci.sh guards against localhost in production', () => {
    const content = readProjectFile('scripts/deploy-oci.sh');
    // Script checks TARGET_DOMAIN != localhost
    expect(content).toContain('localhost');
    expect(content).toMatch(/TARGET_DOMAIN.*!=.*localhost|localhost.*warning|localhost.*PRODUCTION_DOMAIN/i);
  });

  // PROD-006: Workflow has proper concurrency
  it('PROD-006: deploy-oci.yml has production concurrency group', () => {
    const content = readProjectFile('.github/workflows/deploy-oci.yml');
    expect(content).toContain('deploy-oci-production');
    expect(content).toContain('cancel-in-progress: false');
  });

  // Workflow chmod for smoke script in remote section
  it('PROD-003: deploy-oci.yml makes smoke-test-oci.sh executable in remote deploy', () => {
    const content = readProjectFile('.github/workflows/deploy-oci.yml');
    expect(content).toContain('chmod +x scripts/smoke-test-oci.sh');
  });
});
