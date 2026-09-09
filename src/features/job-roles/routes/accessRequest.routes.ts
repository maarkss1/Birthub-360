import { type NextFunction, type Request, type Response, Router } from 'express';
import { z } from 'zod';
import type { AuthRequest } from '../../../shared/middlewares/authenticateToken.js';
import { validateRequest } from '../../../shared/middlewares/validateRequest.js';
import { routeParam } from '../../../shared/http/routeParams.js';
import {
  AccessRequestServiceError,
  cancelAccessRequest,
  createAccessRequest,
  decideAccessRequest,
  listMyAccessRequests,
  listPendingApprovalsForApprover,
  revokeTemporaryCapabilityGrant,
} from '../services/accessRequest.service.js';

const router = Router();

function handleServiceError(error: unknown, next: NextFunction, res: Response): void {
  if (error instanceof AccessRequestServiceError) {
    res.status(error.statusCode).json({ success: false, error: error.message, code: error.code });
    return;
  }
  next(error);
}

// PROMPT 7 — Cross-Role Authorization + Aprovações. Identidade/tenant sempre da sessão
// autenticada (mesmo padrão de `role-supervisor.routes.ts`/`capability.routes.ts`) — o corpo
// nunca informa `requesterId`/`organizationId`/`userRole`.
const createSchema = z.object({
  capabilityCode: z.string().trim().min(1, 'capabilityCode é obrigatório.'),
  resource: z.record(z.string(), z.unknown()),
  reason: z.string().trim().min(1, 'reason é obrigatório.').max(2000),
});

router.post(
  '/',
  validateRequest(createSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authReq = req as AuthRequest;
      const { capabilityCode, resource, reason } = req.body as z.infer<typeof createSchema>;
      const accessRequest = await createAccessRequest({
        actor: {
          userId: authReq.user.id,
          organizationId: authReq.user.organizationId,
          userRole: authReq.user.role,
        },
        capabilityCode,
        resource,
        reason,
      });
      res.status(201).json({ success: true, data: { accessRequest } });
    } catch (error) {
      handleServiceError(error, next, res);
    }
  },
);

router.get('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    const accessRequests = await listMyAccessRequests(authReq.user.organizationId, authReq.user.id);
    res.json({ success: true, data: { accessRequests } });
  } catch (error) {
    next(error);
  }
});

// GET /pending-approvals vem antes de /:id — rota literal sempre precede o parametrizado no
// Express (mesmo cuidado de `capability.routes.ts` com `/check`).
router.get(
  '/pending-approvals',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authReq = req as AuthRequest;
      const accessRequests = await listPendingApprovalsForApprover(
        authReq.user.organizationId,
        authReq.user.id,
        authReq.user.role,
      );
      res.json({ success: true, data: { accessRequests } });
    } catch (error) {
      next(error);
    }
  },
);

const decideSchema = z.object({
  notes: z.string().trim().max(2000).optional(),
  expiresInHours: z
    .number()
    .int()
    .positive()
    .max(24 * 7)
    .optional(),
});

router.post(
  '/:id/approve',
  validateRequest(decideSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authReq = req as AuthRequest;
      const { notes, expiresInHours } = req.body as z.infer<typeof decideSchema>;
      const accessRequest = await decideAccessRequest({
        organizationId: authReq.user.organizationId,
        accessRequestId: routeParam(req.params.id, 'id'),
        approverId: authReq.user.id,
        approverRole: authReq.user.role,
        outcome: 'APPROVED',
        notes,
        expiresInHours,
      });
      res.json({ success: true, data: { accessRequest } });
    } catch (error) {
      handleServiceError(error, next, res);
    }
  },
);

const denySchema = z.object({ notes: z.string().trim().max(2000).optional() });

router.post(
  '/:id/deny',
  validateRequest(denySchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authReq = req as AuthRequest;
      const { notes } = req.body as z.infer<typeof denySchema>;
      const accessRequest = await decideAccessRequest({
        organizationId: authReq.user.organizationId,
        accessRequestId: routeParam(req.params.id, 'id'),
        approverId: authReq.user.id,
        approverRole: authReq.user.role,
        outcome: 'DENIED',
        notes,
      });
      res.json({ success: true, data: { accessRequest } });
    } catch (error) {
      handleServiceError(error, next, res);
    }
  },
);

router.post(
  '/:id/cancel',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authReq = req as AuthRequest;
      const accessRequest = await cancelAccessRequest({
        organizationId: authReq.user.organizationId,
        requesterId: authReq.user.id,
        requesterRole: authReq.user.role,
        accessRequestId: routeParam(req.params.id, 'id'),
      });
      res.json({ success: true, data: { accessRequest } });
    } catch (error) {
      handleServiceError(error, next, res);
    }
  },
);

const revokeSchema = z.object({
  reason: z.string().trim().min(1, 'reason é obrigatório.').max(2000),
});

router.post(
  '/grants/:grantId/revoke',
  validateRequest(revokeSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authReq = req as AuthRequest;
      const { reason } = req.body as z.infer<typeof revokeSchema>;
      await revokeTemporaryCapabilityGrant({
        organizationId: authReq.user.organizationId,
        revokerId: authReq.user.id,
        revokerRole: authReq.user.role,
        grantId: routeParam(req.params.grantId, 'grantId'),
        reason,
      });
      res.json({ success: true, data: { revoked: true } });
    } catch (error) {
      handleServiceError(error, next, res);
    }
  },
);

export const accessRequestRoutes = router;
