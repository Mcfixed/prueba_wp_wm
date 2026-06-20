import { Request, Response } from 'express';
import { prisma } from '../../infrastructure/database/prisma';

/**
 * Prometheus metrics endpoint.
 * In production, use a proper prom-client library.
 */
export async function metrics(_req: Request, res: Response): Promise<void> {
  try {
    const [
      totalSessions,
      connectedSessions,
      errorSessions,
      totalUsers,
      totalEvents,
    ] = await Promise.all([
      prisma.session.count(),
      prisma.session.count({ where: { state: 'CONNECTED' } }),
      prisma.session.count({ where: { state: 'ERROR' } }),
      prisma.user.count(),
      prisma.event.count(),
    ]);

    const lines = [
      '# HELP wm_sessions_total Total number of WhatsApp sessions',
      '# TYPE wm_sessions_total gauge',
      `wm_sessions_total ${totalSessions}`,
      '',
      '# HELP wm_sessions_connected Number of connected sessions',
      '# TYPE wm_sessions_connected gauge',
      `wm_sessions_connected ${connectedSessions}`,
      '',
      '# HELP wm_sessions_error Number of sessions in error state',
      '# TYPE wm_sessions_error gauge',
      `wm_sessions_error ${errorSessions}`,
      '',
      '# HELP wm_users_total Total number of users',
      '# TYPE wm_users_total gauge',
      `wm_users_total ${totalUsers}`,
      '',
      '# HELP wm_events_total Total number of events captured',
      '# TYPE wm_events_total counter',
      `wm_events_total ${totalEvents}`,
      '',
      '# HELP wm_uptime_seconds Server uptime in seconds',
      '# TYPE wm_uptime_seconds counter',
      `wm_uptime_seconds ${process.uptime()}`,
    ];

    res.set('Content-Type', 'text/plain; charset=utf-8');
    res.send(lines.join('\n'));
  } catch (error) {
    res.status(500).send('# Error collecting metrics\n');
  }
}
