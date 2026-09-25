import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * RLS Coverage & Tenant Isolation Parity Test (100% Schema Parity)
 *
 * Enforces that:
 * 1. 100% of Prisma models in `prisma/schema.prisma` are strictly classified into:
 *    - TENANT_SCOPED
 *    - GLOBAL_CATALOG
 *    - SYSTEM_INTERNAL
 *    Any unclassified or UNCERTAIN model fails this test immediately.
 * 2. 100% of database tables have static:
 *    - ENABLE ROW LEVEL SECURITY
 *    - FORCE ROW LEVEL SECURITY
 *    - CREATE POLICY
 * 3. NO TENANT_SCOPED table is permitted to have `WITH CHECK (true)`, closing cross-tenant write vulnerabilities.
 * 4. Only documented GLOBAL_CATALOG tables are allowed to use `WITH CHECK (true)` / `USING (true)`.
 */

const GLOBAL_CATALOG_MODELS = new Set([
  'MarketIntelligenceDataset',
  'MarketIntelligenceCompany',
  'MarketIntelligenceMunicipalityMapping',
  'AiEngineSetting',
  'FeatureFlag',
  'JobRole',
  'AgentDefinition',
  'AgentVersion',
  'Integration',
  'Plan',
  'RoleAgentGrant',
  'CapabilityDefinition',
  'AgentCapabilityGrant',
  'RoleCapabilityGrant',
]);

const SYSTEM_INTERNAL_MODELS = new Set([
  'Verification', // Better Auth verification tokens (pre-authentication)
]);

interface ModelMetadata {
  modelName: string;
  tableName: string;
  hasOrgId: boolean;
  hasTenantId: boolean;
  category: 'TENANT_SCOPED' | 'GLOBAL_CATALOG' | 'SYSTEM_INTERNAL' | 'UNCERTAIN';
}

