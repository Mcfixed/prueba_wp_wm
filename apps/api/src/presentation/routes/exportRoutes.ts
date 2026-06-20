import { Router } from 'express';
import { exportController } from '../controllers';
import { authenticate, authorize } from '../middleware';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticate);
router.get('/sessions/csv', authorize(Role.ADMIN, Role.OPERATOR), exportController.exportSessionsCSV);
router.get('/logs/csv', authorize(Role.ADMIN, Role.OPERATOR), exportController.exportLogsCSV);

export default router;
