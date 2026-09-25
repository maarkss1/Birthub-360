import { type NextFunction, type Request, type Response, Router } from 'express';
import { z } from 'zod';
import { routeParam } from '../../../shared/http/routeParams.js';
import type { AuthRequest } from '../../../shared/middlewares/authenticateToken.js';
import { validateRequest } from '../../../shared/middlewares/validateRequest.js';
import {
  createLearningCandidateFromExecution,
  decideLearningCandidate,
  getActiveAgentMemory,
  getActiveOrganizationMemory,
  getActiveRoleMemory,
  getCandidate,
  listCandidates,
  MemoryServiceError,
  rollbackMemory,
} from '../services/memory.service.js';

const router = Router();

function handleServiceError(error: unknown, next: NextFunction, res: Response): void {
  if (error instanceof MemoryServiceError) {
    res.status(error.statusCode).json({ success: false, error: error.message, code: error.code });
    return;
  }
  next(error);
}

// PROMPT 9 — Memória + Aprendizado Contínuo Governado. Identidade/tenant sempre da sessão
// autenticada (mesmo padrão de `agentBus.routes.ts`/`accessRequest.routes.ts`) — o corpo nunca
// informa `organizationId`/`userRole`.
const evidenceItemSchema = z.object({
  sourceAgent: z.string().trim().min(1, 'sourceAgent é obrigatório.'),
  sourceExecutionId: z.string().trim().min(1).optional(),
  capabilityCode: z.string().trim().min(1).optional(),
  summary: z.string().trim().min(1, 'summary é obrigatório.'),
  recordedAt: z.string().trim().min(1, 'recordedAt é obrigatório.'),
});

const createCandidateSchema = z.object({
  sourceExecutionId: z.string().trim().min(1, 'sourceExecutionId é obrigatório.'),
  targetScope: z.enum(['AGENT', 'ROLE', 'ORGANIZATION']),
  topic: z.string().trim().min(1, 'topic é obrigatório.'),
  category: z.enum([
    'PRICING',
    'DISCOUNT',
    'FORECAST_RULE',
    'CONTRACT',
    'FINANCE',
    'COMPLIANCE',
    'WRITE_AUTOMATION',
    'CAPABILITY',
    'OPERATIONAL',
  ]),
  proposedContent: z
    .record(z.string(), z.unknown())
    .and(z.object({ summary: z.string().trim().min(1, 'proposedContent.summary é obrigatório.') })),
  reflection: z
    .record(z.string(), z.unknown())
    .and(z.object({ rationale: z.string().trim().min(1, 'reflection.rationale é obrigatório.') })),
  evidence: z.array(evidenceItemSchema).optional(),
});

router.post(
  '/candidates',
  validateRequest(createCandidateSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authReq = req as AuthRequest;
      const body = req.body as z.infer<typeof createCandidateSchema>;
      const candidate = await createLearningCandidateFromExecution({
        actor: {
          userId: authReq.user.id,
          organizationId: authReq.user.organizationId,
          userRole: authReq.user.role,
        },
        ...body,
      });
      res.status(201).json({ success: true, data: { candidate } });
    } catch (error) {
      handleServiceError(error, next, res);
    }
  },
);

const candidateStatusSchema = z.enum([
  'PROPOSED',
  'UNDER_REVIEW',
  'APPROVED',
  'REJECTED',
  'SUPERSEDED',
  'ROLLED_BACK',
]);

router.get(
  '/candidates',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authReq = req as AuthRequest;
      const parsedStatus = candidateStatusSchema.safeParse(req.query.status);
      if (req.query.status !== undefined && !parsedStatus.success) {
        res.status(400).json({ success: false, error: 'status inválido.' });
        return;
      }
      const candidates = await listCandidates(
        authReq.user.organizationId,
        parsedStatus.success ? parsedStatus.data : undefined,
      );
      res.json({ success: true, data: { candidates } });
    } catch (error) {
      next(error);
    }
  },
);

