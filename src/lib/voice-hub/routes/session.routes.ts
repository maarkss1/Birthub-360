import express from 'express';
import { requireTenant } from '../middlewares/rbac';
import { listSessionsHandler, createSessionHandler, updateSessionHandler, deleteSessionHandler } from '../controllers/session.controller';

const router = express.Router();

router.get('/sessions', requireTenant, listSessionsHandler);
router.post('/sessions', requireTenant, createSessionHandler);
router.put('/sessions/:id', requireTenant, updateSessionHandler);
router.delete('/sessions/:id', requireTenant, deleteSessionHandler);

export default router;
