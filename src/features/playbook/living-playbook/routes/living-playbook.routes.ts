import { Router } from 'express';
import { container } from '../../../../shared/di/container.js';
import { requireRole } from '../../../../shared/middlewares/requireRole.js';
import type { LivingPlaybookController } from '../presentation/LivingPlaybookController.js';

const router = Router();
// Item 42: envolve comparar desempenho entre vendedores e anunciar pro time inteiro — gate mais
// restrito que a Matriz de Objeções (SDR/CLOSER podem propor objeções, mas não devem disparar
// comparação de performance entre colegas nem broadcast em nome da gestão).
const managementRoles = requireRole(['ADMIN', 'GESTOR']);

router.post('/generate-suggestions', managementRoles, (req, res, next) =>
  container
    .resolve<LivingPlaybookController>('LivingPlaybookController')
    .generateSuggestions(req, res, next),
);

router.post('/broadcast', managementRoles, (req, res, next) =>
  container.resolve<LivingPlaybookController>('LivingPlaybookController').broadcast(req, res, next),
);

export const livingPlaybookRoutes = router;
