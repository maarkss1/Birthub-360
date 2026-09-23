import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';

/**
 * Middleware de proteção CSRF baseado em validação de Origin/Referer.
 * 
 * Protege rotas autenticadas por sessão (cookies). Fail open (permite) requisições:
 * - Webhooks (não possuem cookies, autenticados por assinatura)
 * - Bearer token (cabeçalho Authorization: Bearer explícito)
 */
export function csrfGuard(req: Request, res: Response, next: NextFunction): void {
  // Ignorar métodos seguros que não alteram estado
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Permitir requisições autenticadas explicitamente via Bearer token
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
    return next();
  }

  // Permitir requisições para rotas de webhooks explícitas (fail open)
  // Assumimos que as rotas de webhook estão em /api/webhooks ou contém /webhooks
  if (req.originalUrl.includes('/webhooks')) {
    return next();
  }

  // Validar Origin e Referer
  const origin = req.headers.origin;
  const referer = req.headers.referer;

  if (!origin && !referer) {
    // Para mitigar CSRF, navegadores em cross-origin enviam Origin ou Referer
    res.status(403).json({
      success: false,
      error: 'CSRF token missing or invalid. Missing Origin/Referer header.',
    });
    return;
  }

  const allowedOrigins = new Set<string>();
  
  if (env.PUBLIC_BASE_URL) {
    try {
      allowedOrigins.add(new URL(env.PUBLIC_BASE_URL).origin);
    } catch {}
  }
  
  if (env.ALLOWED_ORIGINS) {
    env.ALLOWED_ORIGINS.split(',').forEach(o => allowedOrigins.add(o.trim()));
  }

  // Ambiente de desenvolvimento: permite localhost
  if (env.NODE_ENV !== 'production' && origin && (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:'))) {
    allowedOrigins.add(origin);
  }
  if (env.NODE_ENV !== 'production' && referer) {
    try {
      const rOrigin = new URL(referer).origin;
      if (rOrigin.startsWith('http://localhost:') || rOrigin.startsWith('http://127.0.0.1:')) {
        allowedOrigins.add(rOrigin);
      }
    } catch {}
  }

  // Validar o Origin (se presente)
  if (origin) {
    if (!allowedOrigins.has(origin)) {
      res.status(403).json({
        success: false,
        error: `CSRF Error: Origin ${origin} not allowed.`,
      });
      return;
    }
  }

  // Validar o Referer (se presente)
  if (referer) {
    try {
      const refererOrigin = new URL(referer).origin;
      if (!allowedOrigins.has(refererOrigin)) {
        res.status(403).json({
          success: false,
          error: `CSRF Error: Referer ${refererOrigin} not allowed.`,
        });
        return;
      }
    } catch (e) {
      res.status(403).json({
        success: false,
        error: 'CSRF Error: Invalid Referer header.',
      });
      return;
    }
  }

  next();
}
