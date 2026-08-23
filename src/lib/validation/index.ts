import { z } from 'zod';
import { isActiveReminderType } from '@/lib/services/reminder-type';

// Romanian phone number validation (E.164 format)
/**
 * Număr de **mobil** românesc, în E.164.
 *
 * Cerea doar „+40 urmat de 9 cifre", ceea ce accepta și numerele fixe:
 * `0212345678` (București) devenea `+40212345678` și trecea. Un fix nu poate
 * primi SMS — deci reminderul se factura, pleca și nu ajungea nicăieri, iar
 * clientul rămânea neanunțat fără ca cineva să afle.
 *
 * În producție nu era încă niciunul (94 din 94 sunt 07x, verificat 2026-08-09),
 * dar importul din Excel aduce liste întregi de contacte în care numerele fixe
 * sunt normale.
 *
 * `07` acoperă toate rețelele mobile din România; fixele sunt `02x`/`03x`.
 */
export const phoneSchema = z
  .string()
  .regex(/^\+407\d{8}$/, 'Numărul trebuie să fie un mobil românesc, în format +407XXXXXXXX');

/**
 * Normalizes a Romanian phone number to E.164, then validates it.
 *
 * phoneSchema is strict (+40XXXXXXXXX); partner-facing inputs also send
 * 07XXXXXXXX / 0040... / 7XXXXXXXX, so those are accepted and normalized here.
 */
export function normalizeRoPhone(input: string): string {
  let digits = input.replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);

  if (digits.startsWith('40') && digits.length === 11) return `+${digits}`;
  if (digits.startsWith('0') && digits.length === 10) return `+4${digits}`;
  if (digits.length === 9) return `+40${digits}`;

  return input.trim();
}

export const roPhoneSchema = z.string().transform(normalizeRoPhone).pipe(phoneSchema);

// Romanian plate number validation
// Accepts any format: B123ABC, B-123-ABC, B 123 ABC
// Normalizes to: B123ABC (compact format for SMS savings)
export const plateNumberSchema = z
  .string()
  .min(6, 'Număr de înmatriculare prea scurt')
  .max(15, 'Număr de înmatriculare prea lung')
  .transform((val) => val.replace(/[^A-Z0-9]/gi, '').toUpperCase())
  .refine(
    // Structure: 1-2 letters + 2-3 digits + 2-3 letters (older plates end in 2 letters)
    (normalized) => /^[A-Z]{1,2}[0-9]{2,3}[A-Z]{2,3}$/.test(normalized),
    'Număr de înmatriculare invalid (ex: B123ABC, B-123-ABC)'
  ); // Returns: B123ABC (without separators)

// Email validation
export const emailSchema = z.string().email('Email invalid');

// User profile schemas
export const userProfileSchema = z.object({
  full_name: z.string().min(3, 'Numele trebuie să aibă minim 3 caractere').optional(),
  phone: phoneSchema.optional(),
  prefers_sms: z.boolean().default(false),
});

export const userProfileUpdateSchema = userProfileSchema.partial().extend({
  // Profile settings persisted from the dashboard (previously stripped silently)
  city: z.string().max(100).nullable().optional(),
  country: z.string().max(100).nullable().optional(),
  avatar_url: z.string().url().nullable().optional().or(z.literal('')),
  use_manual_location: z.boolean().optional(),
  // NOTE: phone_verified is intentionally NOT accepted here — it is set
  // server-side by /api/verification/verify after a successful SMS check.
});

// Reminder schemas
export const reminderTypeSchema = z.enum(['itp', 'rca', 'rovinieta']);

/**
 * La CREARE se acceptă doar tipurile active (azi: doar ITP — decizia din
 * 23.08). reminderTypeSchema complet rămâne pentru citire/afișare, ca
 * reminderele RCA/Rovinieta existente să rămână valide.
 */
export const activeReminderTypeSchema = reminderTypeSchema.refine(
  (t) => isActiveReminderType(t),
  { message: 'Momentan se pot crea doar remindere ITP' }
);

