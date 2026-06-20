import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../infrastructure/database/prisma';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../infrastructure/logger';

export async function listApiKeys(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // API keys are stored in a simple table. Using audit_logs as reference.
    // For now, return placeholder
    res.json({ data: [], message: 'API Keys feature - extend Prisma schema as needed' });
  } catch (error) {
    next(error);
  }
}

export async function createApiKey(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const apiKey = `wm_${uuidv4().replace(/-/g, '')}`;
    // Store in a proper table (future: add ApiKey model to Prisma)
    logger.info({ userId: req.user!.sub }, 'API Key generated');
    res.status(201).json({ apiKey, message: 'Store this key securely. It will not be shown again.' });
  } catch (error) {
    next(error);
  }
}
