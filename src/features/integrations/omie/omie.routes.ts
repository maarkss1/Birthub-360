import { Router, type Request, type Response, type NextFunction } from 'express';
import type { AuthRequest } from '../../../shared/middlewares/authenticateToken.js';
import { routeParam } from '../../../shared/http/routeParams.js';
import { requireRole } from '../../../shared/middlewares/requireRole.js';
import {
  listOmieConnections,
  connectOmie,
  disconnectOmie,
  testOmieConnection,
  upsertOmieCustomer,
} from './omie.service.js';

const router = Router();
const managementRoles = requireRole(['ADMIN', 'GESTOR']);

router.get('/connections', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { organizationId } = (req as AuthRequest).user;
    const data = await listOmieConnections(organizationId);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.post(
  '/connect',
  managementRoles,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId } = (req as AuthRequest).user;
      const data = await connectOmie(organizationId, req.body);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  '/disconnect/:connectionId',
  managementRoles,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId } = (req as AuthRequest).user;
      await disconnectOmie(organizationId, routeParam(req.params.connectionId, 'connectionId'));
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  '/connections/:connectionId/test',
  managementRoles,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId } = (req as AuthRequest).user;
      const data = await testOmieConnection(
        organizationId,
        routeParam(req.params.connectionId, 'connectionId'),
      );
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  '/connections/:connectionId/customers',
  managementRoles,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId } = (req as AuthRequest).user;
      const data = await upsertOmieCustomer(
        organizationId,
        routeParam(req.params.connectionId, 'connectionId'),
        req.body,
      );
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },
);

export const omieRoutes = router;
