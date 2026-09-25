import express from 'express';
import { requireTenant } from '../middlewares/rbac';
import { listOrganizationsHandler } from '../controllers/organization.controller';

const router = express.Router();

router.get('/organizations', requireTenant, listOrganizationsHandler);

export default router;
