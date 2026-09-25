import type { AuthenticatedUser } from '../auth.js';

// Auth & RBAC (CPI follow-up): augmenta o Request do Express com `user`,
// populado pelo middleware `attachUser` (ver server/auth.ts) a partir do
// cookie de sessão assinado. Fica undefined em qualquer rota chamada sem
// sessão válida.
declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}
