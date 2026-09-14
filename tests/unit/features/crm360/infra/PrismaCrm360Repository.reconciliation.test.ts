/**
 * BILLING-003 (onda 5, auditoria de débito técnico — risco financeiro real): "Pago" numa Fatura
 * era uma transição manual livre, sem NENHUM vínculo com Stripe/Omie/qualquer fonte financeira
 * real. Estes testes provam duas coisas: (1) a rota genérica de status nunca mais aceita marcar
 * uma Fatura como Pago diretamente; (2) `reconcileFaturaStripePayment` só grava Pago depois de
 * confirmar AO VIVO contra a API do Stripe que existe uma cobrança "succeeded" com valor/moeda
 * batendo com o documento — nunca a partir de um valor só informado pelo chamador.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Prisma } from '@prisma/client';

const crmCommercialDocumentFindFirst = vi.fn();
const crmCommercialDocumentFindFirstOrThrow = vi.fn();
const crmCommercialDocumentUpdate = vi.fn();

vi.mock('@/lib/prisma', () => ({
  prisma: {
    crmCommercialDocument: {
      findFirst: (...args: unknown[]) => crmCommercialDocumentFindFirst(...args),
      findFirstOrThrow: (...args: unknown[]) => crmCommercialDocumentFindFirstOrThrow(...args),
      update: (...args: unknown[]) => crmCommercialDocumentUpdate(...args),
    },
  },
}));

// BILLING-003 usa `StripeChargePort` (src/shared/contracts/stripeCharge.contract.ts) via
// injeção de dependência, não um import direto de integrations/stripe (no-cross-feature-imports)
// — então o mock é um stub passado no construtor, não um vi.mock() de módulo.
const getStripeChargeMock = vi.fn();

const ensureDealClosureAllowedMock = vi.fn().mockResolvedValue({});
vi.mock('@/features/crm/application/dealClosureGate', () => ({
  ensureDealClosureAllowed: (...args: unknown[]) => ensureDealClosureAllowedMock(...args),
  ensureManualDealClosureAllowed: vi.fn(),
}));
vi.mock('@/features/crm/infra/PrismaDealClosureGate', () => ({ prismaDealClosureGate: {} }));

const auditLogMock = vi.fn();
vi.mock('@/lib/audit/audit.service', () => ({
  AuditService: { log: (...args: unknown[]) => auditLogMock(...args) },
}));

const { PrismaCrm360Repository } = await import(
  '@/features/crm360/infra/PrismaCrm360Repository'
);

const repo = new PrismaCrm360Repository({ getStripeCharge: getStripeChargeMock });
const ORG = 'org-billing-003';
const DOC_ID = 'doc-1';

function baseDocument(overrides: Record<string, unknown> = {}) {
  return {
    id: DOC_ID,
    type: 'Fatura',
    status: 'Aceito',
    leadId: null,
    total: 499,
    currency: 'BRL',
    stripePaymentIntentId: null,
    ...overrides,
  };
}

function fullDocRow(overrides: Record<string, unknown> = {}) {
  return {
    id: DOC_ID,
    organizationId: ORG,
    number: 'FAT-001',
    type: 'Fatura',
    status: 'Pago',
    title: 'Fatura de teste',
    currency: 'BRL',
    issueDate: new Date(),
    validUntil: null,
    dueDate: null,
    subtotal: 499,
    discount: 0,
    tax: 0,
    total: 499,
    lineItems: [],
    notes: null,
    terms: null,
    publicToken: 'token-1',
    sentAt: null,
    firstViewedAt: null,
    lastViewedAt: null,
    viewCount: 0,
    leadId: null,
    lead: null,
    companyId: null,
    company: null,
    contactId: null,
    contact: null,
    stripeConnectionId: 'conn-1',
    stripePaymentIntentId: 'pi_123',
    paymentReconciledAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

afterEach(() => {
  vi.clearAllMocks();
});

describe('updateDocumentStatus — BILLING-003: Fatura nunca aceita Pago pela rota genérica', () => {
  it('rejeita com 400 uma transição direta para Pago quando o documento é Fatura', async () => {
    crmCommercialDocumentFindFirst.mockResolvedValue({
      sentAt: null,
      status: 'Aceito',
      leadId: null,
      type: 'Fatura',
    });

    await expect(
      repo.updateDocumentStatus(ORG, DOC_ID, 'Pago', 'user-1'),
    ).rejects.toThrow(/reconciliação com uma cobrança Stripe real/);
    expect(crmCommercialDocumentUpdate).not.toHaveBeenCalled();
  });

  it('segundo clique (já está Pago) não é bloqueado como uma nova transição', async () => {
    crmCommercialDocumentFindFirst.mockResolvedValue({
      sentAt: null,
      status: 'Pago',
      leadId: null,
      type: 'Fatura',
    });
    crmCommercialDocumentUpdate.mockResolvedValue(fullDocRow());

    await expect(repo.updateDocumentStatus(ORG, DOC_ID, 'Pago', 'user-1')).resolves.toBeDefined();
  });

  it('documentos que não são Fatura continuam podendo ir para Pago pela rota genérica (comportamento pré-existente preservado)', async () => {
    crmCommercialDocumentFindFirst.mockResolvedValue({
      sentAt: null,
      status: 'Aceito',
      leadId: null,
      type: 'Proposta',
    });
    crmCommercialDocumentUpdate.mockResolvedValue(fullDocRow({ type: 'Proposta' }));

    await expect(repo.updateDocumentStatus(ORG, DOC_ID, 'Pago')).resolves.toBeDefined();
    expect(crmCommercialDocumentUpdate).toHaveBeenCalled();
  });
});

describe('reconcileFaturaStripePayment — BILLING-003: só grava Pago com confirmação real da Stripe', () => {
  it('rejeita com 404 quando o documento não existe', async () => {
    crmCommercialDocumentFindFirst.mockResolvedValue(null);

    await expect(
      repo.reconcileFaturaStripePayment(ORG, DOC_ID, 'conn-1', 'pi_123'),
    ).rejects.toThrow(/não encontrado/);
    expect(getStripeChargeMock).not.toHaveBeenCalled();
  });

  it('rejeita com 400 quando o documento não é do tipo Fatura', async () => {
    crmCommercialDocumentFindFirst.mockResolvedValue(baseDocument({ type: 'Proposta' }));

    await expect(
      repo.reconcileFaturaStripePayment(ORG, DOC_ID, 'conn-1', 'pi_123'),
    ).rejects.toThrow(/tipo Fatura/);
    expect(getStripeChargeMock).not.toHaveBeenCalled();
  });

  it('idempotente: mesma cobrança já reconciliada com este documento não chama a Stripe de novo', async () => {
    crmCommercialDocumentFindFirst.mockResolvedValue(
      baseDocument({ status: 'Pago', stripePaymentIntentId: 'pi_123' }),
    );
    crmCommercialDocumentFindFirstOrThrow.mockResolvedValue(fullDocRow());

    const result = await repo.reconcileFaturaStripePayment(ORG, DOC_ID, 'conn-1', 'pi_123');

    expect(result.status).toBe('Pago');
    expect(getStripeChargeMock).not.toHaveBeenCalled();
    expect(crmCommercialDocumentUpdate).not.toHaveBeenCalled();
  });

  it('rejeita com 404 quando a Stripe não encontra a cobrança', async () => {
    crmCommercialDocumentFindFirst.mockResolvedValue(baseDocument());
    getStripeChargeMock.mockResolvedValue(null);

    await expect(
      repo.reconcileFaturaStripePayment(ORG, DOC_ID, 'conn-1', 'pi_123'),
    ).rejects.toThrow(/Cobrança não encontrada/);
    expect(crmCommercialDocumentUpdate).not.toHaveBeenCalled();
  });

  it('rejeita com 409 quando o pagamento ainda não está "succeeded"', async () => {
    crmCommercialDocumentFindFirst.mockResolvedValue(baseDocument());
    getStripeChargeMock.mockResolvedValue({
      paymentId: 'pi_123',
      amountCents: 49900,
      currency: 'BRL',
      status: 'requires_payment_method',
      createdAt: new Date().toISOString(),
    });

    await expect(
      repo.reconcileFaturaStripePayment(ORG, DOC_ID, 'conn-1', 'pi_123'),
    ).rejects.toThrow(/ainda não confirmado/);
    expect(crmCommercialDocumentUpdate).not.toHaveBeenCalled();
  });

  it('rejeita com 409 quando o valor da cobrança não bate com o total da Fatura', async () => {
    crmCommercialDocumentFindFirst.mockResolvedValue(baseDocument({ total: 499 }));
    getStripeChargeMock.mockResolvedValue({
      paymentId: 'pi_123',
      amountCents: 10000, // R$100 — não bate com R$499 da Fatura.
      currency: 'BRL',
      status: 'succeeded',
      createdAt: new Date().toISOString(),
    });

    await expect(
      repo.reconcileFaturaStripePayment(ORG, DOC_ID, 'conn-1', 'pi_123'),
    ).rejects.toThrow(/não bate com o total/);
    expect(crmCommercialDocumentUpdate).not.toHaveBeenCalled();
  });

  it('rejeita com 409 quando a moeda da cobrança não bate com a da Fatura', async () => {
    crmCommercialDocumentFindFirst.mockResolvedValue(baseDocument({ total: 100, currency: 'BRL' }));
    getStripeChargeMock.mockResolvedValue({
      paymentId: 'pi_123',
      amountCents: 10000,
      currency: 'USD',
      status: 'succeeded',
      createdAt: new Date().toISOString(),
    });

    await expect(
      repo.reconcileFaturaStripePayment(ORG, DOC_ID, 'conn-1', 'pi_123'),
    ).rejects.toThrow(/[Mm]oeda/);
    expect(crmCommercialDocumentUpdate).not.toHaveBeenCalled();
  });

  it('sem leadId: reconcilia com sucesso mesmo sem actorUserId, e grava os campos de reconciliação', async () => {
    crmCommercialDocumentFindFirst.mockResolvedValue(baseDocument({ total: 100, leadId: null }));
    getStripeChargeMock.mockResolvedValue({
      paymentId: 'pi_123',
      amountCents: 10000,
      currency: 'BRL',
      status: 'succeeded',
      createdAt: new Date().toISOString(),
    });
    crmCommercialDocumentUpdate.mockResolvedValue(fullDocRow());

    const result = await repo.reconcileFaturaStripePayment(ORG, DOC_ID, 'conn-1', 'pi_123');

    expect(result.status).toBe('Pago');
    expect(crmCommercialDocumentUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: DOC_ID, organizationId: ORG },
        data: expect.objectContaining({
          status: 'Pago',
          stripeConnectionId: 'conn-1',
          stripePaymentIntentId: 'pi_123',
        }),
      }),
    );
    expect(ensureDealClosureAllowedMock).not.toHaveBeenCalled();
    expect(auditLogMock).toHaveBeenCalledWith(
      expect.objectContaining({ entity: 'CrmCommercialDocument', entityId: DOC_ID, tenantId: ORG }),
    );
  });

  it('com leadId e sem actorUserId: rejeita com 401 antes de gravar qualquer coisa', async () => {
    crmCommercialDocumentFindFirst.mockResolvedValue(
      baseDocument({ total: 100, leadId: 'lead-1' }),
    );
    getStripeChargeMock.mockResolvedValue({
      paymentId: 'pi_123',
      amountCents: 10000,
      currency: 'BRL',
      status: 'succeeded',
      createdAt: new Date().toISOString(),
    });

    await expect(
      repo.reconcileFaturaStripePayment(ORG, DOC_ID, 'conn-1', 'pi_123'),
    ).rejects.toThrow(/usuário autenticado/);
    expect(crmCommercialDocumentUpdate).not.toHaveBeenCalled();
  });

  it('com leadId e actorUserId: roda o gate de fechamento de negócio antes de gravar', async () => {
    crmCommercialDocumentFindFirst.mockResolvedValue(
      baseDocument({ total: 100, leadId: 'lead-1' }),
    );
    getStripeChargeMock.mockResolvedValue({
      paymentId: 'pi_123',
      amountCents: 10000,
      currency: 'BRL',
      status: 'succeeded',
      createdAt: new Date().toISOString(),
    });
    crmCommercialDocumentUpdate.mockResolvedValue(fullDocRow({ leadId: 'lead-1' }));

    await repo.reconcileFaturaStripePayment(ORG, DOC_ID, 'conn-1', 'pi_123', 'user-42');

    expect(ensureDealClosureAllowedMock).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        organizationId: ORG,
        leadId: 'lead-1',
        type: 'payment_confirmed',
        evidenceRef: DOC_ID,
        triggeredBy: 'user-42',
      }),
    );
  });

  it('rejeita com 409 quando a mesma cobrança já reconciliou outra Fatura (unique constraint)', async () => {
    crmCommercialDocumentFindFirst.mockResolvedValue(baseDocument({ total: 100 }));
    getStripeChargeMock.mockResolvedValue({
      paymentId: 'pi_123',
      amountCents: 10000,
      currency: 'BRL',
      status: 'succeeded',
      createdAt: new Date().toISOString(),
    });
    crmCommercialDocumentUpdate.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: '7.10.0',
      }),
    );

    await expect(
      repo.reconcileFaturaStripePayment(ORG, DOC_ID, 'conn-1', 'pi_123'),
    ).rejects.toThrow(/já foi usada para reconciliar outra Fatura/);
  });
});
