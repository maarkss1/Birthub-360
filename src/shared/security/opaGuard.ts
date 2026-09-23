import type { NextFunction, Request, Response } from 'express';
import { logger } from '../../lib/logger.js';
import type { AuthRequest } from '../middlewares/authenticateToken.js';

/**
 * Guard de enforcement OPA (SEC-006). Consulta um servidor OPA externo e nega por padrão:
 * qualquer erro de rede, resposta não-OK ou resultado diferente de `true` bloqueia a requisição.
 *
 * Deve ser montado DEPOIS de `authenticateToken` (depende de `req.user`). Política em
 * `policies/authz.rego`; papéis são os 5 oficiais de `src/lib/auth/authorization.ts`.
 */

export interface OpaInput {
  role?: string;
  userId?: string;
  resourceOwnerId?: string;
  method: string;
  path: string;
}

const DEFAULT_OPA_URL = 'http://localhost:8181/v1/data/birthhub/authz/allow';

export const opaGuard = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const user = (req as Partial<AuthRequest>).user;
  const resourceId = req.params?.id;

  const input: OpaInput = {
    role: user?.role,
    userId: user?.id,
    resourceOwnerId: typeof resourceId === 'string' ? resourceId : undefined,
    method: req.method,
    path: req.path,
  };

  try {
    const response = await fetch(process.env.OPA_URL || DEFAULT_OPA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input }),
    });

    if (!response.ok) {
      logger.error({ status: response.status }, 'OPA respondeu com erro; negando (fail-closed).');
      res.status(500).json({ success: false, error: 'Authorization service unavailable' });
      return;
    }

    const data = (await response.json()) as { result?: boolean };
    if (data.result === true) {
      next();
      return;
    }

    res.status(403).json({ success: false, error: 'Forbidden by OPA policy' });
  } catch (err) {
    logger.error({ err }, 'OPA inacessível; negando (fail-closed).');
    res.status(500).json({ success: false, error: 'Authorization service unreachable' });
  }
};
