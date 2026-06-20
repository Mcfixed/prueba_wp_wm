import { Router } from 'express';
import { healthController } from '../controllers';

const router = Router();

router.get('/health', healthController.healthCheck);

export default router;
