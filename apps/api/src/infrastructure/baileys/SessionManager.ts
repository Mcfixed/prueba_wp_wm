import { Boom } from '@hapi/boom';
import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  useMultiFileAuthState,
  WASocket,
  BaileysEventMap,
} from '@whiskeysockets/baileys';
import path from 'path';
import fs from 'fs/promises';
import QRCode from 'qrcode';
import { prisma } from '../database/prisma';
import { redis } from '../redis';
import { logger } from '../logger';
import { config } from '../../config';
import { emitToSession, broadcast } from '../websocket';
import { encryptData, decryptData } from '../crypto';
import { AlertService } from '../alerts/AlertService';

interface ActiveSession {
  socket: WASocket;
  name: string;
  qrCode: string | null;
  state: string;
  retries: number;
  closing?: boolean;
}

export class SessionManager {
  private sessions: Map<string, ActiveSession> = new Map();
  private alertService: AlertService;

  constructor() {
    this.alertService = new AlertService();
  }

  /** Safe session update - catches "record not found" errors */
  private async safeUpdate(sessionId: string, data: any): Promise<void> {
    try {
      await prisma.session.update({ where: { id: sessionId }, data });
    } catch (error: any) {
      if (error?.code === 'P2025') {
        logger.warn({ sessionId }, 'Session not found in DB, skipping update');
        return;
      }
      throw error;
    }
  }

