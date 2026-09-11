import { afterEach, describe, expect, it, vi } from 'vitest';

const signatureRequestCreate = vi.fn().mockResolvedValue({ id: 'request-1' });
const signatureRequestUpdate = vi.fn().mockResolvedValue({});
const signatureRequestFindFirst = vi.fn().mockResolvedValue(null);
const dealClosureEventCreate = vi.fn().mockResolvedValue({});
const leadFindUnique = vi.fn().mockResolvedValue(null);
const leadUpdate = vi.fn().mockResolvedValue({});

vi.mock('../../../../../src/lib/prisma.js', () => ({
    prisma: {
        crmDocumentSignatureRequest: {
            create: (...args: unknown[]) => signatureRequestCreate(...args),
            update: (...args: unknown[]) => signatureRequestUpdate(...args),
            findFirst: (...args: unknown[]) => signatureRequestFindFirst(...args),
        },
        dealClosureEvent: {
            create: (...args: unknown[]) => dealClosureEventCreate(...args),
        },
        lead: {
            findUnique: (...args: unknown[]) => leadFindUnique(...args),
            update: (...args: unknown[]) => leadUpdate(...args),
        },
    },
}));

vi.mock('@prisma/client', () => ({
    SignatureRequestStatus: {
        Created: 'Created', Sent: 'Sent', Viewed: 'Viewed', Signed: 'Signed',
        Declined: 'Declined', Expired: 'Expired', Cancelled: 'Cancelled',
    },
    LeadStatus: { Negocios_Ganhos: 'Negocios_Ganhos' },
    Prisma: {},
}));

const broadcastEvent = vi.fn();
vi.mock('../../../../../src/lib/eventsBus.js', () => ({
    broadcastEvent: (...args: unknown[]) => broadcastEvent(...args),
}));

const contextRuns: Array<Record<string, unknown>> = [];
vi.mock('../../../../../src/lib/async-context.js', () => ({
    requestContext: {
        run: (store: Record<string, unknown>, fn: () => unknown) => {
            contextRuns.push(store);
            return fn();
        },
        getStore: () => undefined,
    },
}));

const { prismaSignatureRequestRepository } = await import('../../../../../src/features/cadence/infra/PrismaSignatureRequestRepository');

const draft = { organizationId: 'org-1', documentId: 'doc-1', provider: 'govbr', signerEmail: 'signer@exemplo.com', signerName: null, requestedBy: null };

afterEach(() => {
    vi.clearAllMocks();
    contextRuns.length = 0;
});

