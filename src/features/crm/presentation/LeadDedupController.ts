import type { NextFunction, Request, Response } from 'express';
import type { AuthRequest } from '../../../shared/middlewares/authenticateToken.js';
import type { LeadDeduplicationService } from '../application/LeadDeduplicationService.js';

/**
 * CRM-002/003 (auditoria de débito técnico): caller real de LeadDeduplicationService, que até
 * a Onda CRM/RevOps era um serviço órfão (sem rota/job/cron nenhum). Dois passos de propósito —
 * preview (só leitura) e merge (destrutivo, soft-delete) — nunca um botão único que já mescla:
 * é uma operação irreversível o suficiente (soft-delete + reatribuição de ~20 relações) pra exigir
 * confirmação explícita do usuário depois de ver os grupos.
 */
export class LeadDedupController {
  constructor(private leadDeduplicationService: LeadDeduplicationService) {}

  preview = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId: orgId } = (req as AuthRequest).user;
      const result = await this.leadDeduplicationService.previewDuplicates(orgId);
      res.json({ success: true, data: result });
    } catch (error: any) {
      next(error);
    }
  };

  merge = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId: orgId } = (req as AuthRequest).user;
      const result = await this.leadDeduplicationService.deduplicateByEmail(orgId);
      res.json({ success: true, data: result });
    } catch (error: any) {
      next(error);
    }
  };
}
