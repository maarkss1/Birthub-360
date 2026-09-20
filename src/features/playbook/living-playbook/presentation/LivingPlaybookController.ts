import type { NextFunction, Request, Response } from 'express';
import type { AuthRequest } from '../../../../shared/middlewares/authenticateToken';
import {
  broadcastWinningPattern,
  generateWinningPatterns,
} from '../application/livingPlaybook.service';

export class LivingPlaybookController {
  /** Item 42: gera sugestões de abordagens vencedoras a partir de outcomes POSITIVOS reais —
   * nunca persiste. */
  generateSuggestions = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId: orgId } = (req as AuthRequest).user;
      const result = await generateWinningPatterns(orgId);
      res.json({
        success: true,
        data: result.suggestions,
        meta: { emptyReason: result.emptyReason },
      });
    } catch (error) {
      next(error);
    }
  };

  /** Anuncia uma sugestão aprovada pro time inteiro (in-app). Quando o front manda o `insightId`
   * devolvido por `generateSuggestions` (sugestão já persistida), marca esse `PlaybookInsight`
   * como BROADCAST — `insightId` é opcional para não quebrar um chamador que ainda não o envie. */
  broadcast = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId: orgId, id: userId } = (req as AuthRequest).user;
      const { sellerName, segment, patternTitle, suggestedScript, insightId } = req.body ?? {};
      if (
        typeof sellerName !== 'string' ||
        typeof segment !== 'string' ||
        typeof patternTitle !== 'string' ||
        typeof suggestedScript !== 'string' ||
        (insightId !== undefined && insightId !== null && typeof insightId !== 'string')
      ) {
        res
          .status(400)
          .json({ success: false, error: 'Payload incompleto para anunciar o padrão.' });
        return;
      }
      const notification = await broadcastWinningPattern(
        orgId,
        {
          sellerName,
          segment,
          patternTitle,
          suggestedScript,
          insightId: insightId ?? null,
        },
        userId,
      );
      if (!notification) {
        res.status(502).json({ success: false, error: 'Falha ao criar a notificação de anúncio.' });
        return;
      }
      res.json({ success: true, data: notification });
    } catch (error) {
      next(error);
    }
  };
}
