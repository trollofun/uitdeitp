/**
 * Quiet Hours Service
 *
 * Handles quiet hours logic for notification delivery
 * Romanian timezone (Europe/Bucharest) aware
 */

import { formatInTimeZone } from 'date-fns-tz';

interface QuietHoursSettings {
  quiet_hours_enabled: boolean;
  quiet_hours_start: string; // HH:MM format (e.g., "22:00")
  quiet_hours_end: string; // HH:MM format (e.g., "08:00")
  quiet_hours_weekdays_only: boolean; // If true, weekends are exempt
}

/**
 * Check if current Romanian time falls within quiet hours
 *
 * @param settings User's quiet hours preferences
 * @returns true if currently in quiet hours, false otherwise
 */
export function isInQuietHours(settings: QuietHoursSettings | null): boolean {
  if (!settings || !settings.quiet_hours_enabled) {
    return false;
  }

  const ROMANIAN_TZ = 'Europe/Bucharest';
  const now = new Date();

  // Get current time in Romanian timezone
  const currentTime = formatInTimeZone(now, ROMANIAN_TZ, 'HH:mm');
  const currentDay = parseInt(formatInTimeZone(now, ROMANIAN_TZ, 'i'), 10); // 1=Monday, 7=Sunday

  // Check if weekends are exempt
  if (settings.quiet_hours_weekdays_only && (currentDay === 6 || currentDay === 7)) {
    // Weekend (Saturday or Sunday) - quiet hours don't apply
    return false;
  }

  const startTime = settings.quiet_hours_start;
  const endTime = settings.quiet_hours_end;

  // Handle overnight quiet hours (e.g., 22:00 - 08:00)
  if (startTime > endTime) {
    // Quiet hours span midnight
    return currentTime >= startTime || currentTime < endTime;
  } else {
    // Quiet hours within same day (e.g., 12:00 - 14:00)
    return currentTime >= startTime && currentTime < endTime;
  }
}

/**
 * Calculate next available notification time outside quiet hours
 *
 * @param settings User's quiet hours preferences
 * @returns ISO date string for next available notification time, or null if no quiet hours
 */
export function calculateNextAvailableTime(
  settings: QuietHoursSettings | null
): string | null {
  if (!settings || !settings.quiet_hours_enabled) {
    return null;
  }

  const ROMANIAN_TZ = 'Europe/Bucharest';
  const now = new Date();

  // If not currently in quiet hours, can send immediately
  if (!isInQuietHours(settings)) {
    return null;
  }

  // Currently in quiet hours - calculate when they end
  const endTime = settings.quiet_hours_end; // e.g., "08:00"
  const [endHour, endMinute] = endTime.split(':').map(Number);

  // Get current date in Romanian timezone
  const currentDate = formatInTimeZone(now, ROMANIAN_TZ, 'yyyy-MM-dd');
  const currentTime = formatInTimeZone(now, ROMANIAN_TZ, 'HH:mm');

  let nextAvailableDate = new Date(currentDate);

  // If quiet hours end time is before current time, it means we're in overnight quiet hours
  // and the end time is tomorrow
  if (settings.quiet_hours_start > settings.quiet_hours_end && currentTime >= settings.quiet_hours_start) {
    // Overnight quiet hours, end time is tomorrow
    nextAvailableDate.setDate(nextAvailableDate.getDate() + 1);
  }

  // Set time to end of quiet hours
  nextAvailableDate.setHours(endHour, endMinute, 0, 0);

  return nextAvailableDate.toISOString();
}

/**
 * Get user's quiet hours settings from user_profiles
 *
 * @param userId User ID
 * @param supabase Supabase client
 * @returns Quiet hours settings or null if not found/disabled
 */
export async function getUserQuietHours(
  userId: string,
  supabase: any
): Promise<QuietHoursSettings | null> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select(
      'quiet_hours_enabled, quiet_hours_start, quiet_hours_end, quiet_hours_weekdays_only'
    )
    .eq('id', userId)
    .single();

  if (error || !data) {
    return null;
  }

  return data as QuietHoursSettings;
}
