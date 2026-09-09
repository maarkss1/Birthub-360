import { type NextFunction, type Request, type Response, Router } from 'express';
import { z } from 'zod';
import type { AuthRequest } from '../../../shared/middlewares/authenticateToken.js';
import { validateRequest } from '../../../shared/middlewares/validateRequest.js';
import { runRoleSupervisor } from '../services/roleSupervisor.service.js';

const router = Router();

// PROMPT 5 — Supervisores de Cargo: única rota. Identidade/tenant/cargo SEMPRE da sessão
// autenticada — o corpo nunca informa `jobRoleCode` nem `agentCode` (o supervisor escolhe o
// agente sozinho, dentro do próprio cargo do ator), mesmo padrão de
// `POST /api/agents/:agentCode/run` (PROMPT 4) e `POST /api/capabilities/check` (PROMPT 3).
const runSupervisorSchema = z.object({
  requestedCapability: z.string().trim().min(1).optional(),
  mission: z.string().trim().max(4000).optional(),
  resource: z.record(z.string(), z.unknown()).optional(),
  context: z.record(z.string(), z.unknown()).optional(),
  correlationId: z.string().trim().max(200).optional(),
});

router.post(
  '/run',
  validateRequest(runSupervisorSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authReq = req as AuthRequest;
      const { requestedCapability, mission, resource, context, correlationId } =
        req.body as z.infer<typeof runSupervisorSchema>;
      const result = await runRoleSupervisor({
        actorId: authReq.user.id,
        organizationId: authReq.user.organizationId,
        actorRole: authReq.user.role,
        requestedCapability,
        mission,
        resource,
        context,
        correlationId,
      });
      const noJobRoleContext =
        result.status === 'NO_JOB_ROLE' || result.status === 'NO_SUPERVISOR_PROFILE';
      res
        .status(noJobRoleContext ? 409 : 200)
        .json({ success: !noJobRoleContext, data: { supervisorRun: result } });
    } catch (error) {
      next(error);
    }
  },
);

export const roleSupervisorRoutes = router;
