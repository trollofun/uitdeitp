/**
 * Fusul orar al platformei, într-un singur loc.
 *
 * `'Europe/Bucharest'` era scris de mână în cinci fișiere, iar
 * `stations/me/upcoming` lucra în UTC pur — deci calendarul stației putea arăta
 * o zi diferită de cea în care pleacă reminderele, în ferestrele de noapte.
 *
 * Nu e o constantă de configurare: platforma e românească prin construcție
 * (plăcuțe, coduri RAR, ITP). Dacă vreodată apare o stație în alt fus, atunci
 * fusul devine proprietate a **stației**, nu variabilă de mediu — iar locul în
 * care se schimbă asta e aici.
 */

import { formatInTimeZone, toZonedTime } from 'date-fns-tz';

export const PLATFORM_TZ = 'Europe/Bucharest';

/** Data calendaristică de azi în România, `YYYY-MM-DD`. */
export function todayInRomania(now: Date = new Date()): string {
  return formatInTimeZone(now, PLATFORM_TZ, 'yyyy-MM-dd');
}

/** Ora locală românească (0-23), pentru ferestrele de liniște. */
export function hourInRomania(now: Date = new Date()): number {
  return Number(formatInTimeZone(now, PLATFORM_TZ, 'H'));
}

/** Momentul dat, exprimat în ora României — pentru calcule pe zile. */
export function inRomania(date: Date): Date {
  return toZonedTime(date, PLATFORM_TZ);
}

/**
 * Prima și ultima zi ale lunii care conține data dată, în ora României.
 *
 * `upcoming` le calcula cu `Date.UTC`, ceea ce în noaptea de 1 ale lunii
 * producea intervalul lunii precedente.
 */
export function monthBoundsInRomania(reference: Date = new Date()): {
  from: string;
  to: string;
} {
  const [year, month] = formatInTimeZone(reference, PLATFORM_TZ, 'yyyy-MM')
    .split('-')
    .map(Number);

  const pad = (n: number) => String(n).padStart(2, '0');
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();

  return { from: `${year}-${pad(month)}-01`, to: `${year}-${pad(month)}-${pad(lastDay)}` };
}
