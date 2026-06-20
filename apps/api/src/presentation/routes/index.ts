import { Router } from 'express';
import authRoutes from './authRoutes';
import sessionRoutes from './sessionRoutes';
import alertRoutes from './alertRoutes';
import webhookRoutes from './webhookRoutes';
import emailRoutes from './emailRoutes';
import logRoutes from './logRoutes';
import dashboardRoutes from './dashboardRoutes';
import healthRoutes from './healthRoutes';
import nodeRedRoutes from './nodeRedRoutes';
import metricsRoutes from './metricsRoutes';
import exportRoutes from './exportRoutes';
import apiKeyRoutes from './apiKeyRoutes';
import messageRoutes from './messageRoutes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/sessions', sessionRoutes);
router.use('/alerts', alertRoutes);
router.use('/webhooks/config', webhookRoutes);
router.use('/webhooks', nodeRedRoutes);
router.use('/email', emailRoutes);
router.use('/logs', logRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/', healthRoutes);
router.use('/', metricsRoutes);
router.use('/export', exportRoutes);
router.use('/api-keys', apiKeyRoutes);
router.use('/messages', messageRoutes);

export default router;
