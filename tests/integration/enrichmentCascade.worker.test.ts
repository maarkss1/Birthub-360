import { afterAll, afterEach, describe, expect, it } from 'vitest';
import { Queue } from 'bullmq';

/**
 * ACH-16-01: prova, contra Postgres e Redis reais, que um job enfileirado na fila de
 * enriquecimento em cascata é de fato processado por `createEnrichmentCascadeWorker()`, que
 * chama `runEnrichmentCascade`. Até esta correção, `createEnrichmentCascadeWorker`
 * (src/lib/queue/enrichmentCascade.worker.ts) existia mas nunca era importado/registrado em
 * `worker.ts` (entrypoint dedicado) nem em `src/bootstrap/workers.ts`
 * (`startEmbeddedWorkers`/modo embutido) — a rota `POST /companies/:id/enrich-cascade` com
 * `async:true` respondia 202 "Enriquecimento em cascata enfileirado", mas nenhum processo
 * consumia essa fila: o job ficava pendente para sempre.
 *
 * Nota sobre ENABLE_QUEUES: `.env.test` (compartilhado por toda a suíte de integração) não
 * define `ENABLE_QUEUES=true` — outro teste real deste diretório
 * (whatsapp-optout-gating.test.ts) depende explicitamente desse estado (`queuesEnabled=false`)
 * ser o ambiente real de teste. Por isso `enrichmentCascadeQueue`, o `Queue` exportado
 * condicionalmente por `enrichmentCascade.worker.ts`, é `null` neste processo — e não faz
 * sentido mudar esse gate compartilhado só por causa deste teste. Em vez disso, este teste
 * constrói um `Queue` do bullmq apontando para o MESMO nome de fila
 * (`ENRICHMENT_CASCADE_QUEUE_NAME`) e a MESMA conexão Redis real (`connection`, de
 * `src/lib/queue/redis.js` — sempre uma conexão ioredis real e válida, independente de
 * `queuesEnabled`; só com `lazyConnect` até o primeiro comando) — ou seja, o mesmo canal Redis
 * que a fila real usaria em produção. O worker sob teste (`createEnrichmentCascadeWorker()`) e
 * o processor (`runEnrichmentCascade`) são o código de produção, sem nenhum mock.
 */

import { prisma } from '../../src/lib/prisma';
import { requestContext } from '../../src/lib/async-context';
import { connection } from '../../src/lib/queue/redis';
import {
  ENRICHMENT_CASCADE_QUEUE_NAME,
  createEnrichmentCascadeWorker,
  type EnrichmentCascadeJobData,
} from '../../src/lib/queue/enrichmentCascade.worker';

const RUN_ID = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const withRlsBypass = <T>(fn: () => Promise<T>): Promise<T> =>
  requestContext.run({ bypassRls: true }, fn);
const asOrg = <T>(organizationId: string, fn: () => Promise<T>): Promise<T> =>
  requestContext.run({ tenantId: organizationId }, fn);

let orgCounter = 0;
const createdOrgIds: string[] = [];
async function createTestOrg(): Promise<string> {
  const id = `test-enrich-cascade-${RUN_ID}-${orgCounter++}`;
  createdOrgIds.push(id);
  await withRlsBypass(() =>
    prisma.organization.create({ data: { id, name: `Test Org (enrich cascade ${id})` } }),
  );
  return id;
}

// Sem domínio/CNPJ/website, e já com telefone + avaliação do Google preenchidos, os três passos
// da cascata (Apollo/Hunter/Google Places) não fazem NENHUMA chamada de rede real: `domain` fica
// vazio (Apollo/Hunter ficam com early-return por falta de domínio) e a condição do passo Google
// Places (`!company.phones?.length || !company.googleRating`) é falsa. O objetivo deste teste é
// provar o caminho real de fila→worker→persistência no Postgres, não o comportamento dos
// providers externos (já cobertos em outros testes unitários/de integração deste domínio).
async function seedCompanyNoExternalCalls(orgId: string) {
  return asOrg(orgId, () =>
    prisma.company.create({
      data: {
        legalName: 'Empresa Teste Cascata',
        tradeName: 'Empresa Teste Cascata',
        organizationId: orgId,
        phones: ['1133334444'],
        googleRating: 4.5,
      },
    }),
  );
}

