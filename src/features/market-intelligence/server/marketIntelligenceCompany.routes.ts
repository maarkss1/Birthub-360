import type { NextFunction, Request, Response } from 'express';
import { Router } from 'express';

import type { AuthRequest } from '../../../shared/middlewares/authenticateToken.js';
import { AppError } from '../../../shared/middlewares/errorHandler.js';
import { requireRole } from '../../../shared/middlewares/requireRole.js';
import { getAccountIntelligence } from './accountIntelligence.service.js';
import {
  approveToPipeline,
  CompanyCatalogValidationError,
  listMarketIntelligenceCompanies,
  parseCompanyCatalogQuery,
} from './marketIntelligenceCompany.service.js';

/**
 * Expõe o catálogo global de inteligência de CNPJ (LDR) sob `/api/companies/market-intelligence`
 * — o path que `LdrAccountIntelligence.tsx` e `CompanyBranchesView.tsx` já chamam. A lógica de
 * negócio (`marketIntelligenceCompany.service.ts`, `getAccountIntelligence`) sempre existiu e
 * está correta; só nunca foi conectada a uma rota Express real (perdida numa reversão anterior,
 * PR #355, que restaurou o "núcleo" por-ID de `accountIntelligence.routes.ts` mas não este
 * catálogo por-CNPJ) — toda chamada caía no catch-all genérico de `/api/*` (404 "Not found",
 * texto cru em inglês sem nenhum contexto).
 *
 * Precisa ser montado em `src/bootstrap/routes.ts` ANTES de `/api/companies` (companyRoutes):
 * o path de 1 segmento `/api/companies/market-intelligence` (lista) colidiria com
 * `companyRoutes` `GET /:id` (que trataria "market-intelligence" como um id de empresa) se
 * `companyRoutes` fosse verificado primeiro.
 */
function asyncHandler(handler: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    handler(req, res).catch(next);
  };
}

/** Converte o erro de validação do catálogo (formato de CNPJ/UF/etc.) num 400 com a mesma
 * mensagem em português — sem isto, um erro de validação vazava como 500 genérico. */
function toAppError(err: unknown): never {
  if (err instanceof CompanyCatalogValidationError) {
    throw new AppError(err.message, 400);
  }
  throw err;
}

const router = Router();

// Defesa em profundidade — VISUALIZADOR é o menor papel canônico, então qualquer papel real pode
// ler; o mount real (routes.ts) ainda aplica authenticateToken + requireTenant.
router.use(requireRole(['VISUALIZADOR']));

router.get(
  '/',
  asyncHandler(async (req, res) => {
    try {
      const query = parseCompanyCatalogQuery(req.query as Record<string, unknown>);
      const result = await listMarketIntelligenceCompanies(query);
      res.json({ success: true, ...result });
    } catch (err) {
      toAppError(err);
    }
  }),
);

router.get(
  '/:cnpj/intelligence',
  asyncHandler(async (req, res) => {
    try {
      const result = await getAccountIntelligence(String(req.params.cnpj));
      if (!result.account) {
        throw new AppError(
          'CNPJ não encontrado no catálogo de inteligência do LDR (snapshot atual). Confira o número ou tente outra empresa do catálogo.',
          404,
        );
      }
      res.json({ success: true, data: result.account, dataset: result.dataset });
    } catch (err) {
      toAppError(err);
    }
  }),
);

router.post(
  '/:cnpj/approve-to-pipeline',
  requireRole(['ADMIN', 'GESTOR', 'CLOSER', 'SDR']),
  asyncHandler(async (req, res) => {
    const authReq = req as AuthRequest;
    try {
      const result = await approveToPipeline(
        authReq.user.organizationId,
        String(authReq.params.cnpj),
        authReq.user.id,
      );
      res.json({
        success: true,
        message: result.message,
        companyId: result.company.id,
        leadId: result.lead.id,
      });
    } catch (err) {
      toAppError(err);
    }
  }),
);

export const marketIntelligenceCompanyRoutes = router;
