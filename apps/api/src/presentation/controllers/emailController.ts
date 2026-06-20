import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../infrastructure/database/prisma';
import { NotFoundError } from '../../shared/errors/AppError';
import { logger } from '../../infrastructure/logger';

export async function getEmailConfig(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const config = await prisma.emailConfig.findFirst({
      where: { userId: req.user!.sub },
    });
    if (!config) {
      res.json(null);
      return;
    }
    // Don't expose password
    const { password, ...safeConfig } = config;
    res.json(safeConfig);
  } catch (error) {
    next(error);
  }
}

export async function upsertEmailConfig(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { host, port, secure, username: smtpUser, password, recipients } = req.body;

    const existing = await prisma.emailConfig.findFirst({
      where: { userId: req.user!.sub },
    });

    let config;
    if (existing) {
      config = await prisma.emailConfig.update({
        where: { id: existing.id },
        data: {
          host,
          port,
          secure,
          username: smtpUser,
          password: password || existing.password,
          recipients,
        },
      });
    } else {
      config = await prisma.emailConfig.create({
        data: {
          userId: req.user!.sub,
          host,
          port,
          secure,
          username: smtpUser,
          password,
          recipients,
        },
      });
    }

    logger.info({ userId: req.user!.sub }, 'Email config updated');
    const { password: _, username: _u, ...safeConfig } = config;
    res.json(safeConfig);
  } catch (error) {
    next(error);
  }
}

export async function deleteEmailConfig(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const config = await prisma.emailConfig.findFirst({
      where: { userId: req.user!.sub },
    });
    if (!config) throw new NotFoundError('EmailConfig');

    await prisma.emailConfig.delete({ where: { id: config.id } });
    res.json({ message: 'Email config deleted' });
  } catch (error) {
    next(error);
  }
}
