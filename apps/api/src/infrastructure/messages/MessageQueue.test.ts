import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Controlled tests for the in-process message queue (no WhatsApp, no DB).
 *
 * We mock the DB (prisma) and the SessionManager so we can:
 *  - induce a send failure and assert the message is requeued (PENDING +
 *    backoff) instead of being lost;
 *  - prove the retry eventually sends it (PENDING -> SENT with waMessageId);
 *  - prove delivery receipts (`messages.update`) mark `deliveredAt`.
 */

// Hoisted shared state so the vi.mock factories can reference it.
const h = vi.hoisted(() => {
  const sendState = {
    getSessionState: vi.fn(),
    sendMessage: vi.fn(),
  };
  const connectedListeners: Array<(sessionId: string) => void> = [];
  const receiptsListeners: Array<(sessionId: string, receipts: any[]) => void> = [];
  return { sendState, connectedListeners, receiptsListeners };
});

vi.mock('../database/prisma', () => ({
  prisma: {
    message: {
      findFirst: vi.fn(),
      updateMany: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock('../baileys/SessionManager', () => ({
  getSessionManager: () => h.sendState,
  onSessionConnected: (cb: (sessionId: string) => void) => {
    h.connectedListeners.push(cb);
  },
  onMessageReceipts: (cb: (sessionId: string, receipts: any[]) => void) => {
    h.receiptsListeners.push(cb);
  },
}));

import { prisma } from '../database/prisma';
import { MessageQueue } from './MessageQueue';

const prismaMessage = prisma.message as any;

const SESSION_ID = 'sess-1';

function candidate(overrides: Partial<{ id: string; attempts: number; maxAttempts: number }> = {}) {
  return {
    id: 'm1',
    to: '5699999999',
    text: 'hola',
    type: null,
    attempts: 0,
    maxAttempts: 6,
    ...overrides,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('MessageQueue', () => {
  beforeEach(() => {
    // Fresh singleton + clean listeners/mocks per test.
    (MessageQueue as any).instance = null;
    h.connectedListeners.length = 0;
    h.receiptsListeners.length = 0;
    h.sendState.getSessionState.mockReset().mockReturnValue('CONNECTED');
    h.sendState.sendMessage.mockReset();
    prismaMessage.findFirst.mockReset();
    prismaMessage.updateMany.mockReset().mockResolvedValue({ count: 1 });
    prismaMessage.update.mockReset().mockResolvedValue({});
    prismaMessage.findMany.mockReset().mockResolvedValue([]);
  });

  it(
    'reintenta tras un fallo inducido y termina SENT',
    async () => {
      const queue = MessageQueue.getInstance();
      queue.start();
      const triggerConnected = h.connectedListeners[0];

      // ── 1st pass: the send fails (transient) → must be requeued, not lost ──
      prismaMessage.findFirst
        .mockResolvedValueOnce(candidate()) // claim m1
        .mockResolvedValueOnce(null); // nothing else due → stop
      h.sendState.sendMessage.mockRejectedValueOnce(new Error('Session not connected'));

      triggerConnected(SESSION_ID);
      await vi.waitFor(() => {
        expect(h.sendState.sendMessage).toHaveBeenCalledTimes(1);
      });

      // handleFailure must have requeued it as PENDING with a future nextAttemptAt.
      expect(prismaMessage.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'm1' },
          data: expect.objectContaining({
            status: 'PENDING',
            lastError: 'Session not connected',
            nextAttemptAt: expect.any(Date),
          }),
        })
      );
      expect(prismaMessage.update).not.toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'SENT' }),
        })
      );

      // Let the first pump finish (it waits SPACING_MS before looping to null).
      await sleep(1300);

      // ── 2nd pass (session "reconnected"): now the send succeeds ──
      prismaMessage.update.mockClear();
      prismaMessage.findFirst
        .mockResolvedValueOnce(candidate({ attempts: 1 })) // retry m1
        .mockResolvedValueOnce(null);
      h.sendState.sendMessage.mockResolvedValueOnce({ key: { id: 'WA123' } });

      triggerConnected(SESSION_ID);
      await vi.waitFor(() => {
        expect(h.sendState.sendMessage).toHaveBeenCalledTimes(2);
      });

      expect(prismaMessage.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'm1' },
          data: expect.objectContaining({ status: 'SENT', waMessageId: 'WA123' }),
        })
      );

      // Let the second pump finish its spacing delay before stopping the queue.
      await sleep(1200);
      queue.stop();
    },
    15_000
  );

  it('marca deliveredAt cuando WhatsApp confirma la entrega (recibo DELIVERY_ACK)', async () => {
    const queue = MessageQueue.getInstance();
    queue.start();
    const notifyReceipts = h.receiptsListeners[0];

    notifyReceipts(SESSION_ID, [
      // numeric status (2 = DELIVERY_ACK) from proto
      { key: { id: 'WA123', fromMe: true }, update: { status: 2 } },
      // message not from us → must be ignored
      { key: { id: 'OTHER', fromMe: false }, update: { status: 3 } },
    ]);

    expect(prismaMessage.updateMany).toHaveBeenCalledWith({
      where: { sessionId: SESSION_ID, waMessageId: 'WA123', status: 'SENT', deliveredAt: null },
      data: { deliveredAt: expect.any(Date) },
    });
    // Only ONE message matched (the fromMe one); ensure we didn't try OTHER.
    const calls = (prismaMessage.updateMany as any).mock.calls.filter(
      ([arg]: any[]) => arg?.where?.waMessageId === 'OTHER'
    );
    expect(calls).toHaveLength(0);
    queue.stop();
  });

  it('agota los reintentos y marca FAILED cuando el error persiste', async () => {
    const queue = MessageQueue.getInstance();
    queue.start();
    const triggerConnected = h.connectedListeners[0];

    // Message already at max attempts after claiming (attempts field = 5, claim
    // increments to 6 → handleFailure receives attempts=6 → FAILED).
    prismaMessage.findFirst
      .mockResolvedValueOnce(candidate({ attempts: 5, maxAttempts: 6 }))
      .mockResolvedValueOnce(null);
    h.sendState.sendMessage.mockRejectedValueOnce(new Error('boom'));

    triggerConnected(SESSION_ID);
    await vi.waitFor(() => {
      expect(h.sendState.sendMessage).toHaveBeenCalledTimes(1);
    });

    expect(prismaMessage.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'm1' },
        data: expect.objectContaining({ status: 'FAILED', lastError: 'boom' }),
      })
    );

    // Let the pump finish its spacing delay before stopping the queue.
    await sleep(1200);
    queue.stop();
  });
});
