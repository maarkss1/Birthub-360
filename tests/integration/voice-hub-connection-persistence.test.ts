import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { prisma, withRlsContext } from '../../src/lib/prisma';
import { requestContext } from '../../src/lib/async-context';
import {
    connectVoiceHub,
    listVoiceHubConnections,
    disconnectVoiceHub,
} from '../../src/features/integrations/birth-voice/voiceHubConnection.service';

/**
 * ACH-01-01: fecha, contra banco real, a mesma revisão que `threecx-persistence.test.ts` já fez
 * para `ThreeCXConnection` — a única cobertura existente de `VoiceHubConnection`
 * (`src/features/integrations/birth-voice/__tests__/voiceHubConnection.service.test.ts`) mocka o
 * Prisma inteiro, então nunca provou persistência, criptografia em repouso ou isolamento de
 * tenant de verdade. Prova aqui: `apiKey` cifrado em repouso (ENCRYPTED_MODEL_FIELDS.
 * VoiceHubConnection em src/lib/crypto/piiFields.ts), RLS por organização, e que
 * `disconnectVoiceHub`/`listVoiceHubConnections` nunca vazam/apagam dado de outro tenant — o
 * mesmo contrato exposto pela rota `GET /api/integrations/birth-voice/connections`
 * (`birthVoice.routes.ts`), que apenas chama `listVoiceHubConnections` sem lógica adicional.
 *
 * Não testa `webhookSecret` diretamente: campo revisitado por ACH-06-01 na mesma auditoria
 * (mantido de verdade, com migration própria, por ser necessário para o segredo de webhook
 * por-organização) — cobertura de cifra/HMAC desse campo específico vive em
 * birthVoice.webhook.test.ts, não aqui.
 *
 * Organizações com id próprio por execução (não o fixture compartilhado `test-org-id`) pelo mesmo
 * motivo documentado em threecx-persistence.test.ts: vários agentes rodam `test:integration` em
 * paralelo contra o mesmo Postgres de teste.
 */

const RUN_ID = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const ORG_A = `test-voicehub-org-a-${RUN_ID}`;
const ORG_B = `test-voicehub-org-b-${RUN_ID}`;

const withRlsBypass = <T>(fn: () => Promise<T>): Promise<T> => requestContext.run({ bypassRls: true }, fn);
const asOrg = <T>(organizationId: string, fn: () => Promise<T>): Promise<T> =>
    requestContext.run({ tenantId: organizationId }, fn);

beforeAll(async () => withRlsBypass(async () => {
    await prisma.organization.createMany({
        data: [
            { id: ORG_A, name: 'Test Org A (Voice Hub)' },
            { id: ORG_B, name: 'Test Org B (Voice Hub)' },
        ],
        skipDuplicates: true,
    });
}));

// VoiceHubConnection não está em BYPASS_RLS_ALLOWED_MODELS (src/lib/prisma.ts) — limpa por tenant,
// mesmo padrão de ThreeCXConnection.
afterEach(async () => {
    await asOrg(ORG_A, () => prisma.voiceHubConnection.deleteMany({ where: { organizationId: ORG_A } }));
    await asOrg(ORG_B, () => prisma.voiceHubConnection.deleteMany({ where: { organizationId: ORG_B } }));
});

afterAll(async () => {
    await asOrg(ORG_A, () => prisma.voiceHubConnection.deleteMany({ where: { organizationId: ORG_A } }));
    await asOrg(ORG_B, () => prisma.voiceHubConnection.deleteMany({ where: { organizationId: ORG_B } }));
    await withRlsBypass(() => prisma.organization.deleteMany({ where: { id: { in: [ORG_A, ORG_B] } } }));
});

describe('Persistência de VoiceHubConnection contra Postgres real', () => {
    it('sobrevive a uma leitura nova — mesma prova de listVoiceHubConnections que a rota GET /api/integrations/birth-voice/connections expõe', async () => {
        const created = await asOrg(ORG_A, () =>
            connectVoiceHub(ORG_A, { baseUrl: 'https://example.com' }),
        );

        // Nova leitura, sem nenhum estado compartilhado com a chamada de escrita — só o Postgres.
        // Este é exatamente o que birthVoice.routes.ts GET /connections chama.
        const reread = await asOrg(ORG_A, () => listVoiceHubConnections(ORG_A));
        expect(reread.map((c) => c.id)).toContain(created.id);
        expect(reread.find((c) => c.id === created.id)?.baseUrl).toBe('https://example.com');
    });

    it('cifra apiKey em repouso — a linha crua no banco não contém a credencial em texto puro', async () => {
        const created = await asOrg(ORG_A, () =>
            connectVoiceHub(ORG_A, {
                baseUrl: 'https://example.com',
                apiKey: 'chave-em-texto-puro',
                agentId: 'agente-1',
            }),
        );

        // $queryRaw ignora a extensão de decrypt do client Prisma e não passa pelo
        // $allOperations — withRlsContext abre a transação interativa e faz o SET LOCAL
        // explicitamente antes da query crua (mesmo cuidado do teste equivalente de
        // ThreeCXConnection, ver comentário lá).
        const raw = await asOrg(ORG_A, () =>
            withRlsContext((tx) =>
                tx.$queryRaw<Array<{ apiKey: string | null }>>`
                    SELECT "apiKey" FROM "VoiceHubConnection" WHERE id = ${created.id}
                `,
            ),
        );
        expect(raw).toHaveLength(1);
        expect(raw[0].apiKey).not.toBe('chave-em-texto-puro');
        expect(raw[0].apiKey).not.toBeNull();

        // hasApiKey (nunca a chave em si) é o único sinal exposto pela API pública.
        const summaries = await asOrg(ORG_A, () => listVoiceHubConnections(ORG_A));
        const match = summaries.find((c) => c.id === created.id);
        expect(match?.hasApiKey).toBe(true);
        for (const summary of summaries) {
            expect(summary).not.toHaveProperty('apiKey');
        }
    });

    it('RLS: uma conexão da organização A é invisível no contexto de tenant da organização B, mesmo pedindo o organizationId de A explicitamente', async () => {
        const created = await asOrg(ORG_A, () =>
            connectVoiceHub(ORG_A, { baseUrl: 'https://example.com' }),
        );

        // Mesmo filtro explícito organizationId=ORG_A no WHERE — o que muda é só o tenant do
        // contexto (app.current_tenant_id), que é o que a policy de RLS realmente compara.
        const seenFromOrgB = await asOrg(ORG_B, () =>
            prisma.voiceHubConnection.findMany({ where: { organizationId: ORG_A } }),
        );
        expect(seenFromOrgB.find((c) => c.id === created.id)).toBeUndefined();

        const seenFromOrgA = await asOrg(ORG_A, () =>
            prisma.voiceHubConnection.findMany({ where: { organizationId: ORG_A } }),
        );
        expect(seenFromOrgA.find((c) => c.id === created.id)).toBeDefined();
    });

    it('disconnectVoiceHub nunca apaga conexão de outra organização, mesmo sabendo o id exato', async () => {
        const created = await asOrg(ORG_A, () =>
            connectVoiceHub(ORG_A, { baseUrl: 'https://example.com' }),
        );

        // Tenta desconectar do lado de B, usando o id real de A.
        await asOrg(ORG_B, () => disconnectVoiceHub(ORG_B, created.id));

        const stillThere = await asOrg(ORG_A, () => listVoiceHubConnections(ORG_A));
        expect(stillThere.map((c) => c.id)).toContain(created.id);
    });
});
