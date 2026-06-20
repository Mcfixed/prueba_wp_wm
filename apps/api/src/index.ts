import { config } from './config';
import { logger } from './infrastructure/logger';
import { connectDatabase, disconnectDatabase } from './infrastructure/database/prisma';
import { initializeWebSocket } from './infrastructure/websocket';
import { createApp } from './app';
import { getSessionManager } from './infrastructure/baileys/SessionManager';

async function main() {
  logger.info('Starting WhatsApp Manager API...');

  // ── Connect to Database ──
  try {
    await connectDatabase();
  } catch (error) {
    logger.fatal({ error }, 'Failed to connect to database');
    process.exit(1);
  }

  // ── Create Express App ──
  const { app, httpServer } = createApp();

  // ── Initialize WebSocket ──
  initializeWebSocket(httpServer);

  // ── Start Server ──
  httpServer.listen(config.api.port, () => {
    logger.info({ port: config.api.port, env: config.nodeEnv }, `API server listening`);
  });

  // ── Restore Active Sessions ──
  try {
    await getSessionManager().restoreAllSessions();
  } catch (error) {
    logger.error({ error }, 'Failed to restore some sessions');
  }

  // ── Graceful Shutdown ──
  const gracefulShutdown = async (signal: string) => {
    logger.info({ signal }, 'Received shutdown signal');
    httpServer.close(async () => {
      await disconnectDatabase();
      logger.info('Server shut down gracefully');
      process.exit(0);
    });

    // Force shutdown after 30 seconds
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 30000);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

main().catch((error) => {
  logger.fatal({ error }, 'Fatal error during startup');
  process.exit(1);
});
