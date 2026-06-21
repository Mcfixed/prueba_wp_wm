import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../../infrastructure/auth/jwt';
import { prisma } from '../../infrastructure/database/prisma';
import { UnauthorizedError, ForbiddenError } from '../../shared/errors/AppError';
import { Role } from '@prisma/client';

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      user?: {
        sub: string;
        email: string;
        role: string;
      };
    }
  }
}

export async function authenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new UnauthorizedError('Missing or invalid authorization header'));
  }

  const token = authHeader.split(' ')[1];

  // Try JWT first
  try {
    const payload = verifyToken(token);
    req.user = payload;
    next();
    return;
  } catch {
    // JWT failed, try API Key
  }

  // Try API Key
  try {
    const apiKey = await prisma.apiKey.findUnique({ where: { key: token } });
    if (apiKey && apiKey.enabled && (!apiKey.expiresAt || apiKey.expiresAt > new Date())) {
      // Update last used
      await prisma.apiKey.update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } });

      const user = await prisma.user.findUnique({ where: { id: apiKey.userId } });
      if (user && user.isActive) {
        req.user = { sub: user.id, email: user.email, role: user.role };
        next();
        return;
      }
    }
  } catch {
    // API key lookup failed
  }

  next(new UnauthorizedError('Invalid or expired token'));
}

export function authorize(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError());
    }
    if (!roles.includes(req.user.role as Role)) {
      return next(new ForbiddenError('Insufficient permissions'));
    }
    next();
  };
}
