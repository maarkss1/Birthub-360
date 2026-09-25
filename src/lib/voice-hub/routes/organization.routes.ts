import express from 'express';
import { requireTenant } from '../middlewares/rbac.js';
import { listOrganizationsHandler } from '../controllers/organization.controller.js';

const router = express.Router();

router.get('/organizations', requireTenant, listOrganizationsHandler);

export default router;
