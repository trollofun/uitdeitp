/**
 * Reminders API Client
 * Type-safe client for all reminder CRUD operations
 */

import { Database } from '@/types';

// Type aliases from database schema
type ReminderRow = Database['public']['Tables']['reminders']['Row'];
type ReminderInsert = Database['public']['Tables']['reminders']['Insert'];
type ReminderUpdate = Database['public']['Tables']['reminders']['Update'];

// Extended reminder type with computed fields
export interface Reminder extends ReminderRow {
  status?: 'urgent' | 'warning' | 'ok';
  daysUntilExpiry?: number;
  station?: {
    id: string;
    slug: string;
    name: string;
    logo_url: string | null;
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

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  success: boolean;
}

// Filter and query types
export interface GetRemindersFilters {
  page?: number;
  limit?: number;
  reminder_type?: 'itp' | 'rca' | 'rovinieta';
  plate_number?: string;
  status?: 'urgent' | 'warning' | 'ok';
  station_id?: string;
  source?: 'web' | 'kiosk' | 'whatsapp' | 'voice' | 'import';
  sort_by?: 'created_at' | 'expiry_date' | 'plate_number';
  sort_order?: 'asc' | 'desc';
}

export interface CreateReminderData {
  plate_number: string;
  reminder_type: 'itp' | 'rca' | 'rovinieta';
  expiry_date: Date | string;
  notification_intervals?: number[];
  notification_channels?: ('sms' | 'email')[];
  guest_phone?: string | null;
  guest_name?: string | null;
}

export interface UpdateReminderData {
  plate_number?: string;
  expiry_date?: Date | string;
  notification_intervals?: number[];
  notification_channels?: ('sms' | 'email')[];
  opt_out?: boolean;
}

export interface SendSmsResponse {
  success: boolean;
  messageId?: string;
  provider?: string;
  error?: string;
}

// Custom error class
export class ReminderApiError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ReminderApiError';
  }
}

/**
 * Base fetch wrapper with error handling
 */
async function fetchApi<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new ReminderApiError(
        data.error?.message || 'A apărut o eroare',
        data.error?.code,
        response.status,
        data.error?.details
      );
    }

    return data;
  } catch (error) {
    if (error instanceof ReminderApiError) {
      throw error;
    }

    // Network or parsing errors
    throw new ReminderApiError(
      error instanceof Error ? error.message : 'Eroare de rețea',
      'NETWORK_ERROR',
      0
    );
  }
}

/**
 * Build query string from filters
 */
function buildQueryString(filters: Record<string, any>): string {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.append(key, String(value));
    }
  });

  return params.toString();
}

/**
 * GET /api/reminders
 * Fetch all reminders with optional filters and pagination
 *
 * @param filters - Optional filters and pagination parameters
 * @returns Paginated list of reminders
 *
 * @example
 * ```typescript
 * const reminders = await getReminders({
 *   page: 1,
 *   limit: 10,
 *   reminder_type: 'itp',
 *   status: 'urgent'
 * });
 * ```
 */
export async function getReminders(
  filters: GetRemindersFilters = {}
): Promise<PaginatedResponse<Reminder>> {
  const queryString = buildQueryString(filters);
  const url = `/api/reminders${queryString ? `?${queryString}` : ''}`;

  return fetchApi<PaginatedResponse<Reminder>>(url, {
    method: 'GET',
  });
}

/**
 * GET /api/reminders/:id
 * Fetch a single reminder by ID
 *
 * @param id - Reminder UUID
 * @returns Single reminder with computed status and station info
 *
 * @example
 * ```typescript
 * const reminder = await getReminder('123e4567-e89b-12d3-a456-426614174000');
 * console.log(reminder.data?.status); // 'urgent' | 'warning' | 'ok'
 * ```
 */
export async function getReminder(
  id: string
): Promise<ApiResponse<Reminder>> {
  if (!id || typeof id !== 'string') {
    throw new ReminderApiError('ID-ul reminder-ului este invalid', 'INVALID_ID', 400);
  }

  return fetchApi<ApiResponse<Reminder>>(`/api/reminders/${id}`, {
    method: 'GET',
  });
}

/**
 * POST /api/reminders
 * Create a new reminder
 *
 * @param data - Reminder creation data
 * @returns Created reminder
 *
 * @example
 * ```typescript
 * const reminder = await createReminder({
 *   plate_number: 'B123ABC',
 *   reminder_type: 'itp',
 *   expiry_date: new Date('2025-12-31'),
 *   notification_intervals: [30, 7, 1],
 *   notification_channels: ['sms', 'email']
 * });
 * ```
 */
