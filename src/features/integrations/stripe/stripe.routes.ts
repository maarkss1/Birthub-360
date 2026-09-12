import { Router, type Request, type Response, type NextFunction } from 'express';
import type { AuthRequest } from '../../../shared/middlewares/authenticateToken.js';
import { routeParam } from '../../../shared/http/routeParams.js';
import { requireRole } from '../../../shared/middlewares/requireRole.js';
import {
  listStripeConnections,
  connectStripe,
  disconnectStripe,
  testStripeConnection,
  createStripeCharge,
  getStripeCharge,
} from './stripe.service.js';

const router = Router();
const managementRoles = requireRole(['ADMIN', 'GESTOR']);

router.get('/connections', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { organizationId } = (req as AuthRequest).user;
    const data = await listStripeConnections(organizationId);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.post('/connect', managementRoles, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { organizationId } = (req as AuthRequest).user;
    const data = await connectStripe(organizationId, req.body);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.post(
  '/disconnect/:connectionId',
  managementRoles,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId } = (req as AuthRequest).user;
      await disconnectStripe(organizationId, routeParam(req.params.connectionId, 'connectionId'));
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
      const data = await testStripeConnection(
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
  '/connections/:connectionId/charges',
  managementRoles,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId } = (req as AuthRequest).user;
      const data = await createStripeCharge(
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

router.get(
  '/connections/:connectionId/charges/:paymentId',
  managementRoles,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId } = (req as AuthRequest).user;
      const data = await getStripeCharge(
        organizationId,
        routeParam(req.params.connectionId, 'connectionId'),
        routeParam(req.params.paymentId, 'paymentId'),
      );
      if (!data) {
        res.status(404).json({ success: false, error: 'Cobrança não encontrada.' });
        return;
      }
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },
);

export const stripeRoutes = router;
