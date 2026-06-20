import { Router } from 'express';
import { logController } from '../controllers';
import { authenticate } from '../middleware';

const router = Router();

router.use(authenticate);
router.get('/', logController.listLogs);

export default router;
