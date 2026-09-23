import { randomBytes } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

/**
 * Endpoint para gerar o token CSRF.
 */
export function csrfTokenHandler(req: Request, res: Response) {
  const token = randomBytes(32).toString('hex');
  res.cookie('csrfToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  });
  res.json({ success: true, token });
}

/**
 * Proteção CSRF por validação estrita de Origin/Referer (SEC-002).
 */

const WEBHOOK_PATHS: readonly RegExp[] = [
  /^\/api\/integrations\/birth-voice\/webhook\/?$/,
  /^\/api\/integrations\/3cx\/webhook(\/|$)/,
  /^\/api\/webhooks\/(voice-result|email|signature)(\/|$)/,
  /^\/api\/integrations\/bitrix\/webhook\/[^/]+\/?$/,
  /^\/api\/integrations\/chatwoot\/webhook\/?$/,
  /^\/api\/integrations\/stripe\/webhook\/[^/]+\/?$/,
];

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function isLocalDevOrigin(origin: string): boolean {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
}

function buildAllowedOrigins(): Set<string> {
  const allowed = new Set<string>();

  if (process.env.PUBLIC_BASE_URL) {
    try {
      allowed.add(new URL(process.env.PUBLIC_BASE_URL).origin);
    } catch {}
  }

  if (process.env.ALLOWED_ORIGINS) {
    for (const raw of process.env.ALLOWED_ORIGINS.split(',')) {
      const origin = raw.trim();
      if (origin) allowed.add(origin);
    }
  }

  return allowed;
}

function originOf(value: string): string | null {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function isAllowedOrigin(origin: string, allowed: Set<string>): boolean {
  if (allowed.has(origin)) return true;
  return process.env.NODE_ENV !== 'production' && isLocalDevOrigin(origin);
}

function deny(res: Response, error: string): void {
  res.status(403).json({ success: false, error });
}

export function csrfGuard(req: Request, res: Response, next: NextFunction): void {
  if (SAFE_METHODS.has(req.method)) return next();

  const path = req.originalUrl.split('?')[0] ?? '';
  if (WEBHOOK_PATHS.some((pattern) => pattern.test(path))) return next();

  const hasBearer = req.headers.authorization?.toLowerCase().startsWith('bearer ') ?? false;
  const hasCookie = Boolean(req.headers.cookie);
  if (hasBearer && !hasCookie) return next();

  const origin = req.headers.origin;
  const referer = req.headers.referer;

  if (!origin && !referer) {
    deny(res, 'CSRF: cabeçalho Origin/Referer ausente.');
    return;
  }

  const allowed = buildAllowedOrigins();

  if (origin && !isAllowedOrigin(origin, allowed)) {
    deny(res, 'CSRF: Origin não permitida.');
    return;
  }

  if (referer) {
    const refererOrigin = originOf(referer);
    if (!refererOrigin || !isAllowedOrigin(refererOrigin, allowed)) {
      deny(res, 'CSRF: Referer não permitido.');
      return;
    }
  }

  // Double Submit Cookie Validation
  if (hasCookie) {
    const csrfHeader = req.header('x-csrf-token');
    const csrfCookieMatch = req.headers.cookie?.match(/csrfToken=([^;]+)/);
    const csrfCookie = csrfCookieMatch ? csrfCookieMatch[1] : null;

    if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
      deny(res, 'CSRF: Token ausente ou inválido.');
      return;
    }
  }

  next();
}
