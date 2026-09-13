import { type NextFunction, type Request, type Response, Router } from 'express';
import { hasRequiredRole } from '../../../lib/auth/authorization.js';
import type { AuthRequest } from '../../../shared/middlewares/authenticateToken.js';
import {
  addDailyPlanItemNote,
  completeDailyPlanItem,
  createDailyPlanActivity,
  createDailyPlanClosing,
  type DailyPlanItemOrigin,
  fetchDailyPlanItemNotes,
  fetchUserDailyPlan,
  getPendingDailyClosing,
} from './bitrix.service.js';

/**
 * Rotas do Plano Diário Operacional (sincronizado com Bitrix24) — extraídas de `bitrix.routes.ts`
 * (ver check-hotspots.ts / HOTSPOT_EXCEPTIONS.md, arquivo tinha passado de 1000 linhas). Montado
 * dentro do router principal de `/api/bitrix` (mesmo prefixo, sem middleware próprio — a
 * autenticação já é aplicada mais acima na composição de rotas).
 */
const router = Router();

router.get(
  '/daily-plan',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { organizationId, id: userId, email, role } = (req as AuthRequest).user;
      let overrideBitrixUserId: string | undefined;

      // Se for ADMIN/GESTOR e passou assignedById na query, permite ver o plano de outro membro
      if (hasRequiredRole(role, ['ADMIN', 'GESTOR']) && req.query.assignedById) {
        overrideBitrixUserId = String(req.query.assignedById);
      }

      const plan = await fetchUserDailyPlan(
        organizationId,
        email,
        userId,
        undefined,
        overrideBitrixUserId,
      );
      res.json({ success: true, data: plan });
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  '/daily-plan/sync',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { organizationId, id: userId, email, role } = (req as AuthRequest).user;
      let overrideBitrixUserId: string | undefined;

      if (hasRequiredRole(role, ['ADMIN', 'GESTOR']) && req.body.assignedById) {
        overrideBitrixUserId = String(req.body.assignedById);
      }

      const plan = await fetchUserDailyPlan(
        organizationId,
        email,
        userId,
        undefined,
        overrideBitrixUserId,
      );
      res.json({ success: true, data: plan, message: 'Plano diário sincronizado com o Bitrix24.' });
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  '/daily-plan/complete',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { organizationId, id: userId } = (req as AuthRequest).user;
      const { itemType, itemId } = req.body;
      if (!itemType || !itemId) {
        res.status(400).json({ success: false, error: 'itemType e itemId são obrigatórios.' });
        return;
      }
      const result = await completeDailyPlanItem(organizationId, userId, itemType, itemId);
      res.json({ success: true, message: result.message });
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  '/daily-plan/note',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { organizationId, id: userId } = (req as AuthRequest).user;
      const { itemType, itemId, note, entityType, entityId } = req.body;
      if (!itemType || !itemId || !note) {
        res.status(400).json({
          success: false,
          error: 'itemType, itemId e note são obrigatórios.',
        });
        return;
      }
      const result = await addDailyPlanItemNote(
        organizationId,
        userId,
        itemType,
        itemId,
        note,
        entityType,
        entityId,
      );
      res.json({ success: true, message: result.message });
    } catch (error) {
      next(error);
    }
  },
);

router.get(
  '/daily-plan/notes',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { organizationId } = (req as AuthRequest).user;
      const { itemType, itemId, entityType, entityId } = req.query;
      if (!itemType || !itemId) {
        res.status(400).json({ success: false, error: 'itemType e itemId são obrigatórios.' });
        return;
      }
      const notes = await fetchDailyPlanItemNotes(
        organizationId,
        itemType as DailyPlanItemOrigin,
        String(itemId),
        entityType ? String(entityType) : undefined,
        entityId ? String(entityId) : undefined,
      );
      res.json({ success: true, data: notes });
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  '/daily-plan/activity',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { organizationId, id: userId, email } = (req as AuthRequest).user;
      const { title, channel, contactName, phone, dueTime, observations, leadId } = req.body;
      if (!title || !channel) {
        res.status(400).json({ success: false, error: 'title e channel são obrigatórios.' });
        return;
      }
      const result = await createDailyPlanActivity(organizationId, userId, email, {
        title,
        channel,
        contactName,
        phone,
        dueTime,
        observations,
        leadId,
      });
      res.json({ success: true, message: result.message });
    } catch (error) {
      next(error);
    }
  },
);

router.get(
  '/daily-plan/closing/pending',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { organizationId, id: userId } = (req as AuthRequest).user;
      const result = await getPendingDailyClosing(organizationId, userId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  '/daily-plan/closing',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { organizationId, id: userId } = (req as AuthRequest).user;
      const { referenceDate, userComment, nextDayGoals } = req.body;
      if (!referenceDate || !userComment) {
        res
          .status(400)
          .json({ success: false, error: 'referenceDate e userComment são obrigatórios.' });
        return;
      }
      await createDailyPlanClosing(organizationId, userId, {
        referenceDate,
        userComment,
        nextDayGoals: Array.isArray(nextDayGoals) ? nextDayGoals : [],
      });
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  },
);

export const dailyPlanRoutes = router;
