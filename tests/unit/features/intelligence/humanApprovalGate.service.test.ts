import { describe, expect, it, vi } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { HumanApprovalGateService } from '../../../../src/features/intelligence/services/humanApprovalGate.service.js';

describe('HumanApprovalGateService (Agente 13)', () => {
  it('aprova automaticamente ações rotineiras de baixo valor', async () => {
    const service = new HumanApprovalGateService({} as PrismaClient);

    const result = await service.evaluateAction({
      organizationId: 'org-123',
      agentRole: 'SDR',
      actionType: 'SCHEDULE_MEETING',
      payload: { leadId: 'lead-1' },
      estimatedValueUsd: 1000,
    });

    expect(result.requiresApproval).toBe(false);
  });

  it('exige aprovação humana para ações críticas como desconto', async () => {
    const mockDb = {
      aIPendingAction: {
        create: vi.fn().mockResolvedValue({ id: 'action-pending-10' }),
      },
    } as unknown as PrismaClient;

    const service = new HumanApprovalGateService(mockDb);

    const result = await service.evaluateAction({
      organizationId: 'org-123',
      agentRole: 'Closer',
      actionType: 'APPLY_DISCOUNT',
      payload: { discountPercentage: 25 },
    });

    expect(result.requiresApproval).toBe(true);
    expect(result.pendingActionId).toBe('action-pending-10');
    expect(result.reason).toContain('Ação crítica');
    expect(mockDb.aIPendingAction.create).toHaveBeenCalled();
  });

  it('exige aprovação humana para negócios acima do teto de valor', async () => {
    const mockDb = {
      aIPendingAction: {
        create: vi.fn().mockResolvedValue({ id: 'action-pending-99' }),
      },
    } as unknown as PrismaClient;

    const service = new HumanApprovalGateService(mockDb);

    const result = await service.evaluateAction({
      organizationId: 'org-123',
      agentRole: 'Supervisor',
      actionType: 'SEND_PROPOSAL',
      payload: { dealValue: 12000 },
      estimatedValueUsd: 12000,
    });

    expect(result.requiresApproval).toBe(true);
    expect(result.reason).toContain('excede o limite de autonomia');
  });
});
