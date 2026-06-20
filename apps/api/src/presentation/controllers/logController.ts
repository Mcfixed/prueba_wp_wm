import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../infrastructure/database/prisma';

export async function listLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (req.query.sessionId) where.sessionId = req.query.sessionId;
    if (req.query.severity) where.severity = req.query.severity;
    if (req.query.eventType) where.eventType = req.query.eventType;

    // Date filter
    if (req.query.startDate || req.query.endDate) {
      where.createdAt = {};
      if (req.query.startDate) where.createdAt.gte = new Date(req.query.startDate as string);
      if (req.query.endDate) where.createdAt.lte = new Date(req.query.endDate as string);
    }

    const [logs, total] = await Promise.all([
      prisma.log.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          session: { select: { id: true, name: true } },
        },
      }),
      prisma.log.count({ where }),
    ]);

    res.json({ data: logs, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    next(error);
  }
}
