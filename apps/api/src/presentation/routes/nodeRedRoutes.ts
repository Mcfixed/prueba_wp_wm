import { Router, Request, Response } from 'express';
import { logger } from '../../infrastructure/logger';
import { prisma } from '../../infrastructure/database/prisma';

const router = Router();

/**
 * POST /webhooks/session-events
 * Endpoint for Node-RED integration.
 * Receives events from the system and forwards to Node-RED.
 */
router.post('/session-events', async (req: Request, res: Response) => {
  try {
    const { sessionId, sessionName, event, timestamp, details } = req.body;

    logger.info({
      msg: 'Node-RED webhook received',
      sessionId,
      sessionName,
      event,
      timestamp,
    });

    // Log the event
    await prisma.log.create({
      data: {
        sessionId,
        eventType: event,
        severity: 'INFO',
        message: `Node-RED event: ${event} for session ${sessionName}`,
        metadata: { details, source: 'node-red-webhook' },
      },
    });

    res.status(200).json({ received: true });
  } catch (error) {
    logger.error({ msg: 'Node-RED webhook error', error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
