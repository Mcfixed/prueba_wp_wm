import { Router } from 'express';
import { dashboardController } from '../controllers';
import { authenticate } from '../middleware';

const router = Router();

router.use(authenticate);
router.get('/stats', dashboardController.getDashboardStats);

export default router;
