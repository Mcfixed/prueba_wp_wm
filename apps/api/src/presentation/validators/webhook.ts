import { z } from 'zod';

export const createWebhookSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  url: z.string().url('Invalid URL'),
  events: z.array(z.string()).min(1, 'At least one event required'),
  sessionIds: z.array(z.string().uuid()).optional(),
});
