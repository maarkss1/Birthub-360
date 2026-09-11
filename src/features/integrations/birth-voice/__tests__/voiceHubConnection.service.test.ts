import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mesmo espírito de threecx.service.test.ts: prova que a conexão com o Birth Voices Hub é 100%
// persistida via Prisma (nada em memória module-level), nunca vaza/apaga dado de outra
// organização, e nunca devolve a API key em texto puro na resposta da API.
const { prismaMock, assertSafeExternalUrlMock, safeFetchMock } = vi.hoisted(() => {
  const assertSafeExternalUrlMock = vi.fn().mockResolvedValue(undefined);
  const safeFetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    await assertSafeExternalUrlMock(url);
    return (globalThis.fetch as typeof fetch)(url, init);
  });
  return {
    prismaMock: {
      voiceHubConnection: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        deleteMany: vi.fn(),
      },
    },
    assertSafeExternalUrlMock,
    safeFetchMock,
  };
});
vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }));
vi.mock('../../../../shared/security/urlGuard.js', () => ({
  assertSafeExternalUrl: assertSafeExternalUrlMock,
  safeFetch: safeFetchMock,
}));

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import {
  listVoiceHubConnections,
  connectVoiceHub,
  disconnectVoiceHub,
  testVoiceHubConnection,
} from '@/features/integrations/birth-voice/voiceHubConnection.service';
import { AppError } from '@/shared/middlewares/errorHandler';

const ORG = 'org-1';

function connectionRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'conn-1',
    organizationId: ORG,
    label: 'Birth Voices Hub',
    baseUrl: 'https://hub.example.com',
    apiKey: 'chave-secreta',
    agentId: 'agente-1',
    enabled: true,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  assertSafeExternalUrlMock.mockResolvedValue(undefined);
});

describe('listVoiceHubConnections', () => {
  it('nunca devolve a API key em texto puro — só um flag hasApiKey', async () => {
    prismaMock.voiceHubConnection.findMany.mockResolvedValue([connectionRow()]);

    const result = await listVoiceHubConnections(ORG);

    expect(result).toEqual([
      {
        id: 'conn-1',
        label: 'Birth Voices Hub',
        baseUrl: 'https://hub.example.com',
        agentId: 'agente-1',
        enabled: true,
        hasApiKey: true,
        createdAt: connectionRow().createdAt,
      },
    ]);
    expect(prismaMock.voiceHubConnection.findMany).toHaveBeenCalledWith({
      where: { organizationId: ORG },
      orderBy: { createdAt: 'desc' },
    });
  });

  it('hasApiKey é false quando nenhuma API key foi cadastrada', async () => {
    prismaMock.voiceHubConnection.findMany.mockResolvedValue([connectionRow({ apiKey: null })]);

    const [result] = await listVoiceHubConnections(ORG);

    expect(result.hasApiKey).toBe(false);
  });
});

describe('connectVoiceHub', () => {
  it('rejeita sem baseUrl, sem chegar a validar URL nem gravar', async () => {
    await expect(connectVoiceHub(ORG, { baseUrl: '   ' })).rejects.toBeInstanceOf(AppError);
    expect(assertSafeExternalUrlMock).not.toHaveBeenCalled();
    expect(prismaMock.voiceHubConnection.create).not.toHaveBeenCalled();
  });

  it('valida a URL contra SSRF antes de gravar', async () => {
    assertSafeExternalUrlMock.mockRejectedValue(new AppError('URL não permitida.', 400));
    await expect(
      connectVoiceHub(ORG, { baseUrl: 'http://169.254.169.254/latest/meta-data' }),
    ).rejects.toBeInstanceOf(AppError);
    expect(prismaMock.voiceHubConnection.create).not.toHaveBeenCalled();
  });

  it('remove barra final da baseUrl e usa label padrão quando não informado', async () => {
    prismaMock.voiceHubConnection.create.mockResolvedValue(
      connectionRow({ label: 'Birth Voices Hub' }),
    );

    await connectVoiceHub(ORG, { baseUrl: 'https://hub.example.com/' });

    expect(prismaMock.voiceHubConnection.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: ORG,
        label: 'Birth Voices Hub',
        baseUrl: 'https://hub.example.com',
      }),
    });
  });
});

describe('disconnectVoiceHub', () => {
  it('escopa a exclusão por organizationId — nunca apaga a conexão de outro tenant mesmo com id adivinhado', async () => {
    await disconnectVoiceHub(ORG, 'conn-de-outra-org');

    expect(prismaMock.voiceHubConnection.deleteMany).toHaveBeenCalledWith({
      where: { id: 'conn-de-outra-org', organizationId: ORG },
    });
  });
});

describe('testVoiceHubConnection', () => {
  it('404 quando a conexão não existe (ou é de outra organização)', async () => {
    prismaMock.voiceHubConnection.findFirst.mockResolvedValue(null);

    await expect(testVoiceHubConnection(ORG, 'conn-1')).rejects.toBeInstanceOf(AppError);
  });

  it('reporta sucesso real só quando /health responde OK — nunca confirma API key/agentId', async () => {
    prismaMock.voiceHubConnection.findFirst.mockResolvedValue(connectionRow());
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200 }));

    const result = await testVoiceHubConnection(ORG, 'conn-1');

    expect(result.success).toBe(true);
    // A mensagem pode MENCIONAR que não confirma credenciais (disclaimer honesto), mas nunca pode
    // AFIRMAR que a API key/agentId são válidos — só /health (sem autenticação) foi chamado.
    expect(result.message).not.toMatch(/credenciais? v[aá]lid|api key v[aá]lid|autenticad/i);
    expect(safeFetchMock).toHaveBeenCalledWith(
      'https://hub.example.com/health',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('reporta falha real quando o Hub responde com erro HTTP — nunca um success:true genérico', async () => {
    prismaMock.voiceHubConnection.findFirst.mockResolvedValue(connectionRow());
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503 }));

    const result = await testVoiceHubConnection(ORG, 'conn-1');

    expect(result.success).toBe(false);
    expect(result.message).toContain('503');
  });
});
