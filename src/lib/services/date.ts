import { format, formatDistanceToNow, differenceInDays, isAfter, isBefore, startOfDay } from 'date-fns';
import { ro } from 'date-fns/locale';
import { formatInTimeZone, toZonedTime } from 'date-fns-tz';

/**
 * Format date for Romanian locale
 * @param date - Date to format
 * @param formatStr - Format string (default: 'dd.MM.yyyy')
 */
export function formatDate(date: Date | string, formatStr: string = 'dd.MM.yyyy'): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return format(dateObj, formatStr, { locale: ro });
}

/**
 * Get relative time in Romanian
 * @param date - Date to compare
 */
export function getRelativeTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return formatDistanceToNow(dateObj, { addSuffix: true, locale: ro });
}

/**
 * Calculate days until expiry
 * FIXED: Normalize both dates to midnight in Romanian timezone to avoid hour-based discrepancies
 * @param expiryDate - Expiry date
 */
export function getDaysUntilExpiry(expiryDate: Date | string): number {
  const ROMANIAN_TZ = 'Europe/Bucharest';

  // Parse expiry date and normalize to midnight in Romanian timezone
  const dateObj = typeof expiryDate === 'string' ? new Date(expiryDate) : expiryDate;
  const expiryMidnight = startOfDay(toZonedTime(dateObj, ROMANIAN_TZ));

  // Get current date normalized to midnight in Romanian timezone
  const nowMidnight = startOfDay(toZonedTime(new Date(), ROMANIAN_TZ));

  return differenceInDays(expiryMidnight, nowMidnight);
}

/**
 * Check if date is in the future
 */
export function isFutureDate(date: Date | string): boolean {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return isAfter(dateObj, new Date());
}

/**
 * Check if date is expired
 */
export function isExpired(date: Date | string): boolean {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
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
 * Când pleacă următoarea notificare pentru un reminder, ca dată `YYYY-MM-DD`.
 *
 * Exista în trei exemplare: unul mort aici (nu-l importa nimeni), cel real
 * inline în `reminder-processor.ts`, și o „simulare" copiată în teste — care
 * testa copia, deci nu apăra nimic. Ăsta e singurul rămas.
 *
 * Aritmetică pe șiruri, nu pe `Date`, deliberat. Varianta veche amesteca
 * `new Date('2026-08-11')` (miezul nopții **UTC**) cu `getDate()`/`setDate()`
 * (ziua **locală**). Merge cât timp procesul rulează pe UTC — cum e pe Vercel —
 * dar se rupe tăcut, cu o zi, oriunde la vest de Greenwich: pe laptopul cuiva,
 * într-un container cu alt `TZ`, sau dacă mutăm vreodată cronul. O dată de
 * calendar n-are fus orar, deci n-are ce căuta într-un `Date`.
 *
 * @param expiryDate - scadența, `YYYY-MM-DD`
 * @param daysUntilExpiry - câte zile mai sunt (calculat în fusul românesc)
 * @param intervals - pragurile stației, ex. [7, 3, 1]
 * @returns data următoarei notificări, sau `null` dacă asta a fost ultima
 */
export function nextNotificationDateFor(
  expiryDate: string,
  daysUntilExpiry: number,
  intervals: number[] | null | undefined
): string | null {
  if (!intervals || intervals.length === 0) return null;

  // Descrescător: vrem cel mai mare prag care mai e înaintea noastră.
  const nextInterval = [...intervals]
    .sort((a, b) => b - a)
    .find((interval) => interval < daysUntilExpiry);

  if (nextInterval === undefined) return null;

  return shiftIsoDate(expiryDate, -nextInterval);
}

/**
 * Mută o dată calendaristică `YYYY-MM-DD` cu N zile, fără să treacă prin fusuri.
 *
 * `Date.UTC` e folosit doar ca aritmetică de calendar — nu reprezintă un moment
 * în timp, deci nu poate fi deplasat de fus sau de ora de vară.
 */
function shiftIsoDate(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const shifted = new Date(Date.UTC(y, m - 1, d + days));
  return shifted.toISOString().split('T')[0];
}
