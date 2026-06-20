import { Router } from 'express';
import { metricsController } from '../controllers';

const router = Router();

router.get('/metrics', metricsController.metrics);

export default router;
