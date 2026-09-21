import { prisma } from '../../src/lib/prisma.js';

async function main() {
  const tables = [
    { name: 'Company', col: 'organizationId' },
    { name: 'Contact', col: 'organizationId' },
    { name: 'Lead', col: 'organizationId' },
    { name: 'Activity', col: 'organizationId' },
    { name: 'Prospect', col: 'organizationId' },
    { name: 'AuditLog', col: 'tenantId' },
  ];

  console.log('=== PREFLIGHT CHECK DATA-007 (organizationId/tenantId NULL) ===');
  let hasNulls = false;
  for (const t of tables) {
    const res: any = await prisma.$queryRawUnsafe(
      `SELECT count(*)::int as total, count(*) FILTER (WHERE "${t.col}" IS NULL)::int as null_count FROM "${t.name}"`
    );
    const total = res[0]?.total ?? 0;
    const nullCount = res[0]?.null_count ?? 0;
    console.log(`${t.name}.${t.col} -> Total: ${total} | NULL: ${nullCount}`);
    if (nullCount > 0) {
      hasNulls = true;
    }
  }

  if (hasNulls) {
    console.error('❌ Encontrados registros órfãos com NULL! Abortando.');
    process.exit(1);
  } else {
    console.log('✅ Preflight APROVADO: 0 registros com NULL em todas as 6 tabelas.');
  }
}

main()
  .catch((err) => {
    console.error('Erro durante o preflight:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });

