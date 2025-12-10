/**
 * Database Types for uitdeitp-app-standalone
 * Generated from migrations 002-005
 *
 * IMPORTANT: Run `npx supabase gen types typescript --local` to regenerate from actual schema
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// ============================================
// ENUM TYPES
// ============================================

export type ReminderType = 'itp' | 'rca' | 'rovinieta'

export type ReminderSource = 'web' | 'kiosk' | 'whatsapp' | 'voice' | 'import'

export type NotificationChannel = 'sms' | 'email'

export type NotificationStatus = 'pending' | 'sent' | 'delivered' | 'failed'

export type UserRole = 'user' | 'station_manager' | 'admin'

// ============================================
// TABLE TYPES
// ============================================

export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          phone: string | null
          role: UserRole
          stations: string[] // Array of station IDs user has access to
          created_at: string // TIMESTAMPTZ stored as ISO string
          updated_at: string // TIMESTAMPTZ stored as ISO string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          phone?: string | null
          role?: UserRole
          stations?: string[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          phone?: string | null
          role?: UserRole
          stations?: string[]
          created_at?: string
          updated_at?: string
        }
      }
      reminders: {
        Row: {
          id: string
          user_id: string | null
          guest_phone: string | null
          guest_name: string | null
          plate_number: string
          reminder_type: ReminderType
          expiry_date: string // DATE stored as ISO string
          notification_intervals: Json // JSONB: number[]
          notification_channels: Json // JSONB: NotificationChannel[]
          next_notification_date: string | null // DATE stored as ISO string
          last_notification_sent_at: string | null // TIMESTAMPTZ stored as ISO string
          source: ReminderSource
          station_id: string | null
          consent_given: boolean
          consent_timestamp: string | null // TIMESTAMPTZ stored as ISO string
          consent_ip: string | null // INET stored as string
          opt_out: boolean
          opt_out_timestamp: string | null // TIMESTAMPTZ stored as ISO string
          deleted_at: string | null // TIMESTAMPTZ stored as ISO string
          created_at: string // TIMESTAMPTZ stored as ISO string
          updated_at: string // TIMESTAMPTZ stored as ISO string
        }
        Insert: {
          id?: string
          user_id?: string | null
          guest_phone?: string | null
          guest_name?: string | null
          plate_number: string
          reminder_type: ReminderType
          expiry_date: string
          notification_intervals?: Json
          notification_channels?: Json
          next_notification_date?: string | null
          last_notification_sent_at?: string | null
          source?: ReminderSource
          station_id?: string | null
          consent_given?: boolean
          consent_timestamp?: string | null
          consent_ip?: string | null
          opt_out?: boolean
          opt_out_timestamp?: string | null
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          guest_phone?: string | null
          guest_name?: string | null
          plate_number?: string
          reminder_type?: ReminderType
          expiry_date?: string
          notification_intervals?: Json
          notification_channels?: Json
          next_notification_date?: string | null
          last_notification_sent_at?: string | null
          source?: ReminderSource
          station_id?: string | null
          consent_given?: boolean
          consent_timestamp?: string | null
          consent_ip?: string | null
          opt_out?: boolean
          opt_out_timestamp?: string | null
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      kiosk_stations: {
        Row: {
          id: string
          slug: string
          name: string
          logo_url: string | null
          primary_color: string
          owner_id: string
          sms_template_5d: string
          sms_template_3d: string
          sms_template_1d: string
          station_phone: string | null
          station_address: string | null
          total_reminders: number
          is_active: boolean
          created_at: string // TIMESTAMPTZ stored as ISO string
          updated_at: string // TIMESTAMPTZ stored as ISO string
        }
        Insert: {
          id?: string
          slug: string
          name: string
          logo_url?: string | null
          primary_color?: string
          owner_id: string
          sms_template_5d?: string
          sms_template_3d?: string
          sms_template_1d?: string
          station_phone?: string | null
          station_address?: string | null
          total_reminders?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          slug?: string
          name?: string
          logo_url?: string | null
          primary_color?: string
          owner_id?: string
          sms_template_5d?: string
          sms_template_3d?: string
          sms_template_1d?: string
          station_phone?: string | null
          station_address?: string | null
          total_reminders?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      notification_log: {
        Row: {
          id: string
          reminder_id: string
          channel: NotificationChannel
          recipient: string
          message_body: string
          status: NotificationStatus
          provider: string | null
          provider_message_id: string | null
          error_message: string | null
          retry_count: number
          estimated_cost: number // DECIMAL stored as number
          sent_at: string | null // TIMESTAMPTZ stored as ISO string
          delivered_at: string | null // TIMESTAMPTZ stored as ISO string
          created_at: string // TIMESTAMPTZ stored as ISO string
        }
        Insert: {
          id?: string
          reminder_id: string
          channel: NotificationChannel
          recipient: string
          message_body: string
          status?: NotificationStatus
          provider?: string | null
          provider_message_id?: string | null
          error_message?: string | null
          retry_count?: number
          estimated_cost?: number
          sent_at?: string | null
          delivered_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          reminder_id?: string
          channel?: NotificationChannel
          recipient?: string
          message_body?: string
          status?: NotificationStatus
          provider?: string | null
          provider_message_id?: string | null
          error_message?: string | null
          retry_count?: number
          estimated_cost?: number
          sent_at?: string | null
          delivered_at?: string | null
          created_at?: string
        }
      }
    }
    Views: {
      notification_analytics: {
        Row: {
          station_id: string | null
          channel: NotificationChannel
          status: NotificationStatus
          notification_date: string // DATE stored as ISO string
          total_notifications: number
          total_cost: number
          avg_delivery_time_seconds: number | null
          delivery_rate: number | null
        }
      }
    }
    Functions: {
      get_pending_notifications: {
        Args: Record<string, never>
        Returns: {
          reminder_id: string
          reminder_type: ReminderType
          plate_number: string
          expiry_date: string
          next_notification_date: string
          days_until_expiry: number
          notification_channels: Json
          recipient_phone: string | null
          recipient_email: string | null
          recipient_name: string | null
          station_id: string | null
          station_name: string | null
          station_phone: string | null
          sms_template: string | null
        }[]
      }
      cleanup_expired_reminders: {
        Args: {
          days_after_expiry?: number
        }
        Returns: number
      }
      get_station_statistics: {
        Args: {
          station_uuid: string
        }
        Returns: {
          total_reminders: number
          active_reminders: number
          expired_reminders: number
          notifications_sent: number
          notifications_delivered: number
          notifications_failed: number
          total_notification_cost: number
          avg_delivery_rate: number
        }[]
      }
      anonymize_guest_reminder: {
        Args: {
          reminder_uuid: string
        }
        Returns: boolean
      }
      bulk_import_reminders: {
        Args: {
          import_data: Json
          import_station_id: string
          import_source?: ReminderSource
        }
        Returns: {
          success_count: number
          error_count: number
          errors: Json
        }[]
      }
    }
    Enums: {
      reminder_type: ReminderType
      reminder_source: ReminderSource
      notification_channel: NotificationChannel
      notification_status: NotificationStatus
      user_role: UserRole
    }
  }
}

// ============================================
// HELPER TYPES FOR COMMON PATTERNS
// ============================================

// Type-safe reminder creation for registered users
export type CreateReminderForUser = Omit<
  Database['public']['Tables']['reminders']['Insert'],
  'guest_phone' | 'guest_name' | 'id' | 'created_at' | 'updated_at'
> & {
  user_id: string
}

// Type-safe reminder creation for guests (kiosk mode)
export type CreateReminderForGuest = Omit<
  Database['public']['Tables']['reminders']['Insert'],
  'user_id' | 'id' | 'created_at' | 'updated_at'
> & {
  guest_phone: string
  guest_name: string
}

// Station creation type
export type CreateKioskStation = Omit<
  Database['public']['Tables']['kiosk_stations']['Insert'],
  'id' | 'total_reminders' | 'created_at' | 'updated_at'
>

// Notification log entry
export type CreateNotificationLog = Omit<
  Database['public']['Tables']['notification_log']['Insert'],
  'id' | 'estimated_cost' | 'created_at'
>

// Bulk import data structure
export interface BulkImportReminderData {
  phone: string
  name: string
  plate_number: string
  reminder_type: ReminderType
  expiry_date: string // ISO date string
}

// Pending notification result
export type PendingNotification = Database['public']['Functions']['get_pending_notifications']['Returns'][number]

// Station statistics result
export type StationStatistics = Database['public']['Functions']['get_station_statistics']['Returns'][number]

// ============================================
// VALIDATION HELPERS
// ============================================

export const REMINDER_TYPES: ReminderType[] = ['itp', 'rca', 'rovinieta']
export const REMINDER_SOURCES: ReminderSource[] = ['web', 'kiosk', 'whatsapp', 'voice', 'import']
export const NOTIFICATION_CHANNELS: NotificationChannel[] = ['sms', 'email']
export const NOTIFICATION_STATUSES: NotificationStatus[] = ['pending', 'sent', 'delivered', 'failed']
export const USER_ROLES: UserRole[] = ['user', 'station_manager', 'admin']

// Default notification intervals (7, 3, 1 days before expiry)
export const DEFAULT_NOTIFICATION_INTERVALS = [7, 3, 1]

// Default notification channels
export const DEFAULT_NOTIFICATION_CHANNELS: NotificationChannel[] = ['sms']

// Phone number validation regex (E.164 format)
export const PHONE_REGEX = /^\+?[1-9]\d{1,14}$/

// Email validation regex
export const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/

// Slug validation regex (lowercase, numbers, hyphens)
export const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

// Hex color validation regex
export const HEX_COLOR_REGEX = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/

// ============================================
// TYPE GUARDS
// ============================================

export function isReminderType(value: string): value is ReminderType {
  return REMINDER_TYPES.includes(value as ReminderType)
}

export function isReminderSource(value: string): value is ReminderSource {
  return REMINDER_SOURCES.includes(value as ReminderSource)
}

export function isNotificationChannel(value: string): value is NotificationChannel {
  return NOTIFICATION_CHANNELS.includes(value as NotificationChannel)
}

export function isNotificationStatus(value: string): value is NotificationStatus {
  return NOTIFICATION_STATUSES.includes(value as NotificationStatus)
}

export function isValidPhone(phone: string): boolean {
  return PHONE_REGEX.test(phone)
}

export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email)
}

export function isValidSlug(slug: string): boolean {
  return SLUG_REGEX.test(slug) && slug.length >= 3 && slug.length <= 50
}

export function isValidHexColor(color: string): boolean {
  return HEX_COLOR_REGEX.test(color)
}

export function isUserRole(value: string): value is UserRole {
  return USER_ROLES.includes(value as UserRole)
}
