import { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs/promises';
import { prisma } from '../../infrastructure/database/prisma';
import { NotFoundError } from '../../shared/errors/AppError';
import { createSessionSchema, updateSessionSchema } from '../validators';
import { config } from '../../config';
import { logger } from '../../infrastructure/logger';
import { getSessionManager } from '../../infrastructure/baileys/SessionManager';

export async function listSessions(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const [sessions, total] = await Promise.all([
      prisma.session.findMany({
        where: { userId: req.user!.sub },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.session.count({ where: { userId: req.user!.sub } }),
    ]);

    res.json({
      data: sessions,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    next(error);
  }
}

export async function createSession(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = createSessionSchema.parse(req.body);
    const session = await prisma.session.create({
      data: {
        name: data.name,
        description: data.description,
        userId: req.user!.sub,
      },
    });

    logger.info({ sessionId: session.id, userId: req.user!.sub }, 'Session created');
    res.status(201).json(session);
  } catch (error) {
    next(error);
  }
}

export async function getSession(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const session = await prisma.session.findFirst({
      where: { id: req.params.id, userId: req.user!.sub },
    });
    if (!session) throw new NotFoundError('Session', req.params.id);
    res.json(session);
  } catch (error) {
    next(error);
  }
}

export async function updateSession(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = updateSessionSchema.parse(req.body);
    const session = await prisma.session.findFirst({
      where: { id: req.params.id, userId: req.user!.sub },
    });
    if (!session) throw new NotFoundError('Session', req.params.id);

    const updated = await prisma.session.update({
      where: { id: req.params.id },
      data,
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
}

export async function deleteSession(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const session = await prisma.session.findFirst({
      where: { id: req.params.id, userId: req.user!.sub },
    });
    if (!session) throw new NotFoundError('Session', req.params.id);

    // Disconnect Baileys if connected
    const sessionManager = getSessionManager();
    await sessionManager.disconnectSession(req.params.id);

    // Clean up session files from disk
    const sessionDir = path.join(config.baileys.sessionDir, req.params.id);
    try { await fs.rm(sessionDir, { recursive: true, force: true }); } catch { /* ignore */ }

    await prisma.session.delete({ where: { id: req.params.id } });
    logger.info({ sessionId: req.params.id }, 'Session deleted');

    res.json({ message: 'Session deleted successfully' });
  } catch (error) {
    next(error);
  }
}

export async function connectSession(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const session = await prisma.session.findFirst({
      where: { id: req.params.id, userId: req.user!.sub },
    });
    if (!session) throw new NotFoundError('Session', req.params.id);

    const sessionManager = getSessionManager();
    const qrCode = await sessionManager.connectSession(session.id, session.name);

    res.json({ message: 'Session connecting', qrCode });
  } catch (error) {
    next(error);
  }
}

export async function disconnectSession(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const session = await prisma.session.findFirst({
      where: { id: req.params.id, userId: req.user!.sub },
    });
    if (!session) throw new NotFoundError('Session', req.params.id);

    const sessionManager = getSessionManager();
    await sessionManager.disconnectSession(req.params.id);

    res.json({ message: 'Session disconnected' });
  } catch (error) {
    next(error);
  }
}

export async function restartSession(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const session = await prisma.session.findFirst({
      where: { id: req.params.id, userId: req.user!.sub },
    });
    if (!session) throw new NotFoundError('Session', req.params.id);

    const sessionManager = getSessionManager();
    await sessionManager.restartSession(req.params.id, session.name);

    res.json({ message: 'Session restarting' });
  } catch (error) {
    next(error);
  }
}

export async function getSessionLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const session = await prisma.session.findFirst({
      where: { id: req.params.id, userId: req.user!.sub },
    });
    if (!session) throw new NotFoundError('Session', req.params.id);

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      prisma.log.findMany({
        where: { sessionId: req.params.id },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.log.count({ where: { sessionId: req.params.id } }),
    ]);

    res.json({ data: logs, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    next(error);
  }
}

export async function getSessionQr(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const session = await prisma.session.findFirst({
      where: { id: req.params.id, userId: req.user!.sub },
    });
    if (!session) throw new NotFoundError('Session', req.params.id);

    const sessionManager = getSessionManager();
    const qrCode = sessionManager.getSessionQr(req.params.id);

    if (!qrCode) {
      res.json({ qrCode: null, message: 'No QR code available. Session might be connecting or connected.' });
      return;
    }

    res.json({ qrCode });
  } catch (error) {
    next(error);
  }
}
