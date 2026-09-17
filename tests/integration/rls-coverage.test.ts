import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * RLS Coverage Test (100% Schema Parity)
 * Verifies that ALL Prisma models defined in `prisma/schema.prisma` have explicit
 * static Row Level Security (RLS) directives in PostgreSQL migration files:
 * 1. ENABLE ROW LEVEL SECURITY
 * 2. FORCE ROW LEVEL SECURITY
 * 3. CREATE POLICY (tenant_isolation_policy, app_context_policy, etc.)
 */

describe('Row Level Security (RLS) - Cobertura 100% no Banco de Dados', () => {
  it('garante que TODOS os models do schema.prisma têm RLS ativada, forçada e com policy estática nas migrations', () => {
    const schemaPath = path.join(process.cwd(), 'prisma/schema.prisma');
    const schemaContent = fs.readFileSync(schemaPath, 'utf8');

    // Extrai todos os models e seus respectivos nomes de tabela
    const modelBlocks = schemaContent.split(/^model\s+/m).slice(1);
    const models = modelBlocks.map((block) => {
      const modelName = block.match(/^(\w+)\s+\{/)?.[1] || '';
      const mapMatch = block.match(/@@map\("([^"]+)"\)/);
      const tableName = mapMatch ? mapMatch[1] : modelName;
      return { modelName, tableName };
    });

    expect(models.length).toBeGreaterThan(100); // Sanidade do schema

    // Lê todas as migrations SQL
    const migrationsDir = path.join(process.cwd(), 'prisma/migrations');
    const migrationDirs = fs.readdirSync(migrationsDir).sort();
    const sqlContent = migrationDirs
      .map((dir) => {
        const migPath = path.join(migrationsDir, dir, 'migration.sql');
        return fs.existsSync(migPath) ? fs.readFileSync(migPath, 'utf8') : '';
      })
      .join('\n');

    const missingRls: Array<{ tableName: string; missing: string[] }> = [];

    for (const { tableName } of models) {
      const enableRegex = new RegExp(
        `ALTER TABLE\\s+"?${tableName}"?\\s+ENABLE ROW LEVEL SECURITY`,
        'i',
      );
      const forceRegex = new RegExp(
        `ALTER TABLE\\s+"?${tableName}"?\\s+FORCE ROW LEVEL SECURITY`,
        'i',
      );
      const policyRegex = new RegExp(
        `CREATE POLICY\\s+[^;]+\\s+ON\\s+"?${tableName}"?\\s+`,
        'i',
      );

      const hasEnable = enableRegex.test(sqlContent);
      const hasForce = forceRegex.test(sqlContent);
      const hasPolicy = policyRegex.test(sqlContent);

      const missing: string[] = [];
      if (!hasEnable) missing.push('ENABLE RLS');
      if (!hasForce) missing.push('FORCE RLS');
      if (!hasPolicy) missing.push('CREATE POLICY');

      if (missing.length > 0) {
        missingRls.push({ tableName, missing });
      }
    }

    expect(
      missingRls,
      `Tabelas do schema.prisma sem RLS estático completo nas migrations:\n${JSON.stringify(
        missingRls,
        null,
        2,
      )}`,
    ).toEqual([]);
  });
});
