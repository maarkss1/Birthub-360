import { Router, type Request, type Response, type NextFunction } from 'express';
import type { AuthRequest } from '../../../shared/middlewares/authenticateToken.js';
import { routeParam } from '../../../shared/http/routeParams.js';
import { requireRole } from '../../../shared/middlewares/requireRole.js';
import {
  listSlackConnections,
  connectSlack,
  disconnectSlack,
  sendSlackMessage,
  testSlackConnection,
} from './slack.service.js';

const router = Router();
const managementRoles = requireRole(['ADMIN', 'GESTOR']);

router.get('/connections', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { organizationId } = (req as AuthRequest).user;
    const data = await listSlackConnections(organizationId);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.post('/connect', managementRoles, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { organizationId } = (req as AuthRequest).user;
    const data = await connectSlack(organizationId, req.body);
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
      await disconnectSlack(organizationId, routeParam(req.params.connectionId, 'connectionId'));
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
      const data = await testSlackConnection(
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
  '/connections/:connectionId/message',
  managementRoles,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId } = (req as AuthRequest).user;
      const { text, channel } = req.body;
      const data = await sendSlackMessage(
        organizationId,
        routeParam(req.params.connectionId, 'connectionId'),
        text,
        channel,
      );
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },
);

export const slackRoutes = router;
