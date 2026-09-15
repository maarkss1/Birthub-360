import type { NextFunction, Request, Response } from 'express';
import type { AuthRequest } from '../../../shared/middlewares/authenticateToken';
import type { CompanyDeduplicationService } from '../application/CompanyDeduplicationService';

/**
 * Item 13 (Inteligência de Dados & Enriquecimento) — mesmo padrão de dois passos do
 * `LeadDedupController`: preview (só leitura) e merge (destrutivo, soft-delete + limpeza da
 * cadeia de Account Intelligence da empresa duplicada) exigem confirmação explícita separada.
 */
export class CompanyDedupController {
  constructor(private companyDeduplicationService: CompanyDeduplicationService) {}

  preview = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId: orgId } = (req as AuthRequest).user;
      const result = await this.companyDeduplicationService.previewDuplicates(orgId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };

  merge = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId: orgId } = (req as AuthRequest).user;
      const result = await this.companyDeduplicationService.deduplicate(orgId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };
}
