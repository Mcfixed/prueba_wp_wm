import nodemailer from 'nodemailer';
import { config } from '../../config';
import { logger } from '../logger';
import { prisma } from '../database/prisma';

interface EmailOptions {
  to?: string[];
  subject: string;
  html: string;
}

let transporter: nodemailer.Transporter | null = null;

async function getTransporter(): Promise<nodemailer.Transporter> {
  if (transporter) return transporter;

  // Try to get config from DB first
  const dbConfig = await prisma.emailConfig.findFirst();
  if (dbConfig) {
    transporter = nodemailer.createTransport({
      host: dbConfig.host,
      port: dbConfig.port,
      secure: dbConfig.secure,
      auth: {
        user: dbConfig.username,
        pass: dbConfig.password,
      },
    });
  } else if (config.smtp.host) {
    transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      auth: {
        user: config.smtp.user,
        pass: config.smtp.pass,
      },
    });
  } else {
    throw new Error('SMTP not configured');
  }

  return transporter;
}

export async function sendEmail(options: EmailOptions): Promise<void> {
  try {
    const transport = await getTransporter();

    // Get recipients
    let recipients = options.to;
    if (!recipients) {
      const emailConfig = await prisma.emailConfig.findFirst();
      recipients = emailConfig?.recipients || [];
    }

    if (recipients.length === 0) {
      logger.warn('No email recipients configured');
      return;
    }

    await transport.sendMail({
      from: `"WhatsApp Manager" <${config.smtp.user || 'noreply@whatsappmanager.com'}>`,
      to: recipients.join(', '),
      subject: options.subject,
      html: options.html,
    });

    logger.info({ to: recipients }, 'Email sent successfully');
  } catch (error) {
    logger.error({ error }, 'Failed to send email');
    throw error;
  }
}
