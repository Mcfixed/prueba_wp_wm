import { prisma } from '../database/prisma';
import { logger } from '../logger';
import { getSessionManager } from '../baileys/SessionManager';

export interface SystemStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime: number;
  timestamp: string;
  database: 'connected' | 'disconnected';
  sessions: {
    total: number;
    connected: number;
    connecting: number;
    waiting_qr: number;
    disconnected: number;
    error: number;
    logged_out: number;
    reconnecting: number;
  };
  baileys: {
    active_sockets: number;
    version: string;
  };
  memory: {
    heapUsedMB: number;
    heapTotalMB: number;
    rssMB: number;
  };
}

export class HealthChecker {
  private checkInterval: NodeJS.Timeout | null = null;
  private lastStatus: SystemStatus | null = null;

  start(intervalMs: number = 60000): void {
    if (this.checkInterval) return;
    logger.info({ intervalMs }, 'Health checker started');

    // Run immediately
    this.check();

    // Then every interval
    this.checkInterval = setInterval(() => this.check(), intervalMs);
  }

  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      logger.info('Health checker stopped');
    }
  }

  getLastStatus(): SystemStatus | null {
    return this.lastStatus;
  }

  async check(): Promise<SystemStatus> {
    const mem = process.memoryUsage();

    let dbStatus: 'connected' | 'disconnected' = 'disconnected';
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbStatus = 'connected';
    } catch {
      dbStatus = 'disconnected';
    }

    const sessionManager = getSessionManager();
    const counts = { total: 0, connected: 0, connecting: 0, waiting_qr: 0, disconnected: 0, error: 0, logged_out: 0, reconnecting: 0 };

    try {
      const sessions = await prisma.session.findMany({ select: { state: true } });
      counts.total = sessions.length;
      for (const s of sessions) {
        switch (s.state) {
          case 'CONNECTED': counts.connected++; break;
          case 'CONNECTING': counts.connecting++; break;
          case 'WAITING_QR': counts.waiting_qr++; break;
          case 'DISCONNECTED': counts.disconnected++; break;
          case 'ERROR': counts.error++; break;
          case 'LOGGED_OUT': counts.logged_out++; break;
          case 'RECONNECTING': counts.reconnecting++; break;
        }
      }
    } catch { /* DB might be down */ }

    const status: SystemStatus = {
      status: dbStatus === 'connected' ? 'healthy' : 'degraded',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      database: dbStatus,
      sessions: counts,
      baileys: {
        active_sockets: sessionManager.getConnectedSessions().length,
        version: process.env.npm_package_version || '1.0.0',
      },
      memory: {
        heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024 * 100) / 100,
        heapTotalMB: Math.round(mem.heapTotal / 1024 / 1024 * 100) / 100,
        rssMB: Math.round(mem.rss / 1024 / 1024 * 100) / 100,
      },
    };

    // Auto-log degraded states
    if (status.database === 'disconnected') {
      logger.error('Health check: Database disconnected');
    }
    if (status.sessions.error > 0) {
      logger.warn({ errorCount: status.sessions.error }, 'Health check: Sessions in error state');
    }
    if (status.memory.heapUsedMB > 400) {
      logger.warn({ heapUsedMB: status.memory.heapUsedMB }, 'Health check: High memory usage');
    }

    this.lastStatus = status;
    return status;
  }
}

let healthChecker: HealthChecker;

export function getHealthChecker(): HealthChecker {
  if (!healthChecker) {
    healthChecker = new HealthChecker();
  }
  return healthChecker;
}
