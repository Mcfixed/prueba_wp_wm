import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../infrastructure/database/prisma';
import { NotFoundError } from '../../shared/errors/AppError';
import { createWebhookSchema } from '../validators';
import { logger } from '../../infrastructure/logger';

export async function listWebhooks(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const webhooks = await prisma.webhookConfig.findMany({
      where: { userId: req.user!.sub },
      include: {
        sessions: {
          include: { session: { select: { id: true, name: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(webhooks);
  } catch (error) {
    next(error);
  }
}

export async function createWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = createWebhookSchema.parse(req.body);

    const webhook = await prisma.webhookConfig.create({
      data: {
        name: data.name,
        url: data.url,
        events: data.events,
        userId: req.user!.sub,
        sessions: data.sessionIds
          ? {
              create: data.sessionIds.map((sessionId) => ({ sessionId })),
            }
          : undefined,
      },
      include: { sessions: true },
    });

    logger.info({ webhookId: webhook.id }, 'Webhook created');
    res.status(201).json(webhook);
  } catch (error) {
    next(error);
  }
}

export async function updateWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const webhook = await prisma.webhookConfig.findFirst({
      where: { id: req.params.id, userId: req.user!.sub },
    });
    if (!webhook) throw new NotFoundError('WebhookConfig', req.params.id);

    const { sessionIds, ...data } = req.body;
    const updated = await prisma.webhookConfig.update({
      where: { id: req.params.id },
      data: {
        ...data,
        sessions: sessionIds
          ? {
              deleteMany: {},
              create: sessionIds.map((sessionId: string) => ({ sessionId })),
            }
          : undefined,
      },
      include: { sessions: true },
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
}

export async function deleteWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const webhook = await prisma.webhookConfig.findFirst({
      where: { id: req.params.id, userId: req.user!.sub },
    });
    if (!webhook) throw new NotFoundError('WebhookConfig', req.params.id);

    await prisma.webhookConfig.delete({ where: { id: req.params.id } });
    res.json({ message: 'Webhook deleted' });
  } catch (error) {
    next(error);
  }
}
