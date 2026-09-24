import express from 'express';
import { requireTenant } from '../middlewares/rbac.js';
import { attachAuthIfPresent } from '../middlewares/index.js';
import { getBrandColorHandler, saveBrandColorHandler, resetBrandColorHandler } from '../controllers/brandColor.controller.js';

const router = express.Router();

router.get('/brand-color', attachAuthIfPresent, getBrandColorHandler);
router.post('/brand-color', requireTenant, saveBrandColorHandler);
router.put('/brand-color', requireTenant, saveBrandColorHandler);
router.delete('/brand-color', requireTenant, resetBrandColorHandler);

export default router;
