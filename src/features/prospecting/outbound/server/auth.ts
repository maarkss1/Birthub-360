import crypto from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';

// Auth & RBAC (CPI follow-up) — recomendação registrada na Wave 11 (Security
// Hardening, ver CPI_BACKLOG.md): antes desta wave, POST /auth/login conferia
// email+senha e devolvia o objeto `user`, mas NENHUMA rota subsequente checava
// quem estava chamando — POST /api/db/query, GET /users e toda rota de
// gestão de lead/campanha eram efetivamente públicas para quem tivesse a URL
// da API. Este módulo implementa sessão via cookie assinado (HMAC-SHA256,
// sem dependência nova — só `node:crypto`) + middleware que popula `req.outboundUser`.
//
// Por que HMAC assinado em vez de `express-session`/JWT de biblioteca: o
// servidor já tem `crypto.scryptSync` para senha (ver server/routes.ts) sem
// dependência externa nenhuma — um token `payload.assinatura` é a mesma ideia
// de um JWT (mas sem alg confusion, sem lib nova, sem tabela de sessão no
// Postgres) e é trivial de testar como função pura (ver tests/auth.test.ts).

export const SESSION_COOKIE_NAME = 'atlas_session';

// 12h: turno de trabalho típico de um vendedor/gestor logado no CRM. Curto o
// bastante para limitar o estrago de um cookie vazado, longo o bastante para
// não derrubar ninguém no meio do expediente.
export const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

export type UserRole = 'admin' | 'user' | string;

// Nunca inclui senha/hash — só o mínimo necessário para autorizar (RBAC por
// role) e para o escopo por marca (company), consistente com o padrão já
// usado em toda a base (ver normalizeCompany em server/routes.ts).
export interface AuthenticatedUser {
  id: string;
  role: UserRole;
  company: string | null;
}

interface SessionPayload extends AuthenticatedUser {
  iat: number; // emitido em (epoch ms)
  exp: number; // expira em (epoch ms)
}

function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (secret && secret.trim().length >= 16) {
    return secret.trim();
  }
  // Sem SESSION_SECRET (ou segredo curto demais) configurado no ambiente: cai
  // para um segredo fixo de DESENVOLVIMENTO. Nunca usar isto em produção —
  // qualquer pessoa com o código-fonte poderia forjar um cookie de admin. O
  // aviso é impresso a cada processo iniciado sem a variável setada, para não
  // passar despercebido num deploy real.
  console.warn(
    '[AUTH] SESSION_SECRET não configurado (ou com menos de 16 caracteres) em process.env — ' +
    'usando segredo de DESENVOLVIMENTO. Isso é INSEGURO em produção: configure ' +
    'SESSION_SECRET (string aleatória longa) nas variáveis de ambiente do servidor.'
  );
  return 'dev-insecure-session-secret-do-not-use-in-production';
}

function sign(data: string): string {
  return crypto.createHmac('sha256', getSessionSecret()).update(data).digest('base64url');
}

// --- Emissão / verificação do token (payload.assinatura) --------------------

