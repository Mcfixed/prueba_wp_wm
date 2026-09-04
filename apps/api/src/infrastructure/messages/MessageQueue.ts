import { prisma } from '../database/prisma';
import { logger } from '../logger';
import {
  getSessionManager,
  onSessionConnected,
  onMessageReceipts,
} from '../baileys/SessionManager';

// ── Tunables ──
const SPACING_MS = 1000; // min gap between sends of the same session (anti-burst)
const TICK_MS = 2000; // how often the queue sweeps for due/pending work
const STALE_PROCESSING_MS = 60_000; // a PROCESSING row older than this is considered stuck
const BACKOFF_BASE_MS = 4_000; // first retry delay
const BACKOFF_MAX_MS = 120_000; // retry delay cap

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * In-process message queue (outbox worker).
 *
 * Guarantees that every message accepted by the API is eventually sent:
 * - Per-session: only one worker drains a session at a time, sending messages
 *   one by one with a spacing gap so WhatsApp doesn't drop bursts.
 * - Retries with exponential backoff when the session is unstable; a message is
 *   only marked FAILED after maxAttempts.
 * - Safe under concurrency / multiple instances: messages are claimed atomically
 *   via `updateMany(where status=PENDING)` so only one worker ever sends a row.
 * - No Redis: state lives in the DB (outbox) + this in-process worker. If the
 *   process restarts, pending messages are picked up again on boot.
 */
export class MessageQueue {
  private static instance: MessageQueue | null = null;
  private processing = new Set<string>();
  private timer: NodeJS.Timeout | null = null;

  static getInstance(): MessageQueue {
    if (!this.instance) {
      this.instance = new MessageQueue();
    }
    return this.instance;
  }

  start(): void {
    if (this.timer) {
      return;
    }

    // Drain a session as soon as it (re)connects → no need to wait for the tick.
    onSessionConnected((sessionId) => {
      void this.pump(sessionId);
    });

    // Mark messages as delivered when WhatsApp acknowledges them.
    onMessageReceipts((sessionId, receipts) => {
      void this.handleReceipts(sessionId, receipts);
    });

    this.timer = setInterval(() => {
      void this.tick();
    }, TICK_MS);
    this.timer.unref?.();

    logger.info('Message queue started (in-process, no Redis)');
  }

  /** Stop the periodic sweep (mainly for tests / clean shutdown). */
  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /** Wake up processing for a session (called right after a message is enqueued). */
  kick(sessionId: string): void {
    void this.pump(sessionId);
  }

  /** Periodic sweep: recover stuck rows and drain sessions with due messages. */
  private async tick(): Promise<void> {
    try {
      // Recover messages left PROCESSING by a worker that died mid-send.
      await prisma.message.updateMany({
        where: {
          status: 'PROCESSING',
          updatedAt: { lt: new Date(Date.now() - STALE_PROCESSING_MS) },
        },
        data: { status: 'PENDING' },
      });

      const sessions = await prisma.message.findMany({
        where: { status: 'PENDING', nextAttemptAt: { lte: new Date() } },
        select: { sessionId: true },
        distinct: ['sessionId'],
      });

      for (const { sessionId } of sessions) {
        if (!this.processing.has(sessionId)) {
          void this.pump(sessionId);
        }
      }
    } catch (error: any) {
      logger.error({ error }, 'Message queue tick failed');
    }
  }

