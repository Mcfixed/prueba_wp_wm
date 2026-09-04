import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../infrastructure/database/prisma';
import { NotFoundError } from '../../shared/errors/AppError';
import { getSessionManager } from '../../infrastructure/baileys/SessionManager';
import { MessageQueue } from '../../infrastructure/messages/MessageQueue';
import { logger } from '../../infrastructure/logger';

/**
 * Enqueue a message into the outbox. The send itself happens asynchronously in
 * the per-session queue (with retries + spacing), so a message is never lost
 * when the session is unstable or many services call at the same time.
 *
 * Supports an optional `idempotencyKey` in the body: retries with the same key
 * return the previous result instead of sending a duplicate.
 */
export async function sendMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const session = await prisma.session.findFirst({
      where: { id: req.params.id, userId: req.user!.sub },
    });
    if (!session) throw new NotFoundError('Session', req.params.id);

    const { to, text, type, idempotencyKey } = req.body;
    if (!to || !text) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'to and text are required' } });
      return;
    }

    // Idempotency: return the existing result on retries with the same key.
    if (idempotencyKey) {
      const existing = await prisma.message.findUnique({ where: { idempotencyKey } });
      if (existing) {
        res.status(200).json({
          success: true,
          messageId: existing.id,
          status: existing.status,
          duplicated: true,
        });
        return;
      }
    }

    let message;
    try {
      message = await prisma.message.create({
        data: {
          sessionId: session.id,
          userId: req.user!.sub,
          to,
          text,
          type: type || null,
          idempotencyKey: idempotencyKey || null,
        },
      });
    } catch (error: any) {
      // Concurrent duplicate (unique constraint race on idempotencyKey).
      if (error?.code === 'P2002' && idempotencyKey) {
        const existing = await prisma.message.findUnique({ where: { idempotencyKey } });
        if (existing) {
          res.status(200).json({
            success: true,
            messageId: existing.id,
            status: existing.status,
            duplicated: true,
          });
          return;
        }
      }
      throw error;
    }

    logger.info({ messageId: message.id, sessionId: session.id }, 'Message enqueued');

    // Hand over to the per-session queue; returns fast, never blocks on the socket.
    MessageQueue.getInstance().kick(session.id);

    res.status(202).json({
      success: true,
      messageId: message.id,
      status: message.status,
      queued: true,
    });
  } catch (error: any) {
    next(error);
  }
}

/** Poll the real status of an outbox message. */
export async function getMessageStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const message = await prisma.message.findFirst({
      where: { id: req.params.messageId, userId: req.user!.sub },
    });
    if (!message) throw new NotFoundError('Message', req.params.messageId);

    res.json({
      id: message.id,
      status: message.status,
      attempts: message.attempts,
      maxAttempts: message.maxAttempts,
      lastError: message.lastError,
      waMessageId: message.waMessageId,
      createdAt: message.createdAt,
      sentAt: message.sentAt,
      deliveredAt: message.deliveredAt,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * List outbox messages with pagination + filters (history panel).
 *
 * Query params:
 *   page, limit, status (comma separated, e.g. `SENT,FAILED`), sessionId,
 *   q (search in text/to), from / to (ISO dates on createdAt).
 */
export async function listMessages(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 25));
    const skip = (page - 1) * limit;

    const { status, sessionId, q, from, to } = req.query;

    const where: any = { userId: req.user!.sub };

    if (status) {
      const statuses = String(status)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      if (statuses.length) where.status = { in: statuses };
    }
    if (sessionId) where.sessionId = String(sessionId);
    if (q) {
      const term = String(q);
      where.OR = [
        { text: { contains: term, mode: 'insensitive' } },
        { to: { contains: term, mode: 'insensitive' } },
      ];
    }
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(String(from));
      if (to) where.createdAt.lte = new Date(String(to));
    }

    const [data, total] = await Promise.all([
      prisma.message.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { session: { select: { id: true, name: true } } },
      }),
      prisma.message.count({ where }),
    ]);

    res.json({ data, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    next(error);
  }
}

/** Quick aggregate counters for the panel header. */
export async function getMessageStats(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const where: any = { userId: req.user!.sub };
    const [total, pending, processing, sent, failed, delivered] = await Promise.all([
      prisma.message.count({ where }),
      prisma.message.count({ where: { ...where, status: 'PENDING' } }),
      prisma.message.count({ where: { ...where, status: 'PROCESSING' } }),
      prisma.message.count({ where: { ...where, status: 'SENT' } }),
      prisma.message.count({ where: { ...where, status: 'FAILED' } }),
      prisma.message.count({ where: { ...where, status: 'SENT', deliveredAt: { not: null } } }),
    ]);
    res.json({ total, pending, processing, sent, failed, delivered });
  } catch (error) {
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
