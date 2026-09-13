import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { MODULE_KEYS } from '../module-catalog';

/**
 * Regressão para DOCBRAND-001: uma migração já renomeou `ModuleAccessGrant.moduleKey` para um
 * valor ('treinamento-birthub360') que o código consumidor (module-catalog.ts/App.tsx) nunca
 * reconheceu, revogando acesso ao módulo de treinamento silenciosamente para quem já tinha grant.
 * Esse teste trava qualquer futura migração que grave um `moduleKey` fora do union atual de
 * `MODULE_KEYS`, para que a mesma classe de bug seja pega no CI antes do merge, não em produção.
 */
describe('migrations não gravam moduleKey fora de MODULE_KEYS (DOCBRAND-001)', () => {
  const migrationsDir = join(__dirname, '../../../prisma/migrations');

  function moduleKeyLiteralsIn(sql: string): string[] {
    const literals: string[] = [];
    const pattern = /"moduleKey"\s*=\s*'([^']+)'/g;
    let match: RegExpExecArray | null = pattern.exec(sql);
    while (match !== null) {
      literals.push(match[1]);
      match = pattern.exec(sql);
    }
    return literals;
  }

  it('todo literal de moduleKey em prisma/migrations/**/migration.sql pertence a MODULE_KEYS', () => {
    const migrationDirs = readdirSync(migrationsDir, { withFileTypes: true }).filter((entry) =>
      entry.isDirectory(),
    );

    const offenders: { migration: string; value: string }[] = [];

    for (const dir of migrationDirs) {
      const sqlPath = join(migrationsDir, dir.name, 'migration.sql');
      let sql: string;
      try {
        sql = readFileSync(sqlPath, 'utf-8');
      } catch {
        continue;
      }

      for (const value of moduleKeyLiteralsIn(sql)) {
        if (!(MODULE_KEYS as string[]).includes(value)) {
          offenders.push({ migration: dir.name, value });
        }
      }
    }

    expect(offenders).toEqual([]);
  });
});
