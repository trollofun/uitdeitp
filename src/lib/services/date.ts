import { format, formatDistanceToNow, differenceInDays, isAfter, isBefore } from 'date-fns';
import { ro } from 'date-fns/locale';

/**
 * Format date for Romanian locale
 * @param date - Date to format
 * @param formatStr - Format string (default: 'dd.MM.yyyy')
 */
export function formatDate(date: Date | string, formatStr: string = 'dd.MM.yyyy'): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(dateObj.getTime())) return 'N/A';
  return format(dateObj, formatStr, { locale: ro });
}

/**
 * Get relative time in Romanian
 * @param date - Date to compare
 */
export function getRelativeTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(dateObj.getTime())) return 'N/A';
  return formatDistanceToNow(dateObj, { addSuffix: true, locale: ro });
}

/**
 * Calculate days until expiry
 * @param expiryDate - Expiry date
 */
export function getDaysUntilExpiry(expiryDate: Date | string): number {
  const dateObj = typeof expiryDate === 'string' ? new Date(expiryDate) : expiryDate;
  if (isNaN(dateObj.getTime())) return -1;
  return differenceInDays(dateObj, new Date());
}

/**
 * Check if date is in the future
 */
export function isFutureDate(date: Date | string): boolean {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(dateObj.getTime())) return false;
  return isAfter(dateObj, new Date());
}

/**
 * Check if date is expired
 */
export function isExpired(date: Date | string): boolean {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(dateObj.getTime())) return false;
  return isBefore(dateObj, new Date());
}

/**
 * Get urgency status based on days until expiry
 */
export function getUrgencyStatus(
  daysUntil: number
): 'expired' | 'urgent' | 'warning' | 'normal' {
  if (daysUntil < 0) return 'expired';
  if (daysUntil <= 3) return 'urgent';
  if (daysUntil <= 7) return 'warning';
  return 'normal';
}

/**
 * Calculate next notification date based on intervals
 * @param expiryDate - Expiry date
 * @param intervals - Notification intervals in days (e.g., [7, 3, 1])
 */
export function calculateNextNotificationDate(
  expiryDate: Date | string,
  intervals: number[]
): Date | null {
  const dateObj = typeof expiryDate === 'string' ? new Date(expiryDate) : expiryDate;
  const daysUntilExpiry = getDaysUntilExpiry(dateObj);

  // Find the next applicable interval
  const nextInterval = intervals
    .sort((a, b) => b - a) // Sort descending
    .find((interval) => daysUntilExpiry >= interval);

  if (!nextInterval) return null;

  const nextDate = new Date(dateObj);
  nextDate.setDate(nextDate.getDate() - nextInterval);
  return nextDate;
}
