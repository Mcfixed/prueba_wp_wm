import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { config } from './config';
import { logger } from './infrastructure/logger';
import { errorHandler } from './presentation/middleware/errorHandler';
import routes from './presentation/routes';

export function createApp() {
  const app = express();
  const httpServer = createServer(app);

  // ── Security Middleware ──
  app.use(helmet());
  app.use(cors({
    origin: config.cors.origin,
    credentials: true,
  }));

  // ── Rate Limiting ──
  app.use(rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.maxRequests,
    message: { error: { code: 'RATE_LIMIT', message: 'Too many requests, please try again later' } },
  }));

  // ── Body Parsing ──
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // ── Request Logging ──
  app.use((req, _res, next) => {
    logger.debug({ method: req.method, url: req.url }, 'Incoming request');
    next();
  });

  // ── API Routes ──
  app.use('/api/v1', routes);

  // ── Health Check (non-API) ──
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // ── Error Handler ──
  app.use(errorHandler);

  return { app, httpServer };
}