describe('prismaSignatureRequestRepository', () => {
    it('create: grava com status Created', async () => {
        const result = await prismaSignatureRequestRepository.create(draft);

        expect(result).toEqual({ id: 'request-1' });
        expect(signatureRequestCreate).toHaveBeenCalledWith({
            data: expect.objectContaining({ organizationId: 'org-1', documentId: 'doc-1', provider: 'govbr', status: 'Created' }),
            select: { id: true },
        });
    });

    it('markSent: atualiza status para Sent com o providerRequestId', async () => {
        await prismaSignatureRequestRepository.markSent('request-1', 'provider-request-1');

        expect(signatureRequestUpdate).toHaveBeenCalledWith({
            where: { id: 'request-1' },
            data: { status: 'Sent', providerRequestId: 'provider-request-1' },
        });
    });

    it('findByProviderRequestId: inexistente devolve null (lookup roda com bypassRls — sem tenant conhecido a priori)', async () => {
        const result = await prismaSignatureRequestRepository.findByProviderRequestId('govbr', 'provider-request-1');
        expect(result).toBeNull();
        expect(contextRuns).toContainEqual({ bypassRls: true });
    });

    it('findByProviderRequestId: mapeia o status do banco (PascalCase) de volta para o domínio (lowercase) e devolve o leadId do documento', async () => {
        signatureRequestFindFirst.mockResolvedValueOnce({
            id: 'request-1',
            organizationId: 'org-1',
            status: 'Signed',
            document: { leadId: 'lead-1' },
        });

        const result = await prismaSignatureRequestRepository.findByProviderRequestId('govbr', 'provider-request-1');

        expect(result).toEqual({ id: 'request-1', organizationId: 'org-1', status: 'signed', leadId: 'lead-1' });
    });

    it('findByProviderRequestId: documento sem lead vinculado devolve leadId null', async () => {
        signatureRequestFindFirst.mockResolvedValueOnce({
            id: 'request-1',
            organizationId: 'org-1',
            status: 'Signed',
            document: { leadId: null },
        });

        const result = await prismaSignatureRequestRepository.findByProviderRequestId('govbr', 'provider-request-1');

        expect(result).toEqual({ id: 'request-1', organizationId: 'org-1', status: 'signed', leadId: null });
    });

    it('updateStatus: grava status/respondedAt/evidenceRef/rawWebhookPayload, escopado pelo tenant resolvido', async () => {
        await prismaSignatureRequestRepository.updateStatus({ id: 'request-1', organizationId: 'org-1', status: 'signed', evidenceRef: 'cert-123', rawWebhookPayload: { a: 1 } });

        expect(signatureRequestUpdate).toHaveBeenCalledWith({
            where: { id: 'request-1' },
            data: expect.objectContaining({ status: 'Signed', evidenceRef: 'cert-123', rawWebhookPayload: { a: 1 } }),
        });
        expect(contextRuns).toContainEqual({ tenantId: 'org-1' });
    });

    it('updateStatus: sem evidenceRef, não sobrescreve o campo', async () => {
        await prismaSignatureRequestRepository.updateStatus({ id: 'request-1', organizationId: 'org-1', status: 'expired', evidenceRef: null, rawWebhookPayload: {} });

        const call = signatureRequestUpdate.mock.calls[0][0];
        expect(call.data).not.toHaveProperty('evidenceRef');
    });

    // ACH-17-01: recordSignatureDealClosure é o lado de persistência do fechamento determinístico
    // disparado pelo webhook de assinatura — grava o DealClosureEvent (type SignatureCompleted no
    // Postgres) e move o Lead para "Negócios Ganhos", escopado pelo tenant do evento.
    describe('recordSignatureDealClosure', () => {
        const event = {
            id: 'closure-1',
            organizationId: 'org-1',
            leadId: 'lead-1',
            type: 'signature_completed' as const,
            evidenceRef: 'request-1',
            triggeredBy: 'webhook:govbr',
            occurredAt: new Date('2026-01-01T00:00:00.000Z'),
        };

        it('grava o DealClosureEvent com o type mapeado para o enum do Postgres', async () => {
            await prismaSignatureRequestRepository.recordSignatureDealClosure(event);

            expect(dealClosureEventCreate).toHaveBeenCalledWith({
                data: {
                    id: 'closure-1',
                    organizationId: 'org-1',
                    leadId: 'lead-1',
                    type: 'SignatureCompleted',
                    evidenceRef: 'request-1',
                    triggeredBy: 'webhook:govbr',
                    occurredAt: event.occurredAt,
                },
            });
            expect(contextRuns).toContainEqual({ tenantId: 'org-1' });
        });

        it('move o Lead para Negocios_Ganhos e grava closedAt quando o lead ainda não tinha fechamento', async () => {
            leadFindUnique.mockResolvedValueOnce({ closedAt: null });

            await prismaSignatureRequestRepository.recordSignatureDealClosure(event);

            expect(leadUpdate).toHaveBeenCalledWith({
                where: { id: 'lead-1' },
                data: { status: 'Negocios_Ganhos', closedAt: event.occurredAt },
            });
        });

        it('não sobrescreve closedAt quando o lead já tinha sido fechado antes', async () => {
            const previousClosedAt = new Date('2025-06-01T00:00:00.000Z');
            leadFindUnique.mockResolvedValueOnce({ closedAt: previousClosedAt });

            await prismaSignatureRequestRepository.recordSignatureDealClosure(event);

            expect(leadUpdate).toHaveBeenCalledWith({
                where: { id: 'lead-1' },
                data: { status: 'Negocios_Ganhos' },
            });
        });

        it('emite o evento DEAL_WON depois de gravar', async () => {
            await prismaSignatureRequestRepository.recordSignatureDealClosure(event);

            expect(broadcastEvent).toHaveBeenCalledWith({
                type: 'DEAL_WON',
                organizationId: 'org-1',
                payload: { leadId: 'lead-1' },
            });
        });
    });
});
