import type { NextFunction, Request, Response } from 'express';
import { env } from '../../config/env';

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

  if (env.PUBLIC_BASE_URL) {
    try {
      allowed.add(new URL(env.PUBLIC_BASE_URL).origin);
    } catch {}
  }

  if (env.ALLOWED_ORIGINS) {
    for (const raw of env.ALLOWED_ORIGINS.split(',')) {
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
  return env.NODE_ENV !== 'production' && isLocalDevOrigin(origin);
}

function deny(res: Response, error: string): void {
  res.status(403).json({ success: false, error });
}

export function csrfGuard(req: Request, res: Response, next: NextFunction): void {
  if (SAFE_METHODS.has(req.method)) {
    next();
    return;
  }

  const path = req.originalUrl.split('?')[0] ?? '';
  if (WEBHOOK_PATHS.some((pattern) => pattern.test(path))) {
    next();
    return;
  }

  const hasBearer = req.headers.authorization?.toLowerCase().startsWith('bearer ') ?? false;
  const hasCookie = Boolean(req.headers.cookie);
  if (hasBearer && !hasCookie) {
    next();
    return;
  }

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

  next();
}
