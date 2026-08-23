/**
 * Tipul scadenței, într-un singur loc.
 *
 * Baza stochează cu litere mici (`itp` | `rca` | `rovinieta`), dar codul avea
 * nevoie de forma afișabilă în trei locuri diferite, iar conversia era scrisă
 * de mână de fiecare dată — un ternar imbricat de trei niveluri, copiat.
 *
 * Contează pentru multi-scadență: ITPalert, SOGA și SmsITP acoperă deja
 * RCA/tahograf/CASCO, deci e obiecție de vânzare („voi faceți doar ITP?"), nu
 * motiv de a ne alege. Schema și interfața acceptau cele trei tipuri de la
 * început; ce lipsea era **pipeline-ul**: șabloanele SMS ale stației sunt per
 * interval, nu per tip, așa că un client cu RCA primea textul de ITP.
 *
 * Soluția e un placeholder `{tip}`, nu nouă coloane `sms_template_<tip>_<zi>`:
 * explozia aia ar fi cerut nouă editoare în interfață pentru o funcție care e
 * paritate, nu diferențiere.
 */

export const REMINDER_TYPES = ['itp', 'rca', 'rovinieta'] as const;

export type ReminderType = (typeof REMINDER_TYPES)[number];

/**
 * Tipurile care se pot CREA acum (23.08: focus pe ITP). Lista completă
 * REMINDER_TYPES rămâne pentru etichete și normalizare — reminderele
 * RCA/Rovinieta existente se afișează și se procesează în continuare corect.
 * Funcție, nu constantă: flag-ul se citește la apel, nu la încărcarea
 * modulului (aceeași capcană ca la geolocation.ts).
 */
export function activeReminderTypes(): readonly ReminderType[] {
  return process.env.NEXT_PUBLIC_MULTI_TYPE_REMINDERS === 'true' ? REMINDER_TYPES : (['itp'] as const);
}

export function isActiveReminderType(type: string): type is ReminderType {
  return (activeReminderTypes() as readonly string[]).includes(type);
}

/** Cum îl scriem în SMS și email. Fără diacritice — vezi `sms-encoding`. */
const LABELS: Record<ReminderType, string> = {
  itp: 'ITP',
  rca: 'RCA',
  rovinieta: 'Rovinieta',
};

/**
 * Normalizează orice a ajuns în coloană la unul din cele trei tipuri.
 *
 * `itp` la necunoscut, deliberat: e tipul a 149 din 149 de rânduri existente,
 * iar un reminder trimis cu eticheta greșită e mai bun decât unul netrimis.
 */
export function normaliseReminderType(value: unknown): ReminderType {
  const text = String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

  if (text.startsWith('rca') || text.includes('asigurare')) return 'rca';
  if (text.startsWith('rovinieta') || text.startsWith('roviniet')) return 'rovinieta';
  return 'itp';
}

/** Eticheta pentru mesaje: `ITP`, `RCA`, `Rovinieta`. */
export function reminderTypeLabel(value: unknown): string {
  return LABELS[normaliseReminderType(value)];
}

/** Forma pe care o cere helperul de email (majuscule mixte, istoric). */
export function reminderTypeForEmail(value: unknown): 'ITP' | 'RCA' | 'Rovinieta' {
  return LABELS[normaliseReminderType(value)] as 'ITP' | 'RCA' | 'Rovinieta';
}
