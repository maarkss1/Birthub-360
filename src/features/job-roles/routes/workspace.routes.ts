import { type NextFunction, type Request, type Response, Router } from 'express';
import type { AuthRequest } from '../../../shared/middlewares/authenticateToken.js';
import { getWorkspaceForUser } from '../services/workspace.service.js';

const router = Router();

// PROMPT 6 — Workspaces por Login/Cargo: única rota, mesmo padrão "me" de
// `GET /api/module-access/me` — identidade/tenant SEMPRE da sessão autenticada, nunca de
// query/body (regra explícita do prompt da onda: "JobRole não vem de query/body"). Um deep link
// direto pra cá nunca revela o workspace de outro cargo: só existe "o meu".
router.get('/me', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    const workspace = await getWorkspaceForUser(
      authReq.user.organizationId,
      authReq.user.id,
      authReq.user.role,
    );
    res.json({ success: true, data: { workspace } });
  } catch (error) {
    next(error);
  }
});

export const workspaceRoutes = router;
