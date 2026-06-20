import { Router } from 'express';
import { alertController } from '../controllers';
import { authenticate, authorize } from '../middleware';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticate);

router.get('/', alertController.listAlertRules);
router.post('/', authorize(Role.ADMIN, Role.OPERATOR), alertController.createAlertRule);
router.put('/:id', authorize(Role.ADMIN, Role.OPERATOR), alertController.updateAlertRule);
router.delete('/:id', authorize(Role.ADMIN), alertController.deleteAlertRule);
router.get('/history', alertController.getAlertHistory);

export default router;
