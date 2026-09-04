import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../infrastructure/database/prisma';
import { NotFoundError } from '../../shared/errors/AppError';
import { getSessionManager } from '../../infrastructure/baileys/SessionManager';
import { logger } from '../../infrastructure/logger';

export async function sendMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const session = await prisma.session.findFirst({
      where: { id: req.params.id, userId: req.user!.sub },
    });
    if (!session) throw new NotFoundError('Session', req.params.id);

    const { to, text, type } = req.body;
    if (!to || !text) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'to and text are required' } });
      return;
    }

    const sessionManager = getSessionManager();
    const result = await sessionManager.sendMessage(req.params.id, to, text, type);

    res.json({ success: true, messageId: result?.key?.id });
  } catch (error: any) {
    if (error.message === 'Session not connected') {
      res.status(400).json({ error: { code: 'SESSION_NOT_CONNECTED', message: 'Session is not connected' } });
      return;
    }
    next(error);
  }
}

export async function getContacts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const session = await prisma.session.findFirst({
      where: { id: req.params.id, userId: req.user!.sub },
    });
    if (!session) throw new NotFoundError('Session', req.params.id);

    const sessionManager = getSessionManager();
    const contacts = await sessionManager.getRecentContacts(req.params.id);

    res.json(contacts);
  } catch (error: any) {
    if (error.message === 'Session not connected') {
      res.status(400).json({ error: { code: 'SESSION_NOT_CONNECTED', message: 'Session is not connected' } });
      return;
    }
    next(error);
  }
}

export async function getConnectedSessions(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const sessionManager = getSessionManager();
    const connected = sessionManager.getConnectedSessions();
    res.json(connected);
  } catch (error) {
    next(error);
  }
}
