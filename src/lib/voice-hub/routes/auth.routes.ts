import express from 'express';
import { registerHandler, loginHandler, meHandler, logoutHandler, refreshHandler } from '../controllers/auth.controller.js';
import { requireTenant } from '../middlewares/rbac.js';

const router = express.Router();

router.post('/auth/register', registerHandler);
router.post('/auth/login', loginHandler);
// `/auth/me` is the browser/session introspection endpoint. It must resolve the httpOnly access
// cookie (or bearer token) before the controller reads req.user; previously this route called the
// controller directly and could return `user: undefined` even for a valid logged-in session.
router.get('/auth/me', requireTenant, meHandler);
router.post('/auth/logout', logoutHandler);
// refreshHandler existed in the controller but was never mounted on a route — passive refresh
// still worked transparently via getAuthUser() (src/middlewares/index.ts) on any authenticated
// request, but non-browser clients had no explicit way to rotate their access token ahead of
// expiry without also holding a session-establishing endpoint. Wiring it here matches the
// documented behavior in SECURITY.md ("Refresh Tokens ... used to obtain a new Access Token").
router.post('/auth/refresh', refreshHandler);

export default router;