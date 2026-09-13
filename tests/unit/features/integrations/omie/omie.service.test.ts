/**
 * Omie: honestidade sobre credenciais e cadastro real de cliente — connectOmie só persiste depois
 * de validar appKey/appSecret de verdade (ListarClientes); upsertOmieCustomer propaga o erro real
 * do Omie (`faultstring`) em vez de fingir sucesso. Mesma classe de garantia de
 * threecx.service.test.ts/stripe.service.test.ts.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

let omieStore: Array<Record<string, unknown>> = [];
const createOmieMock = vi.fn((args: { data: Record<string, unknown> }) => {
  const record = { id: `omie-${omieStore.length + 1}`, createdAt: new Date(), ...args.data };
  omieStore.push(record);
  return Promise.resolve(record);
});
const findFirstOmieMock = vi.fn((args: { where: { id: string; organizationId: string } }) => {
  return Promise.resolve(
    omieStore.find((c) => c.id === args.where.id && c.organizationId === args.where.organizationId) ??
      null,
  );
});

vi.mock('@/lib/prisma', () => ({
  prisma: {
    omieConnection: {
      create: (...args: [{ data: Record<string, unknown> }]) => createOmieMock(...args),
      findFirst: (...args: [{ where: { id: string; organizationId: string } }]) =>
        findFirstOmieMock(...args),
      findMany: () => Promise.resolve(omieStore),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
  },
}));

const fetchWithTimeoutMock = vi.fn();
vi.mock('@/lib/http', () => ({
  fetchWithTimeout: (...args: unknown[]) => fetchWithTimeoutMock(...args),
}));

import { connectOmie, upsertOmieCustomer } from '@/features/integrations/omie/omie.service';

const ORG_ID = 'org-omie-test';

function jsonResponse(status: number, body: Record<string, unknown>) {
  return { ok: status >= 200 && status < 300, status, json: () => Promise.resolve(body) };
}

beforeEach(() => {
  vi.clearAllMocks();
  omieStore = [];
});

describe('connectOmie', () => {
  it('recusa e não persiste quando as credenciais são inválidas', async () => {
    fetchWithTimeoutMock.mockResolvedValue(
      jsonResponse(200, { faultstring: 'Chave de aplicativo inválida', faultcode: '99' }),
    );

    await expect(
      connectOmie(ORG_ID, { appKey: 'wrong-key', appSecret: 'wrong-secret' }),
    ).rejects.toThrow(/Credenciais do Omie inválidas/);
    expect(omieStore).toHaveLength(0);
  });

  it('persiste quando as credenciais são validadas com sucesso', async () => {
    fetchWithTimeoutMock.mockResolvedValue(jsonResponse(200, { clientes_encontrados: [] }));

    const conn = await connectOmie(ORG_ID, { appKey: 'valid-key-1234', appSecret: 'valid-secret' });

    expect(conn.appKeyLast4).toBe('1234');
    expect(fetchWithTimeoutMock).toHaveBeenCalledWith(
      'https://app.omie.com.br/api/v1/geral/clientes/',
      expect.objectContaining({ method: 'POST' }),
      expect.any(Number),
      ['app.omie.com.br'],
    );
  });
});

describe('upsertOmieCustomer — honestidade sobre cadastro real (nunca finge sucesso)', () => {
  it('propaga o erro real do Omie em vez de fingir sucesso', async () => {
    fetchWithTimeoutMock.mockResolvedValueOnce(jsonResponse(200, { clientes_encontrados: [] }));
    const conn = await connectOmie(ORG_ID, { appKey: 'valid-key', appSecret: 'valid-secret' });

    fetchWithTimeoutMock.mockResolvedValueOnce(
      jsonResponse(200, { faultstring: 'CNPJ já cadastrado', faultcode: '20' }),
    );

    await expect(
      upsertOmieCustomer(ORG_ID, conn.id, { name: 'Industria Alfa LTDA', cnpjOrCpf: '12345678000199' }),
    ).rejects.toThrow(/CNPJ já cadastrado/);
  });

  it('cadastra o cliente com sucesso quando o Omie confirma', async () => {
    fetchWithTimeoutMock.mockResolvedValueOnce(jsonResponse(200, { clientes_encontrados: [] }));
    const conn = await connectOmie(ORG_ID, { appKey: 'valid-key', appSecret: 'valid-secret' });

    fetchWithTimeoutMock.mockResolvedValueOnce(
      jsonResponse(200, { codigo_cliente_omie: 89012, status: 'OK' }),
    );

    const customer = await upsertOmieCustomer(ORG_ID, conn.id, {
      name: 'Industria Alfa LTDA',
      cnpjOrCpf: '12345678000199',
      phone: '11987654321',
    });

    expect(customer.id).toBe('89012');
    const [, , , param] = fetchWithTimeoutMock.mock.calls[1];
    void param;
    const secondCallInit = fetchWithTimeoutMock.mock.calls[1][1] as { body: string };
    const sentBody = JSON.parse(secondCallInit.body);
    expect(sentBody.param[0].telefone1_ddd).toBe('11');
    expect(sentBody.param[0].telefone1_numero).toBe('987654321');
  });

  it('rejeita cliente sem nome/CNPJ antes de qualquer chamada de rede', async () => {
    fetchWithTimeoutMock.mockResolvedValueOnce(jsonResponse(200, { clientes_encontrados: [] }));
    const conn = await connectOmie(ORG_ID, { appKey: 'valid-key', appSecret: 'valid-secret' });
    fetchWithTimeoutMock.mockClear();

    await expect(
      upsertOmieCustomer(ORG_ID, conn.id, { name: '', cnpjOrCpf: '' }),
    ).rejects.toThrow(/obrigatórios/);
    expect(fetchWithTimeoutMock).not.toHaveBeenCalled();
  });
});
