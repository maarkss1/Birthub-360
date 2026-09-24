import crypto from 'crypto';
import bcrypt from 'bcryptjs';

export interface TokenPayload {
  id: string;
  email: string;
  role: string;
  tenantId: string;
}

export interface RefreshTokenPayload {
  id: string;
}

function requireSecret(name: 'JWT_SECRET' | 'REFRESH_TOKEN_SECRET'): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} não está configurado. Defina esta variável de ambiente antes de iniciar o servidor.`);
  }
  return value;
}

export function hashPassword(password: string): string {
  const salt = bcrypt.genSaltSync(12);
  return bcrypt.hashSync(password, salt);
}

export function verifyPassword(password: string, stored: string): boolean {
  if (!stored) return false;

  // Fallback to PBKDF2 if old style password
  if (stored.includes(':')) {
    try {
      const [salt, hash] = stored.split(':');
      const checkHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
      return checkHash === hash;
    } catch {
      return false;
    }
  }

  try {
    return bcrypt.compareSync(password, stored);
  } catch {
    return false;
  }
}

function sign(payload: object, secret: string, expiresInSeconds: number): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + expiresInSeconds })).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}

function verify<T>(token: string, secret: string): (T & { exp?: number }) | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [header, body, signature] = parts;
  const expectedSignature = crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
  const signatureBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expectedSignature);
  if (signatureBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(signatureBuf, expectedBuf)) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf-8'));
    if (payload.exp && Date.now() / 1000 > payload.exp) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export function generateToken(payload: TokenPayload): string {
  return sign(payload, requireSecret('JWT_SECRET'), 900);
}

export function generateRefreshToken(payload: RefreshTokenPayload): string {
  return sign(payload, requireSecret('REFRESH_TOKEN_SECRET'), 86400 * 30);
}

export function verifyToken(token: string): TokenPayload | null {
  const payload = verify<TokenPayload>(token, requireSecret('JWT_SECRET'));
  if (!payload) return null;
  return { id: payload.id, email: payload.email, role: payload.role, tenantId: payload.tenantId };
}

export function verifyRefreshToken(token: string): RefreshTokenPayload | null {
  const payload = verify<RefreshTokenPayload>(token, requireSecret('REFRESH_TOKEN_SECRET'));
  if (!payload) return null;
  return { id: payload.id };
}
