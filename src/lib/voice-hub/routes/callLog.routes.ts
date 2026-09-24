import express from 'express';
import { requireTenant } from '../middlewares/rbac.js';
import { listCallLogsHandler, createCallLogHandler, updateCallLogHandler, deleteCallLogHandler } from '../controllers/callLog.controller.js';

const router = express.Router();

router.get('/call-logs', requireTenant, listCallLogsHandler);
router.post('/call-logs', requireTenant, createCallLogHandler);
router.put('/call-logs/:id', requireTenant, updateCallLogHandler);
router.delete('/call-logs/:id', requireTenant, deleteCallLogHandler);

export default router;
