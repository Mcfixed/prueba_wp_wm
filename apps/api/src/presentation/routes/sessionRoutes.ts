import { Router } from 'express';
import { sessionController } from '../controllers';
import { authenticate, authorize, audit } from '../middleware';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticate);

router.get('/', sessionController.listSessions);
router.post('/', authorize(Role.ADMIN, Role.OPERATOR), audit('CREATE', 'Session'), sessionController.createSession);
router.get('/:id', sessionController.getSession);
router.put('/:id', authorize(Role.ADMIN, Role.OPERATOR), audit('UPDATE', 'Session'), sessionController.updateSession);
router.delete('/:id', authorize(Role.ADMIN), audit('DELETE', 'Session'), sessionController.deleteSession);

router.post('/:id/connect', authorize(Role.ADMIN, Role.OPERATOR), audit('CONNECT', 'Session'), sessionController.connectSession);
router.post('/:id/disconnect', authorize(Role.ADMIN, Role.OPERATOR), audit('DISCONNECT', 'Session'), sessionController.disconnectSession);
router.post('/:id/restart', authorize(Role.ADMIN, Role.OPERATOR), audit('RESTART', 'Session'), sessionController.restartSession);
router.get('/:id/logs', sessionController.getSessionLogs);
router.get('/:id/qr', sessionController.getSessionQr);

export default router;
