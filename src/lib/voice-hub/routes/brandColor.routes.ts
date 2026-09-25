import express from 'express';
import { requireTenant } from '../middlewares/rbac';
import { attachAuthIfPresent } from '../middlewares/index';
import { getBrandColorHandler, saveBrandColorHandler, resetBrandColorHandler } from '../controllers/brandColor.controller';

const router = express.Router();

router.get('/brand-color', attachAuthIfPresent, getBrandColorHandler);
router.post('/brand-color', requireTenant, saveBrandColorHandler);
router.put('/brand-color', requireTenant, saveBrandColorHandler);
router.delete('/brand-color', requireTenant, resetBrandColorHandler);

export default router;
