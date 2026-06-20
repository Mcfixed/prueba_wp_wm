import { z } from 'zod';

export const createAlertRuleSchema = z.object({
  sessionId: z.string().uuid(),
  event: z.string().min(1),
  channels: z.array(z.enum(['WEBHOOK', 'EMAIL', 'SOCKET', 'INTERNAL_LOG'])).min(1),
});

export const updateAlertRuleSchema = z.object({
  event: z.string().optional(),
  channels: z.array(z.enum(['WEBHOOK', 'EMAIL', 'SOCKET', 'INTERNAL_LOG'])).optional(),
  enabled: z.boolean().optional(),
});
