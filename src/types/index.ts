// Re-export database types from the generated schema
export type {
  Json,
  Database,
  ReminderType,
  ReminderSource,
  NotificationChannel as DbNotificationChannel,
  NotificationStatus,
  UserRole,
  PendingNotification,
  StationStatistics,
} from './database.types';

// API Response types
export interface ApiResponse<T = unknown> {
  data?: T;
  error?: {
    message: string;
    code?: string;
    details?: unknown;
  };
  success: boolean;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// SMS Provider types
export interface SmsMessage {
  to: string;
  body: string;
  callbackUrl?: string;
  idempotencyKey?: string;
}

export interface SmsResponse {
  success: boolean;
  messageId?: string;
  provider?: 'calisero' | 'twilio';
  parts?: number;
  estimatedCost?: number;
  error?: string;
}

// Notification types
export interface NotificationData {
  name: string;
  plate: string;
  date: string;
  station_name?: string;
  station_phone?: string;
  station_address?: string;  // NEW: Station address for custom branding
  app_url?: string;          // NEW: App URL for links in SMS/email
  opt_out_link?: string;     // NEW: GDPR-required opt-out link
}

export type NotificationChannel = 'sms' | 'email';

export interface NotificationLog {
  id: string;
  reminder_id: string;
  channel: NotificationChannel;
  recipient: string;
  message_body: string;
  status: 'pending' | 'sent' | 'delivered' | 'failed';
  provider: string | null;
  provider_message_id: string | null;
  error_message: string | null;
  retry_count: number;
  estimated_cost: number | null;
  sent_at: string | null;
  delivered_at: string | null;
  created_at: string;
}

// Session types
export interface UserSession {
  user: {
    id: string;
    email: string;
    phone?: string;
    full_name?: string;
  } | null;
  loading: boolean;
}
