// Database types (to be generated from Supabase)
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string;
          full_name: string | null;
          phone: string | null;
          prefers_sms: boolean;
          station_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          phone?: string | null;
          prefers_sms?: boolean;
          station_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          phone?: string | null;
          prefers_sms?: boolean;
          station_id?: string | null;
          updated_at?: string;
        };
      };
      reminders: {
        Row: {
          id: string;
          user_id: string | null;
          guest_phone: string | null;
          guest_name: string | null;
          plate_number: string;
          reminder_type: 'itp' | 'rca' | 'rovinieta';
          expiry_date: string;
          notification_intervals: Json;
          notification_channels: Json;
          last_notification_sent_at: string | null;
          next_notification_date: string | null;
          source: 'web' | 'kiosk' | 'whatsapp' | 'voice' | 'import';
          station_id: string | null;
          consent_given: boolean;
          consent_timestamp: string | null;
          consent_ip: string | null;
          opt_out: boolean;
          opt_out_timestamp: string | null;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          guest_phone?: string | null;
          guest_name?: string | null;
          plate_number: string;
          reminder_type?: 'itp' | 'rca' | 'rovinieta';
          expiry_date: string;
          notification_intervals?: Json;
          notification_channels?: Json;
          source: 'web' | 'kiosk' | 'whatsapp' | 'voice' | 'import';
          station_id?: string | null;
          consent_given?: boolean;
          consent_timestamp?: string | null;
          consent_ip?: string | null;
        };
        Update: {
          plate_number?: string;
          expiry_date?: string;
          notification_intervals?: Json;
          notification_channels?: Json;
          opt_out?: boolean;
          opt_out_timestamp?: string | null;
          deleted_at?: string | null;
          updated_at?: string;
        };
      };
      kiosk_stations: {
        Row: {
          id: string;
          slug: string;
          name: string;
          logo_url: string | null;
          primary_color: string;
          owner_id: string | null;
          sms_template_5d: string;
          sms_template_3d: string;
          sms_template_1d: string;
          station_phone: string | null;
          station_address: string | null;
          total_reminders: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          logo_url?: string | null;
          primary_color?: string;
          owner_id?: string | null;
          sms_template_5d?: string;
          sms_template_3d?: string;
          sms_template_1d?: string;
          station_phone?: string | null;
          station_address?: string | null;
        };
        Update: {
          name?: string;
          logo_url?: string | null;
          primary_color?: string;
          sms_template_5d?: string;
          sms_template_3d?: string;
          sms_template_1d?: string;
          station_phone?: string | null;
          station_address?: string | null;
          is_active?: boolean;
          updated_at?: string;
        };
      };
    };
  };
}

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
