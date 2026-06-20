import { Router } from 'express';
import { messageController } from '../controllers';
import { authenticate, authorize } from '../middleware';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticate);

router.get('/connected', messageController.getConnectedSessions);
router.post('/:id/send', authorize(Role.ADMIN, Role.OPERATOR), messageController.sendMessage);
router.get('/:id/contacts', messageController.getContacts);

export default router;