  async connectSession(sessionId: string, sessionName: string): Promise<string | null> {
    const sessionDir = path.join(config.baileys.sessionDir, sessionId);
    
    // Close old socket if exists (mark as closing to avoid reconnect loop)
    if (this.sessions.has(sessionId)) {
      const existing = this.sessions.get(sessionId)!;
      existing.closing = true;
      try { existing.socket.end(new Error('Reconnecting')); } catch { /* ignore */ }
      this.sessions.delete(sessionId);
      logger.info({ sessionId }, 'Closed existing socket');
    }
    
    // Check current state: only clean for LOGGED_OUT
    const currentSession = await prisma.session.findUnique({ where: { id: sessionId } });
    const isLoggedOut = currentSession?.state === 'LOGGED_OUT';
    
    if (isLoggedOut) {
      logger.info({ sessionId }, 'Session was logged out, starting fresh');
      try { await fs.rm(sessionDir, { recursive: true, force: true }); } catch { /* ignore */ }
      await prisma.sessionCredential.deleteMany({ where: { sessionId } });
      await this.safeUpdate(sessionId, { state: 'CREATED', qrCode: null, phoneNumber: null });
    }

    await fs.mkdir(sessionDir, { recursive: true });

    // Restore credentials from DB for all states except LOGGED_OUT
    if (!isLoggedOut) {
      await this.restoreCredentials(sessionId, sessionDir);
    }

    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

    const { version, isLatest } = await fetchLatestBaileysVersion();
    logger.info({ sessionId, version, isLatest }, 'Using Baileys version');

    // Wrap socket creation in try-catch to handle Node.js compatibility issues
    let socket: WASocket;
    try {
      socket = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: false,
        syncFullHistory: false,
        markOnlineOnConnect: true,
      });
    } catch (error) {
      logger.error({ sessionId, error }, 'Failed to create Baileys socket');
      await this.safeUpdate(sessionId, { state: 'ERROR', qrCode: null });
      broadcast('session:state', { sessionId, state: 'ERROR' });
      return null;
    }

    // Note: DO NOT call removeAllListeners here - it would remove Baileys' own
    // internal handlers and break the connection. Old socket listeners are
    // cleaned up when the old socket is garbage collected (removed from Map).

    let qrCodeValue: string | null = null;

    // Handle connection updates
    socket.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;
      logger.debug({ sessionId, connection, hasQr: !!qr }, 'Baileys connection.update');

      if (qr) {
        // Convert QR text to image data URL for the frontend
        let qrImageUrl: string | null = null;
        try {
          qrImageUrl = await QRCode.toDataURL(qr, { width: 300, margin: 2 });
        } catch {
          qrImageUrl = null;
        }

        qrCodeValue = qrImageUrl;
        this.sessions.set(sessionId, { ...this.sessions.get(sessionId)!, qrCode: qrImageUrl });

        // Update session state and QR in DB
        await this.safeUpdate(sessionId, { state: 'WAITING_QR', qrCode: qr });

        emitToSession(sessionId, 'session:qr', { sessionId, qrCode: qrImageUrl });
        broadcast('session:state', { sessionId, state: 'WAITING_QR' });

        // Alert
        await this.alertService.evaluateAndNotify(sessionId, 'QR_GENERATED', { qrCode: qr });
      }

      if (connection === 'open') {
        const activeSession = this.sessions.get(sessionId);
        this.sessions.set(sessionId, {
          ...activeSession!,
          state: 'CONNECTED',
          qrCode: null,
          retries: 0,
        });

        // Get phone number from Baileys auth state
        let phoneNumber: string | null = null;
        try {
          phoneNumber = socket.authState.creds?.me?.id?.split(':')[0] || null;
        } catch { /* ignore */ }

        await this.safeUpdate(sessionId, {
          state: 'CONNECTED',
          phoneNumber,
          qrCode: null,
          lastConnectionAt: new Date(),
          lastActivityAt: new Date(),
        });

        emitToSession(sessionId, 'session:connected', { sessionId });
        broadcast('session:state', { sessionId, state: 'CONNECTED' });

        await this.alertService.evaluateAndNotify(sessionId, 'SESSION_CONNECTED', {});
        logger.info({ sessionId, phoneNumber }, 'Session connected');
        
        // Save credentials after successful connection
        await saveCreds();
        await this.persistCredentials(sessionId, sessionDir);
      }

      if (connection === 'close') {
        // Skip if manually closed for reconnection
        const activeSession = this.sessions.get(sessionId);
        if (activeSession?.closing) {
          logger.info({ sessionId }, 'Socket closed manually, skipping reconnect handler');
          this.sessions.delete(sessionId);
          return;
        }

        // Extract disconnect reason - handle both Boom and regular Error
        let reason: number | undefined;
        let errorMsg = 'unknown';

        if (lastDisconnect?.error) {
          errorMsg = lastDisconnect.error.message || String(lastDisconnect.error);
          // Try Boom structure first, then fallback to statusCode directly
          const boomError = lastDisconnect.error as Boom;
          reason = boomError?.output?.statusCode ?? (lastDisconnect.error as any)?.statusCode ?? undefined;
        }

        logger.warn({ sessionId, reason, errorMsg }, 'Session connection closed');

        // Clean up session files for a fresh start
        const cleanSessionDir = async () => {
          try {
            await fs.rm(sessionDir, { recursive: true, force: true });
            await fs.mkdir(sessionDir, { recursive: true });
          } catch { /* ignore */ }
        };

        if (reason === DisconnectReason.loggedOut) {
          logger.warn({ sessionId, errorMsg }, 'Session logged out');
          await this.safeUpdate(sessionId, { state: 'LOGGED_OUT', qrCode: null, phoneNumber: null });

          // Remove credentials from DB and clean files
          await prisma.sessionCredential.deleteMany({ where: { sessionId } });
          await cleanSessionDir();

          this.sessions.delete(sessionId);
          broadcast('session:state', { sessionId, state: 'LOGGED_OUT' });
          await this.alertService.evaluateAndNotify(sessionId, 'SESSION_DISCONNECTED', { reason: 'logged_out', errorMsg });
        } else if (reason === DisconnectReason.connectionLost || reason === DisconnectReason.connectionClosed || reason === 515 || !reason) {
          // Auto reconnect
          const retries = (activeSession?.retries || 0) + 1;
          if (retries <= config.baileys.maxReconnectRetries) {
            logger.info({ sessionId, retries, maxRetries: config.baileys.maxReconnectRetries }, 'Reconnecting session');

            await this.safeUpdate(sessionId, { state: 'RECONNECTING' });

            if (activeSession) {
              this.sessions.set(sessionId, { ...activeSession, retries, state: 'RECONNECTING' });
            }

            broadcast('session:state', { sessionId, state: 'RECONNECTING' });

            setTimeout(() => {
              this.connectSession(sessionId, sessionName);
            }, config.baileys.reconnectInterval);
          } else {
            logger.error({ sessionId, errorMsg }, 'Reconnect retries exhausted');
            await this.safeUpdate(sessionId, { state: 'ERROR', qrCode: null });
            this.sessions.delete(sessionId);
            await cleanSessionDir();
            await this.alertService.evaluateAndNotify(sessionId, 'RETRIES_EXHAUSTED', { retries, errorMsg });
          }
        } else {
          // Other disconnect reasons (including bad auth)
          logger.warn({ sessionId, reason, errorMsg }, 'Session disconnected (other)');
          await this.safeUpdate(sessionId, { state: 'DISCONNECTED', qrCode: null });

          this.sessions.delete(sessionId);
          await cleanSessionDir();
          broadcast('session:state', { sessionId, state: 'DISCONNECTED' });
          await this.alertService.evaluateAndNotify(sessionId, 'SESSION_DISCONNECTED', { reason: 'unknown', errorMsg });
        }
      }
    });

    // Handle credentials update
    socket.ev.on('creds.update', async () => {
      logger.debug({ sessionId }, 'creds.update');
      await saveCreds();
      await this.persistCredentials(sessionId, sessionDir);
    });

    // Handle messages
    socket.ev.on('messages.upsert', async ({ messages }) => {
      await this.safeUpdate(sessionId, { lastActivityAt: new Date() });
      await prisma.event.createMany({
        data: messages.map((msg: any) => ({
          sessionId,
          type: 'messages.upsert',
          data: {
            messageId: msg.key?.id,
            from: msg.key?.remoteJid,
            hasText: !!msg.message?.conversation,
          },
        })),
        skipDuplicates: true,
      }).catch(() => {});
    });

    // Register other event handlers
    this.registerEventHandlers(socket, sessionId);

    this.sessions.set(sessionId, {
      socket,
      name: sessionName,
      qrCode: qrCodeValue,
      state: 'CONNECTING',
      retries: 0,
    });

    await this.safeUpdate(sessionId, { state: 'CONNECTING' });

    broadcast('session:state', { sessionId, state: 'CONNECTING' });

    // Wait a bit for QR to be generated (up to 5s)
    for (let i = 0; i < 50; i++) {
      if (qrCodeValue) break;
      await new Promise((r) => setTimeout(r, 100));
    }

    return qrCodeValue;
  }

  async disconnectSession(sessionId: string): Promise<void> {
    const active = this.sessions.get(sessionId);
    if (active) {
      active.closing = true; // Prevent reconnect loop
      active.socket.end(new Error('Manual disconnect'));
      this.sessions.delete(sessionId);
    }

    // Fire alert BEFORE cleaning up
    await this.alertService.evaluateAndNotify(sessionId, 'SESSION_DISCONNECTED', {
      reason: 'manual_disconnect',
    });

    // Clean session directory
    const sessionDir = path.join(config.baileys.sessionDir, sessionId);
    try {
      await fs.rm(sessionDir, { recursive: true, force: true });
    } catch { /* ignore */ }

    // Reset to CREATED so it can reconnect fresh
    await this.safeUpdate(sessionId, { state: 'CREATED', qrCode: null });

    // Remove stored credentials
    await prisma.sessionCredential.deleteMany({ where: { sessionId } });

    broadcast('session:state', { sessionId, state: 'CREATED' });
    logger.info({ sessionId }, 'Session disconnected and reset');
  }

  async restartSession(sessionId: string, sessionName: string): Promise<void> {
    await this.disconnectSession(sessionId);
    // Small delay before reconnecting
    await new Promise((resolve) => setTimeout(resolve, 2000));
    await this.connectSession(sessionId, sessionName);
  }

  getSessionQr(sessionId: string): string | null {
    return this.sessions.get(sessionId)?.qrCode || null;
  }

  getSessionState(sessionId: string): string | null {
    return this.sessions.get(sessionId)?.state || null;
  }

  /**
   * Send a text message through a connected session.
   */
  async sendMessage(sessionId: string, to: string, text: string): Promise<any> {
    const active = this.sessions.get(sessionId);
    if (!active || active.state !== 'CONNECTED') {
      throw new Error('Session not connected');
    }

    const jid = to.includes('@') ? to : `${to}@s.whatsapp.net`;
    const result = await active.socket.sendMessage(jid, { text });
    
    logger.info({ sessionId, to: jid, text: text.substring(0, 50) }, 'Message sent');
    
    // Log the event
    await prisma.event.create({
      data: {
        sessionId,
        type: 'message.sent',
        data: { to: jid, text: text.substring(0, 500), id: result?.key?.id },
      },
    });

    return result;
  }

  /**
   * Get recent contacts from database events for a session.
   */
  async getRecentContacts(sessionId: string): Promise<any[]> {
    try {
      const events = await prisma.event.findMany({
        where: { sessionId, type: 'messages.upsert' },
        orderBy: { timestamp: 'desc' },
        take: 100,
        distinct: ['data'],
      });

      const contactsMap = new Map<string, any>();
      for (const ev of events) {
        const data = ev.data as any;
        const from = data?.from;
        if (from && !from.includes('@broadcast') && !from.includes('status')) {
          contactsMap.set(from, {
            jid: from,
            name: from.split('@')[0],
            lastMessage: data?.hasText ? data.hasText : '',
            lastSeen: ev.timestamp,
          });
        }
      }
      return Array.from(contactsMap.values()).slice(0, 50);
    } catch (error) {
      logger.error({ sessionId, error }, 'Failed to get contacts');
      return [];
    }
  }

  /**
   * Get all connected sessions list (id + name)
   */
  getConnectedSessions(): { id: string; name: string }[] {
    const result: { id: string; name: string }[] = [];
    for (const [id, session] of this.sessions.entries()) {
      if (session.state === 'CONNECTED') {
        result.push({ id, name: session.name });
      }
    }
    return result;
  }

  // Restore all sessions on server start
  async restoreAllSessions(): Promise<void> {
    try {
      const sessions = await prisma.session.findMany({
        where: { state: { in: ['CONNECTED', 'CONNECTING', 'RECONNECTING', 'WAITING_QR'] } },
      });

      logger.info({ count: sessions.length }, 'Restoring sessions after restart');

      for (const session of sessions) {
        try {
          await this.connectSession(session.id, session.name);
          // Stagger reconnections to avoid rate limiting
          await new Promise((resolve) => setTimeout(resolve, 2000));
        } catch (error) {
          logger.error({ sessionId: session.id, error }, 'Failed to restore session');
        }
      }
    } catch (error) {
      logger.error({ error }, 'Failed to restore sessions');
    }
  }

  private registerEventHandlers(socket: WASocket, sessionId: string): void {
    const handlers: Partial<Record<keyof BaileysEventMap, (data: any) => void>> = {
      'messages.update': async (data) => {
        await this.logEvent(sessionId, 'messages.update', data);
      },
      'messages.delete': async (data) => {
        await this.logEvent(sessionId, 'messages.delete', data);
      },
      'chats.update': async (data) => {
        await this.logEvent(sessionId, 'chats.update', data);
      },
      'contacts.update': async (data) => {
        await this.logEvent(sessionId, 'contacts.update', data);
      },
      'presence.update': async (data) => {
        // Don't log every presence update to avoid DB spam
        emitToSession(sessionId, 'session:presence', data);
      },
      'groups.update': async (data) => {
        await this.logEvent(sessionId, 'groups.update', data);
      },
    };

    for (const [event, handler] of Object.entries(handlers)) {
      (socket.ev as any).on(event, handler);
    }
  }

  private async logEvent(sessionId: string, type: string, data: any): Promise<void> {
    try {
      await prisma.event.create({
        data: { sessionId, type, data },
      });
    } catch (error) {
      logger.error({ sessionId, type, error }, 'Failed to log event');
    }
  }

  private async persistCredentials(sessionId: string, sessionDir: string): Promise<void> {
    try {
      const credPath = path.join(sessionDir, 'creds.json');
      const credData = await fs.readFile(credPath);
      const { encrypted, iv, tag } = encryptData(credData.toString());

      await prisma.sessionCredential.upsert({
        where: { sessionId },
        update: { data: Buffer.from(encrypted, 'hex'), iv, tag },
        create: { sessionId, data: Buffer.from(encrypted, 'hex'), iv, tag },
      });

      logger.debug({ sessionId }, 'Credentials persisted');
    } catch (error) {
      logger.error({ sessionId, error }, 'Failed to persist credentials');
    }
  }

  private async restoreCredentials(sessionId: string, sessionDir: string): Promise<void> {
    try {
      const cred = await prisma.sessionCredential.findUnique({
        where: { sessionId },
      });

      if (cred) {
        const credPath = path.join(sessionDir, 'creds.json');
        const decrypted = decryptData(cred.data.toString('hex'), cred.iv, cred.tag);
        await fs.writeFile(credPath, decrypted);
        logger.debug({ sessionId }, 'Credentials restored from DB');
      }
    } catch (error) {
      logger.error({ sessionId, error }, 'Failed to restore credentials');
    }
  }
}

let sessionManager: SessionManager;

export function getSessionManager(): SessionManager {
  if (!sessionManager) {
    sessionManager = new SessionManager();
  }
  return sessionManager;
}
