/**
 * TypeScript types for Reminders system
 */

export type ReminderType = 'itp' | 'rca' | 'rovinieta';
export type ReminderStatus = 'active' | 'sent' | 'expired';

/**
 * Database reminder record with station join
 */
export interface Reminder {
  id: string;
  user_id: string;
  plate_number: string;
  itp_expiry_date: string;
  reminder_type: ReminderType;
  station_id: string | null;
  status: ReminderStatus;
  sent_at: string | null;
  created_at: string;
  updated_at: string;

  // Joined station data
  station?: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

/**
 * Table row data with computed fields
 */
export interface ReminderTableRow extends Reminder {
  stationName: string;
  daysUntilExpiry: number;
  isExpired: boolean;
  canSendSMS: boolean;
}

/**
 * Column sorting state
 */
export interface SortConfig {
  column: keyof ReminderTableRow | null;
  direction: 'asc' | 'desc';
}

/**
 * Pagination state
 */
export interface PaginationConfig {
  pageIndex: number;
  pageSize: number;
}

/**
 * Table action handlers
 */
export interface ReminderTableActions {
  onEdit: (reminder: Reminder) => void;
  onDelete: (reminderId: string) => void;
  onSendSMS: (reminder: Reminder) => void;
}
