import { prisma } from '../database/prisma';
import { logger } from '../logger';
import { emitToSession, emitToUser } from '../websocket';
import { sendEmail } from '../email';
import { sendWebhook } from './WebhookDelivery';

export class AlertService {
  async evaluateAndNotify(
    sessionId: string,
    event: string,
    details: Record<string, unknown> = {}
  ): Promise<void> {
    try {
      // Get matching alert rules
      const rules = await prisma.alertRule.findMany({
        where: {
          sessionId,
          event,
          enabled: true,
        },
        include: {
          session: { select: { name: true, userId: true } },
        },
      });

      if (rules.length === 0) return;

      for (const rule of rules) {
        const channels = rule.channels as string[];

        // Log alert
        await prisma.alertHistory.create({
          data: {
            ruleId: rule.id,
            sessionId,
            event,
            channels,
          },
        });

        // Deliver through each channel
        for (const channel of channels) {
          try {
            await this.deliver(channel, rule, event, details);
          } catch (error) {
            logger.error({ ruleId: rule.id, channel, error }, 'Alert delivery failed');
          }
        }
      }
    } catch (error) {
      logger.error({ sessionId, event, error }, 'Alert evaluation failed');
    }
  }

  private async deliver(
    channel: string,
    rule: any,
    event: string,
    details: Record<string, unknown>
  ): Promise<void> {
    const payload = {
      sessionId: rule.sessionId,
      sessionName: rule.session.name,
      event,
      timestamp: new Date().toISOString(),
      details,
    };

    switch (channel) {
      case 'SOCKET':
        emitToSession(rule.sessionId, 'alert', payload);
        emitToUser(rule.session.userId, 'alert', payload);
        break;

      case 'WEBHOOK':
        await sendWebhook(rule.sessionId, event, payload);
        break;

      case 'EMAIL':
        await sendEmail({
          subject: `[WhatsApp Manager] ${event} - ${rule.session.name}`,
          html: this.buildEmailTemplate(event, rule.session.name, details),
        });
        break;

      case 'INTERNAL_LOG':
        await prisma.log.create({
          data: {
            sessionId: rule.sessionId,
            eventType: event,
            severity: event.includes('ERROR') || event.includes('DISCONNECTED') ? 'ERROR' : 'INFO',
            message: `Alert triggered: ${event} for session ${rule.session.name}`,
            metadata: details as any,
          },
        });
        break;
    }

    // Update alert history as delivered
    await prisma.alertHistory.updateMany({
      where: { ruleId: rule.id, event, delivered: false },
      data: { delivered: true },
    });
  }

  private buildEmailTemplate(event: string, sessionName: string, details: Record<string, unknown>): string {
    const colors: Record<string, string> = {
      SESSION_CONNECTED: '#22c55e',
      SESSION_DISCONNECTED: '#ef4444',
      AUTH_ERROR: '#f97316',
      QR_GENERATED: '#3b82f6',
      MESSAGE_FAILED: '#ef4444',
    };

    const color = colors[event] || '#6b7280';

    return `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="font-family: Arial, sans-serif; background: #f9fafb; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <div style="background: ${color}; padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 20px;">${event}</h1>
          </div>
          <div style="padding: 20px;">
            <p style="color: #374151; font-size: 14px; margin: 0 0 10px 0;">
              <strong>Sesión:</strong> ${sessionName}
            </p>
            <p style="color: #374151; font-size: 14px; margin: 0 0 10px 0;">
              <strong>Evento:</strong> ${event}
            </p>
            <p style="color: #374151; font-size: 14px; margin: 0 0 10px 0;">
              <strong>Fecha:</strong> ${new Date().toLocaleString()}
            </p>
            ${details && Object.keys(details).length > 0 ? `
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 15px 0;">
              <h3 style="color: #374151; font-size: 14px;">Detalles:</h3>
              <pre style="background: #f3f4f6; padding: 10px; border-radius: 4px; font-size: 12px; overflow-x: auto;">${JSON.stringify(details, null, 2)}</pre>
            ` : ''}
          </div>
          <div style="background: #f3f4f6; padding: 10px; text-align: center; font-size: 12px; color: #6b7280;">
            WhatsApp Manager - Sistema de Alertas
          </div>
        </div>
      </body>
      </html>
    `;
  }
}
