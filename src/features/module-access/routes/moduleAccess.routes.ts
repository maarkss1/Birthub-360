import { Router, type Request, type Response, type NextFunction } from 'express';
import type { AuthRequest } from '../../../shared/middlewares/authenticateToken.js';
import { requireRole } from '../../../shared/middlewares/requireRole.js';
import { routeParam } from '../../../shared/http/routeParams.js';
import { MODULE_CATALOG } from '../../../config/module-catalog.js';
import {
  getModuleAccessMatrix,
  listGrantedModulesForUser,
  grantModuleAccess,
  revokeModuleAccess,
  ModuleAccessServiceError,
} from '../services/moduleAccess.service.js';

const router = Router();

// Precisa vir ANTES do requireRole(['ADMIN']) abaixo: qualquer usuário autenticado precisa saber
// quais módulos executivos ele mesmo pode abrir (Hub/RequireModuleAccess), não só o ADMIN que
// gerencia a concessão dos outros.
router.get('/me', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    const grantedModules = await listGrantedModulesForUser(
      authReq.user.organizationId,
      authReq.user.id,
    );
    res.json({ success: true, data: { grantedModules } });
  } catch (error) {
    next(error);
  }
});

router.use(requireRole(['ADMIN']));

router.get('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const users = await getModuleAccessMatrix((req as AuthRequest).user.organizationId);
    res.json({ success: true, data: { users, modules: MODULE_CATALOG } });
  } catch (error) {
    next(error);
  }
});

router.put(
  '/:userId/:moduleKey',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authReq = req as AuthRequest;
      await grantModuleAccess({
        organizationId: authReq.user.organizationId,
        userId: routeParam(req.params.userId, 'userId'),
        moduleKey: routeParam(req.params.moduleKey, 'moduleKey'),
        grantedByUserId: authReq.user.id,
      });
      res.json({ success: true });
    } catch (error) {
      if (error instanceof ModuleAccessServiceError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
        return;
      }
      next(error);
    }
  },
);

router.delete(
  '/:userId/:moduleKey',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authReq = req as AuthRequest;
      await revokeModuleAccess({
        organizationId: authReq.user.organizationId,
        userId: routeParam(req.params.userId, 'userId'),
        moduleKey: routeParam(req.params.moduleKey, 'moduleKey'),
      });
      res.json({ success: true });
    } catch (error) {
      if (error instanceof ModuleAccessServiceError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
        return;
      }
      next(error);
    }
  },
);

export const moduleAccessRoutes = router;
