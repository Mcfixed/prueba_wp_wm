import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { config } from '../../config';
import { logger } from '../logger';
import { verifyToken } from '../auth/jwt';

let io: Server | null = null;

export function initializeWebSocket(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    path: config.ws.path,
    cors: {
      origin: config.cors.origin,
      credentials: true,
    },
    pingInterval: 10000,
    pingTimeout: 5000,
  });

  // Auth middleware for WebSocket
  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) {
      return next(new Error('Authentication required'));
    }
    try {
      const payload = verifyToken(token as string);
      (socket as any).user = payload;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = (socket as any).user;
    logger.info({ userId: user.sub, socketId: socket.id }, 'WebSocket client connected');

    // Join user to their personal room
    socket.join(`user:${user.sub}`);

    socket.on('subscribe:session', (sessionId: string) => {
      socket.join(`session:${sessionId}`);
      logger.info({ sessionId, socketId: socket.id }, 'Client subscribed to session');
    });

    socket.on('unsubscribe:session', (sessionId: string) => {
      socket.leave(`session:${sessionId}`);
    });

    socket.on('disconnect', (reason) => {
      logger.info({ socketId: socket.id, reason }, 'WebSocket client disconnected');
    });
  });

  logger.info('WebSocket server initialized');
  return io;
}

export function getIO(): Server {
  if (!io) {
    throw new Error('WebSocket server not initialized');
  }
  return io;
}

// Emit event to a specific session room
export function emitToSession(sessionId: string, event: string, data: unknown): void {
  if (io) {
    io.to(`session:${sessionId}`).emit(event, data);
  }
}

// Emit event to a specific user
export function emitToUser(userId: string, event: string, data: unknown): void {
  if (io) {
    io.to(`user:${userId}`).emit(event, data);
  }
}

// Broadcast to all connected clients
export function broadcast(event: string, data: unknown): void {
  if (io) {
    io.emit(event, data);
  }
}
