import { logger } from './logger';
import { broadcast } from './websocket';

/**
 * Installs global process handlers so that an unexpected error (for example an
 * unhandled promise rejection thrown by Baileys when the WhatsApp connection is
 * lost mid-query) NEVER takes down the whole backend.
 *
 * We log the error and notify connected clients via websocket (`app:status`),
 * but we keep the process alive and serving.
 *
 * NOTE: For `uncaughtException` we deliberately keep the process alive too.
 * The errors seen in practice (Baileys `query` timeouts, DB hiccups, etc.) do
 * not corrupt the Express/WebSocket state, so restarting the entire backend
 * would only cause more downtime. Logging + keeping alive maximizes uptime,
 * which is what this guard is for.
 */
export function installProcessGuards(): void {
  process.on('unhandledRejection', (reason) => {
    logger.error({ err: reason }, 'Unhandled promise rejection (process kept alive)');
    notifyDegraded('unhandled_rejection', reason);
  });

  process.on('uncaughtException', (error) => {
    logger.error({ err: error }, 'Uncaught exception (process kept alive)');
    notifyDegraded('uncaught_exception', error);
  });
}

let lastNotifyAt = 0;

/** Broadcast a "degraded" status to clients, throttled to avoid spamming. */
function notifyDegraded(type: string, err: unknown): void {
  const now = Date.now();
  if (now - lastNotifyAt < 10_000) {
    return;
  }
  lastNotifyAt = now;

  const message = err instanceof Error ? err.message : String(err);
  try {
    broadcast('app:status', {
      status: 'degraded',
      type,
      message,
      timestamp: new Date().toISOString(),
    });
  } catch {
    // io is not ready yet — nothing to notify.
  }
}
