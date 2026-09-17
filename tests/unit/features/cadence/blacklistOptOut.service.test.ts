import { describe, expect, it, vi } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { BlacklistOptOutService } from '../../../../src/features/cadence/services/blacklistOptOut.service.js';

describe('BlacklistOptOutService (Agente 17)', () => {
  it('registra o opt-out com e-mail normalizado', async () => {
    const mockDb = {
      optOutRecord: {
        create: vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'opt-1', ...data })),
      },
    } as unknown as PrismaClient;

    const service = new BlacklistOptOutService(mockDb);
    const result = await service.registerOptOut({
      organizationId: 'org-test-cadence',
      contactValue: '  SAIR@CLIENTE.COM.BR  ',
      channel: 'Email',
    });

    expect(result.email).toBe('sair@cliente.com.br');
    expect(mockDb.optOutRecord.create).toHaveBeenCalledWith({
      data: {
        organizationId: 'org-test-cadence',
        email: 'sair@cliente.com.br',
        phoneE164: null,
        scope: 'Email',
        originChannel: 'manual',
        reason: 'Solicitação direta do destinatário',
      },
    });
  });

  it('retorna true se o contato possui opt-out registrado para o canal', async () => {
    const mockDb = {
      optOutRecord: {
        findFirst: vi.fn().mockResolvedValue({ id: 'opt-2', phoneE164: '+5511999998888', scope: 'Global' }),
      },
    } as unknown as PrismaClient;

    const service = new BlacklistOptOutService(mockDb);
    const isBlocked = await service.isOptedOut('org-test-cadence', '+5511999998888', 'WhatsApp');

    expect(isBlocked).toBe(true);
  });

  it('retorna false se o contato não estiver na lista de opt-out', async () => {
    const mockDb = {
      optOutRecord: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
    } as unknown as PrismaClient;

    const service = new BlacklistOptOutService(mockDb);
    const isBlocked = await service.isOptedOut('org-test-cadence', 'lead.limpo@empresa.com', 'Email');

    expect(isBlocked).toBe(false);
  });
});
