import type { NextFunction, Request, Response } from 'express';
import { getAiConsent } from '../services/settingService.js';
import { logger } from '../lib/logger.js';

/**
 * Guards endpoints that send tenant/user data directly to an external AI provider without going
 * through LLMGateway. `requireTenant` must run before this middleware so `req.tenantId` is the
 * authenticated ownership boundary.
 */
export async function requireAiProviderConsent(req: Request, res: Response, next: NextFunction) {
  const tenantId = req.tenantId;
  if (!tenantId) {
    return res.status(401).json({
      error: 'Tenant autenticado obrigatório para usar provedores externos de IA.',
      code: 'TENANT_REQUIRED',
    });
  }

  try {
    const consent = await getAiConsent(tenantId);
    if (!consent.granted) {
      return res.status(403).json({
        error: 'Consentimento para processamento por provedor externo de IA é obrigatório.',
        code: 'AI_PROVIDER_CONSENT_REQUIRED',
      });
    }

    next();
  } catch (error: unknown) {
    logger.error('Failed to verify AI provider consent', { tenantId, err: error });
    return res.status(503).json({
      error: 'Não foi possível verificar o consentimento de IA. Tente novamente mais tarde.',
      code: 'AI_CONSENT_CHECK_UNAVAILABLE',
    });
  }
}