export async function createReminder(
  data: CreateReminderData
): Promise<ApiResponse<Reminder>> {
  if (!data.plate_number || !data.expiry_date) {
    throw new ReminderApiError(
      'Numărul de înmatriculare și data de expirare sunt obligatorii',
      'VALIDATION_ERROR',
      400
    );
  }

  // Convert Date to ISO string if needed
  const payload = {
    ...data,
    expiry_date: data.expiry_date instanceof Date
      ? data.expiry_date.toISOString()
      : data.expiry_date,
  };

  return fetchApi<ApiResponse<Reminder>>('/api/reminders', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * PATCH /api/reminders/:id
 * Update an existing reminder
 *
 * @param id - Reminder UUID
 * @param data - Partial reminder update data
 * @returns Updated reminder
 *
 * @example
 * ```typescript
 * const updated = await updateReminder('123e4567-e89b-12d3-a456-426614174000', {
 *   expiry_date: new Date('2026-01-31'),
 *   notification_intervals: [30, 14, 7, 1]
 * });
 * ```
 */
export async function updateReminder(
  id: string,
  data: UpdateReminderData
): Promise<ApiResponse<Reminder>> {
  if (!id || typeof id !== 'string') {
    throw new ReminderApiError('ID-ul reminder-ului este invalid', 'INVALID_ID', 400);
  }

  if (Object.keys(data).length === 0) {
    throw new ReminderApiError(
      'Nu există date de actualizat',
      'VALIDATION_ERROR',
      400
    );
  }

  // Convert Date to ISO string if needed
  const payload = {
    ...data,
    expiry_date: data.expiry_date instanceof Date
      ? data.expiry_date.toISOString()
      : data.expiry_date,
  };

  return fetchApi<ApiResponse<Reminder>>(`/api/reminders/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

/**
 * DELETE /api/reminders/:id
 * Delete a reminder (soft delete)
 *
 * @param id - Reminder UUID
 * @returns Success confirmation
 *
 * @example
 * ```typescript
 * await deleteReminder('123e4567-e89b-12d3-a456-426614174000');
 * ```
 */
export async function deleteReminder(
  id: string
): Promise<ApiResponse<{ success: boolean }>> {
  if (!id || typeof id !== 'string') {
    throw new ReminderApiError('ID-ul reminder-ului este invalid', 'INVALID_ID', 400);
  }

  return fetchApi<ApiResponse<{ success: boolean }>>(`/api/reminders/${id}`, {
    method: 'DELETE',
  });
}

/**
 * POST /api/reminders/:id/send-sms
 * Send SMS notification for a reminder
 *
 * Note: This endpoint needs to be implemented on the backend
 *
 * @param id - Reminder UUID
 * @returns SMS send result
 *
 * @example
 * ```typescript
 * const result = await sendReminderSMS('123e4567-e89b-12d3-a456-426614174000');
 * if (result.success) {
 *   console.log('SMS sent:', result.messageId);
 * }
 * ```
 */
export async function sendReminderSMS(
  id: string
): Promise<ApiResponse<SendSmsResponse>> {
  if (!id || typeof id !== 'string') {
    throw new ReminderApiError('ID-ul reminder-ului este invalid', 'INVALID_ID', 400);
  }

  return fetchApi<ApiResponse<SendSmsResponse>>(`/api/reminders/${id}/send-sms`, {
    method: 'POST',
  });
}

/**
 * Helper function to check if a reminder is expired
 */
export function isReminderExpired(reminder: Reminder): boolean {
  const expiryDate = new Date(reminder.expiry_date);
  return expiryDate < new Date();
}

/**
 * Helper function to calculate days until expiry
 */
export function getDaysUntilExpiry(reminder: Reminder): number {
  const expiryDate = new Date(reminder.expiry_date);
  const now = new Date();
  return Math.floor((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Helper function to get reminder status
 */
export function getReminderStatus(reminder: Reminder): 'urgent' | 'warning' | 'ok' {
  const daysUntilExpiry = getDaysUntilExpiry(reminder);

  if (daysUntilExpiry < 0 || daysUntilExpiry <= 7) {
    return 'urgent';
  } else if (daysUntilExpiry <= 30) {
    return 'warning';
  } else {
    return 'ok';
  }
}

/**
 * Helper function to format plate number
 */
export function formatPlateNumber(plate: string): string {
  return plate.toUpperCase().replace(/\s+/g, '');
}

/**
 * Helper function to validate plate number format
 * Romanian plate format: B123ABC or B12ABC
 */
export function isValidPlateNumber(plate: string): boolean {
  const romanianPlateRegex = /^[A-Z]{1,2}\d{2,3}[A-Z]{3}$/;
  return romanianPlateRegex.test(formatPlateNumber(plate));
}

// Re-export types for convenience
export type {
  ReminderRow,
  ReminderInsert,
  ReminderUpdate,
};