const queue = new Queue<EnrichmentCascadeJobData>(ENRICHMENT_CASCADE_QUEUE_NAME, { connection });
let worker: ReturnType<typeof createEnrichmentCascadeWorker> | null = null;

afterEach(async () => {
  await worker?.close();
  worker = null;

  if (createdOrgIds.length > 0) {
    for (const org of createdOrgIds) {
      await asOrg(org, async () => {
        await prisma.contact.deleteMany({ where: { organizationId: org } });
        await prisma.company.deleteMany({ where: { organizationId: org } });
      });
    }
    await withRlsBypass(() =>
      prisma.organization.deleteMany({ where: { id: { in: createdOrgIds } } }),
    );
  }
  createdOrgIds.length = 0;
});

afterAll(async () => {
  await queue.close();
});

describe('createEnrichmentCascadeWorker — worker real da fila enrichment-cascade-queue (Postgres + Redis reais)', () => {
  it('processa um job real enfileirado em enrichmentCascadeQueue e conclui (completed) chamando runEnrichmentCascade', async () => {
    const org = await createTestOrg();
    const company = await seedCompanyNoExternalCalls(org);

    worker = createEnrichmentCascadeWorker();

    const completed = new Promise<void>((resolve, reject) => {
      worker!.on('completed', (job) => {
        if (job.data.companyId === company.id) resolve();
      });
      worker!.on('failed', (job, err) => {
        if (job?.data.companyId === company.id) reject(err);
      });
    });

    const job = await queue.add('enrich-cascade-job', {
      companyId: company.id,
      organizationId: org,
    });
    expect(job.id).toBeTruthy();

    await completed;

    // Prova que `runEnrichmentCascade` de fato rodou (não só que o worker "aceitou" o job): os
    // efeitos que só o corpo real da função produz — status honesto da cascata e o log de
    // auditoria — estão persistidos no Postgres.
    const updatedCompany = await asOrg(org, () =>
      prisma.company.findUniqueOrThrow({ where: { id: company.id } }),
    );
    expect(updatedCompany.enrichmentStatus).toBe('Enriquecido');
    expect(updatedCompany.enrichmentSource).toBe('Cascade:Apollo->Hunter->GooglePlaces');
    expect(updatedCompany.enrichedAt).not.toBeNull();

    // Leitura escopada por tenant (`asOrg`), não `withRlsBypass`: a policy de RLS de
    // `EnrichmentLog` (migration 20260825120000_scope_rls_bypass_to_bootstrap_allowlist) removeu
    // de propósito a cláusula `OR app.bypass_rls = 'on'` que a migration original (20260807) tinha
    // — mesmo tratamento dado a `Company` (ver o comentário sobre isso em src/lib/prisma.ts):
    // dado comercial/de auditoria vinculado a um tenant real, não uma tabela de bootstrap, então
    // não faz parte do allowlist de bypass. Ler com `withRlsBypass` aqui não reproduz nenhum erro
    // do worker: a policy hoje exige `app.current_tenant_id` de verdade (não vazio) e nenhuma
    // sessão de bypass o fornece, então a leitura sempre voltava vazia mesmo com o INSERT
    // (que roda sob `requestContext.run({ tenantId: organizationId })`, dentro do WITH CHECK
    // válido) tendo commitado normalmente.
    const logs = await asOrg(org, () =>
      prisma.enrichmentLog.findMany({ where: { companyId: company.id } }),
    );
    expect(logs).toHaveLength(1);
    expect(logs[0].source).toBe('Cascade:Apollo->Hunter->GooglePlaces');
    expect(logs[0].status).toBe('not_found'); // nenhum provider rodou -> nada novo (no_new_data)
  }, 20000);
});
