import { z } from 'zod';

// Romanian phone number validation (E.164 format)
export const phoneSchema = z
  .string()
  .regex(/^\+40\d{9}$/, 'Numărul de telefon trebuie să fie în format +40XXXXXXXXX');

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

export const createReminderSchema = z.object({
  plate_number: plateNumberSchema,
  reminder_type: reminderTypeSchema.default('itp'),
  expiry_date: z.coerce.date().refine(
    (date) => date > new Date(),
    'Data expirării trebuie să fie în viitor'
  ),
  notification_intervals: z
    .array(z.number().refine((val) => [1, 5, 14].includes(val), {
      message: 'Intervalul trebuie să fie 1, 5 sau 14 zile',
    }))
    .min(1, 'Trebuie să selectezi cel puțin 1 interval de notificare')
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
