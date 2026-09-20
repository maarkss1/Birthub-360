import { describe, expect, it, vi } from 'vitest';
import type { Request, Response } from 'express';
import { LeadController } from '../../../../../src/features/crm/presentation/LeadController';
import type { LeadUseCases } from '../../../../../src/features/crm/application/LeadUseCases';

// CRM-010: GET /api/leads não pode mais aceitar um `limit` sem teto — o controller agora delega
// o cap para `clampQueryLimit` (src/shared/http/queryLimit.ts), compartilhado com
// ContactController e CompanyController.
// Evidência: docs/audits/repository-debt-audit/agents/CRM.md (CRM-010).
describe('LeadController.getLeads — cap de limit (CRM-010)', () => {
  function buildReqRes(limitQuery: string) {
    const req = {
      user: { organizationId: 'org-1' },
      query: { limit: limitQuery },
    } as unknown as Request;
    const res = { json: vi.fn() } as unknown as Response;
    const next = vi.fn();
    return { req, res, next };
  }

  it('reduz um limit=99999 ao teto de 200', async () => {
    const findLeads = vi.fn().mockResolvedValue({ data: [], meta: { total: 0 } });
    const controller = new LeadController({ findLeads } as unknown as LeadUseCases);
    const { req, res, next } = buildReqRes('99999');

    await controller.getLeads(req, res, next);

    expect(findLeads).toHaveBeenCalledTimes(1);
    const [, , , limitArg] = findLeads.mock.calls[0];
    expect(limitArg).toBe(200);
    expect(next).not.toHaveBeenCalled();
  });

  it('mantém um limit razoável (30) inalterado', async () => {
    const findLeads = vi.fn().mockResolvedValue({ data: [], meta: { total: 0 } });
    const controller = new LeadController({ findLeads } as unknown as LeadUseCases);
    const { req, res, next } = buildReqRes('30');

    await controller.getLeads(req, res, next);

    const [, , , limitArg] = findLeads.mock.calls[0];
    expect(limitArg).toBe(30);
  });
});
