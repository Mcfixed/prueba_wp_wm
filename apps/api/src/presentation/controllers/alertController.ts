import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../infrastructure/database/prisma';
import { NotFoundError } from '../../shared/errors/AppError';
import { createAlertRuleSchema, updateAlertRuleSchema } from '../validators';
import { logger } from '../../infrastructure/logger';

export async function listAlertRules(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const rules = await prisma.alertRule.findMany({
      where: { userId: req.user!.sub },
      include: { session: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(rules);
  } catch (error) {
    next(error);
  }
}

export async function createAlertRule(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = createAlertRuleSchema.parse(req.body);

    // Verify session belongs to user
    const session = await prisma.session.findFirst({
      where: { id: data.sessionId, userId: req.user!.sub },
    });
    if (!session) throw new NotFoundError('Session', data.sessionId);

    const rule = await prisma.alertRule.create({
      data: {
        sessionId: data.sessionId,
        userId: req.user!.sub,
        event: data.event,
        channels: data.channels,
      },
    });

    logger.info({ ruleId: rule.id, sessionId: data.sessionId }, 'Alert rule created');
    res.status(201).json(rule);
  } catch (error) {
    next(error);
  }
}

export async function updateAlertRule(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = updateAlertRuleSchema.parse(req.body);
    const rule = await prisma.alertRule.findFirst({
      where: { id: req.params.id, userId: req.user!.sub },
    });
    if (!rule) throw new NotFoundError('AlertRule', req.params.id);

    const updated = await prisma.alertRule.update({
      where: { id: req.params.id },
      data,
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
}

export async function deleteAlertRule(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const rule = await prisma.alertRule.findFirst({
      where: { id: req.params.id, userId: req.user!.sub },
    });
    if (!rule) throw new NotFoundError('AlertRule', req.params.id);

    await prisma.alertRule.delete({ where: { id: req.params.id } });
    res.json({ message: 'Alert rule deleted' });
  } catch (error) {
    next(error);
  }
}

export async function getAlertHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const [history, total] = await Promise.all([
      prisma.alertHistory.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.alertHistory.count(),
    ]);

    res.json({ data: history, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    next(error);
  }
}
