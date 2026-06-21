import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../infrastructure/database/prisma';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../infrastructure/logger';
import { NotFoundError } from '../../shared/errors/AppError';

export async function listApiKeys(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const keys = await prisma.apiKey.findMany({
      where: { userId: req.user!.sub },
      select: {
        id: true,
        name: true,
        key: true,
        enabled: true,
        lastUsedAt: true,
        createdAt: true,
        expiresAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(keys);
  } catch (error) {
    next(error);
  }
}

export async function createApiKey(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { name, expiresInDays } = req.body;
    if (!name) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'name is required' } });
      return;
    }

    const key = `wm_${uuidv4().replace(/-/g, '')}`;
    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
      : null;

    await prisma.apiKey.create({
      data: {
        name,
        key,
        userId: req.user!.sub,
        expiresAt,
      },
    });

    logger.info({ userId: req.user!.sub, keyName: name }, 'API Key created');
    // Show the key only once
    res.status(201).json({
      id: key,
      name,
      key,
      expiresAt,
      message: '⚠️ Store this key securely. It will not be shown again.',
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteApiKey(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const apiKey = await prisma.apiKey.findFirst({
      where: { id: req.params.id, userId: req.user!.sub },
    });
    if (!apiKey) throw new NotFoundError('ApiKey', req.params.id);

    await prisma.apiKey.delete({ where: { id: req.params.id } });
    logger.info({ keyId: req.params.id }, 'API Key deleted');
    res.json({ message: 'API Key deleted' });
  } catch (error) {
    next(error);
  }
}

export async function toggleApiKey(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const apiKey = await prisma.apiKey.findFirst({
      where: { id: req.params.id, userId: req.user!.sub },
    });
    if (!apiKey) throw new NotFoundError('ApiKey', req.params.id);

    const updated = await prisma.apiKey.update({
      where: { id: req.params.id },
      data: { enabled: !apiKey.enabled },
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
}
