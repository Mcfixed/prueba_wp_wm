/**
 * Redis module - DISABLED.
 * The application works without Redis.
 * All features (session management, rate limiting, cache) use in-memory alternatives.
 */
import { logger } from '../logger';

export const redis = {
  ping: async () => 'PONG' as const,
  on: () => {},
  disconnect: () => {},
  status: 'disconnected' as const,
} as any;

export async function connectRedis(): Promise<void> {
  logger.info('Redis disabled - using in-memory alternatives');
}
