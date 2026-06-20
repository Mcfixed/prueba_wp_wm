// ── Re-export shared types ──
// In a real monorepo, these would come from @whatsapp-manager/shared

export enum SessionState {
  CREATED = 'CREATED',
  WAITING_QR = 'WAITING_QR',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  DISCONNECTED = 'DISCONNECTED',
  RECONNECTING = 'RECONNECTING',
  LOGGED_OUT = 'LOGGED_OUT',
  ERROR = 'ERROR',
}

export enum AlertEvent {
  SESSION_DISCONNECTED = 'SESSION_DISCONNECTED',
  SESSION_CONNECTED = 'SESSION_CONNECTED',
  AUTH_ERROR = 'AUTH_ERROR',
  QR_GENERATED = 'QR_GENERATED',
  QR_EXPIRED = 'QR_EXPIRED',
  MESSAGE_RECEIVED = 'MESSAGE_RECEIVED',
  MESSAGE_FAILED = 'MESSAGE_FAILED',
  RETRIES_EXHAUSTED = 'RETRIES_EXHAUSTED',
}

export enum AlertChannel {
  WEBHOOK = 'WEBHOOK',
  EMAIL = 'EMAIL',
  SOCKET = 'SOCKET',
  INTERNAL_LOG = 'INTERNAL_LOG',
}

export enum Severity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL',
}

export enum Role {
  ADMIN = 'ADMIN',
  OPERATOR = 'OPERATOR',
  VIEWER = 'VIEWER',
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export interface Session {
  id: string;
  name: string;
  description: string | null;
  state: SessionState;
  phoneNumber: string | null;
  qrCode: string | null;
  userId: string;
  createdAt: string;
  updatedAt: string;
  lastConnectionAt: string | null;
  lastActivityAt: string | null;
}

export interface AlertRule {
  id: string;
  sessionId: string;
  userId: string;
  event: string;
  channels: string[];
  enabled: boolean;
  createdAt: string;
  session?: { id: string; name: string };
}

export interface WebhookConfig {
  id: string;
  name: string;
  url: string;
  events: string[];
  enabled: boolean;
  createdAt: string;
  sessions: { session: { id: string; name: string } }[];
}

export interface EmailConfig {
  id: string;
  host: string;
  port: number;
  secure: boolean;
  username: string;
  recipients: string[];
}

export interface LogEntry {
  id: string;
  sessionId: string | null;
  eventType: string;
  severity: string;
  message: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  session?: { id: string; name: string };
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface DashboardStats {
  totalSessions: number;
  connectedSessions: number;
  disconnectedSessions: number;
  messagesSentToday: number;
  messagesReceivedToday: number;
  recentEvents: number;
}

export interface AlertHistory {
  id: string;
  ruleId: string;
  sessionId: string;
  event: string;
  channels: string[];
  delivered: boolean;
  error: string | null;
  createdAt: string;
}
