import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../../src/lib/prisma';
import { requestContext } from '../../src/lib/async-context';

const RUN_ID = "${Date.now()}-${Math.random().toString(36).slice(2, 8)}";
const ORG_A = "test-voicehub-org-a-${RUN_ID}";

const withRlsBypass = <T>(fn: () => Promise<T>): Promise<T> => requestContext.run({ bypassRls: true }, fn);
const asOrg = <T>(organizationId: string, fn: () => Promise<T>): Promise<T> => requestContext.run({ tenantId: organizationId }, fn);

beforeAll(async () => withRlsBypass(async () => {
    await prisma.organization.createMany({ data: [{ id: ORG_A, name: 'Test Org A (VoiceHub)' }] });
}));

afterAll(async () => withRlsBypass(async () => {
    await prisma.organization.deleteMany({ where: { id: ORG_A } });
}));

describe('VoiceHubConnection persistence', () => {
    it('can create and fetch a VoiceHubConnection without crashing due to schema drift', async () => {
        const connection = await asOrg(ORG_A, async () => {
            return prisma.voiceHubConnection.create({
                data: {
                    organizationId: ORG_A,
                    label: 'Test Voice Hub',
                    baseUrl: 'https://test.example.com',
                    apiKey: 'enc:v1:teste',
                    agentId: 'agent-123',
                },
            });
        });

        expect(connection).toBeDefined();
        expect(connection.baseUrl).toBe('https://test.example.com');

        const fetched = await asOrg(ORG_A, async () => {
            return prisma.voiceHubConnection.findFirst({ where: { id: connection.id } });
        });

        expect(fetched).not.toBeNull();
        expect(fetched?.label).toBe('Test Voice Hub');
    });
});
