import { Router } from 'express';
import { emailController } from '../controllers';
import { authenticate, authorize } from '../middleware';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticate);

router.get('/', emailController.getEmailConfig);
router.put('/', authorize(Role.ADMIN), emailController.upsertEmailConfig);
router.delete('/', authorize(Role.ADMIN), emailController.deleteEmailConfig);

export default router;
