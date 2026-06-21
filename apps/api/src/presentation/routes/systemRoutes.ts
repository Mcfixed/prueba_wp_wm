import { Router } from 'express';
import { systemController } from '../controllers';
import { authenticate } from '../middleware';

const router = Router();

router.get('/status', authenticate, systemController.getSystemStatus);
router.post('/health/check', authenticate, systemController.forceHealthCheck);

export default router;
