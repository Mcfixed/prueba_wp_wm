import { prisma } from '../database/prisma';
import { logger } from '../logger';

export async function sendWebhook(
  sessionId: string,
  event: string,
  payload: Record<string, unknown>
): Promise<void> {
  const webhooks = await prisma.webhookConfig.findMany({
    where: {
      enabled: true,
      events: { has: event },
      sessions: { some: { sessionId } },
    },
  });

  for (const webhook of webhooks) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'WhatsApp-Manager/1.0',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        logger.warn({ webhookId: webhook.id, status: response.status }, 'Webhook delivery failed');
      } else {
        logger.debug({ webhookId: webhook.id }, 'Webhook delivered successfully');
      }
    } catch (error) {
      logger.error({ webhookId: webhook.id, url: webhook.url, error }, 'Webhook delivery error');
    }
  }
}
