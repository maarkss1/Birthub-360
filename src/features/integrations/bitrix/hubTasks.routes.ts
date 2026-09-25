import { type NextFunction, type Request, type Response, Router } from 'express';
import { routeParam } from '../../../shared/http/routeParams.js';
import type { AuthRequest } from '../../../shared/middlewares/authenticateToken.js';
import {
  createHubTask,
  listHubTaskAssignees,
  listHubTasks,
  toggleHubTask,
} from './service/hubTasks.service.js';

/**
 * Widget "Tarefas pendentes" do Hub Executivo (Sincronizado com Bitrix24) — pedido explícito do
 * usuário: as tarefas delegadas aqui são tarefas REAIS do Bitrix24 (`tasks.task.*`), não um estado
 * local. Ver o comentário de topo de `service/hubTasks.service.ts`.
 *
 * Router próprio (em vez de mais rotas dentro de `bitrix.routes.ts`) porque `bitrix.routes.ts` já
 * é o maior arquivo do repo e bateu no limite de 1000 linhas do gate de hotspots
 * (`scripts/architecture/check-hotspots.ts`) — mesma decisão de decomposição já aplicada ao
 * `bitrix.service.ts` (ver o comentário de topo daquele arquivo). Montado sob o mesmo prefixo
 * `/api/bitrix` em `bootstrap/routes.ts`, então o contrato de API não muda.
 */
const router = Router();

router.get('/hub-tasks', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { organizationId, id: userId, email } = (req as AuthRequest).user;
    const user = { id: userId, email };
    const [tasks, assignees] = await Promise.all([
      listHubTasks(organizationId, user),
      listHubTaskAssignees(organizationId),
    ]);
    res.json({ success: true, data: { tasks, assignees } });
  } catch (error) {
    next(error);
  }
});

router.post(
  '/hub-tasks',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { organizationId, id: userId, email } = (req as AuthRequest).user;
      const { text, assigneeId } = req.body;
      if (!text || !assigneeId) {
        res.status(400).json({ success: false, error: 'text e assigneeId são obrigatórios.' });
        return;
      }
      const tasks = await createHubTask(
        organizationId,
        { id: userId, email },
        { text: String(text), assigneeId: String(assigneeId) },
      );
      res.json({ success: true, data: { tasks } });
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  '/hub-tasks/:id/toggle',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { organizationId, id: userId, email } = (req as AuthRequest).user;
      const taskId = routeParam(req.params.id, 'id');
      const { done } = req.body;
      const tasks = await toggleHubTask(organizationId, { id: userId, email }, taskId, !!done);
      res.json({ success: true, data: { tasks } });
    } catch (error) {
      next(error);
    }
  },
);

export const hubTasksRoutes = router;
