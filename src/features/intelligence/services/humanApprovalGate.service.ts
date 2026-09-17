import type { Prisma, PrismaClient } from '@prisma/client';
import { prisma as defaultPrisma } from '../../../lib/prisma.js';

export interface ActionApprovalRequest {
  organizationId: string;
  agentRole: 'Supervisor' | 'SDR' | 'BDR' | 'Closer' | 'Ops';
  actionType: 'SEND_PROPOSAL' | 'APPLY_DISCOUNT' | 'SCHEDULE_MEETING' | 'DELETE_RECORD';
  payload: Record<string, unknown>;
  estimatedValueUsd?: number;
}

export interface ApprovalCheckResult {
  requiresApproval: boolean;
  reason?: string;
  pendingActionId?: string;
}

export class HumanApprovalGateService {
  constructor(private db: PrismaClient = defaultPrisma) {}

  async evaluateAction(request: ActionApprovalRequest): Promise<ApprovalCheckResult> {
    const CRITICAL_ACTIONS = ['APPLY_DISCOUNT', 'DELETE_RECORD'];
    const HIGH_VALUE_THRESHOLD = 5000;

    const isCriticalType = CRITICAL_ACTIONS.includes(request.actionType);
    const isHighValue = (request.estimatedValueUsd ?? 0) > HIGH_VALUE_THRESHOLD;

    if (!isCriticalType && !isHighValue) {
      return { requiresApproval: false };
    }

    const reason = isCriticalType
      ? `Ação crítica (${request.actionType}) requer homologação de gestor humano`
      : `Valor estimado ($${request.estimatedValueUsd}) excede o limite de autonomia ($${HIGH_VALUE_THRESHOLD})`;

    const pendingAction = await this.db.aIPendingAction.create({
      data: {
        organizationId: request.organizationId,
        entity: 'Lead',
        action: request.actionType,
        agentRole: request.agentRole,
        riskLevel: isCriticalType || isHighValue ? 'high' : 'low',
        idempotencyKey: `approval_gate:${request.organizationId}:${request.actionType}:${Date.now()}`,
        payload: request.payload as unknown as Prisma.InputJsonValue,
        reason,
      },
    });

    return {
      requiresApproval: true,
      reason,
      pendingActionId: pendingAction.id,
    };
  }
}

export const humanApprovalGateService = new HumanApprovalGateService();
