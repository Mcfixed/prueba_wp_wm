import { Request, Response } from 'express';
import { prisma } from '../../infrastructure/database/prisma';

export async function healthCheck(_req: Request, res: Response): Promise<void> {
  const checks = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks: {
      database: false,
    },
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.checks.database = true;
  } catch {
    checks.status = 'degraded';
  }

  const httpStatus = checks.status === 'ok' ? 200 : 503;
  res.status(httpStatus).json(checks);
}
