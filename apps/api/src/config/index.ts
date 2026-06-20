import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isDev: (process.env.NODE_ENV || 'development') === 'development',

  api: {
    port: parseInt(process.env.API_PORT || '3000', 10),
    url: process.env.API_URL || 'http://localhost:3000',
  },

  web: {
    url: process.env.WEB_URL || 'http://localhost:5173',
  },

  database: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:root@localhost:5432/whatsapp_manager',
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'dev-jwt-secret',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  smtp: {
    host: process.env.SMTP_HOST || '',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },

  encryption: {
    masterKey: process.env.MASTER_ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
  },

  baileys: {
    sessionDir: process.env.BAILEYS_SESSION_DIR || './data/sessions',
    maxReconnectRetries: parseInt(process.env.BAILEYS_MAX_RECONNECT_RETRIES || '5', 10),
    reconnectInterval: parseInt(process.env.BAILEYS_RECONNECT_INTERVAL || '5000', 10),
  },

  logging: {
    level: process.env.LOG_LEVEL || 'debug',
    format: process.env.LOG_FORMAT || 'pretty',
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },

  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  },

  ws: {
    path: process.env.WS_PATH || '/ws',
  },
};
