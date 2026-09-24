import { Response } from 'express';

// Mirrors the JWT expiry set in src/lib/auth-tokens.ts (generateToken/generateRefreshToken)
// so the cookie never outlives — or expires long before — the token it carries.
export const ACCESS_TOKEN_MAX_AGE_MS = 900 * 1000;
export const REFRESH_TOKEN_MAX_AGE_MS = 86400 * 30 * 1000;

export function setCookie(res: Response, name: string, value: string, maxAgeMs?: number) {
  res.cookie(name, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    ...(maxAgeMs !== undefined ? { maxAge: maxAgeMs } : {}),
  });
}

// Non-httpOnly marker cookie the front-end reads (lib/auth.ts) to know a
// session is active, since it cannot read the httpOnly access_token itself.
export function setLoggedInCookie(res: Response) {
  res.cookie('logged_in', 'true', {
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/'
  });
}
