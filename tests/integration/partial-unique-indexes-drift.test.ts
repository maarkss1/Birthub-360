import { describe, it, expect } from 'vitest';
import { prisma } from '../../src/lib/prisma';

/**
 * DATA-006 (docs/audits/repository-debt-audit/MASTER-DEBT-BACKLOG.md) — três índices únicos
 * parciais existem só na SQL de migration, não na sintaxe de `schema.prisma` (o Prisma 7 não tem
 * como expressar uma condição `WHERE` parcial em `@@unique`/`@@index`). Cada `model` afetado já
 * tem um `@@index` "mapa" (não-único, propositalmente) documentando o nome real do índice, mais um
 * comentário explicando o porquê — ver `CadenceRun`, `UserJobRole` e `AgentVersion` em
 * `prisma/schema.prisma`.
 *
 * Este teste é a rede de segurança que falta: prova, contra o Postgres real, que os 3 índices
 * ainda existem E ainda são parciais (têm cláusula `WHERE`) e ainda são únicos. Se algum dia um
 * `prisma db push` contra um banco novo, ou uma squash de migrations, apagar silenciosamente um
 * deles, este teste falha em vez do bug só aparecer meses depois como um 201 onde devia ser 409
 * (sintoma real já documentado em `.claude/PILOTS.md`, ~linha 1372, `cadence-start.routes.test.ts`).
 *
 * Não recria nem modifica a SQL das migrations — só lê o catálogo do Postgres (`pg_indexes`).
 */

type PgIndexRow = {
  indexname: string;
  tablename: string;
  indexdef: string;
};

async function findIndex(indexName: string): Promise<PgIndexRow | undefined> {
  const rows = await prisma.$queryRaw<PgIndexRow[]>`
    SELECT indexname, tablename, indexdef
    FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = ${indexName}
  `;
  return rows[0];
}

describe('DATA-006: índices únicos parciais sobrevivem no banco real', () => {
  it('CadenceRun_leadId_active_unique existe, é UNIQUE e tem WHERE status = Active', async () => {
    const idx = await findIndex('CadenceRun_leadId_active_unique');
    expect(
      idx,
      'índice ausente do Postgres — ver comentário acima de model CadenceRun',
    ).toBeDefined();
    expect(idx!.tablename).toBe('CadenceRun');
    expect(idx!.indexdef).toMatch(/CREATE UNIQUE INDEX/i);
    expect(idx!.indexdef).toMatch(/WHERE \(?"?status"? = 'Active'::"?CadenceRunStatus"?\)?/i);
  });

  it('UserJobRole_one_active_primary_per_user existe, é UNIQUE e tem WHERE isPrimary/isActive', async () => {
    const idx = await findIndex('UserJobRole_one_active_primary_per_user');
    expect(
      idx,
      'índice ausente do Postgres — ver comentário acima de model UserJobRole',
    ).toBeDefined();
    expect(idx!.tablename).toBe('UserJobRole');
    expect(idx!.indexdef).toMatch(/CREATE UNIQUE INDEX/i);
    expect(idx!.indexdef).toMatch(/"isPrimary" = true/i);
    expect(idx!.indexdef).toMatch(/"isActive" = true/i);
  });

  it('AgentVersion_one_active_per_agent existe, é UNIQUE e tem WHERE status = ACTIVE', async () => {
    const idx = await findIndex('AgentVersion_one_active_per_agent');
    expect(
      idx,
      'índice ausente do Postgres — ver comentário acima de model AgentVersion',
    ).toBeDefined();
    expect(idx!.tablename).toBe('AgentVersion');
    expect(idx!.indexdef).toMatch(/CREATE UNIQUE INDEX/i);
    expect(idx!.indexdef).toMatch(/WHERE \(?"?status"? = 'ACTIVE'::"?AgentVersionStatus"?\)?/i);
  });
});
