import { type NextFunction, type Request, type Response, Router } from 'express';
import { prisma } from '../../../lib/prisma.js';
import type { AuthRequest } from '../../../shared/middlewares/authenticateToken.js';

/**
 * Leitura de `EmailMessage` (persistida por `emailReply.webhook.ts`, entrega 3 do Agente 17 —
 * reply tracking). Só GET por enquanto — nenhum caminho de escrita síncrona existe aqui, o
 * webhook de resposta é quem grava. Mesmo padrão de `whatsapp.routes.ts` (`GET /messages?leadId=`):
 * leitura direta via Prisma, tenant já garantido por `requestContext`/RLS + filtro explícito por
 * `organizationId` (defesa em profundidade, não redundância).
 */
const router = Router();

router.get('/messages', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { organizationId } = (req as AuthRequest).user;
    const leadId = typeof req.query.leadId === 'string' ? req.query.leadId : undefined;
    if (!leadId) {
      res.status(400).json({ success: false, error: 'leadId é obrigatório.' });
      return;
    }
    const messages = await prisma.emailMessage.findMany({
      where: { organizationId, leadId },
      orderBy: { receivedAt: 'desc' },
      take: 50,
    });
    res.json({ success: true, data: messages });
  } catch (error) {
    next(error);
  }
});

export const emailRoutes = router;
