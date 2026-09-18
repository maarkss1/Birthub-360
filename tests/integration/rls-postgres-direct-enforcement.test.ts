import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

/**
 * Camada B isolada — PostgreSQL RLS como barreira independente e definitiva.
 *
 * Todo outro teste de RLS deste repositório (rls-tenant-isolation.test.ts,
 * rls-bypass-allowlist.test.ts, etc.) passa pelo client `prisma` (src/lib/prisma.ts), cuja extensão
 * `$allOperations` já sobrescreve/valida `organizationId` para os models de
 * `TENANT_INJECTED_MODELS` (Camada A) antes de qualquer SQL chegar ao Postgres. Isso prova a Camada
 * A, mas não prova a Camada B de forma independente: se um bug futuro remover/enfraquecer a
 * extensão Prisma, ou se algum caminho de código novo escrever direto via SQL cru sem passar por
 * ela, nada aqui garantiria que o banco ainda bloqueia sozinho.
 *
 * Este arquivo não importa `prisma`/`src/lib/prisma.ts` em nenhum momento — usa uma conexão `pg`
 * crua, autenticada como o papel de aplicação real (`prospector_app`, NOSUPERUSER, sem BYPASSRLS —
 * ver scripts/db/create-app-role.sql) e faz SQL direto, com `app.current_tenant_id` setado via
 * `set_config(..., TRUE)` (escopo de transação, mesmo padrão de `src/lib/prisma.ts`) e
 * `app.bypass_rls` explicitamente OFF. Modelo escolhido de propósito: `ForecastSnapshot` NÃO está
 * em `TENANT_INJECTED_MODELS` (src/lib/tenant-scoping-registry.ts) — nenhuma extensão Prisma toca
 * em `organizationId` para esse model, então qualquer bloqueio abaixo só pode vir do Postgres.
 */

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const ORG_A = 'test-rls-layerb-org-a';
const ORG_B = 'test-rls-layerb-org-b';

const INSERT_FORECAST_SNAPSHOT_SQL = `
  INSERT INTO "ForecastSnapshot"
    (id, "organizationId", period, "rulesVersion", "commitAmount", "bestCaseAmount", "forecastAmount")
  VALUES ($1, $2, $3, $4, $5, $6, $7)
  RETURNING id, "organizationId"
`;

// BEGIN + set_config(..., TRUE) (SET LOCAL) garante que o tenant setado aqui não vaza para outra
// query que reuse a mesma conexão do pool depois do COMMIT/ROLLBACK — mesma técnica de
// withRlsContext em src/lib/prisma.ts. `app.bypass_rls` é resetado explicitamente para 'off' em vez
// de simplesmente nunca setado, para não depender de a conexão do pool nunca ter sido usada antes
// com bypass ativo.
async function withTenantContext<T>(tenantId: string, fn: (client: import('pg').PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`SELECT set_config('app.bypass_rls', 'off', TRUE)`);
    await client.query(`SELECT set_config('app.current_tenant_id', $1, TRUE)`, [tenantId]);
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

describe('Camada B isolada — PostgreSQL RLS via conexão pg crua (prospector_app, sem Prisma)', () => {
  beforeAll(async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      // Organization está no allowlist de bypass (BYPASS_RLS_ALLOWED_MODELS) — só usado aqui para
      // criar o fixture, nunca para a asserção real do teste.
      await client.query(`SELECT set_config('app.bypass_rls', 'on', TRUE)`);
      for (const [id, name] of [
        [ORG_A, 'RLS Layer B Org A'],
        [ORG_B, 'RLS Layer B Org B'],
      ] as const) {
        await client.query(
          `INSERT INTO "Organization" (id, name, "updatedAt") VALUES ($1, $2, now()) ON CONFLICT (id) DO NOTHING`,
          [id, name],
        );
      }
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      throw error;
    } finally {
      client.release();
    }
  });

  afterAll(async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`SELECT set_config('app.bypass_rls', 'on', TRUE)`);
      await client.query(`DELETE FROM "ForecastSnapshot" WHERE "organizationId" IN ($1, $2)`, [
        ORG_A,
        ORG_B,
      ]);
      await client.query(`DELETE FROM "Organization" WHERE id IN ($1, $2)`, [ORG_A, ORG_B]);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      throw error;
    } finally {
      client.release();
      await pool.end();
    }
  });

  it('INSERT SQL direto cross-tenant (tenant=ORG_B, organizationId=ORG_A) falha com SQLSTATE 42501', async () => {
    let caughtError: (Error & { code?: string }) | undefined;
    try {
      await withTenantContext(ORG_B, (client) =>
        client.query(INSERT_FORECAST_SNAPSHOT_SQL, [
          'fs-layerb-hack-1',
          ORG_A, // tentativa de gravar em nome do Tenant A a partir do contexto do Tenant B
          '2026-09',
          '1.0',
          10000,
          20000,
          15000,
        ]),
      );
    } catch (error) {
      caughtError = error as Error & { code?: string };
    }

    expect(caughtError).toBeDefined();
    expect(caughtError?.code).toBe('42501');
    expect(caughtError?.message).toMatch(/row-level security/i);

    // Nenhum dado deve ter sido persistido para ORG_A (a transação inteira foi revertida pelo
    // ROLLBACK de withTenantContext ao capturar o erro).
    const bypassCheck = await pool.connect();
    try {
      await bypassCheck.query('BEGIN');
      await bypassCheck.query(`SELECT set_config('app.bypass_rls', 'on', TRUE)`);
      const { rows } = await bypassCheck.query(
        `SELECT id FROM "ForecastSnapshot" WHERE id = $1`,
        ['fs-layerb-hack-1'],
      );
      expect(rows).toHaveLength(0);
      await bypassCheck.query('COMMIT');
    } finally {
      bypassCheck.release();
    }
  });

  it('INSERT SQL direto same-tenant (tenant=ORG_B, organizationId=ORG_B) funciona normalmente', async () => {
    const result = await withTenantContext(ORG_B, (client) =>
      client.query(INSERT_FORECAST_SNAPSHOT_SQL, [
        'fs-layerb-legit-1',
        ORG_B,
        '2026-09',
        '1.0',
        10000,
        20000,
        15000,
      ]),
    );

    expect(result.rows[0].organizationId).toBe(ORG_B);

    // Confirma que a linha ficou realmente visível para o próprio tenant (não é um falso positivo
    // de um RETURNING que nunca commitou).
    const visible = await withTenantContext(ORG_B, (client) =>
      client.query(`SELECT id FROM "ForecastSnapshot" WHERE id = $1`, ['fs-layerb-legit-1']),
    );
    expect(visible.rows).toHaveLength(1);
  });
});