export function createSessionToken(user: AuthenticatedUser, now: number = Date.now(), ttlMs: number = SESSION_TTL_MS): string {
  const payload: SessionPayload = {
    id: user.id,
    role: user.role,
    company: user.company ?? null,
    iat: now,
    exp: now + ttlMs
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const signature = sign(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

// Nunca lança — um cookie ausente/malformado/adulterado/expirado só resulta em
// `null` (usuário não autenticado), nunca em erro 500 nem em exceção que
// derrubaria a rota. Comparação de assinatura em tempo constante
// (`timingSafeEqual`) para não vazar, por timing, quantos bytes da assinatura
// esperada um valor forjado acertou.
export function verifySessionToken(token: string | undefined | null, now: number = Date.now()): AuthenticatedUser | null {
  if (!token || typeof token !== 'string') return null;
  const dotIndex = token.indexOf('.');
  if (dotIndex === -1) return null;

  const encodedPayload = token.slice(0, dotIndex);
  const signature = token.slice(dotIndex + 1);
  if (!encodedPayload || !signature) return null;

  const expectedSignature = sign(encodedPayload);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (signatureBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return null;
  }

  let payload: SessionPayload;
  try {
    payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
  } catch {
    return null;
  }

  if (!payload || typeof payload.exp !== 'number' || typeof payload.id !== 'string' || !payload.id || typeof payload.role !== 'string' || !payload.role) {
    return null;
  }
  if (now > payload.exp) return null;

  return { id: payload.id, role: payload.role, company: payload.company ?? null };
}

// --- Cookie: parsing/serialização mínimos, sem dependência nova -------------
// (o pacote `cookie` já existe em node_modules como dependência transitiva do
// Express, mas não está declarado em package.json — em vez de depender de um
// transitivo não declarado, um parser/serializer de ~15 linhas evita esse risco.)

export function parseCookies(header: string | undefined | null): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  header.split(';').forEach(pair => {
    const idx = pair.indexOf('=');
    if (idx === -1) return;
    const key = pair.slice(0, idx).trim();
    const rawValue = pair.slice(idx + 1).trim();
    if (!key) return;
    try {
      out[key] = decodeURIComponent(rawValue);
    } catch {
      out[key] = rawValue;
    }
  });
  return out;
}

// `Secure` só é adicionado em produção (NODE_ENV==='production', mesmo sinal
// já usado em server.ts para decidir servir Vite dev vs. build estático) —
// um cookie `Secure` é descartado pelo navegador em conexão http:// simples,
// o que travaria login em ambiente de desenvolvimento local.
function isProductionEnv(): boolean {
  return process.env.NODE_ENV === 'production';
}

export function buildSessionCookie(token: string): string {
  const attrs = [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Strict',
    `Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`
  ];
  if (isProductionEnv()) attrs.push('Secure');
  return attrs.join('; ');
}

export function buildLogoutCookie(): string {
  const attrs = [
    `${SESSION_COOKIE_NAME}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Strict',
    'Max-Age=0'
  ];
  if (isProductionEnv()) attrs.push('Secure');
  return attrs.join('; ');
}

// --- Middleware Express -------------------------------------------------

// Popula req.outboundUser quando o cookie existe e é válido; nunca lança e nunca
// bloqueia a requisição — rotas que continuam públicas (ex: /auth/login,
// /health) simplesmente seguem com req.outboundUser undefined. Aplicado globalmente
// no router (ver apiRouter.use(attachUser) em server/routes.ts) para que
// qualquer rota possa checar req.outboundUser sem precisar montar o middleware de
// novo em cada uma.
export function attachUser(req: Request, _res: Response, next: NextFunction) {
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies[SESSION_COOKIE_NAME];
  const user = verifySessionToken(token);
  if (user) {
    (req as Request & { outboundUser?: AuthenticatedUser }).outboundUser = user;
  }
  next();
}

// Exige qualquer sessão válida (não checa role). Usar em rotas que só
// precisam saber "alguém autenticado está chamando" — ex: GET /users.
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.outboundUser) {
    return res.status(401).json({ error: 'Sessão ausente ou expirada. Faça login novamente.' });
  }
  next();
}

// Exige sessão válida E role === 'admin'. Usar nas rotas mais sensíveis (ex:
// SQL Explorer). 401 quando não há sessão nenhuma (não autenticado); 403
// quando a sessão é válida mas a role não autoriza (autenticado, mas sem
// permissão) — distinção padrão HTTP entre "quem é você" e "o que você pode".
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.outboundUser) {
    return res.status(401).json({ error: 'Sessão ausente ou expirada. Faça login novamente.' });
  }
  if (req.outboundUser.role !== 'admin') {
    return res.status(403).json({ error: 'Acesso restrito a administradores.' });
  }
  next();
}

// Exige sessão válida E role 'admin' ou 'gestor'. Usar em rotas de visão
// gerencial que não são sensíveis como o SQL Explorer (ex: painel consolidado
// de tarefas de todos os vendedores), mas que um vendedor comum não deve ver.
export function requireManager(req: Request, res: Response, next: NextFunction) {
  if (!req.outboundUser) {
    return res.status(401).json({ error: 'Sessão ausente ou expirada. Faça login novamente.' });
  }
  if (req.outboundUser.role !== 'admin' && req.outboundUser.role !== 'gestor') {
    return res.status(403).json({ error: 'Acesso restrito a administradores e gestores.' });
  }
  next();
}
