import { type NextFunction, type Request, type Response, Router } from 'express';
import { z } from 'zod';
import { routeParam } from '../../../shared/http/routeParams.js';
import type { AuthRequest } from '../../../shared/middlewares/authenticateToken.js';
import { validateRequest } from '../../../shared/middlewares/validateRequest.js';
import {
  AgentBuilderServiceError,
  decideAgentBuildProposal,
  getAgentBuildProposal,
  listAgentBuildProposals,
  proposeAgentBuild,
} from '../services/agentBuilder.service.js';

const router = Router();

function handleServiceError(error: unknown, next: NextFunction, res: Response): void {
  if (error instanceof AgentBuilderServiceError) {
    res.status(error.statusCode).json({ success: false, error: error.message, code: error.code });
    return;
  }
  next(error);
}

// PROMPT 10 — Agent Builder / Fábrica de Agentes. Identidade/tenant sempre da sessão autenticada
// (mesmo padrão de `memory.routes.ts`/`agentBus.routes.ts`) — o corpo nunca informa
// `organizationId`/`userRole`.
const proposeSchema = z.object({
  need: z.string().trim().min(1, 'need é obrigatório.').max(2000),
  targetJobRoleCode: z.string().trim().min(1).optional(),
  domain: z.string().trim().min(1).max(100).optional(),
});

router.post(
  '/proposals',
  validateRequest(proposeSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authReq = req as AuthRequest;
      const body = req.body as z.infer<typeof proposeSchema>;
      const proposal = await proposeAgentBuild({
        actor: {
          userId: authReq.user.id,
          organizationId: authReq.user.organizationId,
          userRole: authReq.user.role,
        },
        ...body,
      });
      res.status(201).json({ success: true, data: { proposal } });
    } catch (error) {
      handleServiceError(error, next, res);
    }
  },
);

const proposalStatusSchema = z.enum([
  'DRAFT',
  'GAP_NOT_CONFIRMED',
  'UNDER_REVIEW',
  'APPROVED_FOR_DEVELOPMENT',
  'REJECTED',
]);

router.get('/proposals', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    const parsedStatus = proposalStatusSchema.safeParse(req.query.status);
    if (req.query.status !== undefined && !parsedStatus.success) {
      res.status(400).json({ success: false, error: 'status inválido.' });
      return;
    }
    const proposals = await listAgentBuildProposals(
      authReq.user.organizationId,
      parsedStatus.success ? parsedStatus.data : undefined,
    );
    res.json({ success: true, data: { proposals } });
  } catch (error) {
    next(error);
  }
});

router.get(
  '/proposals/:id',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authReq = req as AuthRequest;
      const proposal = await getAgentBuildProposal(
        authReq.user.organizationId,
        routeParam(req.params.id, 'id'),
      );
      res.json({ success: true, data: { proposal } });
    } catch (error) {
      handleServiceError(error, next, res);
    }
  },
);

const decideSchema = z.object({ notes: z.string().trim().max(2000).optional() });

router.post(
  '/proposals/:id/approve',
  validateRequest(decideSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authReq = req as AuthRequest;
      const { notes } = req.body as z.infer<typeof decideSchema>;
      const proposal = await decideAgentBuildProposal({
        actor: {
          userId: authReq.user.id,
          organizationId: authReq.user.organizationId,
          userRole: authReq.user.role,
        },
        proposalId: routeParam(req.params.id, 'id'),
        outcome: 'APPROVED_FOR_DEVELOPMENT',
        notes,
      });
      res.json({ success: true, data: { proposal } });
    } catch (error) {
      handleServiceError(error, next, res);
    }
  },
);

router.post(
  '/proposals/:id/reject',
  validateRequest(decideSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authReq = req as AuthRequest;
      const { notes } = req.body as z.infer<typeof decideSchema>;
      const proposal = await decideAgentBuildProposal({
        actor: {
          userId: authReq.user.id,
          organizationId: authReq.user.organizationId,
          userRole: authReq.user.role,
        },
        proposalId: routeParam(req.params.id, 'id'),
        outcome: 'REJECTED',
        notes,
      });
      res.json({ success: true, data: { proposal } });
    } catch (error) {
      handleServiceError(error, next, res);
    }
  },
);

export const agentBuilderRoutes = router;