router.get(
  '/candidates/:id',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authReq = req as AuthRequest;
      const candidate = await getCandidate(
        authReq.user.organizationId,
        routeParam(req.params.id, 'id'),
      );
      res.json({ success: true, data: { candidate } });
    } catch (error) {
      handleServiceError(error, next, res);
    }
  },
);

const decideSchema = z.object({
  notes: z.string().trim().max(2000).optional(),
  supersedesMemoryId: z.string().trim().min(1).optional(),
});

router.post(
  '/candidates/:id/approve',
  validateRequest(decideSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authReq = req as AuthRequest;
      const { notes, supersedesMemoryId } = req.body as z.infer<typeof decideSchema>;
      const candidate = await decideLearningCandidate({
        actor: {
          userId: authReq.user.id,
          organizationId: authReq.user.organizationId,
          userRole: authReq.user.role,
        },
        candidateId: routeParam(req.params.id, 'id'),
        outcome: 'APPROVED',
        notes,
        supersedesMemoryId,
      });
      res.json({ success: true, data: { candidate } });
    } catch (error) {
      handleServiceError(error, next, res);
    }
  },
);

const rejectSchema = z.object({ notes: z.string().trim().max(2000).optional() });

router.post(
  '/candidates/:id/reject',
  validateRequest(rejectSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authReq = req as AuthRequest;
      const { notes } = req.body as z.infer<typeof rejectSchema>;
      const candidate = await decideLearningCandidate({
        actor: {
          userId: authReq.user.id,
          organizationId: authReq.user.organizationId,
          userRole: authReq.user.role,
        },
        candidateId: routeParam(req.params.id, 'id'),
        outcome: 'REJECTED',
        notes,
      });
      res.json({ success: true, data: { candidate } });
    } catch (error) {
      handleServiceError(error, next, res);
    }
  },
);

router.get(
  '/agent/:code',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authReq = req as AuthRequest;
      const memory = await getActiveAgentMemory(
        authReq.user.organizationId,
        routeParam(req.params.code, 'code'),
      );
      res.json({ success: true, data: { memory } });
    } catch (error) {
      next(error);
    }
  },
);

router.get(
  '/role/:code',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authReq = req as AuthRequest;
      const memory = await getActiveRoleMemory(
        authReq.user.organizationId,
        routeParam(req.params.code, 'code'),
      );
      res.json({ success: true, data: { memory } });
    } catch (error) {
      next(error);
    }
  },
);

router.get(
  '/organization',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authReq = req as AuthRequest;
      const memory = await getActiveOrganizationMemory(authReq.user.organizationId);
      res.json({ success: true, data: { memory } });
    } catch (error) {
      next(error);
    }
  },
);

const scopeParam = z.enum(['agent', 'role', 'organization']);
const rollbackSchema = z.object({
  reason: z.string().trim().min(1, 'reason é obrigatório.').max(2000),
});

router.post(
  '/:scope/:id/rollback',
  validateRequest(rollbackSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authReq = req as AuthRequest;
      const parsedScope = scopeParam.safeParse(req.params.scope);
      if (!parsedScope.success) {
        res
          .status(400)
          .json({ success: false, error: 'scope deve ser agent, role ou organization.' });
        return;
      }
      const { reason } = req.body as z.infer<typeof rollbackSchema>;
      await rollbackMemory({
        actor: {
          userId: authReq.user.id,
          organizationId: authReq.user.organizationId,
          userRole: authReq.user.role,
        },
        scope: parsedScope.data.toUpperCase() as 'AGENT' | 'ROLE' | 'ORGANIZATION',
        memoryId: routeParam(req.params.id, 'id'),
        reason,
      });
      res.json({ success: true, data: { rolledBack: true } });
    } catch (error) {
      handleServiceError(error, next, res);
    }
  },
);

export const memoryRoutes = router;
