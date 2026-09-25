import { type NextFunction, type Request, type Response, Router } from 'express';
import { routeParam } from '../../../shared/http/routeParams.js';
import type { AuthRequest } from '../../../shared/middlewares/authenticateToken.js';
import { createSavedView, deleteSavedView, listSavedViews } from '../services/savedView.service.js';

const router = Router();

router.get('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { organizationId, id: userId } = (req as AuthRequest).user;
    const views = await listSavedViews(organizationId, userId);
    res.json({ success: true, data: views });
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { organizationId, id: userId } = (req as AuthRequest).user;
    const view = await createSavedView(organizationId, userId, req.body);
    res.status(201).json({ success: true, data: view });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { organizationId, id: userId } = (req as AuthRequest).user;
    await deleteSavedView(organizationId, userId, routeParam(req.params.id, 'id'));
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export const savedViewRoutes = router;
