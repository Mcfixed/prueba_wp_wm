/**
 * Session Worker - Direct execution mode (no Redis/BullMQ needed).
 * Session operations are executed immediately instead of being queued.
 */
import { getSessionManager } from '../src/infrastructure/baileys/SessionManager';
import { logger } from '../src/infrastructure/logger';

export async function executeSessionAction(
  sessionId: string,
  sessionName: string,
  action: 'connect' | 'disconnect' | 'restart'
): Promise<void> {
  const sessionManager = getSessionManager();
  logger.info({ sessionId, action }, 'Executing session action directly');

  switch (action) {
    case 'connect':
      await sessionManager.connectSession(sessionId, sessionName);
      break;
    case 'disconnect':
      await sessionManager.disconnectSession(sessionId);
      break;
    case 'restart':
      await sessionManager.restartSession(sessionId, sessionName);
      break;
  }
}