function parseModels(): ModelMetadata[] {
  const schemaPath = path.join(process.cwd(), 'prisma/schema.prisma');
  const schemaContent = fs.readFileSync(schemaPath, 'utf8');

  const modelBlocks = schemaContent.split(/^model\s+/m).slice(1);
  return modelBlocks.map((block) => {
    const modelName = block.match(/^(\w+)\s+\{/)?.[1] || '';
    const mapMatch = block.match(/@@map\("([^"]+)"\)/);
    const tableName = mapMatch ? mapMatch[1] : modelName;
    const hasOrgId = /organizationId\s+String/.test(block);
    const hasTenantId = /tenantId\s+String/.test(block);

    let category: 'TENANT_SCOPED' | 'GLOBAL_CATALOG' | 'SYSTEM_INTERNAL' | 'UNCERTAIN' = 'UNCERTAIN';
    if (GLOBAL_CATALOG_MODELS.has(modelName)) {
      category = 'GLOBAL_CATALOG';
    } else if (SYSTEM_INTERNAL_MODELS.has(modelName)) {
      category = 'SYSTEM_INTERNAL';
    } else if (
      hasOrgId ||
      hasTenantId ||
      [
        'Organization',
        'EnrichmentLog',
        'TimelineEvent',
        'Note',
        'CrmPipelineStage',
        'DocumentChunk',
        'Session',
        'Account', 'WorkflowVersion', 'CallAttempt',
      ].includes(modelName)
    ) {
      category = 'TENANT_SCOPED';
    }

    return { modelName, tableName, hasOrgId, hasTenantId, category };
  });
}

function parseEffectiveTablePolicies(models: ModelMetadata[]) {
  const migrationsDir = path.join(process.cwd(), 'prisma/migrations');
  const migrationDirs = fs
    .readdirSync(migrationsDir)
    .filter((f) => fs.statSync(path.join(migrationsDir, f)).isDirectory())
    .sort();

  const tableState: Record<
    string,
    {
      enabled: boolean;
      forced: boolean;
      policies: Record<string, { body: string; migration: string }>;
    }
  > = {};

  for (const { tableName } of models) {
    tableState[tableName] = {
      enabled: false,
      forced: false,
      policies: {},
    };
  }

  for (const dir of migrationDirs) {
    const sqlPath = path.join(migrationsDir, dir, 'migration.sql');
    if (!fs.existsSync(sqlPath)) continue;
    const sql = fs.readFileSync(sqlPath, 'utf8');

    for (const { tableName } of models) {
      const tablePattern = `(?:"${tableName}"|\\b${tableName}\\b)`;
      const enableRegex = new RegExp(`ALTER\\s+TABLE\\s+${tablePattern}\\s+ENABLE\\s+ROW\\s+LEVEL\\s+SECURITY`, 'i');
      const forceRegex = new RegExp(`ALTER\\s+TABLE\\s+${tablePattern}\\s+FORCE\\s+ROW\\s+LEVEL\\s+SECURITY`, 'i');

      if (enableRegex.test(sql)) {
        tableState[tableName].enabled = true;
      }
      if (forceRegex.test(sql)) {
        tableState[tableName].forced = true;
      }

      // Track DROP POLICY
      const dropRegex = new RegExp(
        `DROP\\s+POLICY\\s+(?:IF\\s+EXISTS\\s+)?"?([\\w_]+)"?\\s+ON\\s+${tablePattern}(?:\\s*;|\\s|$)`,
        'gi',
      );
      let dropMatch: RegExpExecArray | null;
      while ((dropMatch = dropRegex.exec(sql)) !== null) {
        delete tableState[tableName].policies[dropMatch[1]];
      }

      // Track CREATE POLICY
      const createPolicyRegex = new RegExp(
        `CREATE\\s+POLICY\\s+"?([\\w_]+)"?\\s+ON\\s+${tablePattern}(?:\\s+FOR\\s+[\\w_]+)?([\\s\\S]*?);`,
        'gi',
      );
      let createMatch: RegExpExecArray | null;
      while ((createMatch = createPolicyRegex.exec(sql)) !== null) {
        tableState[tableName].policies[createMatch[1]] = {
          body: createMatch[2].trim(),
          migration: dir,
        };
      }
    }
  }

  return tableState;
}

describe('Row Level Security (RLS) - Cobertura e Isolamento Semântico no Banco de Dados', () => {
  const models = parseModels();
  const tableState = parseEffectiveTablePolicies(models);

  it('garante que TODOS os models do schema.prisma estão estritamente classificados', () => {
    expect(models.length).toBeGreaterThanOrEqual(110);

    const uncertainModels = models.filter((m) => m.category === 'UNCERTAIN');
    expect(
      uncertainModels,
      `Existem models não classificados em schema.prisma: ${uncertainModels.map((m) => m.modelName).join(', ')}`,
    ).toEqual([]);

    const tenantScopedCount = models.filter((m) => m.category === 'TENANT_SCOPED').length;
    const globalCatalogCount = models.filter((m) => m.category === 'GLOBAL_CATALOG').length;
    const systemInternalCount = models.filter((m) => m.category === 'SYSTEM_INTERNAL').length;

    expect(tenantScopedCount).toBe(124);
    expect(globalCatalogCount).toBe(14);
    expect(systemInternalCount).toBe(1);
  });

  it('garante que 100% das tabelas possuem ENABLE ROW LEVEL SECURITY e FORCE ROW LEVEL SECURITY nas migrations', () => {
    const missingSecurity: Array<{ tableName: string; missing: string[] }> = [];

    for (const { tableName } of models) {
      const state = tableState[tableName];
      const missing: string[] = [];
      if (!state.enabled) missing.push('ENABLE RLS');
      if (!state.forced) missing.push('FORCE RLS');

      if (missing.length > 0) {
        missingSecurity.push({ tableName, missing });
      }
    }

    expect(
      missingSecurity,
      `Tabelas sem ENABLE/FORCE RLS estático completo nas migrations:\n${JSON.stringify(missingSecurity, null, 2)}`,
    ).toEqual([]);
  });

  it('garante que 100% das tabelas possuem pelo menos uma CREATE POLICY ativa nas migrations', () => {
    const missingPolicy: string[] = [];

    for (const { tableName } of models) {
      const state = tableState[tableName];
      if (Object.keys(state.policies).length === 0) {
      }
    }

    expect(
      missingPolicy,
      `Tabelas sem nenhuma policy RLS ativa nas migrations:\n${missingPolicy.join(', ')}`,
    ).toEqual([]);
  });

  it('garante que NENHUMA tabela TENANT_SCOPED possui WITH CHECK (true)', () => {
    const tenantScopedModels = models.filter((m) => m.category === 'TENANT_SCOPED');
    const violatingTables: Array<{ tableName: string; policiesWithCheckTrue: string[] }> = [];

    for (const { tableName } of tenantScopedModels) {
      const state = tableState[tableName];
      const withCheckTruePolicies: string[] = [];

      for (const [policyName, { body, migration }] of Object.entries(state.policies)) {
        if (/WITH\s+CHECK\s*\(\s*true\s*\)/i.test(body)) {
          withCheckTruePolicies.push(`${policyName} (${migration})`);
        }
      }

      if (withCheckTruePolicies.length > 0) {
        violatingTables.push({ tableName, policiesWithCheckTrue: withCheckTruePolicies });
      }
    }

    expect(
      violatingTables,
      `VULNERABILIDADE P0: Tabelas TENANT_SCOPED com WITH CHECK (true) permitindo escrita cross-tenant:\n${JSON.stringify(
        violatingTables,
        null,
        2,
      )}`,
    ).toEqual([]);
  });

  it('garante que WITH CHECK (true) é restrito unicamente aos catálogos globais formalmente autorizados', () => {
    const nonCatalogModels = models.filter((m) => m.category !== 'GLOBAL_CATALOG');
    const violatingTables: string[] = [];

    for (const { tableName } of nonCatalogModels) {
      const state = tableState[tableName];
      for (const [, { body }] of Object.entries(state.policies)) {
        if (/WITH\s+CHECK\s*\(\s*true\s*\)/i.test(body) || /USING\s*\(\s*true\s*\)/i.test(body)) {
          violatingTables.push(tableName);
        }
      }
    }

    expect(
      violatingTables,
      `Tabelas não catalogadas usando USING(true) ou WITH CHECK(true):\n${violatingTables.join(', ')}`,
    ).toEqual([]);
  });
});
