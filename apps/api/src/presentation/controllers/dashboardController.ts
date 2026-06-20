import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../infrastructure/database/prisma';

export async function getDashboardStats(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.sub;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalSessions,
      connectedSessions,
      disconnectedSessions,
      todayEvents,
    ] = await Promise.all([
      prisma.session.count({ where: { userId } }),
      prisma.session.count({ where: { userId, state: 'CONNECTED' } }),
      prisma.session.count({ where: { userId, state: 'DISCONNECTED' } }),
      prisma.event.count({
        where: {
          session: { userId },
          timestamp: { gte: today },
        },
      }),
    ]);

    res.json({
      totalSessions,
      connectedSessions,
      disconnectedSessions,
      messagesSentToday: 0, // Will be implemented with message tracking
      messagesReceivedToday: 0,
      recentEvents: todayEvents,
    });
  } catch (error) {
    next(error);
  }
}
