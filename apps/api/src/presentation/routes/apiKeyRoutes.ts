import { Router } from 'express';
import { apiKeyController } from '../controllers';
import { authenticate, authorize } from '../middleware';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticate);
router.get('/', apiKeyController.listApiKeys);
router.post('/', authorize(Role.ADMIN), apiKeyController.createApiKey);

export default router;
