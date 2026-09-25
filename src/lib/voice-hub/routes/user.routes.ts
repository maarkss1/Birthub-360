import express from 'express';
import { requireTenant, requireRole } from '../middlewares/rbac.js';
import { listUsersHandler, createUserHandler, updateUserHandler, deleteUserHandler, anonymizeUserHandler } from '../controllers/user.controller.js';

const router = express.Router();

router.get('/users', requireTenant, requireRole(['admin']), listUsersHandler);
router.post('/users', requireTenant, requireRole(['admin']), createUserHandler);
router.put('/users/:id', requireTenant, updateUserHandler);
router.delete('/users/:id', requireTenant, requireRole(['admin']), deleteUserHandler);
// LGPD data-subject erasure request — self-service (own account) or admin-on-behalf-of, same
// authorization shape as PUT /users/:id; enforced inside anonymizeUserData, not just at the route.
router.post('/users/:id/anonymize', requireTenant, anonymizeUserHandler);

export default router;
