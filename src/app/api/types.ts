/**
 * API Response Types for uitdeitp-app
 * Aligned with PRD schema
 */

import { z } from 'zod';

// Reminder status enum
export type ReminderStatus = 'urgent' | 'warning' | 'ok';

// Reminder type enum
export type ReminderType = 'itp' | 'rca' | 'rovinieta';

// Source enum
export type ReminderSource = 'web' | 'kiosk';

// API Response wrapper
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

// Pagination metadata
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// Reminder response type
export interface ReminderResponse {
  id: string;
  user_id: string | null;
  station_id: string | null;
  plate_number: string;
  reminder_type: ReminderType;
  expiry_date: string;
  notification_intervals: number[];
  notification_channels: {
    sms: boolean;
    email: boolean;
  };
  guest_phone: string | null;
  guest_name: string | null;
  source: ReminderSource;
  consent_given: boolean;
  consent_timestamp: string | null;
  consent_ip: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  status?: ReminderStatus; // Computed field
}

// User profile response
export interface UserProfileResponse {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  prefers_sms: boolean;
  location: string | null;
  station_id: string | null;
  created_at: string;
  updated_at: string;
}

// Kiosk station response
export interface KioskStationResponse {
  id: string;
  slug: string;
  name: string;
  owner_id: string;
  logo_url: string | null;
  primary_color: string;
  station_phone: string | null;
  station_address: string | null;
  sms_template: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Notification log response
export interface NotificationLogResponse {
  id: string;
  reminder_id: string | null;
  provider: 'twilio' | 'calisero';
  provider_message_id: string | null;
  recipient: string;
  message_content: string;
  status: 'scheduled' | 'sent' | 'delivered' | 'failed' | 'undelivered';
  error_code: string | null;
  error_message: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  created_at: string;
}

// List response with pagination
export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

// Filter query params for reminders
export interface ReminderFilters {
  user_id?: string;
  station_id?: string;
  reminder_type?: ReminderType;
  status?: ReminderStatus;
  plate_number?: string;
  source?: ReminderSource;
}

// Sort params
export interface SortParams {
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

// Helper function to compute reminder status
export function computeReminderStatus(expiryDate: string): ReminderStatus {
  const expiry = new Date(expiryDate);
  const now = new Date();
  const daysUntilExpiry = Math.floor((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (daysUntilExpiry < 0) return 'urgent'; // Already expired
  if (daysUntilExpiry <= 7) return 'urgent'; // Less than 7 days
  if (daysUntilExpiry <= 30) return 'warning'; // Less than 30 days
  return 'ok'; // More than 30 days
}

// Station slug validation schema
export const stationSlugSchema = z
  .string()
  .min(3)
  .regex(/^[a-z0-9-]+$/, 'Slug-ul poate conține doar litere mici, cifre și liniuțe');

// Manual notification request schema
export const manualNotificationSchema = z.object({
  reminder_id: z.string().uuid('ID reminder invalid'),
  force: z.boolean().optional().default(false),
});

export type ManualNotificationRequest = z.infer<typeof manualNotificationSchema>;
