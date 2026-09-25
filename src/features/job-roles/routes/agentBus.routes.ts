import { type NextFunction, type Request, type Response, Router } from 'express';
import { z } from 'zod';
import { routeParam } from '../../../shared/http/routeParams.js';
import type { AuthRequest } from '../../../shared/middlewares/authenticateToken.js';
import { validateRequest } from '../../../shared/middlewares/validateRequest.js';
import {
  AgentBusServiceError,
  acceptHandoff,
  cancelHandoff,
  completeHandoff,
  failHandoff,
  getHandoff,
  listHandoffsForMission,
  listPendingHandoffsForRole,
  publishHandoff,
} from '../services/agentBus.service.js';

const router = Router();

function handleServiceError(error: unknown, next: NextFunction, res: Response): void {
  if (error instanceof AgentBusServiceError) {
    res.status(error.statusCode).json({ success: false, error: error.message, code: error.code });
    return;
  }
  next(error);
}

// PROMPT 8 — Agent Bus + Handoffs. Identidade/tenant sempre da sessão autenticada (mesmo padrão de
// `accessRequest.routes.ts`) — o corpo nunca informa `organizationId`/`userRole`.
const evidenceItemSchema = z.object({
  sourceAgent: z.string().trim().min(1, 'sourceAgent é obrigatório.'),
  sourceExecutionId: z.string().trim().min(1).optional(),
  capabilityCode: z.string().trim().min(1).optional(),
  summary: z.string().trim().min(1, 'summary é obrigatório.'),
  recordedAt: z.string().trim().min(1, 'recordedAt é obrigatório.'),
});

const factOrRiskSchema = z
  .record(z.string(), z.unknown())
  .refine((obj) => Object.keys(obj).length > 0, {
    message: 'Cada item precisa de ao menos um campo — nunca um objeto vazio.',
  });

const publishSchema = z.object({
  missionId: z.string().trim().min(1, 'missionId é obrigatório.'),
  conversationId: z.string().trim().min(1, 'conversationId é obrigatório.'),
  fromAgent: z.string().trim().min(1, 'fromAgent é obrigatório.'),
  fromRole: z.string().trim().min(1, 'fromRole é obrigatório.'),
  toAgent: z.string().trim().min(1, 'toAgent é obrigatório.'),
  toRole: z.string().trim().min(1, 'toRole é obrigatório.'),
  requestType: z.string().trim().min(1, 'requestType é obrigatório.'),
  requestedCapability: z.string().trim().min(1, 'requestedCapability é obrigatório.'),
  resourceScope: z.record(z.string(), z.unknown()).optional(),
  knownFacts: z.array(factOrRiskSchema).optional(),
  evidence: z.array(evidenceItemSchema).optional(),
  risks: z.array(factOrRiskSchema).optional(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).optional(),
  idempotencyKey: z.string().trim().min(1).max(200).optional(),
  parentHandoffId: z.string().trim().min(1).optional(),
});

router.post(
  '/',
  validateRequest(publishSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authReq = req as AuthRequest;
      const body = req.body as z.infer<typeof publishSchema>;
      const handoff = await publishHandoff({
        actor: {
          userId: authReq.user.id,
          organizationId: authReq.user.organizationId,
          userRole: authReq.user.role,
        },
        ...body,
      });
      res.status(201).json({ success: true, data: { handoff } });
    } catch (error) {
      handleServiceError(error, next, res);
    }
  },
);

// GET /pending vem antes de /:id — rota literal sempre precede o parametrizado no Express (mesmo
// cuidado de `accessRequest.routes.ts` com `/pending-approvals`).
router.get('/pending', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    const handoffs = await listPendingHandoffsForRole(
      authReq.user.organizationId,
      authReq.user.id,
      authReq.user.role,
    );
    res.json({ success: true, data: { handoffs } });
  } catch (error) {
    next(error);
  }
});

const missionQuerySchema = z.object({
  missionId: z.string().trim().min(1, 'missionId é obrigatório.'),
});

router.get('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    const { missionId } = missionQuerySchema.parse({ missionId: req.query.missionId });
    const handoffs = await listHandoffsForMission(authReq.user.organizationId, missionId);
    res.json({ success: true, data: { handoffs } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: 'missionId é obrigatório na query.' });
      return;
    }
    next(error);
  }
});

router.get('/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    const handoff = await getHandoff(authReq.user.organizationId, routeParam(req.params.id, 'id'));
    res.json({ success: true, data: { handoff } });
  } catch (error) {
    handleServiceError(error, next, res);
  }
});

router.post(
  '/:id/accept',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authReq = req as AuthRequest;
      const handoff = await acceptHandoff({
        actor: {
          userId: authReq.user.id,
          organizationId: authReq.user.organizationId,
          userRole: authReq.user.role,
        },
        handoffId: routeParam(req.params.id, 'id'),
      });
      res.json({ success: true, data: { handoff } });
    } catch (error) {
      handleServiceError(error, next, res);
    }
  },
);

const completeSchema = z.object({
  response: z.record(z.string(), z.unknown()).optional(),
  confidence: z.number().min(0).max(1).optional(),
});

router.post(
  '/:id/complete',
  validateRequest(completeSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authReq = req as AuthRequest;
      const { response, confidence } = req.body as z.infer<typeof completeSchema>;
      const handoff = await completeHandoff({
        actor: {
          userId: authReq.user.id,
          organizationId: authReq.user.organizationId,
          userRole: authReq.user.role,
        },
        handoffId: routeParam(req.params.id, 'id'),
        response,
        confidence,
      });
      res.json({ success: true, data: { handoff } });
    } catch (error) {
      handleServiceError(error, next, res);
    }
  },
);

const failSchema = z.object({
  errorMessage: z.string().trim().min(1, 'errorMessage é obrigatório.').max(2000),
  outcome: z.enum(['FAILED', 'DENIED']).optional(),
});

router.post(
  '/:id/fail',
  validateRequest(failSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authReq = req as AuthRequest;
      const { errorMessage, outcome } = req.body as z.infer<typeof failSchema>;
      const handoff = await failHandoff({
        actor: {
          userId: authReq.user.id,
          organizationId: authReq.user.organizationId,
          userRole: authReq.user.role,
        },
        handoffId: routeParam(req.params.id, 'id'),
        errorMessage,
        outcome,
      });
      res.json({ success: true, data: { handoff } });
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
      const handoff = await cancelHandoff({
        actor: {
          userId: authReq.user.id,
          organizationId: authReq.user.organizationId,
          userRole: authReq.user.role,
        },
        handoffId: routeParam(req.params.id, 'id'),
      });
      res.json({ success: true, data: { handoff } });
    } catch (error) {
      handleServiceError(error, next, res);
    }
  },
);

export const agentBusRoutes = router;
