import { Router } from 'express';
import { apiKeyController } from '../controllers';
import { authenticate, authorize } from '../middleware';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticate);
router.get('/', apiKeyController.listApiKeys);
router.post('/', authorize(Role.ADMIN, Role.OPERATOR), apiKeyController.createApiKey);
router.delete('/:id', authorize(Role.ADMIN), apiKeyController.deleteApiKey);
router.patch('/:id/toggle', authorize(Role.ADMIN), apiKeyController.toggleApiKey);

export default router;