export const createReminderSchema = z.object({
  plate_number: plateNumberSchema,
  reminder_type: activeReminderTypeSchema.default('itp'),
  expiry_date: z.coerce.date().refine(
    (date) => date > new Date(),
    'Data expirării trebuie să fie în viitor'
  ),
  /**
   * Intervalele erau limitate la lista fixă [1, 5, 14] — o listă care nu se
   * potrivea cu nimic altceva din sistem.
   *
   * În producție, **39 de remindere au `[7, 3, 1]`** (verificat 2026-08-09):
   * date pe care baza le conține, dar pe care API-ul le refuza. Editarea
   * oricăruia din dashboard eșua cu „Intervalul trebuie să fie 1, 5 sau 14
   * zile", fără ca utilizatorul să înțeleagă de ce.
   *
   * Contrazicea și restul: șabloanele implicite sunt 7d/3d/1d, strategia din
   * PRD e „7 / 3 / 1", iar `default_intervals` al stației acceptă orice între
   * 1 și 60. Aliniem la aceeași regulă — se lărgește, nu se strânge, deci
   * nimic din ce era acceptat nu devine invalid.
   */
  notification_intervals: z
    .array(
      z
        .number()
        .int('Intervalul trebuie să fie un număr întreg de zile')
        .min(1, 'Intervalul trebuie să fie de cel puțin o zi')
        .max(60, 'Intervalul nu poate depăși 60 de zile')
    )
    .min(1, 'Trebuie să selectezi cel puțin 1 interval de notificare')
    // 3, nu 4: homepage-ul promite public „maxim 3 remindere pe vehicul" —
    // promisiunea anti-spam devine lege în validare (audit 23.08). Nicio dată
    // existentă nu avea 4 intervale.
    .max(3, 'Poți selecta maxim 3 intervale de notificare')
    .default([5]),
  notification_channels: z
    .object({
      sms: z.boolean(),
      email: z.boolean(),
    })
    .default({ sms: true, email: false }),
  guest_phone: phoneSchema.optional(),
  guest_name: z.string().min(3).optional(),
});

export const updateReminderSchema = createReminderSchema.partial();

// Kiosk submission schema
export const kioskSubmissionSchema = z.object({
  station_slug: z.string().min(1),
  guest_name: z.string().min(3, 'Numele trebuie să aibă minim 3 caractere'),
  guest_phone: phoneSchema,
  plate_number: plateNumberSchema,
  expiry_date: z.coerce.date().refine(
    (date) => date > new Date(),
    'Data expirării trebuie să fie în viitor'
  ),
  consent_given: z.literal(true, {
    errorMap: () => ({ message: 'Trebuie să accepți termenii și condițiile' }),
  }),
});

// SMS Gateway schemas
export const sendSmsSchema = z.object({
  to: phoneSchema,
  body: z.string().min(1).max(1600, 'Mesajul poate avea maxim 1600 caractere'),
  callbackUrl: z.string().url().optional(),
  idempotencyKey: z.string().uuid().optional(),
});

// Station schemas
export const createStationSchema = z.object({
  slug: z
    .string()
    .min(3)
    .regex(/^[a-z0-9-]+$/, 'Slug-ul poate conține doar litere mici, cifre și liniuțe'),
  name: z.string().min(3),
  logo_url: z.string().url().optional(),
  primary_color: z.string().regex(/^#[0-9A-F]{6}$/i).default('#3B82F6'),
  station_phone: phoneSchema.optional(),
  station_address: z.string().optional(),
  // SMS notification templates (optional - DB defaults used if omitted)
  sms_template_5d: z.string().min(10, 'Template-ul trebuie să aibă minim 10 caractere').optional(),
  sms_template_3d: z.string().min(10, 'Template-ul trebuie să aibă minim 10 caractere').optional(),
  sms_template_1d: z.string().min(10, 'Template-ul trebuie să aibă minim 10 caractere').optional(),
  // Email notification templates (optional - DB defaults used if omitted)
  email_template_5d: z.string().optional(),
  email_template_3d: z.string().optional(),
  email_template_1d: z.string().optional(),
  // Ecosystem / Contract A
  rar_code: z.string().min(2).max(16).optional().or(z.literal('')),
  default_intervals: z.array(z.number().int().min(1).max(60)).min(1).max(3).optional(),
  ingest_enabled: z.boolean().optional(),
  hmac_mode: z.enum(['log', 'enforce']).optional(),
});

export const updateStationSchema = createStationSchema.partial();

// Export types inferred from schemas
export type UserProfile = z.infer<typeof userProfileSchema>;
export type UserProfileUpdate = z.infer<typeof userProfileUpdateSchema>;
export type CreateReminder = z.infer<typeof createReminderSchema>;
export type UpdateReminder = z.infer<typeof updateReminderSchema>;
export type KioskSubmission = z.infer<typeof kioskSubmissionSchema>;
export type SendSms = z.infer<typeof sendSmsSchema>;
export type CreateStation = z.infer<typeof createStationSchema>;
export type UpdateStation = z.infer<typeof updateStationSchema>;
export type ReminderType = z.infer<typeof reminderTypeSchema>;
