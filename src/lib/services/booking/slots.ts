/**
 * Generarea sloturilor libere.
 *
 * „Sloturi reale" înseamnă că ora deja ocupată nu apare. Un orar decorativ, care
 * arată toate orele și lasă clientul să descopere la telefon că nu mai e loc, e
 * mai rău decât niciun orar — pentru că mută dezamăgirea la stație.
 *
 * Toate calculele de zi și oră se fac în fusul platformei; ce se stochează e
 * `timestamptz`, adică un moment. Distincția contează la trecerea la ora de
 * vară: un slot de „09:00" e o oră de perete, iar un moment nu se mută.
 */

import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';
import { PLATFORM_TZ } from '@/lib/config/timezone';

export interface BookingConfig {
  slot_minutes: number;
  slot_capacity: number;
  booking_horizon_days: number;
  booking_lead_minutes: number;
  /** {"1": [["08:00","16:00"]], …} — cheia e ziua ISO, 1 = luni. */
  working_hours: Record<string, [string, string][]>;
  closed_dates: string[];
}

export interface Slot {
  /** Momentul, în ISO cu fus — ce se trimite la rezervare. */
  starts_at: string;
  /** Ora locală, `HH:mm` — ce vede clientul. */
  label: string;
  remaining: number;
}

export interface DaySlots {
  date: string;
  slots: Slot[];
}

const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** `working_hours` vine din `jsonb`, deci poate fi orice. Îl citim defensiv. */
export function parseWorkingHours(raw: unknown): Record<string, [string, string][]> {
  const out: Record<string, [string, string][]> = {};
  if (!raw || typeof raw !== 'object') return out;

  for (const [day, ranges] of Object.entries(raw as Record<string, unknown>)) {
    if (!/^[1-7]$/.test(day) || !Array.isArray(ranges)) continue;

    const valid = ranges.filter(
      (r): r is [string, string] =>
        Array.isArray(r) &&
        r.length === 2 &&
        typeof r[0] === 'string' &&
        typeof r[1] === 'string' &&
        HHMM.test(r[0]) &&
        HHMM.test(r[1]) &&
        r[0] < r[1]
    );

    if (valid.length) out[day] = valid;
  }

  return out;
}

const minutesOf = (hhmm: string): number => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

const pad = (n: number) => String(n).padStart(2, '0');
const labelOf = (minutes: number) => `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;

/** Ziua ISO (1 = luni … 7 = duminică) pentru o dată calendaristică. */
function isoWeekday(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  const day = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return String(day === 0 ? 7 : day);
}

function addDays(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().split('T')[0];
}

/**
 * Sloturile libere dintr-un interval, pentru o stație.
 *
 * @param taken - câte rezervări active există deja, pe moment ISO exact
 */
export function generateSlots(params: {
  config: BookingConfig;
  from: string;
  days: number;
  taken: Map<string, number>;
  now?: Date;
}): DaySlots[] {
  const { config, from, taken } = params;
  const now = params.now ?? new Date();

  const workingHours = parseWorkingHours(config.working_hours);
  const closed = new Set(Array.isArray(config.closed_dates) ? config.closed_dates : []);

  // Nimeni nu rezervă pentru „peste cinci minute": stația n-ar apuca să vadă.
  const earliest = new Date(now.getTime() + config.booking_lead_minutes * 60_000);
  const horizonEnd = addDays(formatInTimeZone(now, PLATFORM_TZ, 'yyyy-MM-dd'), config.booking_horizon_days);

  const result: DaySlots[] = [];

  for (let offset = 0; offset < params.days; offset += 1) {
    const date = addDays(from, offset);
    if (date > horizonEnd || closed.has(date)) continue;

    const ranges = workingHours[isoWeekday(date)] ?? [];
    const slots: Slot[] = [];

    for (const [start, end] of ranges) {
      const endMinutes = minutesOf(end);

      for (
        let minute = minutesOf(start);
        // Slotul trebuie să încapă întreg în interval: unul care se termină
        // după închidere e o promisiune pe care stația n-o poate ține.
        minute + config.slot_minutes <= endMinutes;
        minute += config.slot_minutes
      ) {
        // `fromZonedTime` interpretează ora ca fiind locală și dă momentul —
        // singurul loc unde ora de perete devine punct în timp.
        const startsAt = fromZonedTime(`${date}T${labelOf(minute)}:00`, PLATFORM_TZ);
        if (startsAt < earliest) continue;

        const iso = startsAt.toISOString();
        const remaining = config.slot_capacity - (taken.get(iso) ?? 0);
        if (remaining <= 0) continue;

        slots.push({ starts_at: iso, label: labelOf(minute), remaining });
      }
    }

    // Zilele fără sloturi nu se trimit: o listă cu șapte zile goale îl face pe
    // client să creadă că e stricat, nu că stația e închisă.
    if (slots.length) result.push({ date, slots });
  }

  return result;
}
