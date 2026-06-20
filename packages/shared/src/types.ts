// ──────────────────────────────────────────────
// Session States
// ──────────────────────────────────────────────
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

// ──────────────────────────────────────────────
// Event Types
// ──────────────────────────────────────────────
export enum EventType {
  // Baileys events
  CONNECTION_UPDATE = 'connection.update',
  CREDS_UPDATE = 'creds.update',
  MESSAGES_UPSERT = 'messages.upsert',
  MESSAGES_UPDATE = 'messages.update',
  MESSAGES_DELETE = 'messages.delete',
  CHATS_UPDATE = 'chats.update',
  CONTACTS_UPDATE = 'contacts.update',
  PRESENCE_UPDATE = 'presence.update',
  GROUPS_UPDATE = 'groups.update',

  // System events
  SESSION_CREATED = 'SESSION_CREATED',
  SESSION_CONNECTED = 'SESSION_CONNECTED',
  SESSION_DISCONNECTED = 'SESSION_DISCONNECTED',
  SESSION_ERROR = 'SESSION_ERROR',
  SESSION_QR_GENERATED = 'SESSION_QR_GENERATED',
  SESSION_QR_EXPIRED = 'SESSION_QR_EXPIRED',
  SESSION_LOGGED_OUT = 'SESSION_LOGGED_OUT',
  SESSION_RECONNECTING = 'SESSION_RECONNECTING',
  ALERT_TRIGGERED = 'ALERT_TRIGGERED',
}

// ──────────────────────────────────────────────
// Alert Types
// ──────────────────────────────────────────────
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

// ──────────────────────────────────────────────
// Severity Levels
// ──────────────────────────────────────────────
export enum Severity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL',
}

// ──────────────────────────────────────────────
// User Roles
// ──────────────────────────────────────────────
export enum Role {
  ADMIN = 'ADMIN',
  OPERATOR = 'OPERATOR',
  VIEWER = 'VIEWER',
}

// ──────────────────────────────────────────────
// API DTOs
// ──────────────────────────────────────────────
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: UserDTO;
}

export interface UserDTO {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export interface SessionDTO {
  id: string;
  name: string;
  description: string | null;
  state: SessionState;
  phoneNumber: string | null;
  qrCode: string | null;
  createdAt: string;
  lastConnectionAt: string | null;
  lastActivityAt: string | null;
}

export interface CreateSessionRequest {
  name: string;
  description?: string;
}

export interface UpdateSessionRequest {
  name?: string;
  description?: string;
}

export interface AlertRuleDTO {
  id: string;
  sessionId: string;
  event: AlertEvent;
  channels: AlertChannel[];
  enabled: boolean;
  createdAt: string;
}

export interface CreateAlertRuleRequest {
  sessionId: string;
  event: AlertEvent;
  channels: AlertChannel[];
}

export interface WebhookConfigDTO {
  id: string;
  name: string;
  url: string;
  events: EventType[];
  enabled: boolean;
  createdAt: string;
}

export interface CreateWebhookRequest {
  name: string;
  url: string;
  events: EventType[];
}

export interface EmailConfigDTO {
  id: string;
  host: string;
  port: number;
  secure: boolean;
  user: string;
  recipients: string[];
}

export interface LogEntryDTO {
  id: string;
  sessionId: string | null;
  eventType: string;
  severity: Severity;
  message: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
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

// ──────────────────────────────────────────────
// Node-RED Webhook Payload
// ──────────────────────────────────────────────
export interface NodeRedWebhookPayload {
  sessionId: string;
  sessionName: string;
  event: string;
  timestamp: string;
  details: Record<string, unknown>;
}