  /** Serialized per-session worker: sends every due message one at a time. */
  private async pump(sessionId: string): Promise<void> {
    if (this.processing.has(sessionId)) {
      return;
    }
    this.processing.add(sessionId);
    const sessionManager = getSessionManager();
    try {
      for (;;) {
        // Only send while the session is really connected; otherwise wait for
        // the session:connected event / next tick to resume.
        if (sessionManager.getSessionState(sessionId) !== 'CONNECTED') {
          break;
        }

        const msg = await this.claimNext(sessionId);
        if (!msg) {
          break;
        }

        try {
          const result = await sessionManager.sendMessage(
            sessionId,
            msg.to,
            msg.text,
            msg.type ?? undefined
          );
          await prisma.message.update({
            where: { id: msg.id },
            data: {
              status: 'SENT',
              waMessageId: result?.key?.id ?? null,
              sentAt: new Date(),
              lastError: null,
            },
          });
          logger.info(
            { messageId: msg.id, sessionId, waMessageId: result?.key?.id },
            'Queued message sent'
          );
        } catch (error: any) {
          await this.handleFailure(msg.id, msg.attempts + 1, msg.maxAttempts, error);
        }

        // Space out sends so bursts don't get dropped by WhatsApp.
        await delay(SPACING_MS);
      }
    } finally {
      this.processing.delete(sessionId);
    }
  }

  /**
   * Pick the next due PENDING message for a session and claim it atomically so
   * concurrent workers (or instances) never send the same row twice.
   */
  private async claimNext(sessionId: string): Promise<{
    id: string;
    to: string;
    text: string;
    type: string | null;
    attempts: number;
    maxAttempts: number;
  } | null> {
    const candidate = await prisma.message.findFirst({
      where: {
        sessionId,
        status: 'PENDING',
        nextAttemptAt: { lte: new Date() },
      },
      orderBy: [{ createdAt: 'asc' }],
      select: { id: true, to: true, text: true, type: true, attempts: true, maxAttempts: true },
    });
    if (!candidate) {
      return null;
    }

    const claimed = await prisma.message.updateMany({
      where: { id: candidate.id, status: 'PENDING' },
      data: { status: 'PROCESSING', attempts: { increment: 1 } },
    });

    return claimed.count === 1 ? candidate : null;
  }

  /** Retry with backoff, or mark FAILED after max attempts. */
  private async handleFailure(
    messageId: string,
    attempts: number,
    maxAttempts: number,
    error: unknown
  ): Promise<void> {
    const lastError = error instanceof Error ? error.message : String(error);

    if (attempts >= maxAttempts) {
      await prisma.message.update({
        where: { id: messageId },
        data: { status: 'FAILED', lastError },
      });
      logger.warn({ messageId, attempts, lastError }, 'Message failed permanently');
      return;
    }

    const backoff = Math.min(BACKOFF_MAX_MS, BACKOFF_BASE_MS * 2 ** (attempts - 1));
    await prisma.message.update({
      where: { id: messageId },
      data: {
        status: 'PENDING',
        nextAttemptAt: new Date(Date.now() + backoff),
        lastError,
      },
    });
    logger.warn({ messageId, attempts, backoff, lastError }, 'Message will be retried');
  }

  /**
   * Delivery confirmation from WhatsApp receipts.
   *
   * Baileys emits `messages.update` as an array of `{ key, update }`, where:
   *   - `key` = proto message key: `{ id, fromMe, ... }`
   *   - `update.status` = numeric proto enum (SERVER_ACK=1, DELIVERY_ACK=2,
   *     READ=3, PLAYED=4) — we accept both the number and the string form.
   */
  private async handleReceipts(sessionId: string, receipts: any[]): Promise<void> {
    for (const item of receipts ?? []) {
      const key = item?.key;
      if (!key?.id || !key?.fromMe) {
        continue;
      }
      const status = item?.update?.status;
      const delivered =
        status === 2 || status === 3 || status === 4 ||
        ['DELIVERY_ACK', 'READ', 'PLAYED'].includes(status);
      if (delivered) {
        try {
          const res = await prisma.message.updateMany({
            where: { sessionId, waMessageId: key.id, status: 'SENT', deliveredAt: null },
            data: { deliveredAt: new Date() },
          });
          if (res.count > 0) {
            logger.debug({ sessionId, waMessageId: key.id, status }, 'Message delivery confirmed');
          }
        } catch {
          // best-effort; ignore
        }
      }
    }
  }
}
