import express from 'express';
import { requireTenant } from '../middlewares/rbac.js';
import { listSessionsHandler, createSessionHandler, updateSessionHandler, deleteSessionHandler } from '../controllers/session.controller.js';

const router = express.Router();

router.get('/sessions', requireTenant, listSessionsHandler);
router.post('/sessions', requireTenant, createSessionHandler);
router.put('/sessions/:id', requireTenant, updateSessionHandler);
router.delete('/sessions/:id', requireTenant, deleteSessionHandler);

export default router;
