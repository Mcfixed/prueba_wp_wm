import { Router } from 'express';
import { webhookController } from '../controllers';
import { authenticate, authorize } from '../middleware';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticate);

router.get('/', webhookController.listWebhooks);
router.post('/', authorize(Role.ADMIN, Role.OPERATOR), webhookController.createWebhook);
router.put('/:id', authorize(Role.ADMIN, Role.OPERATOR), webhookController.updateWebhook);
router.delete('/:id', authorize(Role.ADMIN), webhookController.deleteWebhook);

export default router;
