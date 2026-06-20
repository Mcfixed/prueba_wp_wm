import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../infrastructure/database/prisma';
import { logger } from '../../infrastructure/logger';

export function audit(action: string, entity: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const originalJson = res.json.bind(res);

    res.json = function (body: any) {
      // Log audit after response
      if (req.user) {
        const entityId = req.params.id || body?.id || null;

        prisma.auditLog
          .create({
            data: {
              userId: req.user.sub,
              action,
              entity,
              entityId: entityId as string | undefined,
              details: {
                method: req.method,
                path: req.path,
                body: sanitizeBody(req.body),
              },
              ipAddress: req.ip,
            },
          })
          .catch((err) => logger.error({ msg: 'Failed to create audit log', err }));
      }

      return originalJson(body);
    };

    next();
  };
}

function sanitizeBody(body: Record<string, any>): Record<string, any> {
  const sanitized = { ...body };
  delete sanitized.password;
  delete sanitized.passwordHash;
  return sanitized;
}
